import {
	calculateBudgetsWithProgress,
	calculateFreeBudget,
	calculateMonthProgress,
	fetchBudgetsForUser,
	fetchConvertedEntriesForRange,
	getLatestExchangeRates,
} from "@repo/data-ops/drizzle/queries"
import { formatCurrency, getCurrentMonthRange } from "@repo/shared-lib"
import { DateTime } from "luxon"
import {
	aggregateCategoryTotals,
	formatProgressBar,
	getReportDateRange,
	REPORT_SEPARATOR,
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
		allowedUserIds,
		partnerId,
	})

	const latest = await getLatestExchangeRates(db)
	const budgetsList = await fetchBudgetsForUser(db, userId, true)
	const weeklyExpenseEntries = entriesResult.entries.filter(
		(entry) => entry.entryType === "Expense",
	)
	const categoryTotals = aggregateCategoryTotals(weeklyExpenseEntries)

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
		REPORT_SEPARATOR,
		`Weekly spending: ${formatCurrency(totalSpent, displayCurrency)}`,
	]

	const monthProgress = calculateMonthProgress(now)
	lines.push(
		`Month progress: ${monthProgress.day}/${monthProgress.days} days (${Math.round(monthProgress.percent)}%)`,
	)

	lines.push(REPORT_SEPARATOR)

	const freeBudget = calculateFreeBudget(
		monthlyEntriesResult.entries,
		budgetsWithProgress,
		displayCurrency,
	)

	lines.push("Budgets:")
	if (budgetsWithProgress.length === 0 && !freeBudget) {
		lines.push("  No budgets set.")
	} else {
		for (const budget of budgetsWithProgress) {
			const categoryNames = budget.categories.join(", ")
			const bar = formatProgressBar(budget.utilizationPct)
			lines.push(
				`• ${categoryNames}: ${formatCurrency(budget.spentDisplay, displayCurrency)} / ${formatCurrency(budget.amountDisplay, displayCurrency)}`,
			)
			lines.push(`  ${bar} ${Math.round(budget.utilizationPct)}%`)
		}

		if (freeBudget) {
			const bar = formatProgressBar(freeBudget.percent)
			lines.push(
				`• Free budget: ${formatCurrency(freeBudget.usage, displayCurrency)} / ${formatCurrency(freeBudget.cap, displayCurrency)}`,
			)
			lines.push(`  ${bar} ${Math.round(freeBudget.percent)}%`)
		}
	}

	lines.push(REPORT_SEPARATOR)

	const recurringEntriesThisWeek = entriesResult.entries.filter(
		(entry) => entry.recurringTemplateId,
	)
	lines.push("Recurring entries this week:")
	if (recurringEntriesThisWeek.length === 0) {
		lines.push("  None")
	} else {
		for (const entry of recurringEntriesThisWeek) {
			const dateLabel = entry.executedDate
				? DateTime.fromISO(entry.executedDate, { zone: timeZone }).toFormat(
						"LLL d",
					)
				: "Unknown date"
			const label = entry.description?.trim() || entry.category
			const sign = entry.entryType === "Income" ? "+" : "-"
			const amount = formatCurrency(
				Math.abs(entry.convertedAmount),
				displayCurrency,
			)
			lines.push(`• ${dateLabel} - ${label}: ${sign}${amount}`)
		}
	}

	return lines.join("\n")
}
