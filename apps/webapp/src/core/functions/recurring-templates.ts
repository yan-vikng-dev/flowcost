import { getDb } from "@repo/data-ops/database/setup"
import {
	getRecurringTemplates,
	parseRRULE,
} from "@repo/data-ops/drizzle/queries"
import { getUserTimezoneAndCurrency } from "@repo/data-ops/drizzle/queries/helpers"
import {
	entries,
	entryTypes,
	type InsertEntry,
	recurring_entry_templates,
} from "@repo/data-ops/drizzle/schemas/index"
import {
	categories,
	currencies,
	getCurrentMonthRange,
	getStartOfDayInTimezone,
	toUtcMidnight,
} from "@repo/shared-lib"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, gte, lt } from "drizzle-orm"
import { z } from "zod"
import { protectedFunctionMiddleware } from "@/core/middleware/auth"

export const createRecurringTemplateInput = z.object({
	amount: z.number().gt(0),
	currency: z.enum(currencies),
	category: z.enum(categories),
	entryType: z.enum(entryTypes),
	description: z.string().optional(),
	rrule: z
		.string()
		.describe("RRULE string (RFC 5545) without DTSTART/UNTIL/COUNT"),
	dtstart: z.date().describe("When recurrence begins"),
	endAt: z.date().optional().describe("Optional app-level end bound"),
})

export type CreateRecurringTemplateInput = z.infer<
	typeof createRecurringTemplateInput
>

export const createRecurringTemplate = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(createRecurringTemplateInput)
	.handler(async (ctx) => {
		const db = getDb()
		const { rrule, dtstart, endAt, ...entryFields } = ctx.data

		const normalizedDtstart = toUtcMidnight(dtstart)
		const normalizedEndAt = endAt ? toUtcMidnight(endAt) : undefined

		try {
			parseRRULE(rrule, normalizedDtstart)
		} catch (error) {
			throw new Error(
				`Invalid RRULE: ${error instanceof Error ? error.message : String(error)}`,
			)
		}

		const { timezone } = await getUserTimezoneAndCurrency(
			db,
			ctx.context.userId,
		)
		const generationValidUntil = getStartOfDayInTimezone(new Date(), timezone)

		const [result] = await db
			.insert(recurring_entry_templates)
			.values({
				...entryFields,
				rrule,
				dtstart: normalizedDtstart,
				endAt: normalizedEndAt,
				generationValidUntil,
				userId: ctx.context.userId,
				isActive: true,
			})
			.returning({ id: recurring_entry_templates.id })

		return { id: result?.id }
	})

export const updateRecurringTemplateInput = z.object({
	id: z.string().uuid(),
	amount: z.number().gt(0).optional(),
	currency: z.enum(currencies).optional(),
	category: z.enum(categories).optional(),
	entryType: z.enum(entryTypes).optional(),
	description: z.string().optional(),
	isActive: z.boolean().optional(),
})

export type UpdateRecurringTemplateInput = z.infer<
	typeof updateRecurringTemplateInput
>

export const updateRecurringTemplate = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(updateRecurringTemplateInput)
	.handler(async (ctx) => {
		const db = getDb()
		const { id, ...updates } = ctx.data

		const template = await db.query.recurring_entry_templates.findFirst({
			where: and(
				eq(recurring_entry_templates.id, id),
				eq(recurring_entry_templates.userId, ctx.context.userId),
			),
		})

		if (!template) {
			throw new Error("Template not found")
		}

		await db
			.update(recurring_entry_templates)
			.set(updates)
			.where(eq(recurring_entry_templates.id, id))

		const { timezone } = await getUserTimezoneAndCurrency(
			db,
			ctx.context.userId,
		)
		const { start: monthStart, end: monthEnd } = getCurrentMonthRange(timezone)
		const now = getStartOfDayInTimezone(new Date(), timezone)

		const entryFields: (keyof typeof updates)[] = [
			"amount",
			"currency",
			"category",
			"entryType",
			"description",
		]
		const patch: Partial<InsertEntry> = Object.fromEntries(
			entryFields
				.filter((field) => updates[field] !== undefined)
				.map((field) => [field, updates[field]]),
		)

		if (Object.keys(patch).length > 0) {
			await db
				.update(entries)
				.set(patch)
				.where(
					and(
						eq(entries.recurringTemplateId, id),
						eq(entries.isOverridden, false),
						gte(entries.executedAt, monthStart),
						lt(entries.executedAt, monthEnd),
					),
				)
		}

		if (updates.isActive === false) {
			await db
				.delete(entries)
				.where(
					and(
						eq(entries.recurringTemplateId, id),
						gte(entries.executedAt, now),
					),
				)
		}

		return { success: true }
	})

export const deleteRecurringTemplateInput = z.object({
	id: z.string().uuid(),
})

export type DeleteRecurringTemplateInput = z.infer<
	typeof deleteRecurringTemplateInput
>

export const deleteRecurringTemplate = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(deleteRecurringTemplateInput)
	.handler(async (ctx) => {
		const db = getDb()
		const { id } = ctx.data

		const template = await db.query.recurring_entry_templates.findFirst({
			where: and(
				eq(recurring_entry_templates.id, id),
				eq(recurring_entry_templates.userId, ctx.context.userId),
			),
		})

		if (!template) {
			throw new Error("Template not found")
		}

		await db
			.delete(recurring_entry_templates)
			.where(eq(recurring_entry_templates.id, id))

		return { success: true }
	})

export const listRecurringTemplatesInput = z.object({
	includeInactive: z.boolean().optional().default(false),
})

export type ListRecurringTemplatesInput = z.infer<
	typeof listRecurringTemplatesInput
>

export const listRecurringTemplates = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.inputValidator(listRecurringTemplatesInput)
	.handler(async (ctx) => {
		const db = getDb()
		const templates = await getRecurringTemplates(
			db,
			ctx.context.userId,
			ctx.data.includeInactive,
		)
		return templates
	})
