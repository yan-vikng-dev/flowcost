import { relations } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { auth_users } from "./auth_users"
import { timestamps } from "./helpers"

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
	...timestamps,
})

export const authAccountsRelations = relations(auth_accounts, ({ one }) => ({
	authUser: one(auth_users, {
		fields: [auth_accounts.userId],
		references: [auth_users.id],
	}),
}))
