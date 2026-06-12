export const exactSlashCommands = [
	"/new",
	"/help",
	"/accept",
	"/decline",
	"/unpair",
] as const

export type ExactSlashCommand = (typeof exactSlashCommands)[number]

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
