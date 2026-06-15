import { Hono } from "hono"
import { sendTypingIndicator, sendWhatsAppText } from "@/lib/whatsapp/messages"
import {
	NotificationPayloadSchema,
	shouldReplyForUnsupportedMedia,
} from "@/lib/whatsapp/types"
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
	const parsed = NotificationPayloadSchema.safeParse(json)
	if (!parsed.success) {
		// Returning non-2xx makes Meta retry the same unparseable payload.
		console.warn("Unrecognized WhatsApp webhook payload; acknowledging", {
			issues: parsed.error.issues,
		})
		return c.text("OK")
	}
	const {
		phoneNumberId,
		waId,
		text,
		messageId,
		messageType,
		messageKeys,
		media,
		sharedContact,
		buttonReply,
		buttonPayload,
		senderProfileName,
	} = parsed.data

	if (phoneNumberId && phoneNumberId !== c.env.WHATSAPP_PHONE_NUMBER_ID) {
		console.debug({
			message: "ignoring webhook for different phone number",
			receivedPhoneNumberId: phoneNumberId,
			expectedPhoneNumberId: c.env.WHATSAPP_PHONE_NUMBER_ID,
		})
		return c.text("OK")
	}

	const isRequestWelcome = messageType === "request_welcome"
	const hasRecognizedPayload =
		Boolean(text) ||
		Boolean(media) ||
		Boolean(sharedContact) ||
		Boolean(buttonReply) ||
		Boolean(buttonPayload) ||
		isRequestWelcome

	if (!waId || !messageId || !hasRecognizedPayload) {
		if (waId && messageId && messageType) {
			console.warn({
				message: "unhandled whatsapp webhook message",
				messageType,
				waId,
				messageId,
				messageKeys,
			})
			if (shouldReplyForUnsupportedMedia(messageType)) {
				c.executionCtx.waitUntil(sendTypingIndicator({ env: c.env, messageId }))
				c.executionCtx.waitUntil(
					sendWhatsAppText({
						env: c.env,
						waId,
						text: "Sorry, I can't read this media type. try a photo?",
						operation: "reply",
					}),
				)
			}
		}
		return c.text("OK")
	}
	c.executionCtx.waitUntil(
		handleIncomingMessage(c.env, {
			waId,
			text: text ?? undefined,
			messageId,
			requestWelcome: isRequestWelcome,
			senderProfileName,
			sharedContact: sharedContact ?? undefined,
			buttonReply: buttonReply ?? undefined,
			buttonPayload: buttonPayload ?? undefined,
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
