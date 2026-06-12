import type { DrizzleDb } from "@repo/db/database/setup"
import { fetchEntriesForRange } from "@repo/db/drizzle/queries"
import { getAllowedUserIds } from "@repo/db/drizzle/queries/helpers"
import { getZonedDayRange } from "@repo/shared-lib"
import { tool } from "ai"
import { DateTime } from "luxon"
import { z } from "zod"
import { convertEntriesBestEffort } from "@/lib/currency"
import type { MessageContext } from ".."

const getEntriesSchema = z.object({
	startDate: z
		.string()
		.optional()
		.describe("YYYY-MM-DD; defaults to today if omitted"),
	endDate: z
		.string()
		.optional()
		.describe(
			"YYYY-MM-DD, inclusive; defaults to startDate (single day). Use with startDate for ranges like 'this week' or 'this month'.",
		),
})

export const makeGetEntriesTool = (
	context: MessageContext,
	db: DrizzleDb,
	env: Env,
) =>
	tool({
		description:
			"Get expense entries for the user (and partner, if paired) for a date or date range, with amounts converted to the user's display currency plus per-category totals and a grand total. Each entry includes an ID field that can be used with update_entry or delete_entry. A null convertedAmount means conversion is temporarily unavailable; report the original amount instead.",
		inputSchema: getEntriesSchema,
		execute: async (input) => {
			const startDate =
				input.startDate ?? DateTime.now().setZone(context.timezone).toISODate()
			if (!startDate) throw new Error("Failed to resolve start date")
			const endDate = input.endDate ?? startDate
			if (endDate < startDate)
				throw new Error("endDate must be on or after startDate")
			const { start } = getZonedDayRange(startDate, context.timezone)
			const { end } = getZonedDayRange(endDate, context.timezone)
			const allowedUserIds = await getAllowedUserIds(db, context.userId)
			const rawEntries = await fetchEntriesForRange(db, {
				allowedUserIds,
				start,
				end,
				timezone: context.timezone,
				sortBy: "executedAt",
				sortDir: "desc",
			})
			const { entries, unconvertedCount } = await convertEntriesBestEffort(
				env,
				rawEntries,
				context.displayCurrency,
			)

			const totalsByCategory: Record<string, number> = {}
			let total = 0
			for (const entry of entries) {
				if (entry.convertedAmount === null) continue
				totalsByCategory[entry.category] =
					(totalsByCategory[entry.category] ?? 0) + entry.convertedAmount
				total += entry.convertedAmount
			}

			return {
				result: entries,
				totals: { byCategory: totalsByCategory, total },
				targetCurrency: context.displayCurrency,
				...(unconvertedCount > 0 && {
					conversionNote: `${unconvertedCount} entries could not be converted to ${context.displayCurrency} right now; their convertedAmount is null and they are excluded from totals. Report their original amounts.`,
				}),
			}
		},
	})
