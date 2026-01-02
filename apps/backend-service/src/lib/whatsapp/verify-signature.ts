import { timingSafeEqualHex } from "@repo/shared-lib/crypto"

export async function verifyWhatsAppSignature(
	rawBody: ArrayBuffer,
	signatureHeader: string | null,
	appSecret: string,
): Promise<boolean> {
	if (!signatureHeader) return false
	const expected = signatureHeader.replace(/^sha256=/, "")
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(appSecret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	)
	const mac = await crypto.subtle.sign("HMAC", key, rawBody)
	const macHex = Array.from(new Uint8Array(mac))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
	return timingSafeEqualHex(macHex, expected)
}
