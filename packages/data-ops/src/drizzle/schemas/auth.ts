import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

export const auth_accounts = sqliteTable("auth_accounts", {
	id: text().primaryKey().notNull(),
	accountId: text().notNull(),
	providerId: text().notNull(),
	userId: text().notNull().references(() => auth_users.id, { onDelete: "cascade" } ),
	accessToken: text(),
	refreshToken: text(),
	idToken: text(),
	accessTokenExpiresAt: integer({ mode: "timestamp_ms" }),
	refreshTokenExpiresAt: integer({ mode: "timestamp_ms" }),
	scope: text(),
	password: text(),
	createdAt: integer({ mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer({ mode: "timestamp_ms" })
		.default(sql`(unixepoch() * 1000)`)
		.$onUpdate(() => new Date())
		.notNull(),
});

export const auth_sessions = sqliteTable("auth_sessions", {
	id: text().primaryKey().notNull(),
	expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
	token: text().notNull(),
	createdAt: integer({ mode: "timestamp_ms" }).default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
	updatedAt: integer({ mode: "timestamp_ms" })
		.default(sql`(unixepoch() * 1000)`)
		.$onUpdate(() => new Date())
		.notNull(),
	ipAddress: text(),
	userAgent: text(),
	userId: text().notNull().references(() => auth_users.id, { onDelete: "cascade" } ),
},
(table) => [
	uniqueIndex("auth_sessions_token_unique").on(table.token),
]);

export const auth_users = sqliteTable("auth_users", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	image: text(),
	createdAt: integer({ mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer({ mode: "timestamp_ms" })
		.default(sql`(unixepoch() * 1000)`)
		.$onUpdate(() => new Date())
		.notNull(),
	emailVerified: integer({ mode: "boolean" }).default(false).notNull(),
},
(table) => [
	uniqueIndex("auth_users_email_unique").on(table.email),
]);

export const auth_verifications = sqliteTable("auth_verifications", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
	createdAt: integer({ mode: "timestamp_ms" }).default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
	updatedAt: integer({ mode: "timestamp_ms" })
		.default(sql`(unixepoch() * 1000)`)
		.$onUpdate(() => new Date())
		.notNull(),
});
