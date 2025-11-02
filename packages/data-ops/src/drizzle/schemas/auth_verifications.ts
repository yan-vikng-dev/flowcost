import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { timestamps } from "./helpers"

export const auth_verifications = sqliteTable("auth_verifications", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
	...timestamps,
})
