import { categories, currencies } from "@repo/shared-lib"
import { relations } from "drizzle-orm"
import { index, real, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { timestamps } from "./helpers"
import { users } from "./users"

export type InsertEntry = typeof entries.$inferInsert
export type SelectEntry = typeof entries.$inferSelect

export const entries = sqliteTable(
	"entries",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		amount: real().notNull(),
		currency: text({ enum: currencies }).notNull(),
		category: text({ enum: categories }).notNull(),
		description: text(),
		userId: text()
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		executedDate: text().notNull(),
		...timestamps,
	},
	(table) => [
		index("entries_by_user_id_idx").on(table.userId),
		index("entries_by_user_id_executed_date_idx").on(
			table.userId,
			table.executedDate,
		),
	],
)

export const entriesRelations = relations(entries, ({ one }) => ({
	user: one(users, {
		fields: [entries.userId],
		references: [users.id],
	}),
}))
