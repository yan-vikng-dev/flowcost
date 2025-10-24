import { currencies } from "@repo/shared-config";
import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { auth_users } from "./auth_users";

export const user_preferences = sqliteTable("user_preferences", {
	userId: text()
		.primaryKey()
		.references(() => auth_users.id, { onDelete: "cascade" }),
	defaultEntryCurrency: text({ enum: currencies }).notNull().default("USD"),
	displayCurrency: text({ enum: currencies }).notNull().default("USD"),
	timezone: text().notNull().default("UTC"),
	createdAt: integer({ mode: "timestamp_ms" })
		.default(sql`(unixepoch() * 1000)`)
		.notNull(),
	updatedAt: integer({ mode: "timestamp_ms" })
		.default(sql`(unixepoch() * 1000)`)
		.$onUpdate(() => new Date())
		.notNull(),
});

export const userPreferencesRelations = relations(
	user_preferences,
	({ one }) => ({
		user: one(auth_users, {
			fields: [user_preferences.userId],
			references: [auth_users.id],
		}),
	}),
);

export type InsertUserPreferences = typeof user_preferences.$inferInsert;
export type SelectUserPreferences = typeof user_preferences.$inferSelect;
