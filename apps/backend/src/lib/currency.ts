import type { SelectEntry } from "@repo/db/drizzle/schemas/index"
import {
	type Currency,
	convertCurrency,
	getUsdRatesForDates,
} from "@repo/shared-lib"

export type ConvertedEntry = SelectEntry & { convertedAmount: number }

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
