import type { DrizzleDb } from "@repo/db/database/setup"
import type { MessageContext } from ".."
import { makeCreateEntryTool } from "./createEntry"
import { makeDeleteEntryTool } from "./deleteEntry"
import { makeGetEntriesTool } from "./getEntries"
import { makeUpdateEntryTool } from "./updateEntry"
import { makeUpdatePreferencesTool } from "./updatePreferences"

export function createTools(
	messageContext: MessageContext,
	db: DrizzleDb,
	env: Env,
) {
	return {
		create_entry: makeCreateEntryTool(messageContext, db, env),
		get_entries: makeGetEntriesTool(messageContext, db, env),
		update_entry: makeUpdateEntryTool(messageContext, db),
		delete_entry: makeDeleteEntryTool(messageContext, db),
		update_preferences: makeUpdatePreferencesTool(messageContext, db, env),
	}
}
