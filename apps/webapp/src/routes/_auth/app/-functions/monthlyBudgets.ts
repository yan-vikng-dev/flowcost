import { listBudgetsWithProgress } from "@/core/functions/budgets"

export const MONTHLY_BUDGETS_KEY = ["budgets", "monthly"] as const

export const getMonthlyBudgets = listBudgetsWithProgress
