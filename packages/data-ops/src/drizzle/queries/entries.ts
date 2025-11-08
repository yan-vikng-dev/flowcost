import type { Currency } from "@repo/shared-lib"
import { toIsoDateInTimezone } from "@repo/shared-lib"
import { convertCurrency } from "@repo/shared-lib/currency"
import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm"
import type { DrizzleDb } from "../../database/setup"
import { type EntryType, entries, type SelectEntry } from "../schemas/index"
import { fetchExchangeRatesForDates } from "./exchange-rates"
import { getAllowedUserIds, getUserTimezoneAndCurrency } from "./helpers"
import { createPerformanceMeasurer } from "./performance"
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
	allowedUserIds?: string[]
	partnerId?: string | null
	caller?: string
}

export type FetchConvertedEntriesResult = {
	entries: ConvertedEntry[]
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

function convertEntryToCurrency(
	entry: SelectEntry,
	displayCurrency: Currency,
	ratesByDate: Map<string, Record<Currency, number>>,
	fallbackRates: Record<Currency, number>,
): ConvertedEntry {
	const rateMap = ratesByDate.get(entry.executedDate) ?? fallbackRates
	const convertedAmount = convertCurrency(
		entry.amount,
		entry.currency,
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
	return (
		providedCurrency ??
		(await getUserTimezoneAndCurrency(db, userId)).displayCurrency
	)
}

function buildEntriesQuery(
	db: DrizzleDb,
	whereClause: ReturnType<typeof and>,
	sortBy?: FetchConvertedEntriesOptions["sortBy"],
	sortDir?: FetchConvertedEntriesOptions["sortDir"],
) {
	let query = db.select().from(entries).where(whereClause)

	if (sortBy) {
		query = query.orderBy(
			buildOrderBy(sortBy, sortDir ?? "desc"),
		) as typeof query
	}

	return query
}

export async function fetchConvertedEntriesForRange(
	db: DrizzleDb,
	userId: string,
	options: FetchConvertedEntriesOptions,
): Promise<FetchConvertedEntriesResult> {
	const perf = createPerformanceMeasurer()
	const {
		start,
		end,
		timezone,
		displayCurrency: providedDisplayCurrency,
		includePartner = true,
		entryType,
		sortBy,
		sortDir = "desc",
		allowedUserIds: providedAllowedUserIds,
		partnerId,
		caller,
	} = options

	let rowCount = 0

	try {
		const allowedUserIds =
			providedAllowedUserIds ??
			(await perf.measure("allowedUserIds", () =>
				getAllowedUserIds(db, userId, includePartner, partnerId),
			))

		await perf.measure("materializeRecurring", () =>
			materializeRecurringEntriesForUsers(
				db,
				allowedUserIds,
				start,
				end,
				timezone,
			),
		)

		const displayCurrency = await perf.measure("resolveDisplayCurrency", () =>
			resolveDisplayCurrency(db, userId, providedDisplayCurrency),
		)

		const baseWhere = and(
			inArray(entries.userId, allowedUserIds),
			buildDateRangeWhere(start, end, timezone),
			entryType ? eq(entries.entryType, entryType) : undefined,
		)

		const rows = await perf.measure("fetchEntries", () =>
			buildEntriesQuery(db, baseWhere, sortBy, sortDir),
		)

		rowCount = rows.length

		if (rows.length === 0) {
			return { entries: [] }
		}

		const uniqueDates = Array.from(new Set(rows.map((r) => r.executedDate)))
		const { ratesByDate, latest } = await perf.measure(
			"fetchExchangeRates",
			() =>
				fetchExchangeRatesForDates(
					db,
					uniqueDates,
					caller ?? "fetchConvertedEntriesForRange",
				),
		)

		const convertedEntries = rows.map((entry) =>
			convertEntryToCurrency(entry, displayCurrency, ratesByDate, latest.rates),
		)

		return { entries: convertedEntries }
	} finally {
		const totalMs = perf.getTotalMs()
		const timings = perf.getTimings()
		const durationDays = Math.max(
			1,
			Math.ceil((end.getTime() - start.getTime()) / 86_400_000),
		)
		// eslint-disable-next-line no-console
		console.info("[perf] fetchConvertedEntriesForRange", {
			caller: caller ?? "unknown",
			totalMs,
			rowCount,
			durationDays,
			entryType: entryType ?? "all",
			sortBy: sortBy ?? null,
			sortDir: sortBy ? sortDir : null,
			userId,
			timezone,
			timings,
		})
	}
}

export async function getEntryForUser(
	db: DrizzleDb,
	entryId: string,
	userId: string,
	includePartner = true,
	partnerId?: string | null,
) {
	const allowedUserIds = await getAllowedUserIds(
		db,
		userId,
		includePartner,
		partnerId,
	)
	return db.query.entries.findFirst({
		where: and(
			eq(entries.id, entryId),
			inArray(entries.userId, allowedUserIds),
		),
	})
}
