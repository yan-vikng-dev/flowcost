import type { DrizzleDb } from "@repo/db/database/setup"
import { fetchBudgetById } from "@repo/db/drizzle/queries"
import { budgets } from "@repo/db/drizzle/schemas/index"
import { tool } from "ai"
import { eq } from "drizzle-orm"
import { z } from "zod"
import type { MessageContext } from ".."

const deleteBudgetSchema = z.object({
	id: z
		.uuid()
		.describe(
			"The ID of the budget to delete. Use the ID returned by get_budgets.",
		),
})

export const makeDeleteBudgetTool = (context: MessageContext, db: DrizzleDb) =>
	tool({
		description: "Delete a budget. Use get_budgets to find the budget ID.",
		inputSchema: deleteBudgetSchema,
		execute: async (input) => {
			const existing = await fetchBudgetById(db, input.id, context.userId, true)

			if (!existing) {
				throw new Error("Budget not found")
			}

			await db.delete(budgets).where(eq(budgets.id, input.id))

			return { id: input.id }
		},
	})
