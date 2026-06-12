import type { DrizzleDb } from "@repo/db/database/setup"
import { fetchEntriesForRange } from "@repo/db/drizzle/queries"
import { getAllowedUserIds } from "@repo/db/drizzle/queries/helpers"
import { getZonedDayRange } from "@repo/shared-lib"
import { tool } from "ai"
import { DateTime } from "luxon"
import { z } from "zod"
import { convertEntries } from "@/lib/currency"
import type { MessageContext } from ".."

const getEntriesSchema = z.object({
	date: z
		.string()
		.optional()
		.describe("YYYY-MM-DD; defaults to today if omitted"),
})

export const makeGetEntriesTool = (
	context: MessageContext,
	db: DrizzleDb,
	env: Env,
) =>
	tool({
		description:
			"Get the expense entries for the user (and partner, if paired) for a given date, with amounts converted to the user's display currency. Each entry includes an ID field that can be used with update_entry or delete_entry.",
		inputSchema: getEntriesSchema,
		execute: async (input) => {
			const inputDate = input.date ?? DateTime.now().toISODate()
			const { start: startDate, end: endDate } = getZonedDayRange(
				inputDate,
				context.timezone,
			)
			const allowedUserIds = await getAllowedUserIds(db, context.userId)
			const rawEntries = await fetchEntriesForRange(db, {
				allowedUserIds,
				start: startDate,
				end: endDate,
				timezone: context.timezone,
				sortBy: "executedAt",
				sortDir: "desc",
			})
			const entries = await convertEntries(
				env,
				rawEntries,
				context.displayCurrency,
			)
			return { result: entries, targetCurrency: context.displayCurrency }
		},
	})
