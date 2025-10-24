import { categories, currencies } from "@repo/shared-config"
import { relations } from "drizzle-orm"
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { timestamps } from "../helpers"
import { auth_users } from "./auth_users"

export const entryTypes = ["Expense", "Income"] as const
export type EntryType = (typeof entryTypes)[number]

export type InsertEntry = typeof entries.$inferInsert
export type SelectEntry = typeof entries.$inferSelect

export const entries = sqliteTable("entries", {
	id: text()
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	amount: real().notNull(),
	currency: text({ enum: currencies }).notNull(),
	category: text({ enum: categories }).notNull(),
	entryType: text({ enum: entryTypes }).notNull(),
	description: text(),
	userId: text()
		.notNull()
		.references(() => auth_users.id, { onDelete: "cascade" }),
	executedAt: integer({ mode: "timestamp_ms" }).notNull(),
	...timestamps,
})

export const entriesRelations = relations(entries, ({ one }) => ({
	user: one(auth_users, {
		fields: [entries.userId],
		references: [auth_users.id],
	}),
}))
