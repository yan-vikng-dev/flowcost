import type { WhatsAppMedia } from "@/lib/whatsapp/media"
import type { UserContentPart } from "./types"

export function appendMediaContent(
	parts: UserContentPart[],
	kind: "image" | "audio" | "document",
	media: WhatsAppMedia,
) {
	if (kind === "image") {
		parts.push({
			type: "image",
			image: media.data,
			mediaType: media.mimeType ?? undefined,
		})
		return
	}

	parts.push({
		type: "file",
		data: media.data,
		mediaType: media.mimeType ?? "application/octet-stream",
		filename: media.filename ?? undefined,
	})
}
