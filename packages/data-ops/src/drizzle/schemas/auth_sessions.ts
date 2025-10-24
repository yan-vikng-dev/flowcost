import { relations, sql } from "drizzle-orm";
import {
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { auth_users } from "./auth_users";

export const auth_sessions = sqliteTable(
	"auth_sessions",
	{
		id: text().primaryKey().notNull(),
		expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
		token: text().notNull(),
		createdAt: integer({ mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer({ mode: "timestamp_ms" })
			.default(sql`(unixepoch() * 1000)`)
			.$onUpdate(() => new Date())
			.notNull(),
		ipAddress: text(),
		userAgent: text(),
		userId: text()
			.notNull()
			.references(() => auth_users.id, { onDelete: "cascade" }),
	},
	(table) => [uniqueIndex("auth_sessions_token_unique").on(table.token)],
);

export const authSessionsRelations = relations(auth_sessions, ({ one }) => ({
	authUser: one(auth_users, {
		fields: [auth_sessions.userId],
		references: [auth_users.id],
	}),
}));
