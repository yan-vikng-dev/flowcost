import type { DrizzleDb } from "@repo/db/database/setup"
import type { MessageContext } from ".."
import { makeCreateEntryTool } from "./createEntry"
import { makeDeleteEntryTool } from "./deleteEntry"
import { makeGetEntriesTool } from "./getEntries"
import { makeUpdateEntryTool } from "./updateEntry"
import { makeUpdatePreferencesTool } from "./updatePreferences"

type ExecutableTool = {
	execute?: (input: never, options: never) => unknown
}

/**
 * The SDK executes same-step tool calls concurrently, but our tools share a
 * mutable MessageContext (update_preferences writes what get_entries reads).
 * Serialize execution in call order so a preference change always lands
 * before the next tool runs, and log each call for observability.
 */
function serializeToolExecution<T extends Record<string, ExecutableTool>>(
	tools: T,
): T {
	let chain: Promise<unknown> = Promise.resolve()
	for (const [name, toolDef] of Object.entries(tools)) {
		const original = toolDef.execute
		if (!original) continue
		const wrapped = ((input: never, options: never) => {
			const run = chain.then(() => {
				console.debug("tool call", { tool: name, input })
				return original(input, options)
			})
			chain = run.then(
				() => undefined,
				() => undefined,
			)
			return run
		}) as typeof original
		toolDef.execute = wrapped
	}
	return tools
}

export function createTools(
	messageContext: MessageContext,
	db: DrizzleDb,
	env: Env,
) {
	return serializeToolExecution({
		create_entry: makeCreateEntryTool(messageContext, db, env),
		get_entries: makeGetEntriesTool(messageContext, db, env),
		update_entry: makeUpdateEntryTool(messageContext, db),
		delete_entry: makeDeleteEntryTool(messageContext, db),
		update_preferences: makeUpdatePreferencesTool(messageContext, db, env),
	})
}
