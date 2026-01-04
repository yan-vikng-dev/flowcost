import { Hono } from "hono"
import { sendTypingIndicator, sendWhatsAppText } from "@/lib/whatsapp/messages"
import { NotificationPayloadSchema } from "@/lib/whatsapp/types"
import { verifyWhatsAppSignature } from "@/lib/whatsapp/verify-signature"
import { handleIncomingMessage } from "./handle-incoming-message"

export const whatsappRouter = new Hono<{ Bindings: Env }>()

whatsappRouter.get("/whatsapp/webhook", (c) => {
	const {
		"hub.mode": mode,
		"hub.challenge": challenge,
		"hub.verify_token": token,
	} = c.req.query()
	if (
		mode === "subscribe" &&
		token === c.env.WHATSAPP_WEBHOOK_SECRET &&
		challenge
	) {
		console.log("WEBHOOK VERIFIED")
		return c.text(challenge)
	}
	return c.text("Forbidden", 403)
})

whatsappRouter.post("/whatsapp/webhook", async (c) => {
	const signature = c.req.header("x-hub-signature-256") ?? null
	const raw = await c.req.raw.arrayBuffer()
	const ok = await verifyWhatsAppSignature(
		raw,
		signature,
		c.env.WHATSAPP_APP_SECRET,
	)
	if (!ok) {
		return c.text("invalid signature", 403)
	}
	let json: unknown
	try {
		json = JSON.parse(new TextDecoder().decode(raw))
	} catch {
		return c.text("invalid json", 400)
	}
	const { phoneNumberId, waId, text, messageId, messageType, media } =
		NotificationPayloadSchema.parse(json)

	if (phoneNumberId && phoneNumberId !== c.env.WHATSAPP_PHONE_NUMBER_ID) {
		console.debug({
			message: "ignoring webhook for different phone number",
			receivedPhoneNumberId: phoneNumberId,
			expectedPhoneNumberId: c.env.WHATSAPP_PHONE_NUMBER_ID,
		})
		return c.text("OK")
	}

	if (!waId || !messageId || (!text && !media)) {
		if (waId && messageId && messageType) {
			c.executionCtx.waitUntil(sendTypingIndicator({ env: c.env, messageId }))
			c.executionCtx.waitUntil(
				sendWhatsAppText({
					env: c.env,
					waId,
					text: "Sorry, I can't read this media type. try a photo?",
				}),
			)
		}
		return c.text("OK")
	}
	c.executionCtx.waitUntil(
		handleIncomingMessage(c.env, {
			waId,
			text: text ?? undefined,
			messageId,
			media: media
				? {
						kind: media.kind,
						id: media.id,
						mimeType: media.mime_type,
						filename: "filename" in media ? media.filename : undefined,
					}
				: undefined,
		}),
	)
	return c.text("OK")
})
