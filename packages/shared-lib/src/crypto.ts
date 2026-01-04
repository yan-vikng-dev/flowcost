import { createHash, randomBytes } from "node:crypto"

/**
 * Generate a human-friendly verification token like 'ABCD-EFGH'.
 * - Uses uppercase A–Z and digits 0–9.
 * - Uses rejection sampling (b < 252) to avoid modulo bias.
 * @returns {string} Token in the form 'XXXX-XXXX'.
 */
export function token44(): string {
	const hexString = randomBytes(4).toString("hex")
	return `${hexString.slice(0, 4)}-${hexString.slice(4, 8)}`
}

/**
 * Constant-time equality check for two hex strings.
 * Returns false if the strings have different lengths.
 * @param {string} a First hex string.
 * @param {string} b Second hex string.
 * @returns {boolean} True when strings are equal.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
	if (a.length !== b.length) return false
	let res = 0
	for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i)
	return res === 0
}

/**
 * Compute the SHA-256 hash of a UTF-8 string.
 * @param {string} input Input text to hash.
 * @returns {Promise<string>} Hex-encoded SHA-256 digest.
 */
export async function sha256Hex(input: string): Promise<string> {
	return createHash("sha256").update(input).digest("hex")
}
