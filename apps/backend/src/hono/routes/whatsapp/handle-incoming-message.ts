import { getDb } from "@repo/db/database/setup"
import {
	user_preferences,
	whatsapp_link_tokens,
	whatsapp_links,
} from "@repo/db/drizzle/schemas/index"
import { sha256Hex } from "@repo/shared-lib/crypto"
import { and, eq, gt, isNull } from "drizzle-orm"
import type { MessageContext } from "@/durable-objects/AgentServer"
import type { WhatsAppMedia } from "@/lib/whatsapp/media"
import { fetchWhatsAppMedia } from "@/lib/whatsapp/media"
import { sendTypingIndicator, sendWhatsAppText } from "@/lib/whatsapp/messages"
import { appendMediaContent } from "./append-media-content"
import { slashCommands } from "./slash-commands"
import type { HandleIncomingMessageArgs, UserContentPart } from "./types"

export async function handleIncomingMessage(
	env: Env,
	args: HandleIncomingMessageArgs,
) {
	const db = getDb()
	const { waId, text, messageId, media } = args
	console.debug({
		message: "handling whatsapp webhook message",
		waId,
		text,
		messageId,
		mediaKind: media?.kind ?? null,
	})

	const tokenMatch = text?.match(/^\/verify\s*([A-Za-z0-9]{4}-[A-Za-z0-9]{4})$/)
	if (tokenMatch) {
		const rawToken = tokenMatch[1]
		if (!rawToken) {
			await sendWhatsAppText({
				env,
				waId,
				text: "Token invalid or expired. Please retry linking from the web app.",
			})
			return
		}
		const tokenHash = await sha256Hex(rawToken)

		const now = new Date()
		const token = await db.query.whatsapp_link_tokens.findFirst({
			where: and(
				eq(whatsapp_link_tokens.tokenHash, tokenHash),
				gt(whatsapp_link_tokens.expiresAt, now),
				isNull(whatsapp_link_tokens.usedAt),
			),
		})
		if (!token) {
			await sendWhatsAppText({
				env,
				waId,
				text: "Token invalid or expired. Please retry linking from the web app.",
			})
			return
		}

		// Relink logic: if this waId belongs to another user, move it
		const existingByWa = await db.query.whatsapp_links.findFirst({
			where: eq(whatsapp_links.waId, waId),
		})
		if (existingByWa && existingByWa.userId !== token.userId) {
			await sendWhatsAppText({
				env,
				waId,
				text: "This number was linked to a different account. Relinking to your current account.",
			})
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
			})

		// Mark token as used
		await db
			.update(whatsapp_link_tokens)
			.set({ usedAt: now, updatedAt: now })
			.where(eq(whatsapp_link_tokens.id, token.id))

		// Enable all three report types when WhatsApp is linked
		await db
			.insert(user_preferences)
			.values({
				userId: token.userId,
				reportsDailyEnabled: true,
				reportsWeeklyEnabled: true,
				reportsMonthlyEnabled: true,
			})
			.onConflictDoUpdate({
				target: user_preferences.userId,
				set: {
					reportsDailyEnabled: true,
					reportsWeeklyEnabled: true,
					reportsMonthlyEnabled: true,
				},
			})

		// Initialize NotificationScheduler DO
		const schedulerId = env.NOTIFICATION_SCHEDULER.idFromName(token.userId)
		const schedulerStub = env.NOTIFICATION_SCHEDULER.get(schedulerId)
		await schedulerStub.initialize(token.userId)

		await sendWhatsAppText({
			env,
			waId,
			text: "Linked ✅ You can now chat here.",
		})
		return
	}

	const link = await db.query.whatsapp_links.findFirst({
		where: eq(whatsapp_links.waId, waId),
		columns: {},
		with: {
			user: {
				columns: {
					id: true,
					email: true,
					name: true,
				},
				with: {
					preferences: true,
				},
			},
		},
	})

	if (!link) {
		await sendWhatsAppText({
			env,
			waId,
			text: "Please visit https://flowcost.co/app/settings to link your WhatsApp number",
		})
		return
	}
	const id = env.AI_CONVERSATION_SERVER.idFromName(link.user.id)
	const stub = env.AI_CONVERSATION_SERVER.get(id)
	if (text && slashCommands.includes(text)) {
		switch (text) {
			case "/new":
				await stub.reset()
				await sendWhatsAppText({ env, waId, text: "I forgor." })
				return
			case "/help":
				await sendWhatsAppText({
					env,
					waId,
					text: "You can either use slash commands (start with /) or just chat normally, I'll try my best to help you.",
				})
				return
			case "/link":
				await sendWhatsAppText({
					env,
					waId,
					text: "Please visit https://flowcost.co/app/settings to link your WhatsApp number",
				})
				return
			case "/unlink": {
				await db.delete(whatsapp_links).where(eq(whatsapp_links.waId, waId))
				const unlinkUserId = link.user.id
				const unlinkSchedulerId =
					env.NOTIFICATION_SCHEDULER.idFromName(unlinkUserId)
				const unlinkSchedulerStub =
					env.NOTIFICATION_SCHEDULER.get(unlinkSchedulerId)
				await unlinkSchedulerStub.revoke()
				await sendWhatsAppText({ env, waId, text: "Unlinked ✅" })
				return
			}
			default:
		}
	}
	const messageContext: MessageContext = {
		messageId,
		waId,
		userEmail: link.user.email,
		...link.user.preferences,
	}
	try {
		const contentParts: UserContentPart[] = []

		if (text) {
			contentParts.push({ type: "text", text })
		}

		if (media) {
			const fetched = await fetchWhatsAppMedia(env, media.id)
			const resolvedMedia: WhatsAppMedia = {
				...fetched,
				mimeType: fetched.mimeType ?? media.mimeType ?? null,
				filename: fetched.filename ?? media.filename ?? null,
			}
			appendMediaContent(contentParts, media.kind, resolvedMedia)
		}

		const content =
			contentParts.length === 1 && contentParts[0]?.type === "text"
				? contentParts[0].text
				: contentParts
		await sendTypingIndicator({ env, messageId })
		await stub.handleMessage(content, messageContext)
	} catch (error) {
		console.error("Error handling WhatsApp message", {
			waId,
			userId: link.user.id,
			messageId,
			text,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			errorName: error instanceof Error ? error.name : undefined,
		})
		await sendWhatsAppText({
			env,
			waId,
			text: "Something went wrong. Please try again.",
		})
		throw error
	}
	return
}
