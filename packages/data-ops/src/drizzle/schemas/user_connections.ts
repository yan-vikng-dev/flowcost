import { relations } from "drizzle-orm"
import { sqliteTable, text } from "drizzle-orm/sqlite-core"
import { timestamps } from "../helpers"
import { auth_users } from "./auth_users"

export const userConnectionStatus = ["pending", "accepted", "rejected"] as const

export type UserConnectionStatus =
	(typeof userConnectionStatus)[keyof typeof userConnectionStatus]

export const user_connections = sqliteTable("user_connections", {
	id: text()
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userAId: text()
		.notNull()
		.references(() => auth_users.id),
	userBId: text()
		.notNull()
		.references(() => auth_users.id),
	status: text({ enum: userConnectionStatus }).notNull().default("pending"),
	...timestamps,
})

export const userConnectionsRelations = relations(
	user_connections,
	({ one }) => ({
		userA: one(auth_users, {
			fields: [user_connections.userAId],
			references: [auth_users.id],
		}),
		userB: one(auth_users, {
			fields: [user_connections.userBId],
			references: [auth_users.id],
		}),
	}),
)
