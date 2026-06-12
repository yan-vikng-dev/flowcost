import { toIsoDateInTimezone } from "@repo/shared-lib"
import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm"
import type { DrizzleDb } from "../../database/setup"
import { entries, type SelectEntry } from "../schemas/index"

export type FetchEntriesForRangeOptions = {
	allowedUserIds: string[]
	start: Date
	end: Date
	timezone: string
	sortBy?: "executedAt" | "amount" | "category"
	sortDir?: "asc" | "desc"
}

const SORTABLE_COLUMNS = {
	executedAt: entries.executedDate,
	amount: entries.amount,
	category: entries.category,
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
	sortBy: NonNullable<FetchEntriesForRangeOptions["sortBy"]>,
	sortDir: NonNullable<FetchEntriesForRangeOptions["sortDir"]>,
) {
	const sortColumn = SORTABLE_COLUMNS[sortBy] ?? entries.executedDate
	return sortDir === "asc" ? asc(sortColumn) : desc(sortColumn)
}

export async function fetchEntriesForRange(
	db: DrizzleDb,
	opts: FetchEntriesForRangeOptions,
): Promise<SelectEntry[]> {
	const {
		allowedUserIds,
		start,
		end,
		timezone,
		sortBy,
		sortDir = "desc",
	} = opts

	const whereClause = and(
		inArray(entries.userId, allowedUserIds),
		buildDateRangeWhere(start, end, timezone),
	)

	if (sortBy) {
		return db.query.entries.findMany({
			where: whereClause,
			orderBy: buildOrderBy(sortBy, sortDir),
		})
	}

	return db.query.entries.findMany({
		where: whereClause,
	})
}

export async function getEntryForUser(
	db: DrizzleDb,
	entryId: string,
	allowedUserIds: string[],
): Promise<SelectEntry | undefined> {
	return db.query.entries.findFirst({
		where: and(
			eq(entries.id, entryId),
			inArray(entries.userId, allowedUserIds),
		),
	})
}
