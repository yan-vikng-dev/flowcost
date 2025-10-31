import type { DrizzleDb } from "@repo/data-ops/database/setup"
import { fetchConvertedEntriesForRange } from "@repo/data-ops/drizzle/queries"
import { tool } from "ai"
import { DateTime } from "luxon"
import { z } from "zod"
import type { MessageContext } from "../AiConversationServer"

const getEntriesSchema = z.object({
	date: z
		.string()
		.optional()
		.describe("YYYY-MM-DD; defaults to today if omitted"),
})

export const makeGetEntriesTool = (context: MessageContext, db: DrizzleDb) =>
	tool({
		name: "get_entries",
		description:
			"Get the entries for the user for a given date, with a conversion to the user's preferred display currency",
		inputSchema: getEntriesSchema,
		execute: async (input) => {
			const inputDate = input.date ?? DateTime.now().toISODate()
			const { startDate, endDate } = getZonedDayRangeUtc(
				inputDate,
				context.userTimezone,
			)

			const result = await fetchConvertedEntriesForRange(db, context.userId, {
				start: startDate,
				end: endDate,
				timezone: context.userTimezone,
				displayCurrency: context.displayCurrency,
				sortBy: "executedAt",
				sortDir: "desc",
			})

			const safeEntries = result.entries.map((e) => ({
				id: e.id,
				amount: e.amount,
				currency: e.currency,
				category: e.category,
				entryType: e.entryType,
				description: e.description,
				executedAt: e.executedAt.toISOString(),
				convertedAmount: e.convertedAmount,
			}))

			return { entries: safeEntries, targetCurrency: context.displayCurrency }
		},
	})

function getZonedDayRangeUtc(
	dateStr: string,
	timeZone: string,
): { startDate: Date; endDate: Date } {
	const start = DateTime.fromISO(dateStr, { zone: timeZone }).startOf("day")
	const end = start.plus({ days: 1 })
	return {
		startDate: start.toJSDate(),
		endDate: end.toJSDate(),
	}
}
