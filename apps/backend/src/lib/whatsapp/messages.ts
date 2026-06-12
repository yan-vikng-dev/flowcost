export type SendTextParams = {
	env: Env
	waId: string
	text: string
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
}

export type SendTemplateMessageParams = {
	env: Env
	waId: string
	templateName: string
	languageCode: string
	bodyParams: string[]
	quickReplyPayloads: string[]
}

export type SendTemplateMessageResult =
	| { ok: true; messageId?: string }
	| { ok: false; status: number; errorBody: string }

const WHATSAPP_API_URL = `https://graph.facebook.com/v24.0`

export async function sendWhatsAppText({
	env,
	waId,
	text,
}: SendTextParams): Promise<Response> {
	const url = `${WHATSAPP_API_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`
	const body = {
		messaging_product: "whatsapp",
		to: waId,
		type: "text",
		text: { body: text },
	}
	const response = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	})

	if (!response.ok) {
		const errorText = await response.text()
		console.error("WhatsApp API error:", {
			status: response.status,
			statusText: response.statusText,
			url,
			waId,
			errorBody: errorText,
		})
		throw new Error(
			`WhatsApp API error: ${response.status} ${response.statusText} - ${errorText}`,
		)
	}

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

export async function sendInteractiveButtons({
	env,
	waId,
	bodyText,
	buttons,
}: SendInteractiveButtonsParams): Promise<Response> {
	if (buttons.length === 0 || buttons.length > 3) {
		throw new Error("Interactive button messages require 1–3 buttons")
	}

	const url = `${WHATSAPP_API_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`
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
	const response = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	})

	if (!response.ok) {
		const errorText = await response.text()
		console.error("WhatsApp interactive buttons API error:", {
			status: response.status,
			statusText: response.statusText,
			url,
			waId,
			errorBody: errorText,
		})
		throw new Error(
			`WhatsApp API error: ${response.status} ${response.statusText} - ${errorText}`,
		)
	}

	return response
}

export async function sendTemplateMessage({
	env,
	waId,
	templateName,
	languageCode,
	bodyParams,
	quickReplyPayloads,
}: SendTemplateMessageParams): Promise<SendTemplateMessageResult> {
	const url = `${WHATSAPP_API_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`

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

	const response = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	})

	if (!response.ok) {
		const errorBody = await response.text()
		console.error("WhatsApp template message API error:", {
			status: response.status,
			statusText: response.statusText,
			url,
			waId,
			templateName,
			errorBody,
		})
		return { ok: false, status: response.status, errorBody }
	}

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
}

export type SendTypingIndicatorParams = {
	env: Env
	messageId: string
}

export async function sendTypingIndicator({
	env,
	messageId,
}: SendTypingIndicatorParams): Promise<Response> {
	const url = `${WHATSAPP_API_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`
	const body = {
		messaging_product: "whatsapp",
		status: "read",
		message_id: messageId,
		typing_indicator: { type: "text" },
	}
	const response = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	})

	if (!response.ok) {
		const errorText = await response.text()
		console.error("WhatsApp typing indicator API error:", {
			status: response.status,
			statusText: response.statusText,
			url,
			messageId,
			errorBody: errorText,
		})
	} else {
		console.debug("WhatsApp read receipt + typing indicator sent", {
			messageId,
			status: response.status,
		})
	}

	return response
}
