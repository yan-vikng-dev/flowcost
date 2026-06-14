import type { SelectEntry } from "@repo/db/drizzle/schemas/index"
import {
	type Currency,
	convertCurrency,
	getUsdRatesForDates,
	type UsdRates,
} from "@repo/shared-lib"

export type ConvertedEntry = SelectEntry & { convertedAmount: number }

export type BestEffortConvertedEntry = SelectEntry & {
	convertedAmount: number | null
}

/** Entry shape safe for agent tool results and durable history (no Date fields). */
export type AgentEntry = Omit<SelectEntry, "createdAt" | "updatedAt">

export type AgentBestEffortConvertedEntry = AgentEntry & {
	convertedAmount: number | null
}

export function toAgentEntry<T extends SelectEntry>(
	entry: T,
): Omit<T, "createdAt" | "updatedAt"> {
	const { createdAt: _createdAt, updatedAt: _updatedAt, ...agentEntry } = entry
	return agentEntry
}

export type BestEffortConversionResult = {
	entries: BestEffortConvertedEntry[]
	/** Entries whose conversion failed; their convertedAmount is null. */
	unconvertedCount: number
}

/**
 * Strict conversion: throws when rates are unavailable. Used by reports,
 * where a missing report beats a report with wrong totals.
 */
export async function convertEntries(
	env: Env,
	entries: SelectEntry[],
	displayCurrency: Currency,
): Promise<ConvertedEntry[]> {
	if (entries.length === 0) return []

	const dates = entries.map((entry) => entry.executedDate)
	const { ratesByDate, latest } = await getUsdRatesForDates(dates, env.CACHE)

	return entries.map((entry) => {
		const rateMap = ratesByDate.get(entry.executedDate) ?? latest
		const convertedAmount = convertCurrency(
			entry.amount,
			entry.currency,
			displayCurrency,
			rateMap,
		)
		return { ...entry, convertedAmount }
	})
}

/**
 * Best-effort conversion for agent tools: a rate outage must never fail the
 * tool call (the underlying write already succeeded), so failures surface as
 * convertedAmount: null instead of throwing.
 */
export async function convertEntriesBestEffort(
	env: Env,
	entries: SelectEntry[],
	displayCurrency: Currency,
): Promise<BestEffortConversionResult> {
	if (entries.length === 0) return { entries: [], unconvertedCount: 0 }

	let ratesByDate = new Map<string, UsdRates>()
	let latest: UsdRates | null = null
	try {
		const dates = entries.map((entry) => entry.executedDate)
		const fetched = await getUsdRatesForDates(dates, env.CACHE)
		ratesByDate = fetched.ratesByDate
		latest = fetched.latest
	} catch (error) {
		console.error("Failed to fetch exchange rates; returning unconverted", {
			displayCurrency,
			error,
		})
	}

	let unconvertedCount = 0
	const converted = entries.map((entry) => {
		const rateMap = ratesByDate.get(entry.executedDate) ?? latest
		if (rateMap) {
			try {
				return {
					...entry,
					convertedAmount: convertCurrency(
						entry.amount,
						entry.currency,
						displayCurrency,
						rateMap,
					),
				}
			} catch {
				// fall through to unconverted
			}
		}
		unconvertedCount += 1
		return { ...entry, convertedAmount: null }
	})
	return { entries: converted, unconvertedCount }
}
