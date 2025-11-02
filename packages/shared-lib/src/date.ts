import { DateTime } from "luxon"

export function toUtcMidnight(date: Date): Date {
	return DateTime.fromJSDate(date).startOf("day").toUTC().toJSDate()
}

// Creates a UTC-floating Date at midnight of the calendar day in the given timezone.
// This avoids JS local offset affecting the calendar components.
export function toUtcMidnightInTimezone(date: Date, timezone: string): Date {
	const zoned = DateTime.fromJSDate(date, { zone: timezone })
	return new Date(Date.UTC(zoned.year, zoned.month - 1, zoned.day, 0, 0, 0, 0))
}

export function getCurrentMonthRange(timezone: string): {
	start: Date
	end: Date
} {
	const now = DateTime.now().setZone(timezone)
	return {
		start: now.startOf("month").toJSDate(),
		end: now.plus({ months: 1 }).startOf("month").toJSDate(),
	}
}

export function getZonedDayRange(
	dateStr: string,
	timezone: string,
): { start: Date; end: Date } {
	const start = DateTime.fromISO(dateStr, { zone: timezone }).startOf("day")
	return {
		start: start.toJSDate(),
		end: start.plus({ days: 1 }).toJSDate(),
	}
}

export function getStartOfDayInTimezone(date: Date, timezone: string): Date {
	return DateTime.fromJSDate(date, { zone: timezone }).startOf("day").toJSDate()
}

// Returns ISO date string YYYY-MM-DD of the calendar day in tz
export function toIsoDateInTimezone(date: Date, timezone: string): string {
	const dt = DateTime.fromJSDate(date, { zone: timezone })
	return dt.toISODate() as string
}

// Given YYYY-MM-DD, return a UTC-floating Date at 00:00 for RRule compatibility
export function isoDateToUtcMidnight(dateStr: string): Date {
	const dt = DateTime.fromISO(dateStr, { zone: "utc" })
	return new Date(
		Date.UTC(dt.year, (dt.month ?? 1) - 1, dt.day ?? 1, 0, 0, 0, 0),
	)
}

// Month range as ISO strings [startDate, endDate)
export function getMonthRangeIso(
	timezone: string,
	base: Date = new Date(),
): { startDate: string; endDate: string } {
	const now = DateTime.fromJSDate(base, { zone: timezone })
	const start = now.startOf("month")
	const end = now.plus({ months: 1 }).startOf("month")
	return {
		startDate: start.toISODate() as string,
		endDate: end.toISODate() as string,
	}
}
