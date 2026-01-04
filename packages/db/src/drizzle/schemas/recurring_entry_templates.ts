import { index, real, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { categories } from "../../temp-lib/categories"
import { currencies } from "../../temp-lib/currencies"
import { auth_users } from "./auth_users"
import { entryTypes, timestamps } from "./helpers"

export const recurring_entry_templates = sqliteTable(
	"recurring_entry_templates",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text()
			.notNull()
			.references(() => auth_users.id, { onDelete: "cascade" }),

		// Entry fields (mirror entries columns)
		amount: real().notNull(),
		currency: text({ enum: currencies }).notNull(),
		category: text({ enum: categories }).notNull(),
		entryType: text({ enum: entryTypes }).notNull(),
		description: text(),

		// Recurrence configuration
		rrule: text().notNull(), // stored without DTSTART/UNTIL/COUNT
		dtstartDate: text().notNull(),
		endDate: text(),

		// Generation tracking
		generationValidUntil: text().notNull(),

		...timestamps,
	},
	(table) => [
		index("recurring_entry_templates_by_user_idx").on(table.userId),
		index("recurring_entry_templates_by_valid_until_idx").on(
			table.generationValidUntil,
		),
	],
)

export type InsertRecurringEntryTemplate =
	typeof recurring_entry_templates.$inferInsert
export type SelectRecurringEntryTemplate =
	typeof recurring_entry_templates.$inferSelect
