import { relations } from "drizzle-orm"
import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { timestamps } from "./helpers"
import { users } from "./users"

export const user_connections = sqliteTable(
	"user_connections",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userIdLow: text()
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		userIdHigh: text()
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
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

export const userConnectionsRelations = relations(
	user_connections,
	({ one }) => ({
		userLow: one(users, {
			fields: [user_connections.userIdLow],
			references: [users.id],
			relationName: "userLow",
		}),
		userHigh: one(users, {
			fields: [user_connections.userIdHigh],
			references: [users.id],
			relationName: "userHigh",
		}),
	}),
)

export type InsertUserConnection = typeof user_connections.$inferInsert
export type SelectUserConnection = typeof user_connections.$inferSelect
