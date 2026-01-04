import { z } from "zod"

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
						messages: z
							.array(
								z.object({
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
									type: z.string().optional(),
									timestamp: z.string().optional(),
								}),
							)
							.optional(),
					}),
				}),
			),
		}),
	),
})

export const NotificationPayloadSchema =
	NotificationPayloadDataSchema.transform((payload) => {
		const change = payload.entry[0]?.changes[0]
		const msg = change?.value.messages?.[0]
		const text =
			msg?.text?.body ?? msg?.image?.caption ?? msg?.document?.caption
		const media = msg?.image
			? { kind: "image" as const, ...msg.image }
			: msg?.audio
				? { kind: "audio" as const, ...msg.audio }
				: msg?.document
					? { kind: "document" as const, ...msg.document }
					: null

		return {
			phoneNumberId: change?.value.metadata?.phone_number_id ?? null,
			waId: msg?.from ?? null,
			messageId: msg?.id ?? null,
			messageType: msg?.type ?? null,
			text: text ?? null,
			media,
		}
	})

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>
