import { getDb } from "@repo/data-ops/database/setup"
import {
	fetchBudgetsForUser,
	fetchConvertedEntriesForRange,
	fetchExchangeRatesForDates,
} from "@repo/data-ops/drizzle/queries"
import { budgets, user_preferences } from "@repo/data-ops/drizzle/schemas/index"
import {
	type Category,
	type Currency,
	categories,
	currencies,
	getCurrentMonthRange,
} from "@repo/shared-lib"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { protectedFunctionMiddleware } from "@/core/middleware/auth"

export const createBudgetInput = z.object({
	amount: z.number().gt(0),
	currency: z.enum(currencies),
	categories: z.array(z.enum(categories)).min(1),
})

export type CreateBudgetInput = z.infer<typeof createBudgetInput>

export const updateBudgetInput = z.object({
	id: z.string(),
	amount: z.number().gt(0).optional(),
	currency: z.enum(currencies).optional(),
	categories: z.array(z.enum(categories)).min(1).optional(),
})

export type UpdateBudgetInput = z.infer<typeof updateBudgetInput>

export const deleteBudgetInput = z.object({ id: z.string() })
export type DeleteBudgetInput = z.infer<typeof deleteBudgetInput>

export const createBudget = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(createBudgetInput)
	.handler(async (ctx) => {
		const db = getDb()
		const cleanCategories = [...new Set(ctx.data.categories)]
		const [row] = await db
			.insert(budgets)
			.values({
				amount: ctx.data.amount,
				currency: ctx.data.currency,
				categories: cleanCategories,
				userId: ctx.context.userId,
			})
			.returning({ id: budgets.id })
		return { id: row?.id }
	})

export const updateBudget = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(updateBudgetInput)
	.handler(async (ctx) => {
		const db = getDb()
		const budgetsList = await fetchBudgetsForUser(db, ctx.context.userId)

		const existing = budgetsList.find((b) => b.id === ctx.data.id)
		if (!existing) {
			throw new Error("Not found or not authorized")
		}

		const patch: Partial<CreateBudgetInput> = {}
		if (typeof ctx.data.amount === "number") patch.amount = ctx.data.amount
		if (typeof ctx.data.currency === "string")
			patch.currency = ctx.data.currency
		if (Array.isArray(ctx.data.categories)) {
			patch.categories = [...new Set(ctx.data.categories)]
		}

		await db.update(budgets).set(patch).where(eq(budgets.id, ctx.data.id))
		return { id: ctx.data.id }
	})

export const deleteBudget = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(deleteBudgetInput)
	.handler(async (ctx) => {
		const db = getDb()
		const budgetsList = await fetchBudgetsForUser(db, ctx.context.userId)

		const existing = budgetsList.find((b) => b.id === ctx.data.id)
		if (!existing) {
			throw new Error("Not found or not authorized")
		}

		await db.delete(budgets).where(eq(budgets.id, ctx.data.id))
		return { id: ctx.data.id }
	})

// Types
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

export const listBudgetsWithProgress = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx) => {
		const db = getDb()

		const bs = await fetchBudgetsForUser(db, ctx.context.userId)

		if (bs.length === 0) return [] as BudgetWithProgress[]

		// Determine timezone and display currency from user preferences; default to UTC/USD
		const prefs = await db.query.user_preferences.findFirst({
			where: eq(user_preferences.userId, ctx.context.userId),
		})
		const timeZone = prefs?.timezone || "UTC"
		const displayCurrency: Currency =
			(prefs?.displayCurrency as Currency) ?? "USD"
		const { start, end } = getCurrentMonthRange(timeZone)

		const entriesResult = await fetchConvertedEntriesForRange(
			db,
			ctx.context.userId,
			{
				start,
				end,
				timezone: timeZone,
				displayCurrency,
				entryType: "Expense",
			},
		)

		const { latest } = await fetchExchangeRatesForDates(db, [])

		const results: BudgetWithProgress[] = bs.map((b) => {
			let spentDisplay = 0
			for (const e of entriesResult.entries) {
				if (!(b.categories as Category[]).includes(e.category as Category))
					continue
				if (e.convertedAmount !== null) {
					spentDisplay += e.convertedAmount
				}
			}

			const srcBudgetRate = latest.rates[b.currency as Currency]
			const dstBudgetRate = latest.rates[displayCurrency]
			const amountDisplay =
				typeof srcBudgetRate === "number" &&
				srcBudgetRate > 0 &&
				typeof dstBudgetRate === "number"
					? b.amount * (dstBudgetRate / srcBudgetRate)
					: b.amount

			const remainingDisplay = Math.max(0, amountDisplay - spentDisplay)
			const utilizationPct =
				amountDisplay > 0
					? Math.min(100, (spentDisplay / amountDisplay) * 100)
					: 0

			return {
				id: b.id,
				userId: b.userId,
				amount: b.amount,
				currency: b.currency as Currency,
				categories: b.categories as Category[],
				displayCurrency,
				amountDisplay,
				spentDisplay,
				remainingDisplay,
				utilizationPct,
			}
		})

		return results
	})
