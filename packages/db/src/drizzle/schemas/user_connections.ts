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
	(table) => [
		uniqueIndex("user_connections_pair_unique").on(
			table.userIdLow,
			table.userIdHigh,
		),
		index("user_connections_user_low_idx").on(table.userIdLow),
		index("user_connections_user_high_idx").on(table.userIdHigh),
	],
)

export type InsertUserConnection = typeof user_connections.$inferInsert
export type SelectUserConnection = typeof user_connections.$inferSelect
