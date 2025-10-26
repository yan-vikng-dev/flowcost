import { relations } from "drizzle-orm"
import { sqliteTable, text } from "drizzle-orm/sqlite-core"
import { timestamps } from "../helpers"
import { auth_users } from "./auth_users"

export const whatsapp_links = sqliteTable("whatsapp_links", {
	userId: text()
		.primaryKey()
		.references(() => auth_users.id, { onDelete: "cascade" }),
	waId: text().notNull().unique(),
	...timestamps,
})

export const whatsappLinksRelations = relations(whatsapp_links, ({ one }) => ({
	user: one(auth_users, {
		fields: [whatsapp_links.userId],
		references: [auth_users.id],
	}),
}))

export type InsertWhatsappLink = typeof whatsapp_links.$inferInsert
export type SelectWhatsappLink = typeof whatsapp_links.$inferSelect
