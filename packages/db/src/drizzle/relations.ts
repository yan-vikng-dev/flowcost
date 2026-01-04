import { defineRelations } from "drizzle-orm"
import * as schema from "./schemas"

export const relations = defineRelations(schema, (r) => ({
	auth_accounts: {
		authUser: r.one.auth_users({
			from: r.auth_accounts.userId,
			to: r.auth_users.id,
			optional: false,
		}),
	},
	auth_sessions: {
		authUser: r.one.auth_users({
			from: r.auth_sessions.userId,
			to: r.auth_users.id,
			optional: false,
		}),
	},
	auth_users: {
		authAccounts: r.many.auth_accounts({
			from: r.auth_users.id,
			to: r.auth_accounts.userId,
		}),
		authSessions: r.many.auth_sessions({
			from: r.auth_users.id,
			to: r.auth_sessions.userId,
		}),
		entries: r.many.entries({
			from: r.auth_users.id,
			to: r.entries.userId,
		}),
		whatsappLinks: r.one.whatsapp_links({
			from: r.auth_users.id,
			to: r.whatsapp_links.userId,
		}),
		preferences: r.one.user_preferences({
			from: r.auth_users.id,
			to: r.user_preferences.userId,
			optional: false,
		}),
	},
	budgets: {
		user: r.one.auth_users({
			from: r.budgets.userId,
			to: r.auth_users.id,
			optional: false,
		}),
	},
	entries: {
		user: r.one.auth_users({
			from: r.entries.userId,
			to: r.auth_users.id,
			optional: false,
		}),
		recurringTemplate: r.one.recurring_entry_templates({
			from: r.entries.recurringTemplateId,
			to: r.recurring_entry_templates.id,
		}),
	},
	recurring_entry_templates: {
		user: r.one.auth_users({
			from: r.recurring_entry_templates.userId,
			to: r.auth_users.id,
			optional: false,
		}),
		entries: r.many.entries({
			from: r.recurring_entry_templates.id,
			to: r.entries.recurringTemplateId,
		}),
	},
	user_connection_invitations: {
		inviter: r.one.auth_users({
			from: r.user_connection_invitations.inviterUserId,
			to: r.auth_users.id,
			optional: false,
		}),
		invitee: r.one.auth_users({
			from: r.user_connection_invitations.inviteeUserId,
			to: r.auth_users.id,
		}),
	},
	user_connections: {
		userLow: r.one.auth_users({
			from: r.user_connections.userIdLow,
			to: r.auth_users.id,
			optional: false,
		}),
		userHigh: r.one.auth_users({
			from: r.user_connections.userIdHigh,
			to: r.auth_users.id,
			optional: false,
		}),
	},
	user_preferences: {
		user: r.one.auth_users({
			from: r.user_preferences.userId,
			to: r.auth_users.id,
			optional: false,
		}),
	},
	whatsapp_links: {
		user: r.one.auth_users({
			from: r.whatsapp_links.userId,
			to: r.auth_users.id,
			optional: false,
		}),
	},
}))
