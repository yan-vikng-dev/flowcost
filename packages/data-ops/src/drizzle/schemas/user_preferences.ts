import { currencies } from "@repo/shared-config"
import { relations } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { timestamps } from "../helpers"
import { auth_users } from "./auth_users"

export const user_preferences = sqliteTable("user_preferences", {
	userId: text()
		.primaryKey()
		.references(() => auth_users.id, { onDelete: "cascade" }),
	defaultEntryCurrency: text({ enum: currencies }).notNull().default("USD"),
	displayCurrency: text({ enum: currencies }).notNull().default("USD"),
	timezone: text().notNull().default("UTC"),
	reportsDailyEnabled: integer({ mode: "boolean" }).default(false).notNull(),
	reportsWeeklyEnabled: integer({ mode: "boolean" }).default(false).notNull(),
	reportsMonthlyEnabled: integer({ mode: "boolean" }).default(false).notNull(),
	reportsTime: text().notNull().default("20:00"),
	reportsWeeklyDay: integer().notNull().default(0), // 0 = Sunday
	...timestamps,
})

export const userPreferencesRelations = relations(
	user_preferences,
	({ one }) => ({
		user: one(auth_users, {
			fields: [user_preferences.userId],
			references: [auth_users.id],
		}),
	}),
)

export type InsertUserPreferences = typeof user_preferences.$inferInsert
export type SelectUserPreferences = typeof user_preferences.$inferSelect
