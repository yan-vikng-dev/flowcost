import type { DrizzleDb } from "@repo/db/database/setup"
import { users } from "@repo/db/drizzle/schemas/index"
import { type Currency, currencies } from "@repo/shared-lib"
import { tool } from "ai"
import { eq } from "drizzle-orm"
import { z } from "zod"
import type { MessageContext } from ".."

const updatePreferencesSchema = z.object({
	timezone: z
		.string()
		.optional()
		.describe(
			"New timezone for the user in IANA format, for example Europe/Paris",
		),
	displayCurrency: z
		.string()
		.regex(/^[A-Z]{3}$/)
		.optional()
		.describe(
			"The currency used for reports and when fetching entries with get_entries",
		),
	defaultEntryCurrency: z
		.string()
		.regex(/^[A-Z]{3}$/)
		.optional()
		.describe("The default currency for new expense entries"),
	reportsTime: z
		.string()
		.regex(/^\d{2}:\d{2}$/)
		.optional()
		.describe("Local time for weekly and monthly reports, in HH:mm format"),
	reportsWeeklyDay: z
		.number()
		.int()
		.min(0)
		.max(6)
		.optional()
		.describe(
			"Day of week for weekly reports: 0 = Sunday through 6 = Saturday",
		),
})

export const makeUpdatePreferencesTool = (
	context: MessageContext,
	db: DrizzleDb,
	env: Env,
) =>
	tool({
		description:
			"Update the user's preferences. Any omitted properties will be left unchanged. Weekly and monthly reports are always enabled.",
		inputSchema: updatePreferencesSchema,
		execute: async (input) => {
			const displayCurrency =
				(input.displayCurrency as Currency | undefined) ??
				context.displayCurrency
			const defaultEntryCurrency =
				(input.defaultEntryCurrency as Currency | undefined) ??
				context.defaultEntryCurrency
			const timezone = input.timezone ?? context.timezone
			if (!currencies.includes(displayCurrency))
				throw new Error(`invalid currency provided ${displayCurrency}`)
			if (!currencies.includes(defaultEntryCurrency))
				throw new Error(`invalid currency provided ${defaultEntryCurrency}`)

			const existing = await db.query.users.findFirst({
				where: eq(users.id, context.userId),
			})
			if (!existing) throw new Error("User not found")

			const reportsTime = input.reportsTime ?? existing.reportsTime
			const reportsWeeklyDay =
				input.reportsWeeklyDay ?? existing.reportsWeeklyDay

			await db
				.update(users)
				.set({
					displayCurrency,
					defaultEntryCurrency,
					timezone,
					reportsTime,
					reportsWeeklyDay,
				})
				.where(eq(users.id, context.userId))

			const scheduleChanged =
				timezone !== existing.timezone ||
				reportsTime !== existing.reportsTime ||
				reportsWeeklyDay !== existing.reportsWeeklyDay

			if (scheduleChanged) {
				const schedulerId = env.NOTIFICATION_SCHEDULER.idFromName(
					context.userId,
				)
				const schedulerStub = env.NOTIFICATION_SCHEDULER.get(schedulerId)
				await schedulerStub.initialize(context.userId)
			}

			return {
				displayCurrency,
				defaultEntryCurrency,
				timezone,
				reportsTime,
				reportsWeeklyDay,
			}
		},
	})
