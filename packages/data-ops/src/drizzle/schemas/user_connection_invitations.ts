import { relations } from "drizzle-orm"
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { auth_users } from "./auth_users"
import { timestamps } from "./helpers"

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
		status: text({ enum: invitationStatuses }).notNull().default("pending"),
		...timestamps,
	},
	(table) => [
		index("uci_inviter_idx").on(table.inviterUserId),
		index("uci_invitee_email_idx").on(table.inviteeEmail),
	],
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
