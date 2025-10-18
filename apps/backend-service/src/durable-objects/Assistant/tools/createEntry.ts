import { tool } from "ai";
import { z } from "zod";
import { categories, currencies, Currency } from "@repo/shared-config";
import { entries, InsertEntry } from "@repo/data-ops/drizzle/schemas/entries/table";
import { getDb } from "@repo/data-ops/database/setup";

type ToolContext = {
  userId: string;
  defaultCurrency: Currency;
};

const createEntrySchema = z.object({
  type: z.enum(["expense", "income"]).describe("Whether the entry is an expense or income"),
  amount: z.number().gt(0).describe("The absolute amount of the entry"),
  currency: z
    .enum(currencies)
    .optional()
    .describe(
      "The currency code of the entry, e.g. USD, EUR, etc. Optional; defaults to the user's preferred new entry currency.",
    ),
  category: z.enum(categories).describe("strict known category name from the app"),
  description: z.string().optional().describe("Short note or merchant, optional"),
  executionDate: z.string().optional().describe("YYYY-MM-DD; defaults to today if omitted"),
});

export function makeCreateEntryTool(context: ToolContext) {
  const db = getDb();
  return tool({
    name: "create_entry",
    description: "Create a financial entry",
    inputSchema: createEntrySchema,
    execute: async (input) => {
      const executedAt = input.executionDate
        ? new Date(input.executionDate + new Date().toISOString().split(/(?=T)/)[1]!)
        : new Date();
      const currency = input.currency ?? context.defaultCurrency;
      const newEntry: InsertEntry = {
        userId: context.userId,
        amount: input.amount,
        currency,
        category: input.category,
        type: input.type,
        description: input.description,
        executedAt,
      };
      const [result] = await db.insert(entries).values(newEntry).returning({ id: entries.id });
      return { id: result?.id };
    },
  });
}
