export type HandleIncomingMessageArgs = {
	waId: string
	text?: string
	messageId: string
	requestWelcome?: boolean
	senderProfileName?: string | null
	sharedContact?: {
		displayName: string | null
		phones: Array<{ waId: string; label: string }>
	}
	buttonReply?: {
		id: string
		title: string
	}
	buttonPayload?: string
	media?: {
		kind: "image" | "audio" | "document"
		id: string
		mimeType?: string
		filename?: string
	}
}

export type UserContentPart =
	| { type: "text"; text: string }
	| { type: "image"; image: Uint8Array; mediaType?: string }
	| {
			type: "file"
			data: Uint8Array
			mediaType: string
			filename?: string
	  }
