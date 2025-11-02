import { getDb } from "@repo/data-ops/database/setup"
import {
	getRecurringTemplates,
	parseRRULE,
} from "@repo/data-ops/drizzle/queries"
import { getUserTimezoneAndCurrency } from "@repo/data-ops/drizzle/queries/helpers"
import {
	entries,
	entryTypes,
	recurring_entry_templates,
} from "@repo/data-ops/drizzle/schemas/index"
import {
	categories,
	currencies,
	getStartOfDayInTimezone,
	toUtcMidnightInTimezone,
} from "@repo/shared-lib"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, gte } from "drizzle-orm"
import { DateTime } from "luxon"
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

		const { timezone } = await getUserTimezoneAndCurrency(
			db,
			ctx.context.userId,
		)

		// Normalize start/end using the user's timezone calendar day,
		// then convert to UTC-floating (midnight) to align with RRule expectations.
		const normalizedDtstart = toUtcMidnightInTimezone(dtstart, timezone)
		const normalizedEndAt = endAt
			? toUtcMidnightInTimezone(endAt, timezone)
			: undefined

		try {
			parseRRULE(rrule, normalizedDtstart, normalizedEndAt, timezone)
		} catch (error) {
			throw new Error(
				`Invalid RRULE: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
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
				})
			.returning({ id: recurring_entry_templates.id })

		return { id: result?.id }
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
		const { timezone } = await getUserTimezoneAndCurrency(
			db,
			ctx.context.userId,
		)
		const templates = await getRecurringTemplates(
			db,
			ctx.context.userId,
			ctx.data.includeInactive,
			timezone,
		)
		return templates
	})

export const stopRecurringTemplateInput = z.object({
	id: z.string().uuid(),
})

export type StopRecurringTemplateInput = z.infer<
	typeof stopRecurringTemplateInput
>

export const stopRecurringTemplate = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(stopRecurringTemplateInput)
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

		const { timezone } = await getUserTimezoneAndCurrency(
			db,
			ctx.context.userId,
		)
		const now = DateTime.now().setZone(timezone)
		const today = now.startOf("day").toJSDate()
		const tomorrow = now.plus({ days: 1 }).startOf("day").toJSDate()

		await db
			.update(recurring_entry_templates)
			.set({ endAt: today })
			.where(eq(recurring_entry_templates.id, id))

		await db
			.delete(entries)
			.where(
				and(
					eq(entries.recurringTemplateId, id),
					gte(entries.executedAt, tomorrow),
				),
			)

		return { success: true }
	})
