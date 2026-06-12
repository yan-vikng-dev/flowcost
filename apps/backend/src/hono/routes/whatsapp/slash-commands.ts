import type { SelectUser } from "@repo/db/drizzle/schemas/index"

export const exactSlashCommands = [
	"/new",
	"/help",
	"/settings",
	"/start",
	"/accept",
	"/decline",
	"/unpair",
] as const

export type ExactSlashCommand = (typeof exactSlashCommands)[number]

const weeklyDayNames = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
] as const

export function parsePairPhone(text: string): string | null {
	const match = text.match(/^\/pair\s+(.+)$/i)
	if (!match?.[1]) return null
	const digits = match[1].replace(/\D/g, "")
	return digits.length > 0 ? digits : null
}

export function isSlashCommand(text: string): boolean {
	if (exactSlashCommands.includes(text as ExactSlashCommand)) return true
	return parsePairPhone(text) !== null
}

export function buildHelpText(): string {
	return [
		"*What you can do*",
		"• Log expenses in plain language — e.g. *coffee 4.50* or *taxi 8 EUR yesterday*",
		"• Send receipt photos, voice notes, or PDFs — I'll extract the expense",
		"• Ask for totals — e.g. *how much this week?*",
		"• Edit or delete entries by describing them",
		"• Change settings by asking — e.g. *set my currency to EUR*",
		"",
		"*Commands*",
		"/help — this message",
		"/new — clear conversation context (expenses stay safe)",
		"/settings — show your current settings",
		"/start — replay the welcome tour",
		"/pair <phone> — invite someone to share expenses",
		"/unpair — stop sharing with your partner",
		"/accept — accept a pairing request",
		"/decline — decline a pairing request",
	].join("\n")
}

export function buildSettingsText(
	user: SelectUser,
	partnerLabel: string | null,
): string {
	const pairingLine = partnerLabel
		? `Paired with ${partnerLabel}`
		: "Not paired"

	const reportLines = user.reportsPaused
		? ["Reports: paused"]
		: [
				`Weekly report: ${weeklyDayNames[user.reportsWeeklyDay] ?? weeklyDayNames[0]} at ${user.reportsTime} (local)`,
				"Monthly report: last day of each month (local)",
			]

	return [
		"*Your settings*",
		`Timezone: ${user.timezone}`,
		`Display currency: ${user.displayCurrency}`,
		`Default entry currency: ${user.defaultEntryCurrency}`,
		...reportLines,
		pairingLine,
		"",
		"To change anything, just tell me in plain words.",
	].join("\n")
}
