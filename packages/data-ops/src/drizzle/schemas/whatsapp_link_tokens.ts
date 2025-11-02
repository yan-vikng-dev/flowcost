import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { auth_users } from "./auth_users"
import { timestamps } from "./helpers"

export const whatsapp_link_tokens = sqliteTable("whatsapp_link_tokens", {
	id: text().primaryKey(),
	userId: text()
		.references(() => auth_users.id, { onDelete: "cascade" })
		.notNull(),
	tokenHash: text().notNull(),
	expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
	usedAt: integer({ mode: "timestamp_ms" }),
	...timestamps,
})

export type InsertWhatsappLinkToken = typeof whatsapp_link_tokens.$inferInsert
export type SelectWhatsappLinkToken = typeof whatsapp_link_tokens.$inferSelect
