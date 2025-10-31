import { getDb } from "@repo/data-ops/database/setup"
import { fetchConvertedEntriesForRange } from "@repo/data-ops/drizzle/queries"
import {
	type SelectEntry,
	user_preferences,
} from "@repo/data-ops/drizzle/schemas/index"
import type { Currency } from "@repo/shared-config"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { DateTime } from "luxon"
import { protectedFunctionMiddleware } from "@/core/middleware/auth"

export type MonthlyEntryForCharts = Pick<
	SelectEntry,
	"id" | "amount" | "currency" | "category" | "entryType" | "executedAt"
> & {
	amountConverted: number // converted to displayCurrency
}

export type MonthlyEntriesResult = {
	displayCurrency: Currency
	timezone: string
	monthLabel: string // e.g., "October 2025" in user's TZ
	entries: MonthlyEntryForCharts[]
}

export const getMonthlyEntriesForCharts = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx): Promise<MonthlyEntriesResult> => {
		const db = getDb()

		const prefs = await db.query.user_preferences.findFirst({
			where: eq(user_preferences.userId, ctx.context.userId),
		})
		if (!prefs) throw new Error("User preferences not found")
		const displayCurrency = prefs.displayCurrency
		const timeZone = prefs.timezone || "UTC"

		const now = DateTime.now().setZone(timeZone)
		const start = now.startOf("month")
		const end = start.plus({ months: 1 })

		const result = await fetchConvertedEntriesForRange(db, ctx.context.userId, {
			start: start.toJSDate(),
			end: end.toJSDate(),
			timezone: timeZone,
			displayCurrency,
			sortBy: "executedAt",
			sortDir: "desc",
		})

		const enriched: MonthlyEntryForCharts[] = result.entries.map(
			(e): MonthlyEntryForCharts => ({
				id: e.id,
				amount: e.amount,
				currency: e.currency,
				category: e.category,
				entryType: e.entryType,
				executedAt: e.executedAt,
				amountConverted: e.convertedAmount ?? 0,
			}),
		)

		return {
			displayCurrency,
			timezone: timeZone,
			monthLabel: start.toFormat("LLLL yyyy"),
			entries: enriched,
		}
	})
