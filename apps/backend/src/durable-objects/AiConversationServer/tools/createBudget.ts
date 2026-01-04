import type { DrizzleDb } from "@repo/db/database/setup"
import { budgets } from "@repo/db/drizzle/schemas/index"
import { type Currency, categories, currencies } from "@repo/shared-lib"
import { tool } from "ai"
import { z } from "zod"
import type { MessageContext } from ".."

const createBudgetSchema = z.object({
	amount: z.number().gt(0).describe("Monthly budget limit"),
	currency: z
		.enum(currencies)
		.optional()
		.describe("Currency code for the budget, e.g. USD, EUR"),
	categories: z
		.array(z.enum(categories))
		.min(1)
		.describe("Categories included in this budget"),
})

export const makeCreateBudgetTool = (context: MessageContext, db: DrizzleDb) =>
	tool({
		description: "Create a new budget for the user.",
		inputSchema: createBudgetSchema,
		execute: async (input) => {
			const currency = (input.currency ??
				context.defaultEntryCurrency) as Currency
			if (!currencies.includes(currency)) {
				throw new Error(`Unsupported currency: ${currency}`)
			}
			const cleanCategories = [...new Set(input.categories)]

			const [inserted] = await db
				.insert(budgets)
				.values({
					amount: input.amount,
					currency,
					categories: cleanCategories,
					userId: context.userId,
				})
				.returning()

			if (!inserted) throw new Error("Failed to create budget")

			return { result: inserted }
		},
	})
