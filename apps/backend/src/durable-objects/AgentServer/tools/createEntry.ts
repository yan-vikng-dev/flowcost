import type { DrizzleDb } from "@repo/db/database/setup"
import { fetchExchangeRatesForDates } from "@repo/db/drizzle/queries"
import { entries, type InsertEntry } from "@repo/db/drizzle/schemas/index"
import {
	type Currency,
	categories,
	currencies,
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
		.describe(
			"Whether the entry is an expense or income. Infer from context; prefer Expense unless income is clearly indicated (salary, bonus, dividend, refund).",
		),
	amount: z.number().gt(0).describe("The absolute amount of the entry"),
	currency: z
		.string()
		.regex(/^[A-Z]{3}$/)
		.optional()
		.describe(
			"The currency code of the entry, e.g. USD, EUR, etc. Optional; if omitted, the backend resolves to the user's preferred entry currency.",
		),
	category: z
		.enum(categories)
		.describe(
			"Category of the entry from a pre-defined list. Infer from the user's message; ask for clarification only when truly ambiguous.",
		),
	description: z.string().describe("Short note describing the entry"),
	executionDate: z
		.string()
		.optional()
		.describe("YYYY-MM-DD; defaults to today if omitted"),
})

export const makeCreateEntryTool = (context: MessageContext, db: DrizzleDb) =>
	tool({
		description:
			"Create a financial entry. The response includes the created entry plus a converted amount in the user's display currency; report both values back to the user.",
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
					zone: context.timezone,
				}).toJSDate(),
				context.timezone,
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
			const safe = {
				...inserted,
				convertedAmount,
			}
			return { result: safe, targetCurrency: context.displayCurrency }
		},
	})
