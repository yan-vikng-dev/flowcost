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
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional()
    .describe("The currency code of the entry, e.g. USD, EUR, etc. Optional; backend resolves to the user's preference for new entries if omitted",),
  category: z.enum(categories).describe("Category of the entry from a pre-defined list"),
  description: z.string().describe("Short note describing the entry"),
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
        ? new Date(input.executionDate + new Date().toISOString().split(/(?=T)/)[1])
        : new Date();
      const currency = input.currency ? input.currency as Currency : context.defaultCurrency;
      if (!currencies.includes(currency)) throw new Error(`Invalid currency: ${currency}`);
      const newEntry: InsertEntry = {
        userId: context.userId,
        amount: input.amount,
        currency,
        category: input.category,
        type: input.type,
        description: input.description,
        executedAt,
      };
      const [result] = await db.insert(entries).values(newEntry).returning();
      return { result };
    },
  });
}
