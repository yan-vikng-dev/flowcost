import { relations } from "drizzle-orm"
import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { auth_users } from "./auth_users"
import { timestamps } from "./helpers"

export const user_connections = sqliteTable(
	"user_connections",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userIdLow: text()
			.notNull()
			.references(() => auth_users.id, { onDelete: "cascade" }),
		userIdHigh: text()
			.notNull()
			.references(() => auth_users.id, { onDelete: "cascade" }),
		...timestamps,
	},
	(table) => {
		return {
			pairUnique: uniqueIndex("user_connections_pair_unique").on(
				table.userIdLow,
				table.userIdHigh,
			),
			byUserLow: index("user_connections_user_low_idx").on(table.userIdLow),
			byUserHigh: index("user_connections_user_high_idx").on(table.userIdHigh),
		}
	},
)

export const userConnectionsRelations = relations(
	user_connections,
	({ one }) => ({
		userLow: one(auth_users, {
			fields: [user_connections.userIdLow],
			references: [auth_users.id],
		}),
		userHigh: one(auth_users, {
			fields: [user_connections.userIdHigh],
			references: [auth_users.id],
		}),
	}),
)

export type InsertUserConnection = typeof user_connections.$inferInsert
export type SelectUserConnection = typeof user_connections.$inferSelect
