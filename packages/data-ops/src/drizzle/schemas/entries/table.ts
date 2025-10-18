import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { auth_users } from "../auth_users";
import { categories, currencies } from "@repo/shared-config";

export const entryTypes = ["expense", "income"] as const;
export type EntryType = (typeof entryTypes)[number];

export type InsertEntry = typeof entries.$inferInsert;
export type SelectEntry = typeof entries.$inferSelect;

export const entries = sqliteTable("entries", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  amount: real().notNull(),
  currency: text({ enum: currencies }).notNull(),
  category: text({ enum: categories }).notNull(),
  type: text({ enum: entryTypes }).notNull(),
  description: text(),
  userId: text()
    .notNull()
    .references(() => auth_users.id, { onDelete: "cascade" }),
  executedAt: integer({ mode: "timestamp_ms" }).notNull(),
  createdAt: integer({ mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
  updatedAt: integer({ mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const entriesRelations = relations(entries, ({ one }) => ({
  user: one(auth_users, {
    fields: [entries.userId],
    references: [auth_users.id],
  }),
}));