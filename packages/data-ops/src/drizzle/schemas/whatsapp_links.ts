import { sqliteTable, text } from "drizzle-orm/sqlite-core"
import { auth_users } from "./auth_users"
import { timestamps } from "./helpers"

export const whatsapp_links = sqliteTable("whatsapp_links", {
	userId: text()
		.primaryKey()
		.references(() => auth_users.id, { onDelete: "cascade" }),
	waId: text().notNull().unique(),
	...timestamps,
})

export type InsertWhatsappLink = typeof whatsapp_links.$inferInsert
export type SelectWhatsappLink = typeof whatsapp_links.$inferSelect
