import { relations } from "drizzle-orm"
import {
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core"
import { timestamps } from "../helpers"
import { auth_accounts } from "./auth_accounts"
import { auth_sessions } from "./auth_sessions"
import { entries } from "./entries"
import { user_preferences } from "./user_preferences"
import { whatsapp_links } from "./whatsapp_links"

export const auth_users = sqliteTable(
	"auth_users",
	{
		id: text().primaryKey().notNull(),
		name: text().notNull(),
		email: text().notNull(),
		image: text(),
		emailVerified: integer({ mode: "boolean" }).default(false).notNull(),
		...timestamps,
	},
	(table) => [uniqueIndex("auth_users_email_unique").on(table.email)],
)

export const authUsersRelations = relations(auth_users, ({ many, one }) => ({
	authAccounts: many(auth_accounts),
	authSessions: many(auth_sessions),
	entries: many(entries),
	whatsappLinks: one(whatsapp_links, {
		fields: [auth_users.id],
		references: [whatsapp_links.userId],
	}),
	preferences: one(user_preferences, {
		fields: [auth_users.id],
		references: [user_preferences.userId],
	}),
}))
