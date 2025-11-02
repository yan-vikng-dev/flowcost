export type SendTextParams = {
	env: Env
	waId: string
	text: string
}

export async function sendWhatsAppText({
	env,
	waId,
	text,
}: SendTextParams): Promise<Response> {
	const url = `https://graph.facebook.com/v19.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`
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
		// If JSON parsing fails, log but don't fail - the response was OK
		console.warn("WhatsApp API response OK but JSON parse failed", {
			waId,
			parseError:
				parseError instanceof Error ? parseError.message : String(parseError),
		})
	}

	return response
}
