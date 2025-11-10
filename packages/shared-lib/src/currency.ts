import type { Currency } from "./currencies"

export function convertCurrency(
	amount: number,
	from: Currency,
	to: Currency,
	rates: Record<Currency, number>,
): number {
	const srcRate = rates[from]
	const targetRate = rates[to]

	if (
		typeof srcRate === "number" &&
		srcRate > 0 &&
		typeof targetRate === "number" &&
		targetRate > 0
	) {
		return amount * (targetRate / srcRate)
	}

	throw new Error(`Missing exchange rate for conversion from ${from} to ${to}`)
}

export function formatCurrency(
	amount: number,
	currency: Currency,
	locale = "en-US",
): string {
	try {
		return new Intl.NumberFormat(locale, {
			style: "currency",
			currency,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount)
	} catch {
		return `${currency} ${amount.toFixed(2)}`
	}
}
