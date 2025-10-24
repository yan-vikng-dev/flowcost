import { relations, sql } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { auth_users } from "./auth_users"

export const auth_accounts = sqliteTable("auth_accounts", {
	id: text().primaryKey().notNull(),
	accountId: text().notNull(),
	providerId: text().notNull(),
	userId: text()
		.notNull()
		.references(() => auth_users.id, { onDelete: "cascade" }),
	accessToken: text(),
	refreshToken: text(),
	idToken: text(),
	accessTokenExpiresAt: integer({ mode: "timestamp_ms" }),
	refreshTokenExpiresAt: integer({ mode: "timestamp_ms" }),
	scope: text(),
	password: text(),
	createdAt: integer({ mode: "timestamp_ms" })
		.default(sql`(unixepoch() * 1000)`)
		.notNull(),
	updatedAt: integer({ mode: "timestamp_ms" })
		.default(sql`(unixepoch() * 1000)`)
		.$onUpdate(() => new Date())
		.notNull(),
})

export const authAccountsRelations = relations(auth_accounts, ({ one }) => ({
	authUser: one(auth_users, {
		fields: [auth_accounts.userId],
		references: [auth_users.id],
	}),
}))
