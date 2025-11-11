import {
	calculateBudgetsWithProgress,
	calculateFreeBudget,
	calculateMonthProgress,
	calculateRecurringExpenses,
	fetchBudgetsForUser,
	fetchConvertedEntriesForRange,
	getLatestExchangeRates,
} from "@repo/data-ops/drizzle/queries"
import { formatCurrency, getCurrentMonthRange } from "@repo/shared-lib"
import {
	aggregateCategoryTotals,
	findMostUsedCategory,
	findTopSpendingDay,
	formatProgressBar,
	getReportDateRange,
} from "./helpers"
import type { ReportGeneratorParams } from "./types"

export async function generateMonthlyReport(
	params: ReportGeneratorParams,
): Promise<string | null> {
	const { db, userId, now, prefs, allowedUserIds, partnerId } = params
	const timeZone = prefs.timezone
	const displayCurrency = prefs.displayCurrency

	const { start, end, title } = getReportDateRange("monthly", now)
	const entriesResult = await fetchConvertedEntriesForRange(db, userId, {
		start: start.toJSDate(),
		end: end.toJSDate(),
		timezone: timeZone,
		displayCurrency,
		entryType: "Expense",
		allowedUserIds,
		partnerId,
	})

	if (entriesResult.entries.length === 0) {
		return `${title}\n\nNo expenses recorded for this period.`
	}

	const latest = await getLatestExchangeRates(db)
	const budgetsList = await fetchBudgetsForUser(db, userId, true)
	const categoryTotals = aggregateCategoryTotals(entriesResult.entries)

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

	if (budgetsWithProgress.length > 0) {
		lines.push("")
		lines.push("Budgets:")
		for (const budget of budgetsWithProgress) {
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

	const monthProgress = calculateMonthProgress(now)
	lines.push("")
	lines.push("Month progress:")
	lines.push(
		`  ${monthProgress.day}/${monthProgress.days} days (${Math.round(monthProgress.percent)}%)`,
	)

	const recurringExpenses = calculateRecurringExpenses(
		monthlyEntriesResult.entries,
		displayCurrency,
	)
	if (recurringExpenses) {
		lines.push("")
		lines.push("Recurring expenses:")
		lines.push(`  ${formatCurrency(recurringExpenses.usage, displayCurrency)}`)
	}

	const freeBudget = calculateFreeBudget(
		monthlyEntriesResult.entries,
		budgetsWithProgress,
		displayCurrency,
	)
	if (freeBudget) {
		lines.push("")
		lines.push("Free budget:")
		const bar = formatProgressBar(freeBudget.percent)
		lines.push(
			`  ${formatCurrency(freeBudget.usage, displayCurrency)} / ${formatCurrency(freeBudget.cap, displayCurrency)}`,
		)
		lines.push(`  ${bar} ${Math.round(freeBudget.percent)}%`)
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
