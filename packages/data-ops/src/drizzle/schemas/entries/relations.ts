import { relations } from "drizzle-orm";
import { entries } from "./table";
import { auth_users } from "../auth_users";

export const entriesRelations = relations(entries, ({ one }) => ({
  user: one(auth_users, {
    fields: [entries.userId],
    references: [auth_users.id],
  }),
}));
