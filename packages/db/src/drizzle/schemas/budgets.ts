import { type Category, currencies } from "@repo/shared-lib"
import { relations } from "drizzle-orm"
import { index, real, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { auth_users } from "./auth_users"
import { timestamps } from "./helpers"

export const budgets = sqliteTable(
	"budgets",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		amount: real().notNull(),
		currency: text({ enum: currencies }).notNull(),
		categories: text("categories", { mode: "json" })
			.$type<Category[]>()
			.notNull(),
		userId: text()
			.notNull()
			.references(() => auth_users.id, { onDelete: "cascade" }),
		...timestamps,
	},
	(table) => [index("budgets_by_user_idx").on(table.userId)],
)

export const budgetsRelations = relations(budgets, ({ one }) => ({
	user: one(auth_users, {
		fields: [budgets.userId],
		references: [auth_users.id],
	}),
}))

export type InsertBudget = typeof budgets.$inferInsert
export type SelectBudget = typeof budgets.$inferSelect
