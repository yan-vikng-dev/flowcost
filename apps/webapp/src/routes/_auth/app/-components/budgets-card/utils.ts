import type { DateTime } from "luxon"

export function formatNumber(n: number) {
	return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export function parseAmountInput(value: string, previous: number | "") {
	if (value === "") return ""
	const num = Number(value)
	return Number.isFinite(num) ? num : previous
}

export function getMonthProgress(now: DateTime) {
	const start = now.startOf("month")
	const end = start.plus({ months: 1 })
	const totalMs = end.diff(start, "milliseconds").milliseconds
	const elapsedMs = Math.min(
		totalMs,
		Math.max(0, now.diff(start, "milliseconds").milliseconds),
	)
	const percent = (elapsedMs / Math.max(1, totalMs)) * 100
	const day = now.day
	const days = Math.trunc(end.diff(start, "days").days)
	return { percent, day, days }
}
