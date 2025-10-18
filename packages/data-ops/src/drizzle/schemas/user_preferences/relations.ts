import { relations } from "drizzle-orm";
import { user_preferences } from "./table";
import { auth_users } from "../auth_users";

export const userPreferencesRelations = relations(user_preferences, ({ one }) => ({
  user: one(auth_users, {
    fields: [user_preferences.userId],
    references: [auth_users.id],
  }),
}));
