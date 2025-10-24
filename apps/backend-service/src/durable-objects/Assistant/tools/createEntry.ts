import type { DrizzleDb } from "@repo/data-ops/database/setup"
import {
	entries,
	type InsertEntry,
} from "@repo/data-ops/drizzle/schemas/entries/table"
import { type Currency, categories, currencies } from "@repo/shared-config"
import { tool } from "ai"
import { DateTime } from "luxon"
import { z } from "zod"
import type { MessageContext } from "../AiConversationServer"

const createEntrySchema = z.object({
	entryType: z
		.enum(["Expense", "Income"])
		.describe("Whether the entry is an expense or income"),
	amount: z.number().gt(0).describe("The absolute amount of the entry"),
	currency: z
		.string()
		.regex(/^[A-Z]{3}$/)
		.optional()
		.describe(
			"The currency code of the entry, e.g. USD, EUR, etc. Optional; backend resolves to the user's preference for new entries if omitted",
		),
	category: z
		.enum(categories)
		.describe(
			"Category of the entry from a pre-defined list. Pick the one that makes the most sense for the user's message.",
		),
	description: z.string().describe("Short note describing the entry"),
	executionDate: z
		.string()
		.optional()
		.describe("YYYY-MM-DD; defaults to today if omitted"),
})

export const makeCreateEntryTool = (context: MessageContext, db: DrizzleDb) =>
	tool({
		name: "create_entry",
		description: "Create a financial entry",
		inputSchema: createEntrySchema,
		execute: async (input) => {
			const executedAt = input.executionDate
				? DateTime.fromISO(input.executionDate, {
						zone: context.userTimezone,
					}).toJSDate()
				: new Date()
			const currency = input.currency
				? (input.currency as Currency)
				: context.defaultEntryCurrency
			if (!currencies.includes(currency))
				throw new Error(`Unsupported currency: ${currency}`)
			const newEntry: InsertEntry = {
				userId: context.userId,
				amount: input.amount,
				currency,
				category: input.category,
				entryType: input.entryType,
				description: input.description,
				executedAt,
			}
			const [inserted] = await db.insert(entries).values(newEntry).returning()
			if (!inserted) throw new Error("Failed to create entry")
			const safe = {
				...inserted,
				executedAt: inserted.executedAt.toISOString(),
				createdAt: inserted.createdAt.toISOString(),
				updatedAt: inserted.updatedAt.toISOString(),
			}
			return { result: safe }
		},
	})
