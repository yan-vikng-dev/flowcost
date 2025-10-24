import { getDb } from "@repo/data-ops/database/setup";
import { whatsapp_link_tokens } from "@repo/data-ops/drizzle/schemas/whatsapp_link_tokens/table";
import { whatsapp_links } from "@repo/data-ops/drizzle/schemas/whatsapp_links/table";
import { sha256Hex, timingSafeEqualHex } from "@repo/shared-config/crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { MessageContext } from "@/durable-objects/Assistant/AiConversationServer";
import { sendWhatsAppText } from "./helpers";

export async function verifyWhatsAppSignature(
	rawBody: ArrayBuffer,
	signatureHeader: string | null,
	appSecret: string,
): Promise<boolean> {
	if (!signatureHeader) return false;
	const expected = signatureHeader.replace(/^sha256=/, "");
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(appSecret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const mac = await crypto.subtle.sign("HMAC", key, rawBody);
	const macHex = Array.from(new Uint8Array(mac))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return timingSafeEqualHex(macHex, expected);
}

const slashCommands: readonly string[] = [
	"/new",
	"/help",
	"/link",
	"/unlink",
	"/help",
];

export type HandleIncomingMessageArgs = {
	waId: string;
	text: string;
	messageId: string;
};

export async function handleIncomingMessage(
	env: Env,
	args: HandleIncomingMessageArgs,
) {
	const db = getDb();
	const { waId, text, messageId } = args;
	console.debug({
		message: "handling whatsapp webhook message",
		waId,
		text,
		messageId,
	});

	const tokenMatch = text.match(/^\/verify\s*([A-Za-z0-9]{4}-[A-Za-z0-9]{4})$/);
	if (tokenMatch) {
		const rawToken = tokenMatch[1];
		if (!rawToken) {
			await sendWhatsAppText({
				env,
				waId,
				text: "Token invalid or expired. Please retry linking from the web app.",
			});
			return;
		}
		const tokenHash = await sha256Hex(rawToken);

		const now = new Date();
		const rows = await db
			.select()
			.from(whatsapp_link_tokens)
			.where(
				and(
					eq(whatsapp_link_tokens.tokenHash, tokenHash),
					gt(whatsapp_link_tokens.expiresAt, now),
					isNull(whatsapp_link_tokens.usedAt),
				),
			);
		const token = rows[0];
		if (!token) {
			await sendWhatsAppText({
				env,
				waId,
				text: "Token invalid or expired. Please retry linking from the web app.",
			});
			return;
		}

		// Relink logic: if this waId belongs to another user, move it
		const existingByWa = await db
			.select()
			.from(whatsapp_links)
			.where(eq(whatsapp_links.waId, waId));
		if (existingByWa[0] && existingByWa[0].userId !== token.userId) {
			await sendWhatsAppText({
				env,
				waId,
				text: "This number was linked to a different account. Relinking to your current account.",
			});
		}

		await db
			.insert(whatsapp_links)
			.values({
				userId: token.userId,
				waId,
			})
			.onConflictDoUpdate({
				target: whatsapp_links.waId,
				set: { userId: token.userId, updatedAt: new Date() },
			});

		// Mark token as used
		await db
			.update(whatsapp_link_tokens)
			.set({ usedAt: now, updatedAt: now })
			.where(eq(whatsapp_link_tokens.id, token.id));

		await sendWhatsAppText({
			env,
			waId,
			text: "Linked ✅ You can now chat here.",
		});
		return;
	}

	const link = await db.query.whatsapp_links.findFirst({
		where: eq(whatsapp_links.waId, waId),
		columns: {},
		with: {
			user: {
				columns: {
					id: true,
				},
				with: {
					preferences: {
						columns: {
							defaultEntryCurrency: true,
							timezone: true,
							displayCurrency: true,
						},
					},
				},
			},
		},
	});

	if (!link) {
		await sendWhatsAppText({
			env,
			waId,
			text: "Please visit https://flowcost.co/app/settings to link your WhatsApp number",
		});
		return;
	}
	const id = env.AI_CONVERSATION_SERVER.idFromName(link.user.id);
	const stub = env.AI_CONVERSATION_SERVER.get(id);
	if (slashCommands.includes(text)) {
		console.debug("text included in slash commands", text);
		switch (text) {
			case "/new":
				await stub.reset();
				await sendWhatsAppText({ env, waId, text: "I forgor." });
				return;
			case "/help":
				await sendWhatsAppText({
					env,
					waId,
					text: "You can either use slash commands (start with /) or just chat normally, I'll try my best to help you.",
				});
				return;
			case "/link":
				await sendWhatsAppText({
					env,
					waId,
					text: "Please visit https://flowcost.co/app/settings to link your WhatsApp number",
				});
				return;
			case "/unlink":
				await db.delete(whatsapp_links).where(eq(whatsapp_links.waId, waId));
				await sendWhatsAppText({ env, waId, text: "Unlinked ✅" });
				return;
			default:
		}
	}
	const messageContext: MessageContext = {
		messageId,
		waId,
		userId: link.user.id,
		defaultEntryCurrency: link.user.preferences.defaultEntryCurrency,
		displayCurrency: link.user.preferences.displayCurrency,
		userTimezone: link.user.preferences.timezone,
	};
	try {
		const reply = await stub.handleMessage(text, messageContext);
		if (reply) await sendWhatsAppText({ env, waId, text: reply });
	} catch (error) {
		await sendWhatsAppText({
			env,
			waId,
			text: "Something went wrong. Please try again.",
		});
		throw error;
	}
	return;
}
