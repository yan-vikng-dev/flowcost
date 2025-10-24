import { relations } from "drizzle-orm"
import {
	integer,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core"
import { timestamps } from "../helpers"
import { auth_users } from "./auth_users"

export const auth_sessions = sqliteTable(
	"auth_sessions",
	{
		id: text().primaryKey().notNull(),
		expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
		token: text().notNull().unique(),
		ipAddress: text(),
		userAgent: text(),
		userId: text()
			.notNull()
			.references(() => auth_users.id, { onDelete: "cascade" }),
		...timestamps,
	},
)

export const authSessionsRelations = relations(auth_sessions, ({ one }) => ({
	authUser: one(auth_users, {
		fields: [auth_sessions.userId],
		references: [auth_users.id],
	}),
}))
