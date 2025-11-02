/**
 * Generate a human-friendly verification token like 'ABCD-EFGH'.
 * - Uses uppercase A–Z and digits 0–9.
 * - Uses rejection sampling (b < 252) to avoid modulo bias.
 * @returns {string} Token in the form 'XXXX-XXXX'.
 */
export function token44(): string {
	const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	let s = ""
	const getRand = (arr: Uint8Array) => globalThis.crypto.getRandomValues(arr)
	while (s.length < 8) {
		const b = getRand(new Uint8Array(1))[0]
		if (b < 252) s += A[b % 36]
	}
	return `${s.slice(0, 4)}-${s.slice(4)}`
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
 * Compute the SHA-256 hash of a UTF-8 string using Web Crypto.
 * Browser/Workers-safe (no Node dependencies).
 * @param {string} input Input text to hash.
 * @returns {Promise<string>} Hex-encoded SHA-256 digest.
 */
export async function sha256Hex(input: string): Promise<string> {
	const u8 = new TextEncoder().encode(input)
	const digest = await globalThis.crypto.subtle.digest("SHA-256", u8.buffer)
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
}
