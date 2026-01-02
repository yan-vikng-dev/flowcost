import type { DrizzleDb } from "@repo/data-ops/database/setup"
import type { MessageContext } from ".."
import { makeCreateEntryTool } from "./createEntry"
import { makeDeleteEntryTool } from "./deleteEntry"
import { makeGetEntriesTool } from "./getEntries"
import { makeUpdateEntryTool } from "./updateEntry"
import { makeUpdatePreferencesTool } from "./updatePreferences"

export function createTools(messageContext: MessageContext, db: DrizzleDb) {
	return {
		create_entry: makeCreateEntryTool(messageContext, db),
		get_entries: makeGetEntriesTool(messageContext, db),
		update_preferences: makeUpdatePreferencesTool(messageContext, db),
		update_entry: makeUpdateEntryTool(messageContext, db),
		delete_entry: makeDeleteEntryTool(messageContext, db),
	}
}
