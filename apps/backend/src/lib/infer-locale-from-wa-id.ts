import { type Currency, currencies } from "@repo/shared-lib"
import ct from "countries-and-timezones"
import { parsePhoneNumberFromString } from "libphonenumber-js/min"
import countries from "world-countries"

const FALLBACK = { timezone: "UTC", currency: "USD" as Currency }

function resolveCurrency(countryCode: string): Currency {
	const country = countries.find((c) => c.cca2 === countryCode)
	const code = country?.currencies
		? (Object.keys(country.currencies)[0] ?? null)
		: null
	if (code && currencies.includes(code as Currency)) {
		return code as Currency
	}
	return FALLBACK.currency
}

export function inferLocaleFromWaId(waId: string): {
	timezone: string
	currency: Currency
} {
	try {
		const phone = parsePhoneNumberFromString(`+${waId}`)
		if (!phone?.country) return FALLBACK

		const countryData = ct.getCountry(phone.country)
		const timezone = countryData?.timezones?.[0] ?? FALLBACK.timezone
		const currency = resolveCurrency(phone.country)

		return { timezone, currency }
	} catch {
		return FALLBACK
	}
}
