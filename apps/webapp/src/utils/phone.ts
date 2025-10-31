export function formatPhoneNumber(phoneNumber: string): string {
	const cleaned = phoneNumber.replace(/\D/g, "")

	if (cleaned.length === 0) return phoneNumber

	if (cleaned.length < 7) return phoneNumber

	if (cleaned.length === 12) {
		const countryCode = cleaned.slice(0, 3)
		const rest = cleaned.slice(3)
		return `+${countryCode}-${rest.slice(0, 2)}-${rest.slice(2, 5)}-${rest.slice(5)}`
	}

	if (cleaned.length === 11) {
		const countryCode = cleaned.slice(0, 1)
		const rest = cleaned.slice(1)
		if (rest.length === 10) {
			return `+${countryCode}-${rest.slice(0, 3)}-${rest.slice(3, 6)}-${rest.slice(6)}`
		}
		const countryCode2 = cleaned.slice(0, 2)
		const rest2 = cleaned.slice(2)
		return `+${countryCode2}-${rest2.slice(0, 3)}-${rest2.slice(3, 6)}-${rest2.slice(6)}`
	}

	if (cleaned.length === 13) {
		const countryCode = cleaned.slice(0, 3)
		const rest = cleaned.slice(3)
		return `+${countryCode}-${rest.slice(0, 3)}-${rest.slice(3, 6)}-${rest.slice(6)}`
	}

	if (cleaned.length === 10) {
		return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
	}

	if (cleaned.length === 9) {
		return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`
	}

	if (cleaned.length >= 7) {
		const chunks: string[] = []
		for (let i = 0; i < cleaned.length; i += 3) {
			chunks.push(cleaned.slice(i, i + 3))
		}
		return chunks.join("-")
	}

	return phoneNumber
}
