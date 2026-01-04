import type { DrizzleDb } from "@repo/db/database/setup"
import type { MessageContext } from ".."
import { makeCreateBudgetTool } from "./createBudget"
import { makeCreateEntryTool } from "./createEntry"
import { makeDeleteBudgetTool } from "./deleteBudget"
import { makeDeleteEntryTool } from "./deleteEntry"
import { makeGetBudgetsTool } from "./getBudgets"
import { makeGetEntriesTool } from "./getEntries"
import { makeUpdateBudgetTool } from "./updateBudget"
import { makeUpdateEntryTool } from "./updateEntry"
import { makeUpdatePreferencesTool } from "./updatePreferences"

export function createTools(messageContext: MessageContext, db: DrizzleDb) {
	return {
		get_budgets: makeGetBudgetsTool(messageContext, db),
		create_budget: makeCreateBudgetTool(messageContext, db),
		update_budget: makeUpdateBudgetTool(messageContext, db),
		delete_budget: makeDeleteBudgetTool(messageContext, db),
		create_entry: makeCreateEntryTool(messageContext, db),
		get_entries: makeGetEntriesTool(messageContext, db),
		update_preferences: makeUpdatePreferencesTool(messageContext, db),
		update_entry: makeUpdateEntryTool(messageContext, db),
		delete_entry: makeDeleteEntryTool(messageContext, db),
	}
}
