import type { Category, Currency } from "@repo/shared-lib"
import { and, eq, inArray } from "drizzle-orm"
import type { DateTime } from "luxon"
import type { DrizzleDb } from "../../database/setup"
import { budgets, type SelectBudget } from "../schemas/index"
import type { ConvertedEntry } from "./entries"
import { getAllowedUserIds } from "./helpers"

export type BudgetWithProgress = {
	id: string
	userId: string
	amount: number
	currency: Currency
	categories: Category[]
	displayCurrency: Currency
	amountDisplay: number
	spentDisplay: number
	remainingDisplay: number
	utilizationPct: number
}

export type MonthProgress = {
	label: "Month progress"
	percent: number
	day: number
	days: number
}

export type RecurringExpenses = {
	label: "Recurring expenses"
	percent: 100
	usage: number
	currency: Currency
}

export type FreeBudgetCalculation = {
	incomeSum: number
	committedBudgets: number
	recurringExpenseSum: number
	committed: number
	cap: number
	unbudgetedExpenseSum: number
}

export type FreeBudget = {
	label: "Free budget"
	percent: number
	usage: number
	cap: number
	currency: Currency
	calculation: FreeBudgetCalculation
}

export async function fetchBudgetsForUser(
	db: DrizzleDb,
	userId: string,
	includePartner = true,
): Promise<SelectBudget[]> {
	const allowedUserIds = await getAllowedUserIds(db, userId, includePartner)
	return db.query.budgets.findMany({
		where: inArray(budgets.userId, allowedUserIds),
	})
}

export async function fetchBudgetById(
	db: DrizzleDb,
	budgetId: string,
	userId: string,
	includePartner = true,
	partnerId?: string | null,
): Promise<SelectBudget | undefined> {
	const allowedUserIds = await getAllowedUserIds(
		db,
		userId,
		includePartner,
		partnerId,
	)
	return db.query.budgets.findFirst({
		where: and(
			eq(budgets.id, budgetId),
			inArray(budgets.userId, allowedUserIds),
		),
	})
}

function sumEntryAmounts(entries: ConvertedEntry[]): number {
	return entries.reduce((sum, entry) => sum + entry.convertedAmount, 0)
}

function convertCurrency(
	amount: number,
	fromCurrency: Currency,
	toCurrency: Currency,
	rates: Record<Currency, number>,
): number {
	const srcRate = rates[fromCurrency]
	const dstRate = rates[toCurrency]
	if (
		typeof srcRate === "number" &&
		srcRate > 0 &&
		typeof dstRate === "number"
	) {
		return amount * (dstRate / srcRate)
	}
	return amount
}

function calculateSpentForBudget(
	budget: SelectBudget,
	expenseEntries: ConvertedEntry[],
): number {
	const budgetCategories = new Set(budget.categories)
	return sumEntryAmounts(
		expenseEntries.filter((entry) => budgetCategories.has(entry.category)),
	)
}

export function calculateBudgetsWithProgress(
	budgets: SelectBudget[],
	expenseEntries: ConvertedEntry[],
	displayCurrency: Currency,
	latestRates: Record<Currency, number>,
): BudgetWithProgress[] {
	return budgets.map((budget) => {
		const spentDisplay = calculateSpentForBudget(budget, expenseEntries)
		const amountDisplay = convertCurrency(
			budget.amount,
			budget.currency,
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

export function calculateMonthProgress(now: DateTime): MonthProgress {
	const start = now.startOf("month")
	const end = start.plus({ months: 1 })
	const totalMs = end.diff(start, "milliseconds").milliseconds
	const elapsedMs = Math.min(
		totalMs,
		Math.max(0, now.diff(start, "milliseconds").milliseconds),
	)
	const percent = (elapsedMs / Math.max(1, totalMs)) * 100

	return {
		label: "Month progress",
		percent,
		day: now.day,
		days: Math.trunc(end.diff(start, "days").days),
	}
}

export function calculateRecurringExpenses(
	entries: ConvertedEntry[],
	displayCurrency: Currency,
): RecurringExpenses | null {
	const recurringEntries = entries.filter(
		(entry) => entry.entryType === "Expense" && entry.recurringTemplateId,
	)
	const usage = sumEntryAmounts(recurringEntries)

	if (usage <= 0) return null

	return {
		label: "Recurring expenses",
		percent: 100,
		usage,
		currency: displayCurrency,
	}
}

function getBudgetedCategories(
	budgetsWithProgress: BudgetWithProgress[],
): Set<Category> {
	const budgetedCats = new Set<Category>()
	for (const budget of budgetsWithProgress) {
		for (const category of budget.categories) {
			budgetedCats.add(category)
		}
	}
	return budgetedCats
}

function calculateCommittedBudgets(
	budgetsWithProgress: BudgetWithProgress[],
): number {
	return budgetsWithProgress.reduce(
		(sum, budget) => sum + Math.max(budget.amountDisplay, budget.spentDisplay),
		0,
	)
}

export function calculateFreeBudget(
	entries: ConvertedEntry[],
	budgetsWithProgress: BudgetWithProgress[],
	displayCurrency: Currency,
): FreeBudget | null {
	const incomeEntries = entries.filter((entry) => entry.entryType === "Income")
	const incomeSum = sumEntryAmounts(incomeEntries)

	if (incomeSum <= 0) return null

	const budgetedCats = getBudgetedCategories(budgetsWithProgress)
	const recurringEntries = entries.filter(
		(entry) => entry.entryType === "Expense" && entry.recurringTemplateId,
	)
	const unbudgetedEntries = entries.filter(
		(entry) =>
			entry.entryType === "Expense" &&
			!entry.recurringTemplateId &&
			!budgetedCats.has(entry.category),
	)

	const recurringExpenseSum = sumEntryAmounts(recurringEntries)
	const unbudgetedExpenseSum = sumEntryAmounts(unbudgetedEntries)
	const committedBudgets = calculateCommittedBudgets(budgetsWithProgress)
	const committed = committedBudgets + recurringExpenseSum
	const cap = Math.max(0, incomeSum - committed)
	const usage = Math.max(0, unbudgetedExpenseSum)
	const percent = cap > 0 ? Math.min(100, (usage / cap) * 100) : 0

	return {
		label: "Free budget",
		percent,
		usage,
		cap,
		currency: displayCurrency,
		calculation: {
			incomeSum,
			committedBudgets,
			recurringExpenseSum,
			committed,
			cap,
			unbudgetedExpenseSum,
		},
	}
}
