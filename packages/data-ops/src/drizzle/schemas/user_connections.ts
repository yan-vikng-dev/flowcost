import { ne, relations } from "drizzle-orm"
import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { timestamps } from "../helpers"
import { auth_users } from "./auth_users"

export const userConnectionStatus = ["pending", "accepted", "rejected"] as const

export type UserConnectionStatus =
	(typeof userConnectionStatus)[keyof typeof userConnectionStatus]

export const user_connections = sqliteTable(
	"user_connections",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		inviterId: text()
			.notNull()
			.references(() => auth_users.id),
		inviteeId: text().references(() => auth_users.id),
		inviteeEmail: text(),
		status: text({ enum: userConnectionStatus }).notNull().default("pending"),
		...timestamps,
	},
	(table) => [
		check(
			"inviter_id_different_from_invitee_id",
			ne(table.inviterId, table.inviteeId),
		),
		index("user_connections_inviter_id_idx").on(table.inviterId),
		index("user_connections_invitee_id_idx").on(table.inviteeId),
		index("user_connections_invitee_email_idx").on(table.inviteeEmail),
	],
)

export const userConnectionsRelations = relations(
	user_connections,
	({ one }) => ({
		userA: one(auth_users, {
			fields: [user_connections.inviterId],
			references: [auth_users.id],
		}),
		userB: one(auth_users, {
			fields: [user_connections.inviteeId],
			references: [auth_users.id],
		}),
	}),
)
