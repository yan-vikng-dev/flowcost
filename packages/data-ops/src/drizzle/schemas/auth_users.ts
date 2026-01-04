import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { timestamps } from "./helpers"

export const auth_users = sqliteTable("auth_users", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull().unique(),
	image: text(),
	emailVerified: integer({ mode: "boolean" }).default(false).notNull(),
	...timestamps,
})
