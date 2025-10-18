import { createServerFn } from "@tanstack/react-start";
import { protectedFunctionMiddleware } from "@/core/middleware/auth";
import { getDb } from "@repo/data-ops/database/setup";
import { entries, entryTypes, type SelectEntry } from "@repo/data-ops/drizzle/schemas/entries/table";
import { exchange_rates, type SelectExchangeRate } from "@repo/data-ops/drizzle/schemas/exchange_rates/table";
import { user_preferences } from "@repo/data-ops/drizzle/schemas/user_preferences/table";
import { z } from "zod";
import { categories, currencies, type Currency } from "@repo/shared-config";
import { and, desc, eq, gte, lt, inArray, count } from "drizzle-orm";

export const createEntryInput = z.object({
  type: z.enum(entryTypes),
  amount: z.number().gt(0),
  currency: z.enum(currencies),
  category: z.enum(categories),
  description: z.string().optional(),
  executedAt: z.date().default(new Date()),
});

export type CreateEntryInput = z.infer<typeof createEntryInput>;

export const createEntry = createServerFn({ method: "POST" })
  .middleware([protectedFunctionMiddleware])
  .inputValidator(createEntryInput)
  .handler(async (ctx) => {
    const db = getDb();
    const [result] = await db
      .insert(entries)
      .values({
        amount: ctx.data.amount,
        currency: ctx.data.currency,
        category: ctx.data.category,
        type: ctx.data.type,
        description: ctx.data.description,
        executedAt: ctx.data.executedAt,
        userId: ctx.context.userId,
      })
      .returning({ id: entries.id });

    return { id: result?.id };
  });

export const deleteEntriesInput = z.object({
  ids: z.array(z.string()).min(1),
});

export type DeleteEntriesInput = z.infer<typeof deleteEntriesInput>;

export const deleteEntries = createServerFn({ method: "POST" })
  .middleware([protectedFunctionMiddleware])
  .inputValidator(deleteEntriesInput)
  .handler(async (ctx) => {
    const db = getDb();
    const ids = ctx.data.ids;
    await db
      .delete(entries)
      .where(and(eq(entries.userId, ctx.context.userId), inArray(entries.id, ids)));

    return { deleted: ids.length };
  });

// Helpers to get current month range in ms
function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type MonthlyEntry = SelectEntry & {
  amountIls: number | null;
};

export const listEntriesThisMonth = createServerFn()
  .middleware([protectedFunctionMiddleware])
  .handler(async (ctx) => {
    const db = getDb();
    const { startMs, endMs } = getMonthRange();

    // Fetch entries for this user in current month (DB-side filter + sort)
    const rows = await db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.userId, ctx.context.userId),
          gte(entries.executedAt, new Date(startMs)),
          lt(entries.executedAt, new Date(endMs)),
        ),
      )
      .orderBy(desc(entries.executedAt));

    // Collect distinct entry dates (YYYY-MM-DD)
    const neededDates = Array.from(new Set(rows.map((r) => toDateStr(r.executedAt))));

    // Fetch rates only for needed dates, plus latest fallback
    let ratesForDates: SelectExchangeRate[] = [];
    if (neededDates.length > 0) {
      ratesForDates = await db
        .select()
        .from(exchange_rates)
        .where(inArray(exchange_rates.date, neededDates));
    }

    const latestRow = await db
      .select()
      .from(exchange_rates)
      .orderBy(desc(exchange_rates.date))
      .limit(1);

    const latestRates = latestRow[0]?.rates;
    if (!latestRates) {
      throw new Error("No rates available");
    }

    const rateByDate = new Map<string, Record<Currency, number>>(
      ratesForDates.map((r) => [r.date, r.rates]),
    );

    // Determine display currency from user preferences (fallback to USD if missing)
    const prefs = await db
      .select()
      .from(user_preferences)
      .where(eq(user_preferences.userId, ctx.context.userId))
      .limit(1);
    const displayCurrency: Currency = prefs[0]?.displayCurrency ?? "USD";

    const mapped: MonthlyEntry[] = rows.map((row) => {
      const dateStr = toDateStr(row.executedAt);
      const rateMap = rateByDate.get(dateStr) ?? latestRates;
      const srcRate = rateMap[row.currency as Currency];
      const targetRate = rateMap[displayCurrency];

      const amountIls =
        typeof srcRate === "number" && srcRate > 0 && typeof targetRate === "number"
          ? row.amount * (targetRate / srcRate)
          : null;

      return { ...row, amountIls };
    });

    return mapped;
  });

export const listEntriesThisMonthPaginatedInput = z.object({
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(10),
});

export type ListEntriesThisMonthPaginatedInput = z.infer<typeof listEntriesThisMonthPaginatedInput>;

export const listEntriesThisMonthPaginated = createServerFn()
  .middleware([protectedFunctionMiddleware])
  .inputValidator(listEntriesThisMonthPaginatedInput)
  .handler(async (ctx) => {
    const db = getDb();
    const { startMs, endMs } = getMonthRange();

    const { page, pageSize } = ctx.data;
    const offset = page * pageSize;

    const baseWhere = and(
      eq(entries.userId, ctx.context.userId),
      gte(entries.executedAt, new Date(startMs)),
      lt(entries.executedAt, new Date(endMs)),
    );

    // Total count for pagination
    const totalRows = await db.select({ count: count() }).from(entries).where(baseWhere);
    const total = totalRows[0]?.count ?? 0;

    const rows = await db
      .select()
      .from(entries)
      .where(baseWhere)
      .orderBy(desc(entries.executedAt))
      .limit(pageSize)
      .offset(offset);

    // Collect distinct entry dates (YYYY-MM-DD) for fetched page
    const neededDates = Array.from(new Set(rows.map((r) => toDateStr(r.executedAt))));

    let ratesForDates: SelectExchangeRate[] = [];
    if (neededDates.length > 0) {
      ratesForDates = await db
        .select()
        .from(exchange_rates)
        .where(inArray(exchange_rates.date, neededDates));
    }

    const latestRow = await db
      .select()
      .from(exchange_rates)
      .orderBy(desc(exchange_rates.date))
      .limit(1);
    const latestRates = latestRow[0]?.rates;
    if (!latestRates) {
      throw new Error("No rates available");
    }

    const rateByDate = new Map<string, Record<Currency, number>>(
      ratesForDates.map((r) => [r.date, r.rates]),
    );

    const prefs = await db
      .select()
      .from(user_preferences)
      .where(eq(user_preferences.userId, ctx.context.userId))
      .limit(1);
    const displayCurrency: Currency = prefs[0]?.displayCurrency ?? "USD";

    const items: MonthlyEntry[] = rows.map((row) => {
      const dateStr = toDateStr(row.executedAt);
      const rateMap = rateByDate.get(dateStr) ?? latestRates;
      const srcRate = rateMap[row.currency as Currency];
      const targetRate = rateMap[displayCurrency];
      const amountIls =
        typeof srcRate === "number" && srcRate > 0 && typeof targetRate === "number"
          ? row.amount * (targetRate / srcRate)
          : null;
      return { ...row, amountIls };
    });

    return { items, total };
  });
