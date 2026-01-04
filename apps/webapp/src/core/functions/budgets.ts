import { getDb } from "@repo/db/database/setup"
import {
	type BudgetWithProgress,
	calculateBudgetsWithProgress,
	fetchBudgetById,
	fetchBudgetsForUser,
	fetchConvertedEntriesForRange,
	getLatestExchangeRates,
} from "@repo/db/drizzle/queries"
import { getUserTimezoneAndCurrency } from "@repo/db/drizzle/queries/helpers"
import { budgets } from "@repo/db/drizzle/schemas/index"
import { categories, currencies, getCurrentMonthRange } from "@repo/shared-lib"
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
		const existing = await fetchBudgetById(
			db,
			ctx.data.id,
			ctx.context.userId,
			true,
			ctx.context.partnerUserId,
		)

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
		const existing = await fetchBudgetById(
			db,
			ctx.data.id,
			ctx.context.userId,
			true,
			ctx.context.partnerUserId,
		)

		if (!existing) {
			throw new Error("Not found or not authorized")
		}

		await db.delete(budgets).where(eq(budgets.id, ctx.data.id))
		return { id: ctx.data.id }
	})

export type { BudgetWithProgress } from "@repo/db/drizzle/queries"

export const listBudgetsWithProgress = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx) => {
		const db = getDb()
		const budgetsList = await fetchBudgetsForUser(db, ctx.context.userId)
		if (budgetsList.length === 0) return [] as BudgetWithProgress[]

		const { timezone, displayCurrency } = await getUserTimezoneAndCurrency(
			db,
			ctx.context.userId,
		)
		const { start, end } = getCurrentMonthRange(timezone)

		const [entriesResult, latest] = await Promise.all([
			fetchConvertedEntriesForRange(db, ctx.context.userId, {
				start,
				end,
				timezone,
				displayCurrency,
				entryType: "Expense",
				allowedUserIds: ctx.context.allowedUserIds,
				partnerId: ctx.context.partnerUserId,
			}),
			getLatestExchangeRates(db),
		])

		return calculateBudgetsWithProgress(
			budgetsList,
			entriesResult.entries,
			displayCurrency,
			latest.rates,
		)
	})

export const listBudgets = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx) => {
		const db = getDb()
		return await fetchBudgetsForUser(db, ctx.context.userId)
	})

export const getExchangeRates = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.handler(async () => {
		const db = getDb()
		return await getLatestExchangeRates(db)
	})
