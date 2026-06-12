import type { DrizzleDb } from "@repo/db/database/setup"
import { entries, type InsertEntry } from "@repo/db/drizzle/schemas/index"
import {
	type Currency,
	categories,
	currencies,
	toIsoDateInTimezone,
} from "@repo/shared-lib"
import { tool } from "ai"
import { DateTime } from "luxon"
import { z } from "zod"
import { convertEntries } from "@/lib/currency"
import type { MessageContext } from ".."

const createEntrySchema = z.object({
	amount: z.number().gt(0).describe("The absolute amount of the expense"),
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
			"Category of the expense from a pre-defined list. Infer from the user's message; ask for clarification only when truly ambiguous.",
		),
	description: z.string().describe("Short note describing the expense"),
	executionDate: z
		.string()
		.optional()
		.describe("YYYY-MM-DD; defaults to today if omitted"),
})

export const makeCreateEntryTool = (
	context: MessageContext,
	db: DrizzleDb,
	env: Env,
) =>
	tool({
		description:
			"Create an expense entry. The response includes the created entry plus a converted amount in the user's display currency; report both values back to the user.",
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
				description: input.description,
				executedDate,
			}
			const [inserted] = await db.insert(entries).values(newEntry).returning()
			if (!inserted) throw new Error("Failed to create entry")
			const [converted] = await convertEntries(
				env,
				[inserted],
				context.displayCurrency,
			)
			if (!converted) throw new Error("Failed to convert entry")
			return { result: converted, targetCurrency: context.displayCurrency }
		},
	})
