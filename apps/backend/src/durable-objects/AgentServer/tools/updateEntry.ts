import type { DrizzleDb } from "@repo/db/database/setup"
import { getEntryForUser } from "@repo/db/drizzle/queries"
import { getAllowedUserIds } from "@repo/db/drizzle/queries/helpers"
import { entries, type InsertEntry } from "@repo/db/drizzle/schemas/index"
import {
	type Currency,
	categories,
	currencies,
	toIsoDateInTimezone,
} from "@repo/shared-lib"
import { tool } from "ai"
import { eq } from "drizzle-orm"
import { DateTime } from "luxon"
import { z } from "zod"
import type { MessageContext } from ".."

const updateEntrySchema = z.object({
	id: z
		.uuid()
		.describe(
			"The ID of the entry to update. This ID comes from the 'id' field in entries retrieved via get_entries. When a user corrects an entry, retrieve entries for the relevant date, match by description, amount, category, or date, and use that entry's ID. Never ask the user for entry IDs.",
		),
	amount: z
		.number()
		.gt(0)
		.optional()
		.describe("The absolute amount of the expense"),
	currency: z
		.string()
		.regex(/^[A-Z]{3}$/)
		.optional()
		.describe("The currency code of the entry, e.g. USD, EUR, etc."),
	category: z
		.enum(categories)
		.optional()
		.describe("Category of the expense from a pre-defined list"),
	description: z
		.string()
		.optional()
		.describe("Short note describing the expense"),
	executionDate: z
		.string()
		.optional()
		.describe("YYYY-MM-DD format for the execution date"),
})

export const makeUpdateEntryTool = (context: MessageContext, db: DrizzleDb) =>
	tool({
		description:
			"Update an existing expense entry. Only provide fields that should be changed; omitted fields remain unchanged.",
		inputSchema: updateEntrySchema,
		execute: async (input) => {
			const allowedUserIds = await getAllowedUserIds(db, context.userId)
			const entry = await getEntryForUser(db, input.id, allowedUserIds)
			if (!entry) {
				throw new Error(
					"Entry not found or you don't have permission to update it",
				)
			}

			const patch: Partial<InsertEntry> = {}

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

			if (input.category !== undefined) {
				patch.category = input.category
			}

			if (input.description !== undefined) {
				patch.description = input.description
			}

			if (input.executionDate !== undefined) {
				const executedDate = toIsoDateInTimezone(
					DateTime.fromISO(input.executionDate, {
						zone: context.timezone,
					}).toJSDate(),
					context.timezone,
				)
				patch.executedDate = executedDate
			}

			if (Object.keys(patch).length === 0) {
				throw new Error("No fields provided to update")
			}

			const [updatedEntry] = await db
				.update(entries)
				.set(patch)
				.where(eq(entries.id, input.id))
				.returning()

			if (!updatedEntry) {
				throw new Error("Failed to update entry")
			}

			return { result: updatedEntry }
		},
	})
