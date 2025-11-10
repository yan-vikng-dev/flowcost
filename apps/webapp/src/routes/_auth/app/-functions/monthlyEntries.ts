import { getDb } from "@repo/data-ops/database/setup"
import { fetchConvertedEntriesForRange } from "@repo/data-ops/drizzle/queries"
import { getUserTimezoneAndCurrency } from "@repo/data-ops/drizzle/queries/helpers"
import type { Currency } from "@repo/shared-lib"
import { getCurrentMonthRange } from "@repo/shared-lib"
import { createServerFn } from "@tanstack/react-start"
import { DateTime } from "luxon"
import type { MonthlyEntry } from "@/core/functions/entries"
import { protectedFunctionMiddleware } from "@/core/middleware/auth"

export type MonthlyEntriesResult = {
	displayCurrency: Currency
	timezone: string
	monthLabel: string
	entries: MonthlyEntry[]
}

export const MONTHLY_ENTRIES_KEY = ["entries", "monthly"] as const

export const getMonthlyEntries = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx): Promise<MonthlyEntriesResult> => {
		const db = getDb()
		const { timezone, displayCurrency } = await getUserTimezoneAndCurrency(
			db,
			ctx.context.userId,
		)
		const { start, end } = getCurrentMonthRange(timezone)

		const result = await fetchConvertedEntriesForRange(db, ctx.context.userId, {
			start,
			end,
			timezone,
			displayCurrency,
			allowedUserIds: ctx.context.allowedUserIds,
			partnerId: ctx.context.partnerUserId,
		})

		const monthLabel = DateTime.fromJSDate(start, { zone: timezone }).toFormat(
			"LLLL yyyy",
		)

		return {
			displayCurrency,
			timezone,
			monthLabel,
			entries: result.entries,
		}
	})
