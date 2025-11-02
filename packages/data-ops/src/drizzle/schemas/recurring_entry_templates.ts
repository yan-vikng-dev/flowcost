import { categories, currencies } from "@repo/shared-lib"
import { relations } from "drizzle-orm"
import {
	index,
	integer,
	real,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core"
import { auth_users } from "./auth_users"
import { entries } from "./entries"
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
		dtstart: integer({ mode: "timestamp_ms" }).notNull(),
		endAt: integer({ mode: "timestamp_ms" }),

		// Generation tracking
		generationValidUntil: integer({ mode: "timestamp_ms" }).notNull(),

		// Control
		isActive: integer({ mode: "boolean" }).notNull().default(true),

		...timestamps,
	},
	(table) => [
		index("recurring_entry_templates_by_user_idx").on(
			table.userId,
			table.isActive,
		),
		index("recurring_entry_templates_by_valid_until_idx").on(
			table.generationValidUntil,
		),
		index("recurring_entry_templates_by_end_at_idx").on(table.endAt),
	],
)

export const recurringEntryTemplatesRelations = relations(
	recurring_entry_templates,
	({ one, many }) => ({
		user: one(auth_users, {
			fields: [recurring_entry_templates.userId],
			references: [auth_users.id],
		}),
		entries: many(entries),
	}),
)

export type InsertRecurringEntryTemplate =
	typeof recurring_entry_templates.$inferInsert
export type SelectRecurringEntryTemplate =
	typeof recurring_entry_templates.$inferSelect
