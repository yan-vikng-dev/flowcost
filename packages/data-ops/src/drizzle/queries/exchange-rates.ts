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
	let ratesForDates: SelectExchangeRate[] = []
	if (dates.length > 0) {
		ratesForDates = await db.query.exchange_rates.findMany({
			where: inArray(exchange_rates.date, dates),
		})
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
