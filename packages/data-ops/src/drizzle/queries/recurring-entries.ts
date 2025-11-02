import { toUtcMidnight } from "@repo/shared-lib"
import { and, desc, eq, inArray } from "drizzle-orm"
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
	options.dtstart = dtstart
	if (until) {
		options.until = until
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
	const templates = await db.query.recurring_entry_templates.findMany({
		where: and(
			eq(recurring_entry_templates.userId, userId),
			eq(recurring_entry_templates.isActive, true),
		),
	})

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
	includeInactive = false,
): Promise<SelectRecurringEntryTemplate[]> {
	return db.query.recurring_entry_templates.findMany({
		where: includeInactive
			? eq(recurring_entry_templates.userId, userId)
			: and(
					eq(recurring_entry_templates.userId, userId),
					eq(recurring_entry_templates.isActive, true),
				),
		orderBy: desc(recurring_entry_templates.createdAt),
	})
}
