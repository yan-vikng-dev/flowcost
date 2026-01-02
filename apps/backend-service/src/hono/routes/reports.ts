import { Hono } from "hono"
import { z } from "zod"

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
