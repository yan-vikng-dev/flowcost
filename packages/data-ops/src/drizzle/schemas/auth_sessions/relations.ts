import { relations } from "drizzle-orm/relations";
import { auth_sessions } from "./table";
import { auth_users } from "../auth_users";

export const authSessionsRelations = relations(auth_sessions, ({ one }) => ({
  authUser: one(auth_users, {
    fields: [auth_sessions.userId],
    references: [auth_users.id],
  }),
}));
