import { getDb } from "@repo/data-ops/database/setup"
import {
	fetchBudgetsForUser,
	fetchConvertedEntriesForRange,
	getLatestExchangeRates,
} from "@repo/data-ops/drizzle/queries"
import { getUserTimezoneAndCurrency } from "@repo/data-ops/drizzle/queries/helpers"
import { getCurrentMonthRange } from "@repo/shared-lib"
import { createServerFn } from "@tanstack/react-start"
import { DateTime } from "luxon"
import { calculateBudgetsWithProgress } from "@/core/functions/budget-helpers"
import type { BudgetWithProgress } from "@/core/functions/budgets"
import { mapToMonthlyEntry } from "@/core/functions/entries"
import { protectedFunctionMiddleware } from "@/core/middleware/auth"
import type { MonthlyEntriesResult } from "./monthlyEntries"

export const MONTHLY_DASHBOARD_DATA_KEY = ["dashboard", "monthly"] as const

export type MonthlyDashboardData = {
	entries: MonthlyEntriesResult
	budgets: BudgetWithProgress[]
}

function formatMonthLabel(start: Date, timezone: string): string {
	return DateTime.fromJSDate(start, { zone: timezone }).toFormat("LLLL yyyy")
}

export const getMonthlyDashboardData = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx): Promise<MonthlyDashboardData> => {
		const db = getDb()
		const { timezone, displayCurrency } = await getUserTimezoneAndCurrency(
			db,
			ctx.context.userId,
		)
		const { start, end } = getCurrentMonthRange(timezone)

		const [allEntriesResult, budgetsList, latest] = await Promise.all([
			fetchConvertedEntriesForRange(db, ctx.context.userId, {
				start,
				end,
				timezone,
				displayCurrency,
				allowedUserIds: ctx.context.allowedUserIds,
				partnerId: ctx.context.partnerUserId,
				caller: "getMonthlyDashboardData",
			}),
			fetchBudgetsForUser(db, ctx.context.userId),
			getLatestExchangeRates(db, "getMonthlyDashboardData"),
		])

		const entries: MonthlyEntriesResult = {
			displayCurrency,
			timezone,
			monthLabel: formatMonthLabel(start, timezone),
			entries: allEntriesResult.entries.map(mapToMonthlyEntry),
		}

		const expenseEntries = allEntriesResult.entries.filter(
			(e) => e.entryType === "Expense",
		)
		const budgets =
			budgetsList.length > 0
				? calculateBudgetsWithProgress(
						budgetsList,
						expenseEntries,
						displayCurrency,
						latest.rates,
					)
				: []

		return { entries, budgets }
	})
