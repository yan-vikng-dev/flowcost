import type { Category, Currency } from "@repo/shared-config"

export type BudgetProgressEntry = {
	spentDisplay: number
	amountDisplay: number
	utilizationPct: number
}

export type BudgetForProgress = {
	id: string
	amount: number
	currency: string
	categories: unknown
}

export type EntryForProgress = {
	category: string
	convertedAmount: number | null
}

export function calculateBudgetProgress(
	budgetsList: BudgetForProgress[],
	entries: EntryForProgress[],
	latestRates: Record<Currency, number>,
	displayCurrency: Currency,
): Map<Category, BudgetProgressEntry> {
	const result = new Map<Category, BudgetProgressEntry>()

	for (const budget of budgetsList) {
		const budgetCategories = budget.categories as Category[]
		let spentDisplay = 0

		for (const entry of entries) {
			if (!budgetCategories.includes(entry.category as Category)) continue
			if (entry.convertedAmount !== null) {
				spentDisplay += entry.convertedAmount
			}
		}

		const srcBudgetRate = latestRates[budget.currency as Currency]
		const dstBudgetRate = latestRates[displayCurrency]
		const amountDisplay =
			typeof srcBudgetRate === "number" &&
			srcBudgetRate > 0 &&
			typeof dstBudgetRate === "number"
				? budget.amount * (dstBudgetRate / srcBudgetRate)
				: budget.amount

		const utilizationPct =
			amountDisplay > 0
				? Math.min(100, (spentDisplay / amountDisplay) * 100)
				: 0

		for (const category of budgetCategories) {
			const existing = result.get(category)
			if (existing) {
				existing.spentDisplay += spentDisplay
				existing.amountDisplay += amountDisplay
				existing.utilizationPct = Math.min(
					100,
					(existing.spentDisplay / existing.amountDisplay) * 100,
				)
			} else {
				result.set(category, {
					spentDisplay,
					amountDisplay,
					utilizationPct,
				})
			}
		}
	}

	return result
}
