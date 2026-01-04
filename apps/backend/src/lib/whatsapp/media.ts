const WHATSAPP_API_URL = "https://graph.facebook.com/v24.0"

export type WhatsAppMedia = {
	id: string
	mimeType: string | null
	filename?: string | null
	data: Uint8Array
}

type WhatsAppMediaMeta = {
	url?: string
	mime_type?: string
	filename?: string
	id?: string
}

export async function fetchWhatsAppMedia(
	env: Env,
	mediaId: string,
): Promise<WhatsAppMedia> {
	const metaUrl = `${WHATSAPP_API_URL}/${mediaId}`
	const metaResponse = await fetch(metaUrl, {
		headers: {
			Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
		},
	})

	if (!metaResponse.ok) {
		const errorText = await metaResponse.text()
		console.error("WhatsApp media metadata error:", {
			status: metaResponse.status,
			statusText: metaResponse.statusText,
			url: metaUrl,
			mediaId,
			errorBody: errorText,
		})
		throw new Error(
			`WhatsApp media metadata error: ${metaResponse.status} ${metaResponse.statusText} - ${errorText}`,
		)
	}

	const meta = (await metaResponse.json()) as WhatsAppMediaMeta
	if (!meta.url) {
		throw new Error("WhatsApp media metadata missing url")
	}

	const mediaResponse = await fetch(meta.url, {
		headers: {
			Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
		},
	})

	if (!mediaResponse.ok) {
		const errorText = await mediaResponse.text()
		console.error("WhatsApp media download error:", {
			status: mediaResponse.status,
			statusText: mediaResponse.statusText,
			url: meta.url,
			mediaId,
			errorBody: errorText,
		})
		throw new Error(
			`WhatsApp media download error: ${mediaResponse.status} ${mediaResponse.statusText} - ${errorText}`,
		)
	}

	const arrayBuffer = await mediaResponse.arrayBuffer()
	return {
		id: mediaId,
		mimeType: meta.mime_type ?? mediaResponse.headers.get("content-type"),
		filename: meta.filename ?? null,
		data: new Uint8Array(arrayBuffer),
	}
}
