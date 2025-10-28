import { getDb } from "@repo/data-ops/database/setup"
import {
	budgets,
	entries,
	exchange_rates,
	type SelectEntry,
	type SelectExchangeRate,
	user_preferences,
} from "@repo/data-ops/drizzle/schemas/index"
import {
	type Category,
	type Currency,
	categories,
	currencies,
} from "@repo/shared-config"
import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm"
import { DateTime } from "luxon"
import { z } from "zod"
import { getPartnerUserId } from "@/core/helpers/connections"
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
		const partnerId = await getPartnerUserId(db, ctx.context.userId)
		const allowedUserIds = partnerId
			? [ctx.context.userId, partnerId]
			: [ctx.context.userId]

		const existing = await db.query.budgets.findFirst({
			where: eq(budgets.id, ctx.data.id),
			columns: { id: true, userId: true },
		})
		if (!existing || !allowedUserIds.includes(existing.userId)) {
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
		const partnerId = await getPartnerUserId(db, ctx.context.userId)
		const allowedUserIds = partnerId
			? [ctx.context.userId, partnerId]
			: [ctx.context.userId]
		// Only delete if owner is allowed
		await db
			.delete(budgets)
			.where(
				and(
					eq(budgets.id, ctx.data.id),
					inArray(budgets.userId, allowedUserIds),
				),
			)
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
		const partnerId = await getPartnerUserId(db, ctx.context.userId)
		const allowedUserIds = partnerId
			? [ctx.context.userId, partnerId]
			: [ctx.context.userId]

		// Fetch budgets owned by actor or partner
		const bs = await db.query.budgets.findMany({
			where: inArray(budgets.userId, allowedUserIds),
		})

		if (bs.length === 0) return [] as BudgetWithProgress[]

		// Determine timezone and display currency from user preferences; default to UTC/USD
		const prefs = await db.query.user_preferences.findFirst({
			where: eq(user_preferences.userId, ctx.context.userId),
		})
		const timeZone = prefs?.timezone || "UTC"
		const displayCurrency: Currency =
			(prefs?.displayCurrency as Currency) ?? "USD"
		const now = DateTime.now().setZone(timeZone)
		const start = now.startOf("month")
		const end = start.plus({ months: 1 })

		// Fetch relevant entries for actor/partner in current month (Expenses only)
		const rows: SelectEntry[] = await db.query.entries.findMany({
			where: and(
				inArray(entries.userId, allowedUserIds),
				eq(entries.entryType, "Expense"),
				gte(entries.executedAt, start.toJSDate()),
				lt(entries.executedAt, end.toJSDate()),
			),
			orderBy: desc(entries.executedAt),
		})

		// Exchange rates for conversion; collect needed entry dates
		const neededDates = Array.from(
			new Set(
				rows
					.map((r) =>
						DateTime.fromJSDate(r.executedAt, { zone: timeZone }).toISODate(),
					)
					.filter((d): d is string => typeof d === "string"),
			),
		)
		const ratesForDates: SelectExchangeRate[] = neededDates.length
			? await db.query.exchange_rates.findMany({
					where: inArray(exchange_rates.date, neededDates),
				})
			: []
		const latest = await db.query.exchange_rates.findFirst({
			orderBy: desc(exchange_rates.date),
		})
		if (!latest) throw new Error("No rates available")

		const rateByDate = new Map<string, Record<Currency, number>>(
			ratesForDates.map((r) => [r.date, r.rates]),
		)

		const results: BudgetWithProgress[] = bs.map((b) => {
			// spent in display currency using per-entry date rate
			let spentDisplay = 0
			for (const e of rows) {
				if (!(b.categories as Category[]).includes(e.category as Category))
					continue
				const dateKey =
					DateTime.fromJSDate(e.executedAt, { zone: timeZone }).toISODate() ||
					latest.date
				const rateMap = rateByDate.get(dateKey) ?? latest.rates
				const srcRate = rateMap[e.currency as Currency]
				const dstRate = rateMap[displayCurrency]
				if (
					typeof srcRate === "number" &&
					srcRate > 0 &&
					typeof dstRate === "number"
				) {
					spentDisplay += e.amount * (dstRate / srcRate)
				}
			}

			// convert budget amount to display currency using latest
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
