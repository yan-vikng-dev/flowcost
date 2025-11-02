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
