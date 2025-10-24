import type { DrizzleDb } from "@repo/data-ops/database/setup";
import { entries } from "@repo/data-ops/drizzle/schemas/entries/table";
import { exchange_rates } from "@repo/data-ops/drizzle/schemas/exchange_rates/table";
import { tool } from "ai";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { DateTime } from "luxon";
import { z } from "zod";
import type { MessageContext } from "../AiConversationServer";

const getEntriesSchema = z.object({
	date: z
		.string()
		.optional()
		.describe("YYYY-MM-DD; defaults to today if omitted"),
});

export const makeGetEntriesTool = (context: MessageContext, db: DrizzleDb) =>
	tool({
		name: "get_entries",
		description:
			"Get the entries for the user for a given date, with a conversion to the user's preferred display currency",
		inputSchema: getEntriesSchema,
		execute: async (input) => {
			const inputDate = input.date ?? DateTime.now().toISODate();
			const { startDate, endDate } = getZonedDayRangeUtc(
				inputDate,
				context.userTimezone,
			);
			const foundEntries = await db.query.entries.findMany({
				where: and(
					eq(entries.userId, context.userId),
					gte(entries.executedAt, startDate),
					lt(entries.executedAt, endDate),
				),
				columns: {
					userId: false,
					createdAt: false,
					updatedAt: false,
				},
				orderBy: desc(entries.executedAt),
			});
			let exchangeRates = await db.query.exchange_rates.findFirst({
				where: eq(exchange_rates.date, inputDate),
			});
			if (!exchangeRates) {
				exchangeRates = await db.query.exchange_rates.findFirst({
					orderBy: desc(exchange_rates.createdAt),
				});
			}
			if (!exchangeRates) throw new Error("Failed to find exchange rates");
			const safeEntries = foundEntries.map((e) => ({
				...e,
				executedAt: e.executedAt.toISOString(),
				convertedAmount:
					e.amount *
					(exchangeRates.rates[context.displayCurrency] /
						exchangeRates.rates[e.currency]),
			}));
			return { entries: safeEntries, targetCurrency: context.displayCurrency };
		},
	});

function getZonedDayRangeUtc(
	dateStr: string,
	timeZone: string,
): { startDate: Date; endDate: Date } {
	const start = DateTime.fromISO(dateStr, { zone: timeZone }).startOf("day");
	const end = start.plus({ days: 1 });
	return {
		startDate: start.toJSDate(),
		endDate: end.toJSDate(),
	};
}
