import {
	calculateBudgetsWithProgress,
	calculateRecurringExpenses,
	fetchBudgetsForUser,
	fetchConvertedEntriesForRange,
	getLatestExchangeRates,
} from "@repo/data-ops/drizzle/queries"
import { formatCurrency, getCurrentMonthRange } from "@repo/shared-lib"
import {
	formatProgressBar,
	getReportDateRange,
	REPORT_SEPARATOR,
} from "./helpers"
import type { ReportGeneratorParams } from "./types"

export async function generateMonthlyReport(
	params: ReportGeneratorParams,
): Promise<string | null> {
	const { db, userId, now, prefs, allowedUserIds, partnerId } = params
	const timeZone = prefs.timezone
	const displayCurrency = prefs.displayCurrency

	const { start, end } = getReportDateRange("monthly", now)
	const title = `Monthly report - ${now.toFormat("LLLL yyyy")}`
	const entriesResult = await fetchConvertedEntriesForRange(db, userId, {
		start: start.toJSDate(),
		end: end.toJSDate(),
		timezone: timeZone,
		displayCurrency,
		allowedUserIds,
		partnerId,
	})

	const latest = await getLatestExchangeRates(db)
	const budgetsList = await fetchBudgetsForUser(db, userId, true)

	const { start: monthStart, end: monthEnd } = getCurrentMonthRange(timeZone)
	const monthlyEntriesResult = await fetchConvertedEntriesForRange(db, userId, {
		start: monthStart,
		end: monthEnd,
		timezone: timeZone,
		displayCurrency,
		allowedUserIds,
		partnerId,
	})

	const expenseEntries = monthlyEntriesResult.entries.filter(
		(e) => e.entryType === "Expense",
	)
	const budgetsWithProgress = calculateBudgetsWithProgress(
		budgetsList,
		expenseEntries,
		displayCurrency,
		latest.rates,
	)

	const expenseEntriesForTotals = entriesResult.entries.filter(
		(entry) => entry.entryType === "Expense",
	)
	const incomeEntriesForTotals = entriesResult.entries.filter(
		(entry) => entry.entryType === "Income",
	)
	const totalSpent = expenseEntriesForTotals.reduce(
		(sum, entry) => sum + entry.convertedAmount,
		0,
	)
	const totalIncome = incomeEntriesForTotals.reduce(
		(sum, entry) => sum + entry.convertedAmount,
		0,
	)
	const netTotal = totalIncome - totalSpent

	const recurringExpenses = calculateRecurringExpenses(
		monthlyEntriesResult.entries,
		displayCurrency,
	)
	const lines: string[] = [title, REPORT_SEPARATOR]
	if (recurringExpenses) {
		lines.push(
			`Recurring expenses: ${formatCurrency(recurringExpenses.usage, displayCurrency)}`,
		)
	}
	lines.push(
		`Total spending: ${formatCurrency(totalSpent, displayCurrency)}`,
		`Total income: ${formatCurrency(totalIncome, displayCurrency)}`,
		`Net: ${formatCurrency(netTotal, displayCurrency)}`,
	)
	lines.push(REPORT_SEPARATOR)

	if (budgetsWithProgress.length > 0) {
		lines.push("Budgets:")
		for (const budget of budgetsWithProgress) {
			const categoryNames = budget.categories.join(", ")
			const bar = formatProgressBar(budget.utilizationPct)
			const warning = budget.utilizationPct >= 100 ? "⚠️ " : ""
			lines.push(
				`• ${warning}${categoryNames}: ${formatCurrency(budget.spentDisplay, displayCurrency)} / ${formatCurrency(budget.amountDisplay, displayCurrency)}`,
			)
			lines.push(`  ${bar} ${Math.round(budget.utilizationPct)}%`)
		}
	}

	return lines.join("\n")
}
