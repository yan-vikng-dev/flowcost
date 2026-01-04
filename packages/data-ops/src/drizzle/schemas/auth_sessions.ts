import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { auth_users } from "./auth_users"
import { timestamps } from "./helpers"

export const auth_sessions = sqliteTable("auth_sessions", {
	id: text().primaryKey().notNull(),
	expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
	token: text().notNull().unique(),
	ipAddress: text(),
	userAgent: text(),
	userId: text()
		.notNull()
		.references(() => auth_users.id, { onDelete: "cascade" }),
	...timestamps,
})
