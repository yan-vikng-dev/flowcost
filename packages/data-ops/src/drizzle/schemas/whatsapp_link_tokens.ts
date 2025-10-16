import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { auth_users } from "./auth";

export const whatsapp_link_tokens = sqliteTable("whatsapp_link_tokens", {
    id: text().primaryKey(),
    userId: text()
        .references(() => auth_users.id, { onDelete: "cascade" }).notNull(),
    tokenHash: text().notNull(),
    expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
    usedAt: integer({ mode: "timestamp_ms" }),
    createdAt: integer({ mode: "timestamp_ms" })
        .default(sql`(unixepoch() * 1000)`).notNull(),
    updatedAt: integer({ mode: "timestamp_ms" })
        .default(sql`(unixepoch() * 1000)`).$onUpdate(() => new Date()).notNull(),
});

export type InsertWhatsappLinkToken = typeof whatsapp_link_tokens.$inferInsert;
export type SelectWhatsappLinkToken = typeof whatsapp_link_tokens.$inferSelect;
