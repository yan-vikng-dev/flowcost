import type { DrizzleDb } from "@repo/db/database/setup"
import { fetchBudgetById } from "@repo/db/drizzle/queries"
import { budgets, type InsertBudget } from "@repo/db/drizzle/schemas/index"
import { type Currency, categories, currencies } from "@repo/shared-lib"
import { tool } from "ai"
import { eq } from "drizzle-orm"
import { z } from "zod"
import type { MessageContext } from ".."

const updateBudgetSchema = z.object({
	id: z
		.uuid()
		.describe(
			"The ID of the budget to update. Use the ID returned by get_budgets.",
		),
	amount: z.number().gt(0).optional().describe("Monthly budget limit"),
	currency: z
		.enum(currencies)
		.optional()
		.describe("Currency code for the budget, e.g. USD, EUR"),
	categories: z
		.array(z.enum(categories))
		.min(1)
		.optional()
		.describe("Categories included in this budget"),
})

export const makeUpdateBudgetTool = (context: MessageContext, db: DrizzleDb) =>
	tool({
		description:
			"Update an existing budget. Only provide fields that should be changed.",
		inputSchema: updateBudgetSchema,
		execute: async (input) => {
			const existing = await fetchBudgetById(db, input.id, context.userId, true)

			if (!existing) {
				throw new Error("Budget not found or not authorized")
			}

			const patch: Partial<InsertBudget> = {}

			if (input.amount !== undefined) {
				patch.amount = input.amount
			}

			if (input.currency !== undefined) {
				const currency = input.currency as Currency
				if (!currencies.includes(currency)) {
					throw new Error(`Unsupported currency: ${currency}`)
				}
				patch.currency = currency
			}

			if (input.categories !== undefined) {
				patch.categories = [...new Set(input.categories)]
			}

			if (Object.keys(patch).length === 0) {
				throw new Error("No fields provided to update")
			}

			const [updatedBudget] = await db
				.update(budgets)
				.set(patch)
				.where(eq(budgets.id, input.id))
				.returning()

			if (!updatedBudget) throw new Error("Failed to update budget")

			return { result: updatedBudget }
		},
	})
