import { type DrizzleDb, getDb } from "@repo/data-ops/database/setup"
import { user_preferences } from "@repo/data-ops/drizzle/schemas/index"
import { currencies, isValidTimeZone } from "@repo/shared-config"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { protectedFunctionMiddleware } from "@/core/middleware/auth"

export const getUserPreferences = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx) => {
		const db = getDb()
		let preferences = await db.query.user_preferences.findFirst({
			where: eq(user_preferences.userId, ctx.context.userId),
		})
		if (!preferences) {
			const req = getRequest()
			const cfTz = req.cf?.timezone as string | undefined
			const envTz = Intl.DateTimeFormat().resolvedOptions().timeZone
			const initialTz = cfTz || envTz || "UTC"
			;[preferences] = await db
				.insert(user_preferences)
				.values({ userId: ctx.context.userId, timezone: initialTz })
				.returning()
		}
		if (!preferences) throw new Error("Failed to get user preferences")
		return preferences
	})

export const updateUserPreferencesInput = z.object({
	defaultEntryCurrency: z.enum(currencies),
	displayCurrency: z.enum(currencies),
	timezone: z
		.string()
		.min(1)
		.refine((tz) => isValidTimeZone(tz), { message: "Invalid timezone" }),
	reportsDailyEnabled: z.boolean(),
	reportsWeeklyEnabled: z.boolean(),
	reportsMonthlyEnabled: z.boolean(),
	reportsTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
	reportsWeeklyDay: z.number().int().min(0).max(6),
})

export type UpdateUserPreferencesInput = z.infer<
	typeof updateUserPreferencesInput
>

export const updateUserPreferences = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(updateUserPreferencesInput)
	.handler(async (ctx) => {
		const db = getDb()
		const payload = ctx.data
		// Upsert logic
		const updateData = {
			defaultEntryCurrency: payload.defaultEntryCurrency,
			displayCurrency: payload.displayCurrency,
			timezone: payload.timezone,
			reportsDailyEnabled: payload.reportsDailyEnabled,
			reportsWeeklyEnabled: payload.reportsWeeklyEnabled,
			reportsMonthlyEnabled: payload.reportsMonthlyEnabled,
			reportsTime: payload.reportsTime,
			reportsWeeklyDay: payload.reportsWeeklyDay,
		}

		await db
			.insert(user_preferences)
			.values({
				userId: ctx.context.userId,
				...updateData,
			})
			.onConflictDoUpdate({
				target: user_preferences.userId,
				set: updateData,
			})
		return { ok: true } as const
	})

export const enableReportsForUser = async (
	db: DrizzleDb,
	userId: string,
): Promise<void> => {
	await db
		.insert(user_preferences)
		.values({
			userId,
			reportsDailyEnabled: true,
			reportsWeeklyEnabled: true,
			reportsMonthlyEnabled: true,
			reportsTime: "20:00",
			reportsWeeklyDay: 0,
		})
		.onConflictDoUpdate({
			target: user_preferences.userId,
			set: {
				reportsDailyEnabled: true,
				reportsWeeklyEnabled: true,
				reportsMonthlyEnabled: true,
				reportsTime: "20:00",
				reportsWeeklyDay: 0,
			},
		})
}
