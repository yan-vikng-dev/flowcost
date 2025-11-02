import type { Currency } from "@repo/shared-lib"
import { convertCurrency } from "@repo/shared-lib/currency"
import { and, asc, count, desc, eq, gte, inArray, lt } from "drizzle-orm"
import { DateTime } from "luxon"
import type { DrizzleDb } from "../../database/setup"
import { type EntryType, entries, type SelectEntry } from "../schemas/index"
import { fetchExchangeRatesForDates } from "./exchange-rates"
import { getAllowedUserIds, getUserTimezoneAndCurrency } from "./helpers"
import { ensureRecurringEntriesMaterialized } from "./recurring-entries"

export type ConvertedEntry = SelectEntry & {
	convertedAmount: number | null
}

export type FetchConvertedEntriesOptions = {
	start: Date
	end: Date
	timezone: string
	displayCurrency?: Currency
	includePartner?: boolean
	entryType?: EntryType
	sortBy?: "executedAt" | "amount" | "category" | "entryType"
	sortDir?: "asc" | "desc"
	limit?: number
	offset?: number
}

export type FetchConvertedEntriesResult = {
	entries: ConvertedEntry[]
	total?: number
}

export async function fetchConvertedEntriesForRange(
	db: DrizzleDb,
	userId: string,
	options: FetchConvertedEntriesOptions,
): Promise<FetchConvertedEntriesResult> {
	const {
		start,
		end,
		timezone,
		displayCurrency: providedDisplayCurrency,
		includePartner = true,
		entryType,
		sortBy = "executedAt",
		sortDir = "desc",
		limit,
		offset,
	} = options

	const allowedUserIds = await getAllowedUserIds(db, userId, includePartner)

	for (const uid of allowedUserIds) {
		await ensureRecurringEntriesMaterialized(db, uid, start, end, timezone)
	}

	const displayCurrency: Currency =
		providedDisplayCurrency ??
		(await getUserTimezoneAndCurrency(db, userId)).displayCurrency

	const baseWhere = and(
		inArray(entries.userId, allowedUserIds),
		gte(entries.executedAt, start),
		lt(entries.executedAt, end),
		entryType ? eq(entries.entryType, entryType) : undefined,
	)

	let total: number | undefined
	if (limit !== undefined || offset !== undefined) {
		const totalRows = await db
			.select({ count: count() })
			.from(entries)
			.where(baseWhere)
		total = totalRows[0]?.count ?? 0
	}

	const sortableColumns = {
		executedAt: entries.executedAt,
		amount: entries.amount,
		category: entries.category,
		entryType: entries.entryType,
	} as const

	const sortColumn = sortableColumns[sortBy] ?? entries.executedAt
	const orderExpr = sortDir === "asc" ? asc(sortColumn) : desc(sortColumn)

	const baseQuery = db
		.select()
		.from(entries)
		.where(baseWhere)
		.orderBy(orderExpr)

	const rows =
		limit !== undefined && offset !== undefined
			? await baseQuery.limit(limit).offset(offset)
			: limit !== undefined
				? await baseQuery.limit(limit)
				: offset !== undefined
					? await baseQuery.offset(offset)
					: await baseQuery

	if (rows.length === 0) {
		return {
			entries: [],
			...(total !== undefined && { total }),
		}
	}

	const neededDates = Array.from(
		new Set(
			rows
				.map((r) =>
					DateTime.fromJSDate(r.executedAt, { zone: timezone }).toISODate(),
				)
				.filter((d): d is string => typeof d === "string"),
		),
	)

	const { ratesByDate, latest } = await fetchExchangeRatesForDates(
		db,
		neededDates,
	)

	const convertedEntries: ConvertedEntry[] = rows.map((row) => {
		const dateKey =
			DateTime.fromJSDate(row.executedAt, { zone: timezone }).toISODate() ||
			latest.date
		const rateMap = ratesByDate.get(dateKey) ?? latest.rates

		const convertedAmount = convertCurrency(
			row.amount,
			row.currency as Currency,
			displayCurrency,
			rateMap,
		)

		return {
			...row,
			convertedAmount,
		}
	})

	return {
		entries: convertedEntries,
		...(total !== undefined && { total }),
	}
}

export async function getEntryForUser(
	db: DrizzleDb,
	entryId: string,
	userId: string,
	includePartner = true,
) {
	const allowedUserIds = await getAllowedUserIds(db, userId, includePartner)
	return db.query.entries.findFirst({
		where: and(
			eq(entries.id, entryId),
			inArray(entries.userId, allowedUserIds),
		),
	})
}
