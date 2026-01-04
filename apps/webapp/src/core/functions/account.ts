import { getDb } from "@repo/db/database/setup"
import { auth_users } from "@repo/db/drizzle/schemas/index"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { protectedFunctionMiddleware } from "@/core/middleware/auth"

export const deleteCurrentUser = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx) => {
		try {
			const mod = await import("./reports")
			await mod.revokeReports()
		} catch {}

		const db = getDb()
		await db.delete(auth_users).where(eq(auth_users.id, ctx.context.userId))

		return { ok: true } as const
	})
