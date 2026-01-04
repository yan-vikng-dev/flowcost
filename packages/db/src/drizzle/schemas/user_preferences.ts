import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { currencies } from "../../temp-lib/currencies"
import { auth_users } from "./auth_users"
import { timestamps } from "./helpers"

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

export type InsertUserPreferences = typeof user_preferences.$inferInsert
export type SelectUserPreferences = typeof user_preferences.$inferSelect
