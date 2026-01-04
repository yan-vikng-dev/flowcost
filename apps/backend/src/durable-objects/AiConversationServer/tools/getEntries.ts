import type { DrizzleDb } from "@repo/db/database/setup"
import { fetchConvertedEntriesForRange } from "@repo/db/drizzle/queries"
import { getZonedDayRange } from "@repo/shared-lib"
import { tool } from "ai"
import { DateTime } from "luxon"
import { z } from "zod"
import type { MessageContext } from ".."

const getEntriesSchema = z.object({
	date: z
		.string()
		.optional()
		.describe("YYYY-MM-DD; defaults to today if omitted"),
})

export const makeGetEntriesTool = (context: MessageContext, db: DrizzleDb) =>
	tool({
		description:
			"Get the entries for the user for a given date, with a conversion to the user's preferred display currency. Each entry includes an ID field that can be used with update_entry or delete_entry to modify or remove entries.",
		inputSchema: getEntriesSchema,
		execute: async (input) => {
			const inputDate = input.date ?? DateTime.now().toISODate()
			const { start: startDate, end: endDate } = getZonedDayRange(
				inputDate,
				context.timezone,
			)

			const { entries } = await fetchConvertedEntriesForRange(
				db,
				context.userId,
				{
					start: startDate,
					end: endDate,
					timezone: context.timezone,
					displayCurrency: context.displayCurrency,
					sortBy: "executedAt",
					sortDir: "desc",
				},
			)
			return { result: entries, targetCurrency: context.displayCurrency }
		},
	})
