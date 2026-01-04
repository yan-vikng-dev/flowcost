import { getDb } from "@repo/db/database/setup"
import {
	calculateBudgetsWithProgress,
	fetchBudgetsForUser,
	fetchConvertedEntriesForRange,
	getLatestExchangeRates,
} from "@repo/db/drizzle/queries"
import { getUserTimezoneAndCurrency } from "@repo/db/drizzle/queries/helpers"
import { getCurrentMonthRange } from "@repo/shared-lib"
import { createServerFn } from "@tanstack/react-start"
import { DateTime } from "luxon"
import type { BudgetWithProgress } from "@/core/functions/budgets"
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
			}),
			fetchBudgetsForUser(db, ctx.context.userId),
			getLatestExchangeRates(db),
		])

		const entries: MonthlyEntriesResult = {
			displayCurrency,
			timezone,
			monthLabel: formatMonthLabel(start, timezone),
			entries: allEntriesResult.entries,
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
