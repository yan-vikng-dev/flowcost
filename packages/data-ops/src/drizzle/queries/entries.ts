import type { Currency } from "@repo/shared-lib"
import { toIsoDateInTimezone } from "@repo/shared-lib"
import { convertCurrency } from "@repo/shared-lib/currency"
import { and, asc, count, desc, eq, gte, inArray, lt } from "drizzle-orm"
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

function buildDateRangeWhere(start: Date, end: Date, timezone: string) {
	const isoStart = toIsoDateInTimezone(start, timezone)
	const isoEnd = toIsoDateInTimezone(end, timezone)

	return and(
		gte(entries.executedDate, isoStart),
		lt(entries.executedDate, isoEnd),
	)
}

function buildOrderBy(
	sortBy: NonNullable<FetchConvertedEntriesOptions["sortBy"]>,
	sortDir: NonNullable<FetchConvertedEntriesOptions["sortDir"]>,
) {
	const sortableColumns = {
		executedAt: entries.executedDate,
		amount: entries.amount,
		category: entries.category,
		entryType: entries.entryType,
	} as const

	const sortColumn = sortableColumns[sortBy] ?? entries.executedDate
	return sortDir === "asc" ? asc(sortColumn) : desc(sortColumn)
}

function extractDateString(row: SelectEntry): string {
	return row.executedDate
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
		buildDateRangeWhere(start, end, timezone),
		entryType ? eq(entries.entryType, entryType) : undefined,
	)

	const needsTotal = limit !== undefined || offset !== undefined
	const total = needsTotal
		? ((await db.select({ count: count() }).from(entries).where(baseWhere))[0]
				?.count ?? 0)
		: undefined

	let query = db
		.select()
		.from(entries)
		.where(baseWhere)
		.orderBy(buildOrderBy(sortBy, sortDir) as any)

	if (limit !== undefined) {
		query = query.limit(limit) as typeof query
	}
	if (offset !== undefined) {
		query = query.offset(offset) as typeof query
	}

	const rows = await query

	if (rows.length === 0) {
		return {
			entries: [],
			...(total !== undefined && { total }),
		}
	}

	const neededDates = Array.from(new Set(rows.map((r) => extractDateString(r))))

	const { ratesByDate, latest } = await fetchExchangeRatesForDates(
		db,
		neededDates,
	)

	const convertedEntries: ConvertedEntry[] = rows.map((row) => {
		const dateKey = extractDateString(row)
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
