import type { ModelMessage } from "ai"

type UserContent = Extract<ModelMessage, { role: "user" }>["content"]

type UserContentPart = Exclude<UserContent, string>[number]

function binaryPartPlaceholder(part: UserContentPart): UserContentPart {
	if (part.type === "image") {
		const label = part.mediaType ? ` (${part.mediaType})` : ""
		return { type: "text", text: `[image sent${label}]` }
	}
	if (part.type === "file") {
		const name = part.filename ? `: ${part.filename}` : ""
		const label = part.mediaType ? ` (${part.mediaType})` : ""
		return { type: "text", text: `[file sent${name}${label}]` }
	}
	return part
}

/** Replace image/file parts with text placeholders for durable, binary-free history. */
export function sanitizeUserContentForHistory(
	content: UserContent,
): UserContent {
	if (typeof content === "string") return content

	const sanitized = content.map((part) =>
		part.type === "image" || part.type === "file"
			? binaryPartPlaceholder(part)
			: part,
	)

	if (sanitized.length === 1 && sanitized[0]?.type === "text") {
		return sanitized[0].text
	}

	return sanitized
}

const defaultMaxErrorMessageLength = 500

export function formatErrorForLog(
	error: unknown,
	maxMessageLength = defaultMaxErrorMessageLength,
): { errorName?: string; errorMessage: string } {
	if (error instanceof Error) {
		return {
			errorName: error.name,
			errorMessage: error.message.slice(0, maxMessageLength),
		}
	}
	const message = String(error)
	return { errorMessage: message.slice(0, maxMessageLength) }
}
