import { createServerFn } from "@tanstack/react-start"
import { protectedFunctionMiddleware } from "@/core/middleware/auth"

export const rescheduleReports = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx) => {
		const { env } = await import("cloudflare:workers")
		await fetch(`${env.BACKEND_URL}/reports/reschedule`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ userId: ctx.context.userId }),
		})
	})

export const revokeReports = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx) => {
		const { env } = await import("cloudflare:workers")
		await fetch(`${env.BACKEND_URL}/reports/revoke`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ userId: ctx.context.userId }),
		})
	})
