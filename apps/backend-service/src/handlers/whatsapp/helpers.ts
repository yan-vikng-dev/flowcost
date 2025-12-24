export type SendTextParams = {
	env: Env
	waId: string
	text: string
}

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
