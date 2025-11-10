import type { ConvertedEntry } from "@repo/data-ops/drizzle/queries/entries"
import type { SelectBudget } from "@repo/data-ops/drizzle/schemas/index"
import type { Currency } from "@repo/shared-lib"
import type { BudgetWithProgress } from "./budgets"
import type { MonthlyEntry } from "./entries"

function calculateSpentForBudget(
	budget: SelectBudget,
	expenseEntries: ConvertedEntry[],
): number {
	let spent = 0
	const budgetCategories = budget.categories
	for (const entry of expenseEntries) {
		if (!budgetCategories.includes(entry.category)) continue
		spent += entry.convertedAmount
	}
	return spent
}

function calculateSpentForBudgetFromMonthlyEntries(
	budget: SelectBudget,
	expenseEntries: MonthlyEntry[],
): number {
	let spent = 0
	const budgetCategories = budget.categories
	for (const entry of expenseEntries) {
		if (!budgetCategories.includes(entry.category)) continue
		spent += entry.convertedAmount
	}
	return spent
}

function convertBudgetAmount(
	budget: SelectBudget,
	displayCurrency: Currency,
	latestRates: Record<Currency, number>,
): number {
	const srcRate = latestRates[budget.currency]
	const dstRate = latestRates[displayCurrency]
	if (
		typeof srcRate === "number" &&
		srcRate > 0 &&
		typeof dstRate === "number"
	) {
		return budget.amount * (dstRate / srcRate)
	}
	return budget.amount
}

export function calculateBudgetsWithProgress(
	budgets: SelectBudget[],
	expenseEntries: ConvertedEntry[],
	displayCurrency: Currency,
	latestRates: Record<Currency, number>,
): BudgetWithProgress[] {
	return budgets.map((budget) => {
		const spentDisplay = calculateSpentForBudget(budget, expenseEntries)
		const amountDisplay = convertBudgetAmount(
			budget,
			displayCurrency,
			latestRates,
		)
		const remainingDisplay = Math.max(0, amountDisplay - spentDisplay)
		const utilizationPct =
			amountDisplay > 0
				? Math.min(100, (spentDisplay / amountDisplay) * 100)
				: 0

		return {
			id: budget.id,
			userId: budget.userId,
			amount: budget.amount,
			currency: budget.currency,
			categories: budget.categories,
			displayCurrency,
			amountDisplay,
			spentDisplay,
			remainingDisplay,
			utilizationPct,
		}
	})
}

export function calculateBudgetsWithProgressFromMonthlyEntries(
	budgets: SelectBudget[],
	expenseEntries: MonthlyEntry[],
	displayCurrency: Currency,
	latestRates: Record<Currency, number>,
): BudgetWithProgress[] {
	return budgets.map((budget) => {
		const spentDisplay = calculateSpentForBudgetFromMonthlyEntries(
			budget,
			expenseEntries,
		)
		const amountDisplay = convertBudgetAmount(
			budget,
			displayCurrency,
			latestRates,
		)
		const remainingDisplay = Math.max(0, amountDisplay - spentDisplay)
		const utilizationPct =
			amountDisplay > 0
				? Math.min(100, (spentDisplay / amountDisplay) * 100)
				: 0

		return {
			id: budget.id,
			userId: budget.userId,
			amount: budget.amount,
			currency: budget.currency,
			categories: budget.categories,
			displayCurrency,
			amountDisplay,
			spentDisplay,
			remainingDisplay,
			utilizationPct,
		}
	})
}
