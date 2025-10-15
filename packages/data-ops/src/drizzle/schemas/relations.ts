import { relations } from "drizzle-orm/relations";
import { auth_users, auth_accounts, auth_sessions } from "./auth";
import { entries } from "./entries";
import { user_preferences } from "./user_preferences";

export const authAccountsRelations = relations(auth_accounts, ({one}) => ({
	authUser: one(auth_users, {
		fields: [auth_accounts.userId],
		references: [auth_users.id]
	}),
}));

export const authUsersRelations = relations(auth_users, ({ many, one }) => ({
	authAccounts: many(auth_accounts),
	authSessions: many(auth_sessions),
	entries: many(entries),
  	preferences: one(user_preferences, {
  	  fields: [auth_users.id],
  	  references: [user_preferences.userId]
  	}),
}));

export const authSessionsRelations = relations(auth_sessions, ({one}) => ({
	authUser: one(auth_users, {
		fields: [auth_sessions.userId],
		references: [auth_users.id]
	}),
}));

export const entriesRelations = relations(entries, ({one}) => ({
	user: one(auth_users, {
		fields: [entries.userId],
		references: [auth_users.id]
	}),
}));

export const userPreferencesRelations = relations(user_preferences, ({ one }) => ({
  user: one(auth_users, {
    fields: [user_preferences.userId],
    references: [auth_users.id]
  })
}));
