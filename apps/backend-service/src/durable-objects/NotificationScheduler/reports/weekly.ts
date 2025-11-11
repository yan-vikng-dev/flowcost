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
	formatProgressBar,
	getReportDateRange,
} from "./helpers"
import type { ReportGeneratorParams } from "./types"

export async function generateWeeklyReport(
	params: ReportGeneratorParams,
): Promise<string | null> {
	const { db, userId, now, prefs, allowedUserIds, partnerId } = params
	const timeZone = prefs.timezone
	const displayCurrency = prefs.displayCurrency

	const { start, end, title } = getReportDateRange("weekly", now)
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

	const lines: string[] = [title, "", "This week's spending:"]

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

	const previousWeekStart = start.minus({ weeks: 1 })
	const previousWeekEnd = start
	const previousWeekResult = await fetchConvertedEntriesForRange(db, userId, {
		start: previousWeekStart.toJSDate(),
		end: previousWeekEnd.toJSDate(),
		timezone: timeZone,
		displayCurrency,
		entryType: "Expense",
		allowedUserIds,
		partnerId,
	})

	const previousWeekTotal = previousWeekResult.entries.reduce(
		(sum, entry) => sum + entry.convertedAmount,
		0,
	)

	const diff = totalSpent - previousWeekTotal
	const sign = diff >= 0 ? "+" : ""
	lines.push(`vs Last week: ${sign}${formatCurrency(diff, displayCurrency)}`)

	return lines.join("\n")
}
