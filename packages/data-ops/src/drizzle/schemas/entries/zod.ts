import { z } from "zod";
import { categories } from "@repo/shared-config";

export const createEntrySchema = z.object({
  type: z.enum(["expense", "income"]).describe("Whether the entry is an expense or income"),
  amount: z.number().gt(0).describe("The absolute amount of the entry"),
  currency: z
    .string()
    .optional()
    .describe(
      "The currency code of the entry, e.g. USD, EUR, etc. Optional; defaults to the user's preferred new entry currency.",
    ),
  category: z.enum(categories).describe("strict known category name from the app"),
  description: z.string().optional().describe("Short note or merchant, optional"),
  executedAt: z.string().optional().describe("YYYY-MM-DD; defaults to today if omitted"),
});
