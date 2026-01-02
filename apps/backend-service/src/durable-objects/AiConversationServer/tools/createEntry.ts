import type { DrizzleDb } from "@repo/data-ops/database/setup"
import { fetchExchangeRatesForDates } from "@repo/data-ops/drizzle/queries"
import { entries, type InsertEntry } from "@repo/data-ops/drizzle/schemas/index"
import {
	type Currency,
	categories,
	currencies,
	isoDateToUtcMidnight,
	toIsoDateInTimezone,
} from "@repo/shared-lib"
import { convertCurrency } from "@repo/shared-lib/currency"
import { tool } from "ai"
import { DateTime } from "luxon"
import { z } from "zod"
import type { MessageContext } from ".."

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
		description: "Create a financial entry",
		inputSchema: createEntrySchema,
		execute: async (input) => {
			const executionDate = input.executionDate ?? DateTime.now().toISODate()
			const currency = input.currency
				? (input.currency as Currency)
				: context.defaultEntryCurrency
			if (!currencies.includes(currency))
				throw new Error(`Unsupported currency: ${currency}`)
			const executedDate = toIsoDateInTimezone(
				DateTime.fromISO(executionDate, {
					zone: context.userTimezone,
				}).toJSDate(),
				context.userTimezone,
			)
			const newEntry: InsertEntry = {
				userId: context.userId,
				amount: input.amount,
				currency,
				category: input.category,
				entryType: input.entryType,
				description: input.description,
				executedDate,
			}
			const [inserted] = await db.insert(entries).values(newEntry).returning()
			if (!inserted) throw new Error("Failed to create entry")
			const { ratesByDate, latest } = await fetchExchangeRatesForDates(db, [
				inserted.executedDate,
			])
			const rateMap = ratesByDate.get(inserted.executedDate) ?? latest.rates
			const convertedAmount = convertCurrency(
				inserted.amount,
				inserted.currency,
				context.displayCurrency,
				rateMap,
			)
			const executedAt = isoDateToUtcMidnight(
				inserted.executedDate,
			).toISOString()
			const safe = {
				...inserted,
				executedAt,
				createdAt: inserted.createdAt.toISOString(),
				updatedAt: inserted.updatedAt.toISOString(),
				convertedAmount,
			}
			return { result: safe, targetCurrency: context.displayCurrency }
		},
	})
