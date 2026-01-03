import { getDb } from "@repo/data-ops/database/setup"
import { getAllowedUserIds } from "@repo/data-ops/drizzle/queries/helpers"
import {
	user_preferences,
	whatsapp_links,
} from "@repo/data-ops/drizzle/schemas/index"
import { eq } from "drizzle-orm"
import { Hono } from "hono"
import { DateTime } from "luxon"
import { z } from "zod"
import {
	generateDailyReport,
	generateMonthlyReport,
	generateWeeklyReport,
} from "@/durable-objects/NotificationScheduler/reports"
import { sendWhatsAppText } from "@/lib/whatsapp/messages"

export const reportsRouter = new Hono<{ Bindings: Env }>()

const RescheduleReportsSchema = z.object({
	userId: z.string().min(1),
})

reportsRouter.post("/reports/reschedule", async (c) => {
	let body: unknown
	try {
		body = await c.req.json()
	} catch {
		return c.text("Invalid JSON", 400)
	}

	const parsed = RescheduleReportsSchema.safeParse(body)
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

reportsRouter.post("/reports/revoke", async (c) => {
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

const SendReportSchema = z.object({
	userId: z.string().min(1),
	type: z.enum(["daily", "weekly", "monthly"]).optional().default("monthly"),
})

reportsRouter.post("/reports/send", async (c) => {
	const devKey = c.req.header("x-dev-key")
	if (devKey !== c.env.WHATSAPP_WEBHOOK_SECRET) {
		return c.text("Forbidden", 403)
	}

	let body: unknown
	try {
		body = await c.req.json()
	} catch {
		return c.text("Invalid JSON", 400)
	}

	const parsed = SendReportSchema.safeParse(body)
	if (!parsed.success) {
		return c.text("Invalid request body", 400)
	}

	const db = getDb()
	const { userId, type } = parsed.data
	const prefs = await db.query.user_preferences.findFirst({
		where: eq(user_preferences.userId, userId),
	})

	if (!prefs) {
		return c.text("No preferences found", 404)
	}

	const whatsappLink = await db.query.whatsapp_links.findFirst({
		where: eq(whatsapp_links.userId, userId),
	})

	if (!whatsappLink) {
		return c.text("No WhatsApp link found", 404)
	}

	const now = DateTime.now().setZone(prefs.timezone)
	const allowedUserIds = await getAllowedUserIds(db, userId, true)
	const partnerId =
		allowedUserIds.length > 1
			? (allowedUserIds.find((id) => id !== userId) ?? null)
			: null
	const params = {
		db,
		userId,
		now,
		prefs: {
			timezone: prefs.timezone,
			displayCurrency: prefs.displayCurrency,
		},
		allowedUserIds,
		partnerId,
	}

	const report =
		type === "daily"
			? await generateDailyReport(params)
			: type === "weekly"
				? await generateWeeklyReport(params)
				: await generateMonthlyReport(params)

	if (!report) {
		return c.json({ ok: false, message: "No report generated" }, 200)
	}

	await sendWhatsAppText({
		env: c.env,
		waId: whatsappLink.waId,
		text: report,
	})

	const messageId = `report:${type}:${now.toISODate()}`
	const conversationId = c.env.AI_CONVERSATION_SERVER.idFromName(userId)
	const conversationStub = c.env.AI_CONVERSATION_SERVER.get(conversationId)
	await conversationStub.appendReport(messageId, report)

	return c.json({ ok: true })
})
