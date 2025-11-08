import { fetchConvertedEntriesForRange } from "@repo/data-ops/drizzle/queries"
import { formatCurrency } from "@repo/shared-lib"
import { aggregateCategoryTotals, getReportDateRange } from "./helpers"
import type { ReportGeneratorParams } from "./types"

export async function generateDailyReport(
	params: ReportGeneratorParams,
): Promise<string | null> {
	const { db, userId, now, prefs } = params
	const timeZone = prefs.timezone
	const displayCurrency = prefs.displayCurrency

	const { start, end, title } = getReportDateRange("daily", now)
	const entriesResult = await fetchConvertedEntriesForRange(db, userId, {
		start: start.toJSDate(),
		end: end.toJSDate(),
		timezone: timeZone,
		displayCurrency,
		entryType: "Expense",
		caller: "generateDailyReport",
	})

	if (entriesResult.entries.length === 0) {
		return `${title}\n\nNo expenses recorded for this period.`
	}

	const categoryTotals = aggregateCategoryTotals(entriesResult.entries)
	const totalSpent = Array.from(categoryTotals.values()).reduce(
		(sum, val) => sum + val,
		0,
	)

	const lines: string[] = [title, "", "Today's spending:"]

	const categoriesWithSpending = Array.from(categoryTotals.entries())
		.sort((a, b) => b[1] - a[1])
		.filter(([, amount]) => amount > 0)

	for (const [category, amount] of categoriesWithSpending) {
		lines.push(`• ${category}: ${formatCurrency(amount, displayCurrency)}`)
	}

	lines.push("━━━━━━━━━━━━━━━")
	lines.push(`Total: ${formatCurrency(totalSpent, displayCurrency)}`)

	return lines.join("\n")
}
