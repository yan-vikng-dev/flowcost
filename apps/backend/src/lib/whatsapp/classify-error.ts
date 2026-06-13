export type WhatsAppErrorKind =
	| "rate_limited"
	| "transient"
	| "auth"
	| "client"
	| "unknown"

export type WhatsAppErrorClassification = { kind: WhatsAppErrorKind }

export function parseWhatsAppErrorCode(errorBody: string): number | undefined {
	try {
		const json = JSON.parse(errorBody) as { error?: { code?: number } }
		const code = json.error?.code
		return typeof code === "number" ? code : undefined
	} catch {
		return undefined
	}
}

export function parseWhatsAppErrorType(errorBody: string): string | undefined {
	try {
		const json = JSON.parse(errorBody) as { error?: { type?: string } }
		const type = json.error?.type
		return typeof type === "string" ? type : undefined
	} catch {
		return undefined
	}
}

export class WhatsAppApiError extends Error {
	readonly status: number
	readonly statusText: string
	readonly errorBody: string
	readonly code: number | undefined

	constructor(status: number, statusText: string, errorBody: string) {
		super(`WhatsApp API error: ${status} ${statusText} - ${errorBody}`)
		this.name = "WhatsAppApiError"
		this.status = status
		this.statusText = statusText
		this.errorBody = errorBody
		this.code = parseWhatsAppErrorCode(errorBody)
	}
}

export function classifyWhatsAppError(error: {
	status: number
	code: number | undefined
}): WhatsAppErrorClassification {
	const { status, code } = error
	if (code === 0 || code === 190) return { kind: "auth" }
	if (code !== undefined && code >= 200 && code <= 299)
		return { kind: "client" }
	if (code === 130429 || code === 131056) return { kind: "rate_limited" }
	if (status >= 500 || code === 1 || code === 2) return { kind: "transient" }
	if (status >= 400) return { kind: "client" }
	return { kind: "unknown" }
}

export function maxAttemptsFor(
	classification: WhatsAppErrorClassification,
): number {
	switch (classification.kind) {
		case "transient":
			return 5
		case "rate_limited":
			return 3
		default:
			return 1
	}
}

export function isRetryable(
	classification: WhatsAppErrorClassification,
): boolean {
	return maxAttemptsFor(classification) > 1
}

export function isChannelDown(
	classification: WhatsAppErrorClassification,
): boolean {
	return classification.kind === "transient"
}

export function classificationLogFields(
	classification: WhatsAppErrorClassification,
): {
	errorKind: WhatsAppErrorKind
	retryable: boolean
	channelDown: boolean
	rateLimited: boolean
} {
	return {
		errorKind: classification.kind,
		retryable: isRetryable(classification),
		channelDown: isChannelDown(classification),
		rateLimited: classification.kind === "rate_limited",
	}
}
