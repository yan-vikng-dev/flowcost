import type { Currency } from "./currencies"

export function convertCurrency(
	amount: number,
	from: Currency,
	to: Currency,
	rates: Record<Currency, number>,
): number | null {
	const srcRate = rates[from]
	const targetRate = rates[to]

	if (
		typeof srcRate === "number" &&
		srcRate > 0 &&
		typeof targetRate === "number"
	) {
		return amount * (targetRate / srcRate)
	}

	return null
}
