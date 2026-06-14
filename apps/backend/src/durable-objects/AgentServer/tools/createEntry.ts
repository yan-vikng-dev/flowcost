import type { DrizzleDb } from "@repo/db/database/setup"
import { getAllowedUserIds } from "@repo/db/drizzle/queries/helpers"
import { entries, type InsertEntry } from "@repo/db/drizzle/schemas/index"
import {
	type Currency,
	categories,
	currencies,
	toIsoDateInTimezone,
} from "@repo/shared-lib"
import { tool } from "ai"
import { and, eq, gte, inArray, ne } from "drizzle-orm"
import { DateTime } from "luxon"
import { z } from "zod"
import { convertEntriesBestEffort } from "@/lib/currency"
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
			"Create an expense entry. The response includes the created entry plus a converted amount in the user's display currency; report both values back to the user. A null convertedAmount means the entry was saved but conversion is temporarily unavailable — never treat that as a failed save.",
		inputSchema: createEntrySchema,
		execute: async (input) => {
			const executionDate =
				input.executionDate ??
				DateTime.now().setZone(context.timezone).toISODate()
			if (!executionDate) throw new Error("Failed to resolve execution date")
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
			const { entries: convertedEntries, unconvertedCount } =
				await convertEntriesBestEffort(env, [inserted], context.displayCurrency)
			const converted = convertedEntries[0] ?? {
				...inserted,
				convertedAmount: null,
			}

			// Non-blocking duplicate check: same category + original amount/currency
			// logged by this user or their partner within the last 10 minutes.
			const allowedUserIds = await getAllowedUserIds(db, context.userId)
			const windowStart = new Date(Date.now() - 10 * 60 * 1000)
			const duplicate = await db.query.entries.findFirst({
				where: and(
					inArray(entries.userId, allowedUserIds),
					ne(entries.id, inserted.id),
					eq(entries.amount, input.amount),
					eq(entries.currency, currency),
					eq(entries.category, input.category),
					gte(entries.createdAt, windowStart),
				),
				with: { user: true },
			})
			const duplicateWarning = duplicate
				? {
						matchedEntryId: duplicate.id,
						amount: duplicate.amount,
						currency: duplicate.currency,
						category: duplicate.category,
						loggedAt: duplicate.createdAt.toISOString(),
						minutesAgo: Math.round(
							(Date.now() - duplicate.createdAt.getTime()) / 60_000,
						),
						addedBy:
							duplicate.userId === context.userId
								? "you"
								: (duplicate.user?.displayName ?? "your partner"),
					}
				: undefined

			return {
				result: converted,
				targetCurrency: context.displayCurrency,
				...(unconvertedCount > 0 && {
					conversionNote:
						"Entry saved successfully. Conversion to the display currency is temporarily unavailable — report the original amount and currency.",
				}),
				...(duplicateWarning && { duplicateWarning }),
			}
		},
	})
