import { getDb } from "@repo/data-ops/database/setup"
import {
	entries,
	entryTypes,
	exchange_rates,
	type SelectEntry,
	type SelectExchangeRate,
	user_preferences,
} from "@repo/data-ops/drizzle/schemas/index"
import { type Currency, categories, currencies } from "@repo/shared-config"
import { createServerFn } from "@tanstack/react-start"
import { and, asc, count, desc, eq, gte, inArray, lt } from "drizzle-orm"
import { z } from "zod"
import { getPartnerUserId } from "@/core/helpers/connections"
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

// Helpers to get current month range in ms
function getMonthRange(date = new Date()) {
	const start = new Date(date.getFullYear(), date.getMonth(), 1)
	const end = new Date(date.getFullYear(), date.getMonth() + 1, 1)
	return { startMs: start.getTime(), endMs: end.getTime() }
}

function toDateStr(d: Date) {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, "0")
	const day = String(d.getDate()).padStart(2, "0")
	return `${y}-${m}-${day}`
}

export type MonthlyEntry = SelectEntry & {
	amountIls: number | null
}

export const listEntriesThisMonth = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx) => {
		const db = getDb()
		const { startMs, endMs } = getMonthRange()

		// Fetch entries for this user (and partner if connected) in current month
		const partnerId = await getPartnerUserId(db, ctx.context.userId)
		const allowedUserIds = partnerId
			? [ctx.context.userId, partnerId]
			: [ctx.context.userId]
		const rows = await db
			.select()
			.from(entries)
			.where(
				and(
					inArray(entries.userId, allowedUserIds),
					gte(entries.executedAt, new Date(startMs)),
					lt(entries.executedAt, new Date(endMs)),
				),
			)
			.orderBy(desc(entries.executedAt))

		// Collect distinct entry dates (YYYY-MM-DD)
		const neededDates = Array.from(
			new Set(rows.map((r) => toDateStr(r.executedAt))),
		)

		// Fetch rates only for needed dates, plus latest fallback
		let ratesForDates: SelectExchangeRate[] = []
		if (neededDates.length > 0) {
			ratesForDates = await db
				.select()
				.from(exchange_rates)
				.where(inArray(exchange_rates.date, neededDates))
		}

		const latestRow = await db
			.select()
			.from(exchange_rates)
			.orderBy(desc(exchange_rates.date))
			.limit(1)

		const latestRates = latestRow[0]?.rates
		if (!latestRates) {
			throw new Error("No rates available")
		}

		const rateByDate = new Map<string, Record<Currency, number>>(
			ratesForDates.map((r) => [r.date, r.rates]),
		)

		// Determine display currency from user preferences (fallback to USD if missing)
		const prefs = await db
			.select()
			.from(user_preferences)
			.where(eq(user_preferences.userId, ctx.context.userId))
			.limit(1)
		const displayCurrency: Currency = prefs[0]?.displayCurrency ?? "USD"

		const mapped: MonthlyEntry[] = rows.map((row) => {
			const dateStr = toDateStr(row.executedAt)
			const rateMap = rateByDate.get(dateStr) ?? latestRates
			const srcRate = rateMap[row.currency]
			const targetRate = rateMap[displayCurrency]

			const amountIls =
				typeof srcRate === "number" &&
				srcRate > 0 &&
				typeof targetRate === "number"
					? row.amount * (targetRate / srcRate)
					: null

			return { ...row, amountIls }
		})

		return mapped
	})

export const listEntriesThisMonthPaginatedInput = z.object({
	page: z.number().int().min(0).default(0),
	pageSize: z.number().int().min(1).max(100).default(10),
	sortBy: z
		.enum(["executedAt", "amount", "category", "entryType"]) // whitelist sortable columns
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
		const { startMs, endMs } = getMonthRange()

		const { page, pageSize, sortBy, sortDir } = ctx.data
		const offset = page * pageSize

		const partnerId = await getPartnerUserId(db, ctx.context.userId)
		const allowedUserIds = partnerId
			? [ctx.context.userId, partnerId]
			: [ctx.context.userId]
		const baseWhere = and(
			inArray(entries.userId, allowedUserIds),
			gte(entries.executedAt, new Date(startMs)),
			lt(entries.executedAt, new Date(endMs)),
		)

		// Total count for pagination
		const totalRows = await db
			.select({ count: count() })
			.from(entries)
			.where(baseWhere)
		const total = totalRows[0]?.count ?? 0

		const sortableColumns = {
			executedAt: entries.executedAt,
			amount: entries.amount,
			category: entries.category,
			entryType: entries.entryType,
		} as const

		const sortColumn = sortableColumns[sortBy] ?? entries.executedAt
		const orderExpr = sortDir === "asc" ? asc(sortColumn) : desc(sortColumn)

		const rows = await db
			.select()
			.from(entries)
			.where(baseWhere)
			.orderBy(orderExpr)
			.limit(pageSize)
			.offset(offset)

		// Collect distinct entry dates (YYYY-MM-DD) for fetched page
		const neededDates = Array.from(
			new Set(rows.map((r) => toDateStr(r.executedAt))),
		)

		let ratesForDates: SelectExchangeRate[] = []
		if (neededDates.length > 0) {
			ratesForDates = await db
				.select()
				.from(exchange_rates)
				.where(inArray(exchange_rates.date, neededDates))
		}

		const latestRow = await db
			.select()
			.from(exchange_rates)
			.orderBy(desc(exchange_rates.date))
			.limit(1)
		const latestRates = latestRow[0]?.rates
		if (!latestRates) {
			throw new Error("No rates available")
		}

		const rateByDate = new Map<string, Record<Currency, number>>(
			ratesForDates.map((r) => [r.date, r.rates]),
		)

		const prefs = await db
			.select()
			.from(user_preferences)
			.where(eq(user_preferences.userId, ctx.context.userId))
			.limit(1)
		const displayCurrency: Currency = prefs[0]?.displayCurrency ?? "USD"

		const items: MonthlyEntry[] = rows.map((row) => {
			const dateStr = toDateStr(row.executedAt)
			const rateMap = rateByDate.get(dateStr) ?? latestRates
			const srcRate = rateMap[row.currency]
			const targetRate = rateMap[displayCurrency]
			const amountIls =
				typeof srcRate === "number" &&
				srcRate > 0 &&
				typeof targetRate === "number"
					? row.amount * (targetRate / srcRate)
					: null
			return { ...row, amountIls }
		})

		return { items, total }
	})
