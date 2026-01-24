import { type DrizzleDb, getDb } from "@repo/db/database/setup"
import { user_preferences } from "@repo/db/drizzle/schemas/index"
import { currencies, isValidTimeZone } from "@repo/shared-lib"
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
	defaultEntryCurrency: z.enum(currencies).optional(),
	displayCurrency: z.enum(currencies).optional(),
	timezone: z
		.string()
		.min(1)
		.refine((tz) => isValidTimeZone(tz), { message: "Invalid timezone" })
		.optional(),
	reportsDailyEnabled: z.boolean().optional(),
	reportsWeeklyEnabled: z.boolean().optional(),
	reportsMonthlyEnabled: z.boolean().optional(),
	reportsTime: z
		.string()
		.regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
		.optional(),
	reportsWeeklyDay: z.number().int().min(0).max(6).optional(),
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

		const updateData = Object.fromEntries(
			Object.entries(payload).filter(([, value]) => value !== undefined),
		) as Partial<typeof user_preferences.$inferInsert>

		if (Object.keys(updateData).length === 0) {
			return { ok: true } as const
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

		const reportFields = [
			"reportsDailyEnabled",
			"reportsWeeklyEnabled",
			"reportsMonthlyEnabled",
			"reportsTime",
			"reportsWeeklyDay",
		] as const
		const reportFieldsChanged = reportFields.some(
			(field) => field in updateData,
		)

		if (reportFieldsChanged) {
			const current = await db.query.user_preferences.findFirst({
				where: eq(user_preferences.userId, ctx.context.userId),
			})
			const hasAnyReportEnabled =
				current?.reportsDailyEnabled ||
				current?.reportsWeeklyEnabled ||
				current?.reportsMonthlyEnabled

			if (hasAnyReportEnabled) {
				const mod = await import("./reports")
				await mod.rescheduleReports()
			}
		}

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
