import {
	fetchBudgetsForUser,
	fetchConvertedEntriesForRange,
	fetchExchangeRatesForDates,
} from "@repo/data-ops/drizzle/queries"
import { formatCurrency, getCurrentMonthRange } from "@repo/shared-lib"
import {
	aggregateCategoryTotals,
	calculateBudgetProgressForBudgets,
	findMostUsedCategory,
	findTopSpendingDay,
	formatProgressBar,
	getReportDateRange,
} from "./helpers"
import type { ReportGeneratorParams } from "./types"

export async function generateMonthlyReport(
	params: ReportGeneratorParams,
): Promise<string | null> {
	const { db, userId, now, prefs } = params
	const timeZone = prefs.timezone
	const displayCurrency = prefs.displayCurrency

	const { start, end, title } = getReportDateRange("monthly", now)
	const entriesResult = await fetchConvertedEntriesForRange(db, userId, {
		start: start.toJSDate(),
		end: end.toJSDate(),
		timezone: timeZone,
		displayCurrency,
		entryType: "Expense",
	})

	if (entriesResult.entries.length === 0) {
		return `${title}\n\nNo expenses recorded for this period.`
	}

	const { latest } = await fetchExchangeRatesForDates(db, [])
	const budgetsList = await fetchBudgetsForUser(db, userId)
	const categoryTotals = aggregateCategoryTotals(entriesResult.entries)

	const { start: monthStart, end: monthEnd } = getCurrentMonthRange(timeZone)
	const monthlyEntriesResult = await fetchConvertedEntriesForRange(db, userId, {
		start: monthStart,
		end: monthEnd,
		timezone: timeZone,
		displayCurrency,
		entryType: "Expense",
	})

	const budgetProgressList = calculateBudgetProgressForBudgets(
		budgetsList,
		monthlyEntriesResult.entries,
		latest.rates,
		displayCurrency,
	)

	const totalSpent = Array.from(categoryTotals.values()).reduce(
		(sum, val) => sum + val,
		0,
	)

	const lines: string[] = [
		title,
		"",
		`Total spending: ${formatCurrency(totalSpent, displayCurrency)}`,
		"",
		"By category:",
	]

	const categoriesWithSpending = Array.from(categoryTotals.entries())
		.sort((a, b) => b[1] - a[1])
		.filter(([, amount]) => amount > 0)

	for (const [category, amount] of categoriesWithSpending) {
		lines.push(`• ${category}: ${formatCurrency(amount, displayCurrency)}`)
	}

	lines.push("━━━━━━━━━━━━━━━")
	lines.push(`Total: ${formatCurrency(totalSpent, displayCurrency)}`)

	if (budgetProgressList.length > 0) {
		lines.push("")
		lines.push("Budgets:")
		for (const budget of budgetProgressList) {
			const categoryNames = budget.categories.join(", ")
			const bar = formatProgressBar(budget.utilizationPct)
			lines.push(
				`• ${categoryNames}: ${formatCurrency(budget.spentDisplay, displayCurrency)} / ${formatCurrency(budget.amountDisplay, displayCurrency)}`,
			)
			lines.push(`  ${bar} ${Math.round(budget.utilizationPct)}%`)
			if (budget.utilizationPct >= 100) {
				lines.push("  ⚠️ Over budget")
			}
		}
	}

	const topSpendingDay = findTopSpendingDay(entriesResult.entries, timeZone)
	if (topSpendingDay) {
		lines.push("")
		lines.push(
			`Top spending day: ${topSpendingDay.date} (${formatCurrency(topSpendingDay.amount, displayCurrency)})`,
		)
	}

	const mostUsedCategory = findMostUsedCategory(entriesResult.entries)
	if (mostUsedCategory) {
		lines.push(
			`Most used category: ${mostUsedCategory.category} (${mostUsedCategory.count} transactions)`,
		)
	}

	return lines.join("\n")
}
