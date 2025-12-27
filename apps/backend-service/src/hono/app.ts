import { Hono } from "hono"
import { z } from "zod"
import {
	handleIncomingMessage,
	verifyWhatsAppSignature,
} from "@/handlers/whatsapp"
import { NotificationPayloadSchema } from "@/handlers/whatsapp/types"

export const app = new Hono<{ Bindings: Env }>()

app.get("/health", (c) => {
	return c.text("Health")
})

app.get("/whatsapp/webhook", (c) => {
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
	} else {
		return c.text("Forbidden", 403)
	}
})

const notificationPayloadSchema = NotificationPayloadSchema

app.post("/whatsapp/webhook", async (c) => {
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
	const payload = notificationPayloadSchema.parse(json)
	const change = payload.entry[0]?.changes[0]
	const phoneNumberId = change?.value.metadata?.phone_number_id
	const msg = change?.value.messages?.[0]
	const waId = msg?.from
	const text = msg?.text?.body
	const messageId = msg?.id
	
	if (phoneNumberId && phoneNumberId !== c.env.WHATSAPP_PHONE_NUMBER_ID) {
		console.debug({
			message: "ignoring webhook for different phone number",
			receivedPhoneNumberId: phoneNumberId,
			expectedPhoneNumberId: c.env.WHATSAPP_PHONE_NUMBER_ID,
		})
		return c.text("OK")
	}
	
	if (!waId || !text || !messageId) {
		return c.text("OK")
	}
	console.debug({
		message: "whatsapp webhook raw json",
		json,
	})
	c.executionCtx.waitUntil(
		handleIncomingMessage(c.env, { waId, text, messageId }),
	)
	return c.text("OK")
})

const rescheduleReportsSchema = z.object({
	userId: z.string().min(1),
})

app.post("/reports/reschedule", async (c) => {
	let body: unknown
	try {
		body = await c.req.json()
	} catch {
		return c.text("Invalid JSON", 400)
	}

	const parsed = rescheduleReportsSchema.safeParse(body)
	if (!parsed.success) {
		return c.text("Invalid request body", 400)
	}

	const schedulerId = c.env.NOTIFICATION_SCHEDULER.idFromName(
		parsed.data.userId,
	)
	const schedulerStub = c.env.NOTIFICATION_SCHEDULER.get(schedulerId)
	c.executionCtx.waitUntil(schedulerStub.initialize(parsed.data.userId))
	return c.json({ ok: true })
})

const revokeReportsSchema = z.object({
	userId: z.string().min(1),
})

app.post("/reports/revoke", async (c) => {
	let body: unknown
	try {
		body = await c.req.json()
	} catch {
		return c.text("Invalid JSON", 400)
	}

	const parsed = revokeReportsSchema.safeParse(body)
	if (!parsed.success) {
		return c.text("Invalid request body", 400)
	}

	const schedulerId = c.env.NOTIFICATION_SCHEDULER.idFromName(
		parsed.data.userId,
	)
	const schedulerStub = c.env.NOTIFICATION_SCHEDULER.get(schedulerId)
	c.executionCtx.waitUntil(schedulerStub.revoke())
	return c.json({ ok: true })
})
