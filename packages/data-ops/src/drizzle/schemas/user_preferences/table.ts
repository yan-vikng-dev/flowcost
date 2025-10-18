import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { auth_users } from "../auth_users";
import { currencies } from "@repo/shared-config";

export const user_preferences = sqliteTable("user_preferences", {
  userId: text()
    .primaryKey()
    .references(() => auth_users.id, { onDelete: "cascade" }),
  defaultEntryCurrency: text({ enum: currencies }).notNull().default("USD"),
  displayCurrency: text({ enum: currencies }).notNull().default("USD"),
  createdAt: integer({ mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
  updatedAt: integer({ mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export type InsertUserPreferences = typeof user_preferences.$inferInsert;
export type SelectUserPreferences = typeof user_preferences.$inferSelect;
