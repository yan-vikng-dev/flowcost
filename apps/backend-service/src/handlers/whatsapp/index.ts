import { and, eq, isNull, gt } from "drizzle-orm";
import { getDb } from "@repo/data-ops/database/setup";
import { whatsapp_link_tokens } from "@repo/data-ops/drizzle/schemas/whatsapp_link_tokens";
import { whatsapp_links } from "@repo/data-ops/drizzle/schemas/whatsapp_links";
import { sendWhatsAppText } from "./helpers";
import { NotificationPayload } from "./types";

export async function sha256Hex(input: ArrayBuffer | string): Promise<string> {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

export async function verifyWhatsAppSignature(rawBody: ArrayBuffer, signatureHeader: string | null, appSecret: string): Promise<boolean> {
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
  const macHex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqualHex(macHex, expected);
}

export async function handleIncomingMessage(env: Env, payload: NotificationPayload) {
  const db = getDb();
  const msg = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const waId = msg?.from;
  const text = msg?.text?.body;
  const messageId = msg?.id;
  console.debug({
    message: "handling whatsapp webhook message",
    waId,
    text,
    messageId,
  });
  if (!waId || !text || !messageId) return;

  const tokenMatch = text.match(/^\/token\s*([A-Fa-f0-9]+)$/);
  if (tokenMatch) {
    const rawToken = tokenMatch[1];
    const tokenHash = await sha256Hex(rawToken);

    const now = new Date();
    const rows = await db.select().from(whatsapp_link_tokens).where(
      and(
        eq(whatsapp_link_tokens.tokenHash, tokenHash),
        gt(whatsapp_link_tokens.expiresAt, now),
        isNull(whatsapp_link_tokens.usedAt),
      ),
    );
    const token = rows[0];
    if (!token) {
      await sendWhatsAppText({ env, waId, text: "Token invalid or expired. Please retry linking from the web app." });
      return;
    }

    // Relink logic: if this waId belongs to another user, move it
    const existingByWa = await db.select().from(whatsapp_links).where(eq(whatsapp_links.waId, waId));
    if (existingByWa[0] && existingByWa[0].userId !== token.userId) {
      await sendWhatsAppText({ env, waId, text: "This number was linked to a different account. Relinking to your current account." });
    }

    await db.insert(whatsapp_links).values({
      userId: token.userId,
      waId,
    }).onConflictDoUpdate({
      target: whatsapp_links.waId,
      set: { userId: token.userId, updatedAt: new Date() },
    });

    // Mark token as used
    await db.update(whatsapp_link_tokens)
      .set({ usedAt: now, updatedAt: now })
      .where(eq(whatsapp_link_tokens.id, token.id));

    await sendWhatsAppText({ env, waId, text: "Linked ✅ You can now chat here." });
    return;
  }

  const link = (await db.select().from(whatsapp_links).where(eq(whatsapp_links.waId, waId)))[0];
  if (!link) {
    await sendWhatsAppText({ env, waId, text: "This number is not linked. In the web app, tap ‘Link to WhatsApp’." });
    return;
  }

  const id = env.AI_CONVERSATION_SERVER.idFromName(link.userId);
  const stub = env.AI_CONVERSATION_SERVER.get(id);
  const reply = await stub.handleMessage(text, { messageId, waId, userId: link.userId });
  if (reply) await sendWhatsAppText({ env, waId, text: reply });
  return;
}


