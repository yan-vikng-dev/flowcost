import type { Category, Currency } from "@repo/shared-config"
import { DateTime } from "luxon"

export type ReportType = "daily" | "weekly" | "monthly"

export type ReportPreferences = {
	reportsMonthlyEnabled: boolean | null
	reportsWeeklyEnabled: boolean | null
	reportsDailyEnabled: boolean | null
	reportsWeeklyDay: number | null
	timezone: string
	displayCurrency: Currency
}

export function determineReportType(
	now: DateTime,
	prefs: ReportPreferences,
): ReportType | null {
	const isLastDayOfMonth = now.day === now.endOf("month").day
	const weeklyDay = prefs.reportsWeeklyDay ?? 0
	const dayOfWeek = now.weekday === 7 ? 0 : now.weekday

	if (isLastDayOfMonth && prefs.reportsMonthlyEnabled) {
		return "monthly"
	}
	if (dayOfWeek === weeklyDay && prefs.reportsWeeklyEnabled) {
		return "weekly"
	}
	if (prefs.reportsDailyEnabled) {
		return "daily"
	}
	return null
}

export function getReportDateRange(
	type: ReportType,
	now: DateTime,
): { start: DateTime; end: DateTime; title: string } {
	if (type === "daily") {
		const start = now.startOf("day")
		const end = start.plus({ days: 1 })
		return {
			start,
			end,
			title: `Daily Report - ${now.toFormat("LLL d")}`,
		}
	}

	if (type === "weekly") {
		let start = now.startOf("week")
		let end = start.plus({ weeks: 1 })
		const monthStart = now.startOf("month")
		const monthEnd = now.endOf("month")
		if (start < monthStart) start = monthStart
		if (end > monthEnd) end = monthEnd.plus({ days: 1 })
		return {
			start,
			end,
			title: `Weekly Report - ${start.toFormat("LLL d")}-${end.minus({ days: 1 }).toFormat("LLL d")}`,
		}
	}

	const start = now.startOf("month")
	const end = start.plus({ months: 1 })
	return {
		start,
		end,
		title: `Monthly Report - ${now.toFormat("LLLL yyyy")}`,
	}
}

export function formatProgressBar(percentage: number): string {
	const filled = Math.round((percentage / 100) * 10)
	const empty = 10 - filled
	return "■".repeat(filled) + "□".repeat(empty)
}

export function aggregateCategoryTotals(
	entries: Array<{ category: string; convertedAmount: number | null }>,
): Map<Category, number> {
	const categoryTotals = new Map<Category, number>()
	for (const entry of entries) {
		if (entry.convertedAmount !== null) {
			const current = categoryTotals.get(entry.category as Category) || 0
			categoryTotals.set(
				entry.category as Category,
				current + entry.convertedAmount,
			)
		}
	}
	return categoryTotals
}

export function findTopSpendingDay(
	entries: Array<{ executedAt: Date; convertedAmount: number | null }>,
	timeZone: string,
): { date: string; amount: number } | null {
	const dayTotals = new Map<string, number>()

	for (const entry of entries) {
		if (entry.convertedAmount === null) continue
		const isoDate = DateTime.fromJSDate(entry.executedAt, {
			zone: timeZone,
		}).toISODate()
		const dateKey = isoDate || ""
		if (!dateKey) continue
		const current = dayTotals.get(dateKey) || 0
		dayTotals.set(dateKey, current + entry.convertedAmount)
	}

	let topDay: { date: string; amount: number } | null = null
	for (const [date, amount] of dayTotals.entries()) {
		if (!topDay || amount > topDay.amount) {
			const dt = DateTime.fromISO(date, { zone: timeZone })
			topDay = {
				date: dt.toFormat("LLL d"),
				amount,
			}
		}
	}

	return topDay
}

export function findMostUsedCategory(
	entries: Array<{ category: string }>,
): { category: string; count: number } | null {
	const categoryCounts = new Map<string, number>()
	for (const entry of entries) {
		const current = categoryCounts.get(entry.category) || 0
		categoryCounts.set(entry.category, current + 1)
	}

	let topCategory: { category: string; count: number } | null = null
	for (const [category, count] of categoryCounts.entries()) {
		if (!topCategory || count > topCategory.count) {
			topCategory = { category, count }
		}
	}

	return topCategory
}
