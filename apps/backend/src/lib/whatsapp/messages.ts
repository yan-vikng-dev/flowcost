import {
	classificationLogFields,
	classifyWhatsAppError,
	isChannelDown,
	maxAttemptsFor,
	parseWhatsAppErrorType,
	WhatsAppApiError,
	type WhatsAppErrorClassification,
} from "./classify-error"

export type WhatsAppSendOperation =
	| "reply"
	| "fallback"
	| "typing"
	| "report"
	| "command"
	| "template"
	| "interactive"

export type SendTextParams = {
	env: Env
	waId: string
	text: string
	operation: WhatsAppSendOperation
	userId?: string
	traceId?: string
	retry?: boolean
}

export type InteractiveButton = {
	id: string
	title: string
}

export type SendInteractiveButtonsParams = {
	env: Env
	waId: string
	bodyText: string
	buttons: InteractiveButton[]
	operation: WhatsAppSendOperation
	userId?: string
	traceId?: string
	retry?: boolean
}

export type SendTemplateMessageParams = {
	env: Env
	waId: string
	templateName: string
	languageCode: string
	bodyParams: string[]
	quickReplyPayloads: string[]
	operation: WhatsAppSendOperation
	userId?: string
	traceId?: string
	retry?: boolean
}

export type SendTemplateMessageResult =
	| { ok: true; messageId?: string }
	| { ok: false; status: number; errorBody: string }

const WHATSAPP_API_URL = `https://graph.facebook.com/v24.0`

const DEFAULT_RATE_LIMIT_DELAY_MS = 60_000

type PostWhatsAppMessageOptions = {
	env: Env
	body: unknown
	operation: WhatsAppSendOperation
	waId?: string
	messageId?: string
	userId?: string
	traceId?: string
	retry?: boolean
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function jitteredDelay(baseMs: number): number {
	return baseMs + Math.floor(Math.random() * baseMs * 0.25)
}

function logWhatsAppSendFailed(
	options: PostWhatsAppMessageOptions,
	error: WhatsAppApiError,
	classification: WhatsAppErrorClassification,
	attempt: number,
	attemptsMax: number,
	exhausted: boolean,
): void {
	console.error({
		event: "whatsapp.send.failed",
		operation: options.operation,
		waId: options.waId,
		messageId: options.messageId,
		userId: options.userId,
		httpStatus: error.status,
		metaCode: error.code,
		metaType: parseWhatsAppErrorType(error.errorBody),
		...classificationLogFields(classification),
		attempt,
		attemptsMax,
		exhausted,
		traceId: options.traceId,
	})
}

async function postWhatsAppMessage(
	options: PostWhatsAppMessageOptions,
): Promise<Response> {
	const { env, body, retry = true } = options
	const url = `${WHATSAPP_API_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`

	for (let attempt = 1; ; attempt++) {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		})

		if (response.ok) {
			return response
		}

		const errorText = await response.text()
		const error = new WhatsAppApiError(
			response.status,
			response.statusText,
			errorText,
		)
		const classification = classifyWhatsAppError(error)
		const attemptsMax = retry ? maxAttemptsFor(classification) : 1
		const exhausted = attempt >= attemptsMax

		logWhatsAppSendFailed(
			options,
			error,
			classification,
			attempt,
			attemptsMax,
			exhausted,
		)

		if (exhausted) {
			throw error
		}

		let delayMs: number
		if (classification.kind === "rate_limited") {
			const retryAfter = response.headers.get("Retry-After")
			const retryAfterSeconds = retryAfter
				? Number.parseInt(retryAfter, 10)
				: NaN
			delayMs = Number.isFinite(retryAfterSeconds)
				? retryAfterSeconds * 1000
				: DEFAULT_RATE_LIMIT_DELAY_MS
		} else {
			delayMs = jitteredDelay(2000 * 2 ** (attempt - 1))
		}

		await sleep(delayMs)
	}
}

export async function sendWhatsAppText({
	env,
	waId,
	text,
	operation,
	userId,
	traceId,
	retry,
}: SendTextParams): Promise<Response> {
	const body = {
		messaging_product: "whatsapp",
		to: waId,
		type: "text",
		text: { body: text },
	}
	const response = await postWhatsAppMessage({
		env,
		body,
		operation,
		waId,
		userId,
		traceId,
		retry,
	})

	try {
		const responseBody = (await response.json()) as {
			messages?: Array<{ id?: string }>
		}
		console.debug("WhatsApp message sent successfully", {
			waId,
			messageId: responseBody.messages?.[0]?.id,
			status: response.status,
		})
	} catch (parseError) {
		console.warn("WhatsApp API response OK but JSON parse failed", {
			waId,
			parseError:
				parseError instanceof Error ? parseError.message : String(parseError),
		})
	}

	return response
}

