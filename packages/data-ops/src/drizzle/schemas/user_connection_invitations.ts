import { relations } from "drizzle-orm"
import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core"
import { timestamps } from "../helpers"
import { auth_users } from "./auth_users"

export const invitationStatuses = [
	"pending",
	"accepted",
	"declined",
	"expired",
] as const
export type InvitationStatus = (typeof invitationStatuses)[number]

export const user_connection_invitations = sqliteTable(
	"user_connection_invitations",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		inviterUserId: text()
			.notNull()
			.references(() => auth_users.id, { onDelete: "cascade" }),
		inviteeEmail: text().notNull(),
		inviteeUserId: text().references(() => auth_users.id, {
			onDelete: "set null",
		}),
		token: text().notNull(),
		status: text({ enum: invitationStatuses }).notNull().default("pending"),
		expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
		respondedAt: integer({ mode: "timestamp_ms" }),
		...timestamps,
	},
	(table) => {
		return {
			tokenUnique: uniqueIndex("uci_token_unique").on(table.token),
			byInviter: index("uci_inviter_idx").on(table.inviterUserId),
			byInviteeEmail: index("uci_invitee_email_idx").on(table.inviteeEmail),
		}
	},
)

export const userConnectionInvitationsRelations = relations(
	user_connection_invitations,
	({ one }) => ({
		inviter: one(auth_users, {
			fields: [user_connection_invitations.inviterUserId],
			references: [auth_users.id],
		}),
		invitee: one(auth_users, {
			fields: [user_connection_invitations.inviteeUserId],
			references: [auth_users.id],
		}),
	}),
)

export type InsertUserConnectionInvitation =
	typeof user_connection_invitations.$inferInsert
export type SelectUserConnectionInvitation =
	typeof user_connection_invitations.$inferSelect
