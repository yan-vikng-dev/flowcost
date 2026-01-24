import { getDb } from "@repo/db/database/setup"
import { auth_users } from "@repo/db/drizzle/schemas/index"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { protectedFunctionMiddleware } from "@/core/middleware/auth"

export const getCurrentUserMeta = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx) => {
		const db = getDb()
		const user = await db.query.auth_users.findFirst({
			columns: { createdAt: true },
			where: eq(auth_users.id, ctx.context.userId),
		})

		if (!user) return null

		return { createdAt: user.createdAt.valueOf() } as const
	})