export function sendWhatsAppFallbackText(params: {
	env: Env
	waId: string
	text: string
	userId?: string
	traceId?: string
}): Promise<Response> {
	return sendWhatsAppText({
		...params,
		operation: "fallback",
		retry: false,
	})
}

export type TrySendUserFallbackParams = {
	env: Env
	waId: string
	text: string
	error: unknown
	userId?: string
	traceId?: string
}

export async function trySendUserFallback({
	env,
	waId,
	text,
	error,
	userId,
	traceId,
}: TrySendUserFallbackParams): Promise<void> {
	if (
		error instanceof WhatsAppApiError &&
		isChannelDown(classifyWhatsAppError(error))
	) {
		return
	}
	try {
		await sendWhatsAppFallbackText({ env, waId, text, userId, traceId })
	} catch {
		// Failure already emitted as a structured whatsapp.send.failed log by postWhatsAppMessage.
	}
}

export async function sendInteractiveButtons({
	env,
	waId,
	bodyText,
	buttons,
	operation,
	userId,
	traceId,
	retry,
}: SendInteractiveButtonsParams): Promise<Response> {
	if (buttons.length === 0 || buttons.length > 3) {
		throw new Error("Interactive button messages require 1–3 buttons")
	}

	const body = {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: waId,
		type: "interactive",
		interactive: {
			type: "button",
			body: { text: bodyText },
			action: {
				buttons: buttons.map((button) => ({
					type: "reply",
					reply: { id: button.id, title: button.title.slice(0, 20) },
				})),
			},
		},
	}

	return postWhatsAppMessage({
		env,
		body,
		operation,
		waId,
		userId,
		traceId,
		retry,
	})
}

export async function sendTemplateMessage({
	env,
	waId,
	templateName,
	languageCode,
	bodyParams,
	quickReplyPayloads,
	operation,
	userId,
	traceId,
	retry,
}: SendTemplateMessageParams): Promise<SendTemplateMessageResult> {
	const components: Array<Record<string, unknown>> = []
	if (bodyParams.length > 0) {
		components.push({
			type: "body",
			parameters: bodyParams.map((text) => ({ type: "text", text })),
		})
	}
	for (const [index, payload] of quickReplyPayloads.entries()) {
		components.push({
			type: "button",
			sub_type: "quick_reply",
			index: String(index),
			parameters: [{ type: "payload", payload }],
		})
	}

	const body = {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: waId,
		type: "template",
		template: {
			name: templateName,
			language: { code: languageCode },
			...(components.length > 0 ? { components } : {}),
		},
	}

	try {
		const response = await postWhatsAppMessage({
			env,
			body,
			operation,
			waId,
			userId,
			traceId,
			retry,
		})

		try {
			const responseBody = (await response.json()) as {
				messages?: Array<{ id?: string }>
			}
			console.debug("WhatsApp template message sent successfully", {
				waId,
				templateName,
				messageId: responseBody.messages?.[0]?.id,
				status: response.status,
			})
			return { ok: true, messageId: responseBody.messages?.[0]?.id }
		} catch (parseError) {
			console.warn("WhatsApp template API response OK but JSON parse failed", {
				waId,
				templateName,
				parseError:
					parseError instanceof Error ? parseError.message : String(parseError),
			})
			return { ok: true }
		}
	} catch (error) {
		if (error instanceof WhatsAppApiError) {
			return { ok: false, status: error.status, errorBody: error.errorBody }
		}
		throw error
	}
}

export type SendTypingIndicatorParams = {
	env: Env
	messageId: string
	traceId?: string
}

export async function sendTypingIndicator({
	env,
	messageId,
	traceId,
}: SendTypingIndicatorParams): Promise<void> {
	const body = {
		messaging_product: "whatsapp",
		status: "read",
		message_id: messageId,
		typing_indicator: { type: "text" },
	}
	try {
		await postWhatsAppMessage({
			env,
			body,
			operation: "typing",
			messageId,
			traceId,
			retry: false,
		})
		console.debug("WhatsApp read receipt + typing indicator sent", {
			messageId,
		})
	} catch {
		// Best-effort UX; failure already emitted as a structured log by postWhatsAppMessage.
	}
}
