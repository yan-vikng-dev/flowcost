import { getCurrentMonthRange, toUtcMidnight } from "@repo/shared-lib"
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

export function parseRRULE(
	rruleString: string,
	dtstart: Date,
	until?: Date,
	tzid?: string,
): RRule {
	const options = RRule.parseString(`RRULE:${rruleString}`)

	// RRule expects UTC-floating dates (JS offsets ignored). When tzid is provided,
	// reconstruct dtstart as a UTC date using the calendar components in that tz.
	if (tzid) {
		const startInTz = DateTime.fromJSDate(dtstart, { zone: tzid })
		options.dtstart = new Date(
			Date.UTC(
				startInTz.year,
				startInTz.month - 1,
				startInTz.day,
				startInTz.hour,
				startInTz.minute,
				startInTz.second,
				startInTz.millisecond,
			),
		)
	} else {
		options.dtstart = dtstart
	}
	if (until) {
		if (tzid) {
			// Use the calendar day in tzid, then make a UTC-floating midnight
			const untilInTz = DateTime.fromJSDate(until, { zone: tzid })
			options.until = new Date(
				Date.UTC(untilInTz.year, untilInTz.month - 1, untilInTz.day, 0, 0, 0, 0),
			)
		} else {
			options.until = until
		}
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
	start: Date,
	end: Date,
	timezone: string,
): Promise<void> {
	const { start: monthStart } = getCurrentMonthRange(timezone)
	const templates = await db
		.select()
		.from(recurring_entry_templates)
		.where(
			and(
				eq(recurring_entry_templates.userId, userId),
				or(
					isNull(recurring_entry_templates.endAt),
					gte(recurring_entry_templates.endAt, monthStart),
				),
			),
		)

	const targetHorizon = DateTime.fromJSDate(end, { zone: timezone })
		.endOf("month")
		.toJSDate()

	for (const template of templates) {
		const validUntil = template.generationValidUntil
		if (validUntil < targetHorizon) {
			await materializeTemplateEntries(
				db,
				template,
				start,
				targetHorizon,
				timezone,
			)
		}
	}
}

export async function materializeTemplateEntries(
	db: DrizzleDb,
	template: SelectRecurringEntryTemplate,
	queryStart: Date,
	queryEnd: Date,
	timezone: string,
): Promise<void> {
	const generateUntil = DateTime.fromJSDate(queryEnd, { zone: timezone })
		.endOf("month")
		.toJSDate()

	const normalizedQueryStart = toUtcMidnight(queryStart)
	const normalizedQueryEnd = toUtcMidnight(generateUntil)
	const normalizedCappedUntil = template.endAt
		? toUtcMidnight(template.endAt)
		: normalizedQueryEnd
	const finalCappedUntil = template.endAt
		? new Date(
				Math.min(normalizedCappedUntil.getTime(), normalizedQueryEnd.getTime()),
			)
		: normalizedQueryEnd

	const rrule = parseRRULE(template.rrule, template.dtstart, undefined)

	const dates = generateDatesFromRRULE(
		rrule,
		normalizedQueryStart,
		finalCappedUntil,
	)

	if (dates.length === 0) {
		await db
			.update(recurring_entry_templates)
			.set({ generationValidUntil: generateUntil })
			.where(eq(recurring_entry_templates.id, template.id))
		return
	}

	const existingEntries = await db.query.entries.findMany({
		where: and(
			eq(entries.recurringTemplateId, template.id),
			inArray(entries.executedAt, dates),
		),
		columns: { executedAt: true },
	})

	const existingDates = new Set(
		existingEntries.map((e) => e.executedAt.getTime()),
	)

	const newRows: InsertEntry[] = dates
		.filter((date) => !existingDates.has(date.getTime()))
		.map((date) => ({
			amount: template.amount,
			currency: template.currency,
			category: template.category,
			entryType: template.entryType,
			description: template.description,
			executedAt: date,
			recurringTemplateId: template.id,
			userId: template.userId,
			isOverridden: false,
		}))

	if (newRows.length > 0) {
		await db.insert(entries).values(newRows)
	}

	await db
		.update(recurring_entry_templates)
		.set({ generationValidUntil: generateUntil })
		.where(eq(recurring_entry_templates.id, template.id))
}

export async function getRecurringTemplates(
	db: DrizzleDb,
	userId: string,
	includeInactive: boolean,
	timezone: string,
): Promise<SelectRecurringEntryTemplate[]> {
	const baseWhere = eq(recurring_entry_templates.userId, userId)

	if (includeInactive) {
		return db
			.select()
			.from(recurring_entry_templates)
			.where(baseWhere)
			.orderBy(desc(recurring_entry_templates.createdAt))
	}

	const { start: monthStart } = getCurrentMonthRange(timezone)
	return db
		.select()
		.from(recurring_entry_templates)
		.where(
			and(
				baseWhere,
				or(
					isNull(recurring_entry_templates.endAt),
					gte(recurring_entry_templates.endAt, monthStart),
				),
			),
		)
		.orderBy(desc(recurring_entry_templates.createdAt))
}
