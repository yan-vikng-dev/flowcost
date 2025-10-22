import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { auth_users } from "./auth_users";

export const whatsapp_links = sqliteTable(
  "whatsapp_links",
  {
    userId: text()
      .primaryKey()
      .references(() => auth_users.id, { onDelete: "cascade" }),
    waId: text().notNull().unique(),
    createdAt: integer({ mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
    updatedAt: integer({ mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("wa_id_index").on(table.waId)],
);

export const whatsappLinksRelations = relations(whatsapp_links, ({ one }) => ({
  user: one(auth_users, {
    fields: [whatsapp_links.userId],
    references: [auth_users.id],
  }),
}));

export type InsertWhatsappLink = typeof whatsapp_links.$inferInsert;
export type SelectWhatsappLink = typeof whatsapp_links.$inferSelect;
