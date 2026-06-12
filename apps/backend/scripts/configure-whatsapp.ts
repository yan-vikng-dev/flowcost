// Run: pnpm wa:config  (or pnpm wa:config:dry for read-only diff)
// Node 24+ executes .ts directly via native type stripping; --experimental-strip-types is optional.

import {
	type BotCommand,
	type ConversationalAutomationConfig,
	conversationalAutomation,
	type MessageTemplateConfig,
	messageTemplates,
} from "./whatsapp-config.ts"

const GRAPH_API_VERSION = "v24.0"
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

type GraphError = {
	error?: {
		message?: string
		type?: string
		code?: number
		error_subcode?: number
		fbtrace_id?: string
	}
}

type LiveTemplate = {
	id: string
	name: string
	status: string
	language: string
	category: string
	components?: unknown[]
}

type LiveTemplatesResponse = {
	data?: LiveTemplate[]
} & GraphError

type LivePhoneNumberResponse = {
	conversational_automation?: ConversationalAutomationConfig
} & GraphError

const dryRun = process.argv.includes("--dry-run")

function requireEnv(name: string): string {
	const value = process.env[name]
	if (!value) {
		console.error(`Missing required environment variable: ${name}`)
		process.exit(1)
	}
	return value
}

async function graphRequest<T>(path: string, init?: RequestInit): Promise<T> {
	const token = requireEnv("WHATSAPP_ACCESS_TOKEN")
	const response = await fetch(`${GRAPH_API_BASE}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			...init?.headers,
		},
	})

	const body = (await response.json()) as T & GraphError
	if (!response.ok) {
		console.error(
			`Graph API error (${response.status} ${response.statusText}):`,
		)
		console.error(JSON.stringify(body, null, 2))
		process.exit(1)
	}

	return body
}

function stableStringify(value: unknown): string {
	return JSON.stringify(value, (_key, current) => {
		if (Array.isArray(current)) {
			return current
		}
		if (current && typeof current === "object") {
			const record = current as Record<string, unknown>
			return Object.fromEntries(
				Object.keys(record)
					.sort()
					.map((key) => [key, record[key]]),
			)
		}
		return current
	})
}

function normalizeCommands(commands: BotCommand[] | undefined): BotCommand[] {
	return [...(commands ?? [])].sort((a, b) =>
		a.command_name.localeCompare(b.command_name),
	)
}

function normalizeConversationalAutomation(
	config: ConversationalAutomationConfig | undefined,
): ConversationalAutomationConfig {
	return {
		enable_welcome_message: config?.enable_welcome_message ?? false,
		prompts: [...(config?.prompts ?? [])],
		commands: normalizeCommands(config?.commands),
	}
}

type NormalizedTemplateComponent =
	| {
			type: "BODY"
			text: string
			example?: { body_text: string[][] }
	  }
	| {
			type: "BUTTONS"
			buttons: Array<{ type: string; text: string }>
	  }

function normalizeTemplateComponents(
	components: unknown[] | undefined,
): NormalizedTemplateComponent[] {
	return (components ?? []).map((component) => {
		const record = component as Record<string, unknown>
		const type = String(record["type"] ?? "").toUpperCase()

		if (type === "BODY") {
			return {
				type: "BODY",
				text: String(record["text"] ?? ""),
				example: record["example"] as
					| { body_text: string[][] }
					| undefined,
			}
		}

		if (type === "BUTTONS") {
			const buttons = Array.isArray(record["buttons"])
				? record["buttons"]
				: []
			return {
				type: "BUTTONS",
				buttons: buttons.map((button) => {
					const btn = button as Record<string, unknown>
					return {
						type: String(btn["type"] ?? "").toUpperCase(),
						text: String(btn["text"] ?? ""),
					}
				}),
			}
		}

		throw new Error(`Unsupported template component type: ${type}`)
	})
}

function componentsEqual(
	live: unknown[] | undefined,
	desired: MessageTemplateConfig["components"],
): boolean {
	return (
		stableStringify(normalizeTemplateComponents(live)) ===
		stableStringify(normalizeTemplateComponents(desired))
	)
}

function printSection(title: string) {
	console.log(`\n=== ${title} ===`)
}

function printConversationalDiff(
	live: ConversationalAutomationConfig | undefined,
	desired: ConversationalAutomationConfig,
) {
	const normalizedLive = normalizeConversationalAutomation(live)
	const normalizedDesired = normalizeConversationalAutomation(desired)

	printSection("Conversational automation")

	if (
		normalizedLive.enable_welcome_message !==
		normalizedDesired.enable_welcome_message
	) {
		console.log(
			`  enable_welcome_message: ${normalizedLive.enable_welcome_message} -> ${normalizedDesired.enable_welcome_message}`,
		)
	} else {
		console.log(
			`  enable_welcome_message: ${normalizedDesired.enable_welcome_message} (unchanged)`,
		)
	}

	if (
		stableStringify(normalizedLive.prompts) !==
		stableStringify(normalizedDesired.prompts)
	) {
		console.log("  prompts:")
		console.log(`    live:    ${JSON.stringify(normalizedLive.prompts)}`)
		console.log(`    desired: ${JSON.stringify(normalizedDesired.prompts)}`)
	} else {
		console.log(
			`  prompts: ${JSON.stringify(normalizedDesired.prompts)} (unchanged)`,
		)
	}

	if (
		stableStringify(normalizedLive.commands) !==
		stableStringify(normalizedDesired.commands)
	) {
		console.log("  commands:")
		console.log(`    live:    ${JSON.stringify(normalizedLive.commands)}`)
		console.log(`    desired: ${JSON.stringify(normalizedDesired.commands)}`)
	} else {
		console.log("  commands: (unchanged)")
		for (const command of normalizedDesired.commands) {
			console.log(
				`    /${command.command_name} — ${command.command_description}`,
			)
		}
	}

	return stableStringify(normalizedLive) !== stableStringify(normalizedDesired)
}

function printTemplateDiff(
	liveTemplates: LiveTemplate[],
	desiredTemplates: MessageTemplateConfig[],
) {
	printSection("Message templates")

	for (const desired of desiredTemplates) {
		const live = liveTemplates.find(
			(template) =>
				template.name === desired.name &&
				template.language === desired.language,
		)

		if (!live) {
			console.log(`  ${desired.name} (${desired.language}): will CREATE`)
			continue
		}

		const same = componentsEqual(live.components, desired.components)
		if (same) {
			console.log(
				`  ${desired.name} (${desired.language}): unchanged [${live.status}]`,
			)
		} else {
			console.log(
				`  ${desired.name} (${desired.language}): will UPDATE [current status: ${live.status}]`,
			)
			console.log(
				`    live components:    ${JSON.stringify(normalizeTemplateComponents(live.components))}`,
			)
			console.log(
				`    desired components: ${JSON.stringify(normalizeTemplateComponents(desired.components))}`,
			)
		}
	}

	const undeclared = liveTemplates.filter(
		(template) =>
			!desiredTemplates.some(
				(desired) =>
					desired.name === template.name &&
					desired.language === template.language,
			),
	)
	if (undeclared.length > 0) {
		console.log("  undeclared templates on WABA (left untouched):")
		for (const template of undeclared) {
			console.log(
				`    ${template.name} (${template.language}) [${template.status}]`,
			)
		}
	}
}

async function applyConversationalAutomation(
	phoneNumberId: string,
	desired: ConversationalAutomationConfig,
) {
	console.log("\nApplying conversational automation...")
	await graphRequest(`/${phoneNumberId}/conversational_automation`, {
		method: "POST",
		body: JSON.stringify(desired),
	})
	console.log("  conversational automation updated")
}

async function applyTemplates(
	wabaId: string,
	liveTemplates: LiveTemplate[],
	desiredTemplates: MessageTemplateConfig[],
) {
	for (const desired of desiredTemplates) {
		const live = liveTemplates.find(
			(template) =>
				template.name === desired.name &&
				template.language === desired.language,
		)

		if (!live) {
			console.log(
				`\nCreating template ${desired.name} (${desired.language})...`,
			)
			await graphRequest(`/${wabaId}/message_templates`, {
				method: "POST",
				body: JSON.stringify({
					name: desired.name,
					language: desired.language,
					category: desired.category,
					components: desired.components,
				}),
			})
			console.log("  created (status will be PENDING until Meta approves)")
			continue
		}

		if (componentsEqual(live.components, desired.components)) {
			console.log(
				`\nTemplate ${desired.name} (${desired.language}): skipped [${live.status}]`,
			)
			continue
		}

		console.log(
			`\nUpdating template ${desired.name} (${desired.language}) [was ${live.status}]...`,
		)
		await graphRequest(`/${live.id}`, {
			method: "POST",
			body: JSON.stringify({
				category: desired.category,
				components: desired.components,
			}),
		})
		console.log("  updated (may re-enter review)")
	}
}

async function refreshTemplateStatuses(
	wabaId: string,
	desiredTemplates: MessageTemplateConfig[],
) {
	const refreshed = await graphRequest<LiveTemplatesResponse>(
		`/${wabaId}/message_templates?fields=name,status,language,category,components&limit=100`,
	)

	printSection("Template status after apply")
	for (const desired of desiredTemplates) {
		const live = refreshed.data?.find(
			(template) =>
				template.name === desired.name &&
				template.language === desired.language,
		)
		if (live) {
			console.log(`  ${live.name} (${live.language}): ${live.status}`)
		} else {
			console.log(`  ${desired.name} (${desired.language}): not found`)
		}
	}
}

async function main() {
	const phoneNumberId = requireEnv("WHATSAPP_PHONE_NUMBER_ID")
	const wabaId = requireEnv("WHATSAPP_BUSINESS_ACCOUNT_ID")

	console.log(
		dryRun ? "WhatsApp config dry-run (read-only)" : "WhatsApp config apply",
	)
	console.log(`Graph API ${GRAPH_API_VERSION}`)
	console.log(`Phone number ID: ${phoneNumberId}`)
	console.log(`WABA ID: ${wabaId}`)

	const phoneNumber = await graphRequest<LivePhoneNumberResponse>(
		`/${phoneNumberId}?fields=conversational_automation`,
	)
	const templates = await graphRequest<LiveTemplatesResponse>(
		`/${wabaId}/message_templates?fields=name,status,language,category,components&limit=100`,
	)

	const liveTemplates = templates.data ?? []
	const conversationalChanged = printConversationalDiff(
		phoneNumber.conversational_automation,
		conversationalAutomation,
	)
	printTemplateDiff(liveTemplates, messageTemplates)

	const templateChanges = messageTemplates.some((desired) => {
		const live = liveTemplates.find(
			(template) =>
				template.name === desired.name &&
				template.language === desired.language,
		)
		return !live || !componentsEqual(live.components, desired.components)
	})

	if (!conversationalChanged && !templateChanges) {
		console.log("\nNo changes needed.")
		return
	}

	if (dryRun) {
		console.log("\nDry-run complete. Re-run without --dry-run to apply.")
		return
	}

	if (conversationalChanged) {
		await applyConversationalAutomation(phoneNumberId, conversationalAutomation)
	}

	if (templateChanges) {
		await applyTemplates(wabaId, liveTemplates, messageTemplates)
		await refreshTemplateStatuses(wabaId, messageTemplates)
	}

	console.log("\nDone.")
}

main().catch((error: unknown) => {
	console.error("Unexpected error:")
	console.error(error)
	process.exit(1)
})
