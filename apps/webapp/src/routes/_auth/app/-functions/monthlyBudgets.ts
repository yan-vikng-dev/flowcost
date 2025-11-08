import {
	getExchangeRates,
	listBudgets,
	listBudgetsWithProgress,
} from "@/core/functions/budgets"

export const MONTHLY_BUDGETS_KEY = ["budgets", "monthly"] as const
export const EXCHANGE_RATES_KEY = ["exchangeRates"] as const

export const getMonthlyBudgets = listBudgetsWithProgress
export const getBudgets = listBudgets
export const getExchangeRatesForBudgets = getExchangeRates
