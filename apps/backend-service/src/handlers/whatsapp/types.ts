import { z } from "zod"

export const NotificationPayloadSchema = z.object({
	object: z.literal("whatsapp_business_account"),
	entry: z.array(
		z.object({
			id: z.string(),
			changes: z.array(
				z.object({
					field: z.literal("messages"),
					value: z.object({
						metadata: z.object({
							display_phone_number: z.string(),
							phone_number_id: z.string(),
						}).optional(),
						messages: z
							.array(
								z.object({
									id: z.string(),
									from: z.string(),
									text: z.object({ body: z.string() }).optional(),
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

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>
