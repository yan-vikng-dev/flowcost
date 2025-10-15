import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

export const auth_accounts = sqliteTable("auth_accounts", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull().references(() => auth_users.id, { onDelete: "cascade" } ),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
	refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
	scope: text(),
	password: text(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(unixepoch() * 1000)`)
		.$onUpdate(() => sql`(unixepoch() * 1000)`)
		.notNull(),
});

export const auth_sessions = sqliteTable("auth_sessions", {
	id: text().primaryKey().notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
	token: text().notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(unixepoch() * 1000)`)
		.$onUpdate(() => sql`(unixepoch() * 1000)`)
		.notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull().references(() => auth_users.id, { onDelete: "cascade" } ),
},
(table) => [
	uniqueIndex("auth_sessions_token_unique").on(table.token),
]);

export const auth_users = sqliteTable("auth_users", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	image: text(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(unixepoch() * 1000)`)
		.$onUpdate(() => sql`(unixepoch() * 1000)`)
		.notNull(),
	emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
},
(table) => [
	uniqueIndex("auth_users_email_unique").on(table.email),
]);

export const auth_verifications = sqliteTable("auth_verifications", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(unixepoch() * 1000)`)
		.$onUpdate(() => sql`(unixepoch() * 1000)`)
		.notNull(),
});
