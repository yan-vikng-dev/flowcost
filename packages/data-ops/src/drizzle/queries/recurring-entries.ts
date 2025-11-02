import {
	getCurrentMonthRange,
	isoDateToUtcMidnight,
	toIsoDateInTimezone,
	toUtcMidnight,
} from "@repo/shared-lib"
import { and, desc, eq, gte, inArray, isNull, or } from "drizzle-orm"
import { DateTime } from "luxon"
import { RRule } from "rrule"
import type { DrizzleDb } from "../../database/setup"
import {
	entries,
	type InsertEntry,
	recurring_entry_templates,
	type SelectRecurringEntryTemplate,
} from "../schemas/index"

function normalizeDateForRRule(date: Date, tzid?: string): Date {
	if (!tzid) return date
	const zoned = DateTime.fromJSDate(date, { zone: tzid })
	return new Date(
		Date.UTC(
			zoned.year,
			zoned.month - 1,
			zoned.day,
			zoned.hour,
			zoned.minute,
			zoned.second,
			zoned.millisecond,
		),
	)
}

function normalizeUntilForRRule(until: Date, tzid?: string): Date {
	if (!tzid) return until
	const untilInTz = DateTime.fromJSDate(until, { zone: tzid })
	return new Date(
		Date.UTC(untilInTz.year, untilInTz.month - 1, untilInTz.day, 0, 0, 0, 0),
	)
}

export function parseRRULE(
	rruleString: string,
	dtstart: Date,
	until?: Date,
	tzid?: string,
): RRule {
	const options = RRule.parseString(`RRULE:${rruleString}`)
	options.dtstart = normalizeDateForRRule(dtstart, tzid)
	if (until) {
		options.until = normalizeUntilForRRule(until, tzid)
	}
	if (tzid) {
		options.tzid = tzid
	}
	return new RRule(options)
}

export function generateDatesFromRRULE(
	rrule: RRule,
	startDate: Date,
	endDate: Date,
): Date[] {
	return rrule.between(startDate, endDate, true)
}

export async function ensureRecurringEntriesMaterialized(
	db: DrizzleDb,
	userId: string,
	_start: Date,
	end: Date,
	timezone: string,
): Promise<void> {
	const { start: monthStart } = getCurrentMonthRange(timezone)
	const monthStartIso = DateTime.fromJSDate(monthStart, {
		zone: timezone,
	}).toISODate() as string
	const templates = await db
		.select()
		.from(recurring_entry_templates)
		.where(
			and(
				eq(recurring_entry_templates.userId, userId),
				or(
					isNull(recurring_entry_templates.endDate),
					gte(recurring_entry_templates.endDate, monthStartIso),
				),
			),
		)

	const targetHorizon = DateTime.fromJSDate(end, { zone: timezone })
		.endOf("month")
		.toJSDate()
	const targetHorizonIso = toIsoDateInTimezone(targetHorizon, timezone)

	for (const template of templates) {
		const validUntilDate = template.generationValidUntil
		if (validUntilDate < targetHorizonIso) {
			const generationStartDate = isoDateToUtcMidnight(validUntilDate)
			const templateStartDate = isoDateToUtcMidnight(template.dtstartDate)
			const effectiveStart = new Date(
				Math.max(generationStartDate.getTime(), templateStartDate.getTime()),
			)
			await materializeTemplateEntries(
				db,
				template,
				effectiveStart,
				targetHorizon,
				timezone,
			)
		}
	}
}

function toIsoDateString(date: Date, timezone: string): string {
	return DateTime.fromJSDate(date, { zone: timezone }).toISODate() as string
}

function computeGenerationHorizon(queryEnd: Date, timezone: string): Date {
	return DateTime.fromJSDate(queryEnd, { zone: timezone })
		.endOf("month")
		.toJSDate()
}

function computeQueryBounds(
	queryStart: Date,
	queryEnd: Date,
	template: SelectRecurringEntryTemplate,
): { start: Date; end: Date } {
	const templateStartDate = isoDateToUtcMidnight(template.dtstartDate)
	const normalizedStart = toUtcMidnight(queryStart)
	const effectiveStart = new Date(
		Math.max(normalizedStart.getTime(), templateStartDate.getTime()),
	)
	const normalizedEnd = toUtcMidnight(queryEnd)

	if (!template.endDate) {
		return { start: effectiveStart, end: normalizedEnd }
	}

	const cappedUntil = isoDateToUtcMidnight(template.endDate)
	const finalEnd = new Date(
		Math.min(cappedUntil.getTime(), normalizedEnd.getTime()),
	)
	return { start: effectiveStart, end: finalEnd }
}

