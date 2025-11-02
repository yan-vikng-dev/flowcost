import { DateTime } from "luxon"

export type FrequencyUnit = "day" | "week" | "month" | "year"

export type MonthlyMode = { type: "byMonthDay" } | { type: "byWeekday" }

export type RecurrenceUi = {
	every: number
	unit: FrequencyUnit
	weeklyDays?: ("SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA")[]
	monthlyMode?: MonthlyMode
}

const freqMap: Record<FrequencyUnit, string> = {
	day: "DAILY",
	week: "WEEKLY",
	month: "MONTHLY",
	year: "YEARLY",
}

export function getWeekdayFromDate(
	date: Date,
): "SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA" {
	const dt = DateTime.fromJSDate(date)
	return dt.toFormat("ccc").toUpperCase().slice(0, 2) as
		| "SU"
		| "MO"
		| "TU"
		| "WE"
		| "TH"
		| "FR"
		| "SA"
}

export function getDefaultRecurrence(): RecurrenceUi {
	return {
		every: 1,
		unit: "month",
		monthlyMode: { type: "byMonthDay" },
	}
}

export function buildRRuleFromUi(
    dtstart: Date,
    ui: RecurrenceUi,
    timezone?: string,
): string {
	if (!ui || !ui.unit || !ui.every) {
		throw new Error("Recurrence UI object is incomplete")
	}
	const { every, unit } = ui
	// Use calendar components in the intended timezone (fallback to local)
	const dt = timezone
		? DateTime.fromJSDate(dtstart, { zone: timezone })
		: DateTime.fromJSDate(dtstart)
	const parts: string[] = []

	const freq = freqMap[unit]
	if (!freq) {
		throw new Error(`Invalid frequency unit: ${unit}`)
	}
	parts.push(`FREQ=${freq}`)
	if (every && every > 1) parts.push(`INTERVAL=${every}`)

	if (unit === "week" && ui.weeklyDays?.length) {
		parts.push(`BYDAY=${ui.weeklyDays.join(",")}`)
	}

	if (unit === "month") {
		if (ui.monthlyMode?.type === "byMonthDay") {
			parts.push(`BYMONTHDAY=${dt.day}`)
		} else if (ui.monthlyMode?.type === "byWeekday") {
			const weekday = dt.toFormat("ccc").toUpperCase().slice(0, 2)
			const weekOfMonth = Math.ceil(dt.day / 7)
			parts.push(`BYDAY=${weekday}`)
			parts.push(`BYSETPOS=${weekOfMonth}`)
		}
	}

	if (unit === "year") {
		parts.push(`BYMONTH=${dt.month}`)
		parts.push(`BYMONTHDAY=${dt.day}`)
	}

	return parts.join(";")
}
