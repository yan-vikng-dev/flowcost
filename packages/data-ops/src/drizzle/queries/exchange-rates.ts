import type { Currency } from "@repo/shared-lib"
import { desc, inArray } from "drizzle-orm"
import type { DrizzleDb } from "../../database/setup"
import { exchange_rates, type SelectExchangeRate } from "../schemas/index"

export async function fetchExchangeRatesForDates(
	db: DrizzleDb,
	dates: string[],
): Promise<{
	ratesByDate: Map<string, Record<Currency, number>>
	latest: SelectExchangeRate
}> {
	const ratesForDates: SelectExchangeRate[] = []
	if (dates.length > 0) {
		const BATCH_SIZE = 100
		for (let i = 0; i < dates.length; i += BATCH_SIZE) {
			const dateBatch = dates.slice(i, i + BATCH_SIZE)
			const batchRates = await db.query.exchange_rates.findMany({
				where: inArray(exchange_rates.date, dateBatch),
			})
			ratesForDates.push(...batchRates)
		}
	}

	const latest = await db.query.exchange_rates.findFirst({
		orderBy: desc(exchange_rates.date),
	})

	if (!latest) {
		throw new Error("No exchange rates available")
	}

	const ratesByDate = new Map<string, Record<Currency, number>>(
		ratesForDates.map((r) => [r.date, r.rates]),
	)

	return { ratesByDate, latest }
}

export async function getLatestExchangeRates(
	db: DrizzleDb,
): Promise<SelectExchangeRate> {
	const latest = await db.query.exchange_rates.findFirst({
		orderBy: desc(exchange_rates.date),
	})

	if (!latest) {
		throw new Error("No exchange rates available")
	}

	return latest
}
