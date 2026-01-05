import type { DrizzleDb } from "@repo/db/database/setup"
import {
	calculateBudgetsWithProgress,
	calculateFreeBudget,
	fetchBudgetsForUser,
	fetchConvertedEntriesForRange,
	getLatestExchangeRates,
} from "@repo/db/drizzle/queries"
import { getAllowedUserIds } from "@repo/db/drizzle/queries/helpers"
import { getCurrentMonthRange } from "@repo/shared-lib"
import { tool } from "ai"
import { z } from "zod"
import type { MessageContext } from ".."

const getBudgetsSchema = z.object({})

export const makeGetBudgetsTool = (context: MessageContext, db: DrizzleDb) =>
	tool({
		description:
			"Get budgets with current-month progress and the free budget calculation. Use create_budget, update_budget, or delete_budget to modify budgets.",
		inputSchema: getBudgetsSchema,
		execute: async () => {
			const timezone = context.timezone
			const displayCurrency = context.displayCurrency
			const allowedUserIds = await getAllowedUserIds(db, context.userId, true)
			const { start, end } = getCurrentMonthRange(timezone)

			const [entriesResult, budgetsList, latest] = await Promise.all([
				fetchConvertedEntriesForRange(db, context.userId, {
					start,
					end,
					timezone,
					displayCurrency,
					allowedUserIds,
				}),
				fetchBudgetsForUser(db, context.userId, true),
				getLatestExchangeRates(db),
			])

			const expenseEntries = entriesResult.entries.filter(
				(entry) => entry.entryType === "Expense",
			)
			const budgetsWithProgress =
				budgetsList.length > 0
					? calculateBudgetsWithProgress(
							budgetsList,
							expenseEntries,
							displayCurrency,
							latest.rates,
						)
					: []

			const freeBudget = calculateFreeBudget(
				entriesResult.entries,
				budgetsWithProgress,
				displayCurrency,
			)

			return {
				displayCurrency,
				timezone,
				budgets: budgetsWithProgress,
				freeBudget,
			}
		},
	})
