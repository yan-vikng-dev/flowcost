import type { DrizzleDb } from "@repo/db/database/setup"
import { getEntryForUser } from "@repo/db/drizzle/queries"
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
	entryType: z
		.enum(["Expense", "Income"])
		.optional()
		.describe("Whether the entry is an expense or income"),
	amount: z
		.number()
		.gt(0)
		.optional()
		.describe("The absolute amount of the entry"),
	currency: z
		.string()
		.regex(/^[A-Z]{3}$/)
		.optional()
		.describe("The currency code of the entry, e.g. USD, EUR, etc."),
	category: z
		.enum(categories)
		.optional()
		.describe("Category of the entry from a pre-defined list"),
	description: z
		.string()
		.optional()
		.describe("Short note describing the entry"),
	executionDate: z
		.string()
		.optional()
		.describe("YYYY-MM-DD format for the execution date"),
})

export const makeUpdateEntryTool = (context: MessageContext, db: DrizzleDb) =>
	tool({
		description:
			"Update an existing financial entry. Only provide fields that should be changed; omitted fields remain unchanged.",
		inputSchema: updateEntrySchema,
		execute: async (input) => {
			const entry = await getEntryForUser(db, input.id, context.userId)
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

			if (input.entryType !== undefined) {
				patch.entryType = input.entryType
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

			if (entry.recurringTemplateId) {
				patch.isOverridden = true
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
