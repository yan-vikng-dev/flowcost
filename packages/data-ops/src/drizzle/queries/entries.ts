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

const SORTABLE_COLUMNS = {
	executedAt: entries.executedDate,
	amount: entries.amount,
	category: entries.category,
	entryType: entries.entryType,
} as const

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
	const sortColumn = SORTABLE_COLUMNS[sortBy] ?? entries.executedDate
	return sortDir === "asc" ? asc(sortColumn) : desc(sortColumn)
}

function withConditionalTotal(
	result: { entries: ConvertedEntry[] },
	total: number | undefined,
): FetchConvertedEntriesResult {
	return { ...result, ...(total !== undefined && { total }) }
}

function convertEntryToCurrency(
	entry: SelectEntry,
	displayCurrency: Currency,
	ratesByDate: Map<string, Record<Currency, number>>,
	fallbackRates: Record<Currency, number>,
): ConvertedEntry {
	const rateMap = ratesByDate.get(entry.executedDate) ?? fallbackRates
	const convertedAmount = convertCurrency(
		entry.amount,
		entry.currency as Currency,
		displayCurrency,
		rateMap,
	)
	return { ...entry, convertedAmount }
}

async function materializeRecurringEntriesForUsers(
	db: DrizzleDb,
	userIds: string[],
	start: Date,
	end: Date,
	timezone: string,
): Promise<void> {
	for (const uid of userIds) {
		await ensureRecurringEntriesMaterialized(db, uid, start, end, timezone)
	}
}

async function resolveDisplayCurrency(
	db: DrizzleDb,
	userId: string,
	providedCurrency?: Currency,
): Promise<Currency> {
	if (providedCurrency) return providedCurrency
	const prefs = await getUserTimezoneAndCurrency(db, userId)
	return prefs.displayCurrency
}

async function fetchTotalCount(
	db: DrizzleDb,
	whereClause: ReturnType<typeof and>,
): Promise<number> {
	const result = await db
		.select({ count: count() })
		.from(entries)
		.where(whereClause)
	return result[0]?.count ?? 0
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
	await materializeRecurringEntriesForUsers(
		db,
		allowedUserIds,
		start,
		end,
		timezone,
	)

	const displayCurrency = await resolveDisplayCurrency(
		db,
		userId,
		providedDisplayCurrency,
	)

	const baseWhere = and(
		inArray(entries.userId, allowedUserIds),
		buildDateRangeWhere(start, end, timezone),
		entryType ? eq(entries.entryType, entryType) : undefined,
	)

	const needsPagination = limit !== undefined || offset !== undefined
	const total = needsPagination
		? await fetchTotalCount(db, baseWhere)
		: undefined

	let query = db
		.select()
		.from(entries)
		.where(baseWhere)
		.orderBy(buildOrderBy(sortBy, sortDir))

	if (limit !== undefined) {
		query = query.limit(limit) as typeof query
	}
	if (offset !== undefined) {
		query = query.offset(offset) as typeof query
	}

	const rows = await query

	if (rows.length === 0) {
		return withConditionalTotal({ entries: [] }, total)
	}

	const uniqueDates = Array.from(new Set(rows.map((r) => r.executedDate)))
	const { ratesByDate, latest } = await fetchExchangeRatesForDates(
		db,
		uniqueDates,
	)

	const convertedEntries = rows.map((entry) =>
		convertEntryToCurrency(entry, displayCurrency, ratesByDate, latest.rates),
	)

	return withConditionalTotal({ entries: convertedEntries }, total)
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
