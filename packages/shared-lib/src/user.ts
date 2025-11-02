/**
 * Generate initials from a name string (2 characters max)
 * @param name - Optional name string
 * @returns Initials (2 characters max) or "?" if name is empty
 */
export function initialsFrom(name?: string): string {
	const trimmedName = name?.trim()
	if (!trimmedName) return "?"
	const parts = trimmedName.split(" ").filter(Boolean)
	if (parts.length >= 2) {
		return `${(parts[0]?.[0] ?? "").toUpperCase()}${(parts[1]?.[0] ?? "").toUpperCase()}`
	}
	return (parts[0] ?? "?").slice(0, 2).toUpperCase()
}