function getTemplateDateBounds(template: SelectRecurringEntryTemplate): {
	start: Date
	until?: Date
} {
	const anchorStart = isoDateToUtcMidnight(template.dtstartDate)
	const untilDate = template.endDate
		? isoDateToUtcMidnight(template.endDate)
		: undefined
	return { start: anchorStart, until: untilDate }
}

function buildEntryFromTemplate(
	template: SelectRecurringEntryTemplate,
	_date: Date,
	dateStr: string,
): InsertEntry {
	return {
		amount: template.amount,
		currency: template.currency,
		category: template.category,
		entryType: template.entryType,
		description: template.description,
		executedDate: dateStr,
		recurringTemplateId: template.id,
		userId: template.userId,
		isOverridden: false,
	}
}

export async function materializeTemplateEntries(
	db: DrizzleDb,
	template: SelectRecurringEntryTemplate,
	queryStart: Date,
	queryEnd: Date,
	timezone: string,
): Promise<void> {
	const generateUntil = computeGenerationHorizon(queryEnd, timezone)
	const { start: normalizedStart, end: finalCappedUntil } = computeQueryBounds(
		queryStart,
		generateUntil,
		template,
	)
	const { start: anchorStart, until: untilDate } =
		getTemplateDateBounds(template)

	const rrule = parseRRULE(template.rrule, anchorStart, untilDate, timezone)
	const dates = generateDatesFromRRULE(rrule, normalizedStart, finalCappedUntil)

	if (dates.length === 0) {
		const generateUntilIso = toIsoDateInTimezone(generateUntil, timezone)
		await db
			.update(recurring_entry_templates)
			.set({ generationValidUntil: generateUntilIso })
			.where(eq(recurring_entry_templates.id, template.id))
		return
	}

	const desiredDateStrings = dates.map((d) => toIsoDateString(d, timezone))
	const existingDateStrings = new Set<string>()
	const QUERY_BATCH_SIZE = 50
	for (let i = 0; i < desiredDateStrings.length; i += QUERY_BATCH_SIZE) {
		const dateBatch = desiredDateStrings.slice(i, i + QUERY_BATCH_SIZE)
		const existingByDate = await db.query.entries.findMany({
			where: and(
				eq(entries.recurringTemplateId, template.id),
				inArray(entries.executedDate, dateBatch),
			),
			columns: { executedDate: true },
		})
		for (const entry of existingByDate) {
			existingDateStrings.add(entry.executedDate)
		}
	}

	const newRows: InsertEntry[] = dates
		.map((date) => ({
			date,
			dateStr: toIsoDateString(date, timezone),
		}))
		.filter(({ dateStr }) => !existingDateStrings.has(dateStr))
		.map(({ date, dateStr }) => buildEntryFromTemplate(template, date, dateStr))

	if (newRows.length > 0) {
		const BATCH_SIZE = 5
		for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
			const batch = newRows.slice(i, i + BATCH_SIZE)
			await db.insert(entries).values(batch)
		}
	}

	const generateUntilIso = toIsoDateInTimezone(generateUntil, timezone)
	await db
		.update(recurring_entry_templates)
		.set({ generationValidUntil: generateUntilIso })
		.where(eq(recurring_entry_templates.id, template.id))
}

function buildActiveTemplatesWhere(userId: string, timezone: string) {
	const baseWhere = eq(recurring_entry_templates.userId, userId)
	const { start: monthStart } = getCurrentMonthRange(timezone)
	const monthStartIso = DateTime.fromJSDate(monthStart, {
		zone: timezone,
	}).toISODate() as string

	return and(
		baseWhere,
		or(
			isNull(recurring_entry_templates.endDate),
			gte(recurring_entry_templates.endDate, monthStartIso),
		),
	)
}

export async function getRecurringTemplates(
	db: DrizzleDb,
	userId: string,
	includeInactive: boolean,
	timezone: string,
): Promise<SelectRecurringEntryTemplate[]> {
	const baseWhere = eq(recurring_entry_templates.userId, userId)
	const where = includeInactive
		? baseWhere
		: buildActiveTemplatesWhere(userId, timezone)

	return db
		.select()
		.from(recurring_entry_templates)
		.where(where)
		.orderBy(desc(recurring_entry_templates.createdAt))
}
