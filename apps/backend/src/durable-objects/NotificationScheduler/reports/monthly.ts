import { fetchEntriesForRange } from "@repo/db/drizzle/queries"
import { formatCurrency } from "@repo/shared-lib"
import { convertEntries } from "@/lib/currency"
import {
	aggregateCategoryTotals,
	aggregatePartnerTotals,
	calculateMonthProgress,
	findTopSpendingDay,
	formatProgressBar,
	getReportDateRange,
	REPORT_SEPARATOR,
} from "./helpers"
import type { ReportGeneratorParams } from "./types"

export async function generateMonthlyReport(
	params: ReportGeneratorParams,
): Promise<string | null> {
	const { env, db, userId, now, prefs, allowedUserIds, partnerId } = params
	const timeZone = prefs.timezone
	const displayCurrency = prefs.displayCurrency

	const { start, end } = getReportDateRange("monthly", now)
	const title = `Monthly report - ${now.toFormat("LLLL yyyy")}`
	const rawEntries = await fetchEntriesForRange(db, {
		allowedUserIds,
		start: start.toJSDate(),
		end: end.toJSDate(),
		timezone: timeZone,
	})
	const entries = await convertEntries(env, rawEntries, displayCurrency)

	const categoryTotals = aggregateCategoryTotals(entries)
	const totalSpent = Array.from(categoryTotals.values()).reduce(
		(sum, val) => sum + val,
		0,
	)

	const lines: string[] = [
		title,
		REPORT_SEPARATOR,
		`Total spending: ${formatCurrency(totalSpent, displayCurrency)}`,
	]

	const monthProgress = calculateMonthProgress(now)
	lines.push(
		`Month progress: ${monthProgress.day}/${monthProgress.days} days (${Math.round(monthProgress.percent)}%)`,
	)
	lines.push(formatProgressBar(monthProgress.percent))

	const partnerTotals = aggregatePartnerTotals(entries, userId, partnerId)
	if (partnerTotals) {
		lines.push(REPORT_SEPARATOR)
		lines.push("Shared spending:")
		lines.push(`• You: ${formatCurrency(partnerTotals.yours, displayCurrency)}`)
		lines.push(
			`• Partner: ${formatCurrency(partnerTotals.partner, displayCurrency)}`,
		)
	}

	lines.push(REPORT_SEPARATOR)
	lines.push("By category:")
	const categoriesWithSpending = Array.from(categoryTotals.entries())
		.sort((a, b) => b[1] - a[1])
		.filter(([, amount]) => amount > 0)

	if (categoriesWithSpending.length === 0) {
		lines.push("  None")
	} else {
		for (const [category, amount] of categoriesWithSpending) {
			lines.push(`• ${category}: ${formatCurrency(amount, displayCurrency)}`)
		}
	}

	const topDay = findTopSpendingDay(entries, timeZone)
	if (topDay) {
		lines.push(REPORT_SEPARATOR)
		lines.push(
			`Top spending day: ${topDay.date} (${formatCurrency(topDay.amount, displayCurrency)})`,
		)
	}

	return lines.join("\n")
}
