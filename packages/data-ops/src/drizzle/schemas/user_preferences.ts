import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { auth_users } from "./auth";
import { currencies } from "@repo/shared-config";

export const user_preferences = sqliteTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => auth_users.id, { onDelete: "cascade" }),
  defaultEntryCurrency: text("default_entry_currency", { enum: currencies }).notNull().default("USD"),
  displayCurrency: text("display_currency", { enum: currencies }).notNull().default("USD"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`).$onUpdate(() => sql`(unixepoch() * 1000)`).notNull(),
});

export type InsertUserPreferences = typeof user_preferences.$inferInsert;
export type SelectUserPreferences = typeof user_preferences.$inferSelect;


