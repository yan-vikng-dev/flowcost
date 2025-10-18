import { relations } from "drizzle-orm/relations";
import { auth_users } from "../auth_users/table";
import { auth_accounts } from "./table";

export const authAccountsRelations = relations(auth_accounts, ({ one }) => ({
  authUser: one(auth_users, {
    fields: [auth_accounts.userId],
    references: [auth_users.id],
  }),
}));
