import { categories, currencies } from "@repo/shared-lib"
import { relations } from "drizzle-orm"
import {
	index,
	integer,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core"
import { auth_users } from "./auth_users"
import { entryTypes, timestamps } from "./helpers"
import { recurring_entry_templates } from "./recurring_entry_templates"

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
		entryType: text({ enum: entryTypes }).notNull(),
		description: text(),
		userId: text()
			.notNull()
			.references(() => auth_users.id, { onDelete: "cascade" }),
		executedAt: integer({ mode: "timestamp_ms" }),
		executedDate: text().notNull(),

		// Recurring linkage & flags
		recurringTemplateId: text().references(() => recurring_entry_templates.id, {
			onDelete: "cascade",
		}),
		isOverridden: integer({ mode: "boolean" }).notNull().default(false),

		...timestamps,
	},
	(table) => [
		index("entries_by_user_id_idx").on(table.userId),
		index("entries_by_recurring_template_idx").on(table.recurringTemplateId),
		index("entries_by_user_id_executed_date_idx").on(
			table.userId,
			table.executedDate,
		),
		uniqueIndex("entries_recurring_unique_by_executed_date_idx").on(
			table.recurringTemplateId,
			table.executedDate,
		),
	],
)

export const entriesRelations = relations(entries, ({ one }) => ({
	user: one(auth_users, {
		fields: [entries.userId],
		references: [auth_users.id],
	}),
	recurringTemplate: one(recurring_entry_templates, {
		fields: [entries.recurringTemplateId],
		references: [recurring_entry_templates.id],
	}),
}))
