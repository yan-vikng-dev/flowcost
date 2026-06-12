import type { Currency } from "./currencies"

const FRANKFURTER_BASE = "https://api.frankfurter.dev/v2"
const BASE_CURRENCY: Currency = "USD"
const LATEST_TTL_SECONDS = 60 * 60 * 6 // 6h for today/latest; history is immutable

/** USD-based rates, e.g. { USD: 1, EUR: 0.92, ... }. */
export type UsdRates = Record<Currency, number>

/**
 * Minimal cache interface satisfied by a Cloudflare KV namespace.
 * Inject `env.CACHE` to persist Frankfurter responses across requests.
 */
export interface RateCache {
	get(key: string): Promise<string | null>
	put(
		key: string,
		value: string,
		options?: { expirationTtl?: number },
	): Promise<void>
}

type FrankfurterRateItem = {
	date: string
	base: string
	quote: string
	rate: number
}

// Caching a partial rate map poisons every conversion until the TTL expires,
// so reject implausibly small responses instead of trusting them.
const MIN_EXPECTED_CURRENCIES = 100

function isRateItem(value: unknown): value is FrankfurterRateItem {
	if (typeof value !== "object" || value === null) return false
	const item = value as Partial<FrankfurterRateItem>
	return (
		typeof item.quote === "string" &&
		typeof item.rate === "number" &&
		item.rate > 0
	)
}

function todayIso(): string {
	const iso = new Date().toISOString().split("T")[0]
	if (!iso) throw new Error("Failed to compute current date")
	return iso
}

function withBase(rates: Record<string, number>): UsdRates {
	// Frankfurter omits the base currency from `rates`; it is always 1.
	return { ...rates, [BASE_CURRENCY]: 1 } as UsdRates
}

async function fetchUsdRates(query: string): Promise<UsdRates> {
	const res = await fetch(
		`${FRANKFURTER_BASE}/rates?base=${BASE_CURRENCY}${query}`,
	)
	if (!res.ok) {
		throw new Error(`Frankfurter request failed (${res.status}) for "${query}"`)
	}
	const data: unknown = await res.json()
	if (!Array.isArray(data)) {
		throw new Error(`Frankfurter returned a non-array response for "${query}"`)
	}
	const rates = Object.fromEntries(
		data.filter(isRateItem).map((item) => [item.quote, item.rate]),
	)
	if (Object.keys(rates).length < MIN_EXPECTED_CURRENCIES) {
		throw new Error(
			`Frankfurter returned only ${Object.keys(rates).length} rates for "${query}"; refusing to cache a partial rate map`,
		)
	}
	return withBase(rates)
}

/** Latest USD-based rates (cached briefly). */
export async function getLatestUsdRates(cache?: RateCache): Promise<UsdRates> {
	const key = "fx:usd:v2:latest"
	const cached = await cache?.get(key)
	if (cached) return JSON.parse(cached) as UsdRates

	const rates = await fetchUsdRates("")
	await cache?.put(key, JSON.stringify(rates), {
		expirationTtl: LATEST_TTL_SECONDS,
	})
	return rates
}

/**
 * USD-based rates for a specific YYYY-MM-DD. Historical dates are cached
 * permanently (immutable); the current day is cached briefly.
 */
export async function getUsdRatesForDate(
	date: string,
	cache?: RateCache,
): Promise<UsdRates> {
	const key = `fx:usd:v2:${date}`
	const cached = await cache?.get(key)
	if (cached) return JSON.parse(cached) as UsdRates

	const rates = await fetchUsdRates(`&date=${date}`)
	const isHistorical = date < todayIso()
	await cache?.put(
		key,
		JSON.stringify(rates),
		isHistorical ? undefined : { expirationTtl: LATEST_TTL_SECONDS },
	)
	return rates
}

/**
 * Resolve rates for many dates at once. Returns a per-date map plus a `latest`
 * fallback to use for dates that have no quote (e.g. future-dated entries).
 */
export async function getUsdRatesForDates(
	dates: string[],
	cache?: RateCache,
): Promise<{ ratesByDate: Map<string, UsdRates>; latest: UsdRates }> {
	const uniqueDates = Array.from(new Set(dates))
	const ratesByDate = new Map<string, UsdRates>()

	await Promise.all(
		uniqueDates.map(async (date) => {
			ratesByDate.set(date, await getUsdRatesForDate(date, cache))
		}),
	)

	const latest = await getLatestUsdRates(cache)
	return { ratesByDate, latest }
}
