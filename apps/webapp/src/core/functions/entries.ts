import { getDb } from "@repo/data-ops/database/setup"
import {
	fetchConvertedEntriesForRange,
	getPartnerUserId,
} from "@repo/data-ops/drizzle/queries"
import {
	entries,
	entryTypes,
	type SelectEntry,
	user_preferences,
} from "@repo/data-ops/drizzle/schemas/index"
import { categories, currencies } from "@repo/shared-config"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, inArray } from "drizzle-orm"
import { DateTime } from "luxon"
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
		const partnerId = await getPartnerUserId(db, ctx.context.userId)
		const allowedUserIds = partnerId
			? [ctx.context.userId, partnerId]
			: [ctx.context.userId]
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

export const listEntriesThisMonth = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx) => {
		const db = getDb()

		const prefs = await db.query.user_preferences.findFirst({
			where: eq(user_preferences.userId, ctx.context.userId),
		})
		const timezone = prefs?.timezone || "UTC"
		const displayCurrency = prefs?.displayCurrency

		const now = DateTime.now().setZone(timezone)
		const start = now.startOf("month").toJSDate()
		const end = now.plus({ months: 1 }).startOf("month").toJSDate()

		const result = await fetchConvertedEntriesForRange(db, ctx.context.userId, {
			start,
			end,
			timezone,
			displayCurrency,
			sortBy: "executedAt",
			sortDir: "desc",
		})

		const mapped: MonthlyEntry[] = result.entries.map(
			(entry): MonthlyEntry => ({
				...entry,
				amountIls: entry.convertedAmount,
			}),
		)

		return mapped
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

		const prefs = await db.query.user_preferences.findFirst({
			where: eq(user_preferences.userId, ctx.context.userId),
		})
		const timezone = prefs?.timezone || "UTC"
		const displayCurrency = prefs?.displayCurrency

		const now = DateTime.now().setZone(timezone)
		const start = now.startOf("month").toJSDate()
		const end = now.plus({ months: 1 }).startOf("month").toJSDate()

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

		const items: MonthlyEntry[] = result.entries.map(
			(entry): MonthlyEntry => ({
				...entry,
				amountIls: entry.convertedAmount,
			}),
		)

		return { items, total: result.total ?? 0 }
	})
