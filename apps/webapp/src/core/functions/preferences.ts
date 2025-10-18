import { createServerFn } from "@tanstack/react-start";
import { protectedFunctionMiddleware } from "@/core/middleware/auth";
import { getDb } from "@repo/data-ops/database/setup";
import { user_preferences } from "@repo/data-ops/drizzle/schemas/user_preferences/table";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { currencies } from "@repo/shared-config";

export const getUserPreferences = createServerFn()
  .middleware([protectedFunctionMiddleware])
  .handler(async (ctx) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(user_preferences)
      .where(eq(user_preferences.userId, ctx.context.userId))
      .limit(1);
    const row = rows[0];
    return {
      defaultEntryCurrency: row?.defaultEntryCurrency ?? "USD",
      displayCurrency: row?.displayCurrency ?? "USD",
    } as const;
  });

export const updateUserPreferencesInput = z.object({
  defaultEntryCurrency: z.enum(currencies),
  displayCurrency: z.enum(currencies),
});

export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesInput>;

export const updateUserPreferences = createServerFn({ method: "POST" })
  .middleware([protectedFunctionMiddleware])
  .inputValidator(updateUserPreferencesInput)
  .handler(async (ctx) => {
    const db = getDb();
    const payload = ctx.data;
    // Upsert logic
    await db
      .insert(user_preferences)
      .values({
        userId: ctx.context.userId,
        defaultEntryCurrency: payload.defaultEntryCurrency,
        displayCurrency: payload.displayCurrency,
      })
      .onConflictDoUpdate({
        target: user_preferences.userId,
        set: {
          defaultEntryCurrency: payload.defaultEntryCurrency,
          displayCurrency: payload.displayCurrency,
        },
      });
    return { ok: true } as const;
  });
