import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { auth_users } from "./auth";

export const whatsapp_links = sqliteTable("whatsapp_links", {
    userId: text()
        .primaryKey()
        .references(() => auth_users.id, { onDelete: "cascade" }),
    waId: text().notNull().unique(),
    createdAt: integer({ mode: "timestamp_ms" })
        .default(sql`(unixepoch() * 1000)`).notNull(),
    updatedAt: integer({ mode: "timestamp_ms" })
        .default(sql`(unixepoch() * 1000)`).$onUpdate(() => new Date()).notNull(),
}, (table)=>[
    index("wa_id_index").on(table.waId),
]);

export type InsertWhatsappLink = typeof whatsapp_links.$inferInsert;
export type SelectWhatsappLink = typeof whatsapp_links.$inferSelect;
