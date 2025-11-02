import { getDb } from "@repo/data-ops/database/setup"
import {
	fetchConvertedEntriesForRange,
	getEntryForUser,
} from "@repo/data-ops/drizzle/queries"
import {
	getAllowedUserIds,
	getUserTimezoneAndCurrency,
} from "@repo/data-ops/drizzle/queries/helpers"
import {
	entries,
	entryTypes,
	type InsertEntry,
	type SelectEntry,
} from "@repo/data-ops/drizzle/schemas/index"
import { categories, currencies, getCurrentMonthRange } from "@repo/shared-lib"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"
import { protectedFunctionMiddleware } from "@/core/middleware/auth"

export const createEntryInput = z.object({
	entryType: z.enum(entryTypes),
	amount: z.number().gt(0),
	currency: z.enum(currencies),
	category: z.enum(categories),
	description: z.string().optional(),
	executedAt: z.date().default(new Date()),
})

export type CreateEntryInput = z.infer<typeof createEntryInput>

export const createEntry = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(createEntryInput)
	.handler(async (ctx) => {
		const db = getDb()
		const [result] = await db
			.insert(entries)
			.values({
				amount: ctx.data.amount,
				currency: ctx.data.currency,
				category: ctx.data.category,
				entryType: ctx.data.entryType,
				description: ctx.data.description,
				executedAt: ctx.data.executedAt,
				userId: ctx.context.userId,
			})
			.returning({ id: entries.id })

		return { id: result?.id }
	})

export const updateEntryInput = z.object({
	id: z.uuid(),
	amount: z.number().gt(0).optional(),
	currency: z.enum(currencies).optional(),
	category: z.enum(categories).optional(),
	entryType: z.enum(entryTypes).optional(),
	description: z.string().optional(),
	executedAt: z.date().optional(),
})

export type UpdateEntryInput = z.infer<typeof updateEntryInput>

export const updateEntry = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(updateEntryInput)
	.handler(async (ctx) => {
		const db = getDb()
		const { id, ...updates } = ctx.data

		const row = await getEntryForUser(db, id, ctx.context.userId)

		if (!row) {
			throw new Error("Entry not found")
		}

		const patch: Partial<InsertEntry> = { ...updates }

		if (row.recurringTemplateId) {
			patch.isOverridden = true
		}

		await db.update(entries).set(patch).where(eq(entries.id, id))

		return { success: true }
	})

export const deleteEntriesInput = z.object({
	ids: z.array(z.string()).min(1),
})

export type DeleteEntriesInput = z.infer<typeof deleteEntriesInput>

export const deleteEntries = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(deleteEntriesInput)
	.handler(async (ctx) => {
		const db = getDb()
		const ids = ctx.data.ids
		const allowedUserIds = await getAllowedUserIds(db, ctx.context.userId)

		await db
			.delete(entries)
			.where(
				and(inArray(entries.userId, allowedUserIds), inArray(entries.id, ids)),
			)

		return { deleted: ids.length }
	})

export type MonthlyEntry = SelectEntry & {
	amountIls: number | null
}

function mapToMonthlyEntry(
	entry: SelectEntry & { convertedAmount: number | null },
): MonthlyEntry {
	return {
		...entry,
		amountIls: entry.convertedAmount,
	}
}

export const listEntriesThisMonth = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx) => {
		const db = getDb()
		const { timezone, displayCurrency } = await getUserTimezoneAndCurrency(
			db,
			ctx.context.userId,
		)
		const { start, end } = getCurrentMonthRange(timezone)

		const result = await fetchConvertedEntriesForRange(db, ctx.context.userId, {
			start,
			end,
			timezone,
			displayCurrency,
			sortBy: "executedAt",
			sortDir: "desc",
		})

		return result.entries.map(mapToMonthlyEntry)
	})

export const listEntriesThisMonthPaginatedInput = z.object({
	page: z.number().int().min(0).default(0),
	pageSize: z.number().int().min(1).max(100).default(10),
	sortBy: z
		.enum(["executedAt", "amount", "category", "entryType"])
		.optional()
		.default("executedAt"),
	sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
})

export type ListEntriesThisMonthPaginatedInput = z.infer<
	typeof listEntriesThisMonthPaginatedInput
>

export const listEntriesThisMonthPaginated = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.inputValidator(listEntriesThisMonthPaginatedInput)
	.handler(async (ctx) => {
		const db = getDb()
		const { page, pageSize, sortBy, sortDir } = ctx.data
		const offset = page * pageSize

		const { timezone, displayCurrency } = await getUserTimezoneAndCurrency(
			db,
			ctx.context.userId,
		)
		const { start, end } = getCurrentMonthRange(timezone)

		const result = await fetchConvertedEntriesForRange(db, ctx.context.userId, {
			start,
			end,
			timezone,
			displayCurrency,
			sortBy,
			sortDir,
			limit: pageSize,
			offset,
		})

		return {
			items: result.entries.map(mapToMonthlyEntry),
			total: result.total ?? 0,
		}
	})
