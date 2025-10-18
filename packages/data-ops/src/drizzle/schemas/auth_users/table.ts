import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { auth_accounts } from "../auth_accounts/table";
import { auth_sessions } from "../auth_sessions/table";
import { entries } from "../entries/table";
import { whatsapp_links } from "../whatsapp_links/table";
import { user_preferences } from "../user_preferences/table";

export const auth_users = sqliteTable(
  "auth_users",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    image: text(),
    createdAt: integer({ mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
    updatedAt: integer({ mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(() => new Date())
      .notNull(),
    emailVerified: integer({ mode: "boolean" }).default(false).notNull(),
  },
  (table) => [uniqueIndex("auth_users_email_unique").on(table.email)],
);

export const authUsersRelations = relations(auth_users, ({ many, one }) => ({
  authAccounts: many(auth_accounts),
  authSessions: many(auth_sessions),
  entries: many(entries),
  whatsappLinks: one(whatsapp_links, {
    fields: [auth_users.id],
    references: [whatsapp_links.userId],
  }),
  preferences: one(user_preferences, {
    fields: [auth_users.id],
    references: [user_preferences.userId],
  }),
}));
