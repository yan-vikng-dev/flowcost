import { auth_users } from "./table";
import { relations } from "drizzle-orm/relations";
import { auth_accounts } from "../auth_accounts/table";
import { auth_sessions } from "../auth_sessions/table";
import { entries } from "../entries/table";
import { user_preferences } from "../user_preferences/table";

export const authUsersRelations = relations(auth_users, ({ many, one }) => ({
  authAccounts: many(auth_accounts),
  authSessions: many(auth_sessions),
  entries: many(entries),
  preferences: one(user_preferences, {
    fields: [auth_users.id],
    references: [user_preferences.userId],
  }),
}));
