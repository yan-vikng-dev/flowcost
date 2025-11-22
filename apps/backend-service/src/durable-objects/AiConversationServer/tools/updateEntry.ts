import type { DrizzleDb } from "@repo/data-ops/database/setup"
import { getEntryForUser } from "@repo/data-ops/drizzle/queries"
import { entries, type InsertEntry } from "@repo/data-ops/drizzle/schemas/index"
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
			"The ID of the entry to update. This ID comes from the 'id' field in entries retrieved via get_entries. When a user corrects an entry, match their description to a previously retrieved entry and use that entry's ID.",
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
		name: "update_entry",
		description:
			"Update an existing financial entry. Only provide fields that should be changed. Omitted fields will remain unchanged. When a user corrects an entry (e.g., 'the breakfast was 360k, not 360'), retrieve entries for the relevant date using get_entries, match the user's description to the correct entry, and use that entry's ID to update it. Never ask the user for entry IDs.",
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
						zone: context.userTimezone,
					}).toJSDate(),
					context.userTimezone,
				)
				patch.executedDate = executedDate
			}

			if (entry.recurringTemplateId) {
				patch.isOverridden = true
			}

			if (Object.keys(patch).length === 0) {
				throw new Error("No fields provided to update")
			}

			const [updated] = await db
				.update(entries)
				.set(patch)
				.where(eq(entries.id, input.id))
				.returning()

			if (!updated) {
				throw new Error("Failed to update entry")
			}

			const executedAt = DateTime.fromISO(updated.executedDate, {
				zone: context.userTimezone,
			})
				.toJSDate()
				.toISOString()

			const safe = {
				...updated,
				executedAt,
				createdAt: updated.createdAt.toISOString(),
				updatedAt: updated.updatedAt.toISOString(),
			}

			return { result: safe }
		},
	})
