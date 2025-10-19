import { tool } from "ai";
import { z } from "zod";
import { MessageContext } from "../AiConversationServer";
import { type DrizzleDb } from "@repo/data-ops/database/setup";
import { and, desc, gte, lt, eq } from "drizzle-orm";
import { entries } from "@repo/data-ops/drizzle/schemas/entries/table";
import { DateTime } from "luxon";

const getEntriesSchema = z.object({
  date: z
    .string()
    .optional()
    .describe("YYYY-MM-DD; defaults to today if omitted")
});

export const makeGetEntriesTool = (context: MessageContext, db: DrizzleDb) =>
  tool({
    name: "get_entries",
    description: "Get the entries for the user for a given date",
    inputSchema: getEntriesSchema,
    execute: async (input) => {
        const inputDate = input.date ?? DateTime.now().toISODate();
      const { startDate, endDate } = getZonedDayRangeUtc(inputDate, context.userTimezone);
        const foundEntries = await db.query.entries.findMany({
            where: and(eq(entries.userId, context.userId), gte(entries.executedAt, startDate), lt(entries.executedAt, endDate)),
            orderBy: desc(entries.executedAt),
        })
      return { entries: foundEntries };
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
