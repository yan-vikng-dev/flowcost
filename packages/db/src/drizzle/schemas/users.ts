import { currencies } from "@repo/shared-lib"
import { relations } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { connection_requests } from "./connection_requests"
import { entries } from "./entries"
import { timestamps } from "./helpers"
import { user_connections } from "./user_connections"

export const users = sqliteTable("users", {
	id: text()
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	waId: text().notNull().unique(),
	displayName: text(),
	defaultEntryCurrency: text({ enum: currencies }).notNull().default("USD"),
	displayCurrency: text({ enum: currencies }).notNull().default("USD"),
	timezone: text().notNull().default("UTC"),
	reportsTime: text().notNull().default("20:00"),
	reportsWeeklyDay: integer().notNull().default(0), // 0 = Sunday
	onboardedAt: integer({ mode: "timestamp_ms" }),
	...timestamps,
})

export const usersRelations = relations(users, ({ many }) => ({
	entries: many(entries),
	connectionRequests: many(connection_requests),
	connectionsLow: many(user_connections, { relationName: "userLow" }),
	connectionsHigh: many(user_connections, { relationName: "userHigh" }),
}))

export type InsertUser = typeof users.$inferInsert
export type SelectUser = typeof users.$inferSelect
