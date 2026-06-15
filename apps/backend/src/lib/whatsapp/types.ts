import { z } from "zod"

/** Known WhatsApp Cloud API inbound message `type` values (not exhaustive). */
export const WHATSAPP_MESSAGE_TYPES = [
	"text",
	"image",
	"audio",
	"video",
	"document",
	"sticker",
	"location",
	"contacts",
	"interactive",
	"button",
	"reaction",
	"order",
	"system",
	"unsupported",
	"ephemeral",
	"request_welcome",
] as const

export type WhatsAppMessageType = (typeof WHATSAPP_MESSAGE_TYPES)[number]

/** Media subtypes we do not handle yet but should politely decline. */
const UNSUPPORTED_MEDIA_REPLY_TYPES = new Set<WhatsAppMessageType>([
	"sticker",
	"video",
])

export function shouldReplyForUnsupportedMedia(
	messageType: string | null,
): messageType is WhatsAppMessageType {
	return (
		messageType !== null &&
		UNSUPPORTED_MEDIA_REPLY_TYPES.has(messageType as WhatsAppMessageType)
	)
}

const ContactPhoneSchema = z.object({
	phone: z.string().optional(),
	wa_id: z.string().optional(),
	type: z.string().optional(),
})

const SharedContactSchema = z.object({
	name: z
		.object({
			formatted_name: z.string().optional(),
			first_name: z.string().optional(),
		})
		.optional(),
	phones: z.array(ContactPhoneSchema).optional(),
})

const NotificationPayloadDataSchema = z.object({
	object: z.literal("whatsapp_business_account"),
	entry: z.array(
		z.object({
			id: z.string(),
			changes: z.array(
				z.object({
					field: z.literal("messages"),
					value: z.object({
						metadata: z
							.object({
								display_phone_number: z.string(),
								phone_number_id: z.string(),
							})
							.optional(),
						contacts: z
							.array(
								z.object({
									wa_id: z.string().optional(),
									profile: z.object({ name: z.string().optional() }).optional(),
								}),
							)
							.optional(),
						messages: z
							.array(
								z
									.object({
										id: z.string(),
										from: z.string(),
										text: z.object({ body: z.string() }).optional(),
										image: z
											.object({
												id: z.string(),
												mime_type: z.string().optional(),
												caption: z.string().optional(),
											})
											.optional(),
										audio: z
											.object({
												id: z.string(),
												mime_type: z.string().optional(),
											})
											.optional(),
										document: z
											.object({
												id: z.string(),
												mime_type: z.string().optional(),
												filename: z.string().optional(),
												caption: z.string().optional(),
											})
											.optional(),
										contacts: z.array(SharedContactSchema).optional(),
										button: z
											.object({
												payload: z.string(),
												text: z.string(),
											})
											.optional(),
										interactive: z
											.object({
												type: z.literal("button_reply"),
												button_reply: z.object({
													id: z.string(),
													title: z.string(),
												}),
											})
											.optional(),
										type: z.string().optional(),
										timestamp: z.string().optional(),
									})
									.passthrough(),
							)
							.optional(),
					}),
				}),
			),
		}),
	),
})

export type SharedContactPhone = {
	waId: string
	label: string
}

export type ParsedSharedContact = {
	displayName: string | null
	phones: SharedContactPhone[]
}

function formatPhoneLabel(digits: string, type?: string): string {
	if (type) {
		const withType = `${type}: ${digits}`
		if (withType.length <= 20) return withType
	}
	return digits
}

function parseSharedContact(
	contact: z.infer<typeof SharedContactSchema>,
): ParsedSharedContact {
	const displayName =
		contact.name?.formatted_name?.trim() ||
		contact.name?.first_name?.trim() ||
		null

	const seen = new Set<string>()
	const phones: SharedContactPhone[] = []

	for (const phone of contact.phones ?? []) {
		const waId =
			phone.wa_id?.replace(/\D/g, "") || phone.phone?.replace(/\D/g, "") || null
		if (!waId || seen.has(waId)) continue
		seen.add(waId)

		const digits = phone.phone?.replace(/\D/g, "") || waId
		phones.push({
			waId,
			label: formatPhoneLabel(digits, phone.type),
		})
	}

	return { displayName, phones }
}

export const NotificationPayloadSchema =
	NotificationPayloadDataSchema.transform((payload) => {
		const change = payload.entry[0]?.changes[0]
		const value = change?.value
		const msg = value?.messages?.[0]
		const text =
			msg?.text?.body ?? msg?.image?.caption ?? msg?.document?.caption
		const media = msg?.image
			? { kind: "image" as const, ...msg.image }
			: msg?.audio
				? { kind: "audio" as const, ...msg.audio }
				: msg?.document
					? { kind: "document" as const, ...msg.document }
					: null

		const sharedContact =
			msg?.type === "contacts" && msg.contacts?.[0]
				? parseSharedContact(msg.contacts[0])
				: null

		const buttonReply =
			msg?.type === "interactive" && msg.interactive?.type === "button_reply"
				? msg.interactive.button_reply
				: null

		const buttonPayload =
			msg?.type === "button" && msg.button?.payload ? msg.button.payload : null

		const senderProfileName =
			value?.contacts?.[0]?.profile?.name?.trim() || null

		return {
			phoneNumberId: value?.metadata?.phone_number_id ?? null,
			waId: msg?.from ?? null,
			messageId: msg?.id ?? null,
			messageType: msg?.type ?? null,
			messageKeys: msg ? Object.keys(msg).sort() : [],
			text: text ?? null,
			media,
			sharedContact,
			buttonReply,
			buttonPayload,
			senderProfileName,
		}
	})

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>
