import { getDb } from "@repo/db/database/setup"
import { getPartnerUserId } from "@repo/db/drizzle/queries/connections"
import {
	getUserById,
	markUserOnboarded,
	upsertUserByWaId,
} from "@repo/db/drizzle/queries/helpers"
import { user_connections } from "@repo/db/drizzle/schemas/index"
import { eq, or } from "drizzle-orm"
import type { MessageContext } from "@/durable-objects/AgentServer"
import { inferLocaleFromWaId } from "@/lib/infer-locale-from-wa-id"
import type { WhatsAppMedia } from "@/lib/whatsapp/media"
import { fetchWhatsAppMedia } from "@/lib/whatsapp/media"
import {
	sendInteractiveButtons,
	sendTypingIndicator,
	sendWhatsAppText,
	trySendUserFallback,
} from "@/lib/whatsapp/messages"
import { appendMediaContent } from "./append-media-content"
import {
	parseOnboardButtonId,
	sendWelcomeBackMessage,
	sendWelcomeMessages,
} from "./onboarding"
import {
	displayLabel,
	handlePairAccept,
	handlePairDecline,
	initializeScheduler,
	initiatePairingRequest,
	parsePairButtonId,
	parsePairPickId,
} from "./pairing"
import { parseSendReportPayload } from "./report-buttons"
import {
	buildHelpText,
	buildSettingsText,
	isSlashCommand,
} from "./slash-commands"
import type { HandleIncomingMessageArgs, UserContentPart } from "./types"

export async function handleIncomingMessage(
	env: Env,
	args: HandleIncomingMessageArgs,
) {
	const db = getDb()
	const {
		waId,
		text,
		messageId,
		media,
		sharedContact,
		buttonReply,
		buttonPayload,
		requestWelcome,
	} = args
	const pairButtonId = buttonReply?.id ?? buttonPayload ?? null
	console.debug({
		message: "handling whatsapp webhook message",
		waId,
		text,
		messageId,
		mediaKind: media?.kind ?? null,
		hasSharedContact: Boolean(sharedContact),
		buttonReplyId: buttonReply?.id ?? null,
		buttonPayload: buttonPayload ?? null,
	})

	const inferred = inferLocaleFromWaId(waId)
	const { user, created } = await upsertUserByWaId(db, waId, {
		displayName: args.senderProfileName,
		timezone: inferred.timezone,
		defaultEntryCurrency: inferred.currency,
		displayCurrency: inferred.currency,
	})
	if (created) {
		await initializeScheduler(env, user.id)
	}

	if (requestWelcome) {
		if (user.onboardedAt !== null) {
			await sendWelcomeBackMessage(env, waId)
		} else {
			await sendWelcomeMessages(env, waId, user)
		}
		return
	}

	const isOnboarding = user.onboardedAt === null

	if (sharedContact) {
		await sendTypingIndicator({ env, messageId })
		const { phones } = sharedContact

		if (phones.length === 0) {
			await sendWhatsAppText({
				env,
				waId,
				text: "That contact doesn't have a phone number I can use. Share a contact that has a number.",
				operation: "reply",
			})
			return
		}

		if (phones.length === 1) {
			const [phone] = phones
			if (!phone) return
			const result = await initiatePairingRequest(db, env, user, phone.waId)
			if (!result.ok) {
				await sendWhatsAppText({
					env,
					waId,
					text: result.message,
					operation: "reply",
				})
				return
			}
			await sendWhatsAppText({
				env,
				waId,
				text: "Pairing request sent. They have 24 hours to accept.",
				operation: "reply",
			})
			return
		}

		const contactName = sharedContact.displayName?.trim()
		const bodyText = contactName
			? `${contactName} has multiple numbers. Which one should I invite?`
			: "This contact has multiple numbers. Which one should I invite?"
		await sendInteractiveButtons({
			env,
			waId,
			bodyText,
			buttons: phones.slice(0, 3).map((phone) => ({
				id: `pair_pick:${phone.waId}`,
				title: phone.label,
			})),
			operation: "interactive",
		})
		return
	}

	if (pairButtonId) {
		await sendTypingIndicator({ env, messageId })

		const onboardAction = parseOnboardButtonId(pairButtonId)
		if (onboardAction === "confirm") {
			await markUserOnboarded(db, user.id)
			await sendWhatsAppText({
				env,
				waId,
				text: "Perfect, you're all set. Text me your first expense whenever — e.g. *lunch 12* or *taxi 8 EUR yesterday*.",
				operation: "reply",
			})
			return
		}
		if (onboardAction === "change") {
			await markUserOnboarded(db, user.id)
			await sendWhatsAppText({
				env,
				waId,
				text: "Sure — tell me what to change in plain words, e.g. *set my currency to EUR*, *my timezone is Paris*, or *send reports on Sunday at 9am*.",
				operation: "reply",
			})
			return
		}

		if (pairButtonId.startsWith("send_report:")) {
			const sendReport = parseSendReportPayload(pairButtonId)
			if (!sendReport) {
				await sendWhatsAppText({
					env,
					waId,
					text: "That report link looks expired or invalid. Ask me for a spending summary anytime.",
					operation: "reply",
				})
				return
			}
			const schedulerId = env.NOTIFICATION_SCHEDULER.idFromName(user.id)
			const schedulerStub = env.NOTIFICATION_SCHEDULER.get(schedulerId)
			await schedulerStub.sendReportNow(
				sendReport.reportType,
				sendReport.dateISO,
			)
			return
		}

		const pairPick = parsePairPickId(pairButtonId)
		if (pairPick) {
			const result = await initiatePairingRequest(db, env, user, pairPick.waId)
			if (!result.ok) {
				await sendWhatsAppText({
					env,
					waId,
					text: result.message,
					operation: "reply",
				})
				return
			}
			await sendWhatsAppText({
				env,
				waId,
				text: "Pairing request sent. They have 24 hours to accept.",
				operation: "reply",
			})
			return
		}

		const parsed = parsePairButtonId(pairButtonId)
		if (!parsed) {
			await sendWhatsAppText({
				env,
				waId,
				text: "Sorry, I didn't recognize that button.",
				operation: "reply",
			})
			return
		}
		if (parsed.action === "accept") {
			const result = await handlePairAccept(db, env, user, parsed.requestId)
			if (!result.ok) {
				await sendWhatsAppText({
					env,
					waId,
					text: result.message,
					operation: "reply",
				})
			}
			return
		}
		const result = await handlePairDecline(db, env, user, parsed.requestId)
		if (!result.ok) {
			await sendWhatsAppText({
				env,
				waId,
				text: result.message,
				operation: "reply",
			})
		}
		return
	}

	if (text && isSlashCommand(text)) {
		switch (text) {
			case "/new": {
				const id = env.AI_CONVERSATION_SERVER.idFromName(user.id)
				const stub = env.AI_CONVERSATION_SERVER.get(id)
				await stub.reset()
				await sendWhatsAppText({
					env,
					waId,
					text: "Fresh start 🧹 I've cleared our conversation context — your logged expenses are all safe.",
					operation: "command",
				})
				return
			}
			case "/help":
				await sendWhatsAppText({
					env,
					waId,
					text: buildHelpText(),
					operation: "command",
				})
				return
			case "/settings": {
				const partnerId = await getPartnerUserId(db, user.id)
				const partner = partnerId ? await getUserById(db, partnerId) : null
				await sendWhatsAppText({
					env,
					waId,
					text: buildSettingsText(user, partner ? displayLabel(partner) : null),
					operation: "command",
				})
				return
			}
			case "/start":
				await sendWelcomeMessages(env, waId, user)
				return
			case "/unpair": {
				const partnerId = await getPartnerUserId(db, user.id)
				if (!partnerId) {
					await sendWhatsAppText({
						env,
						waId,
						text: "You're not paired with anyone.",
						operation: "command",
					})
					return
				}
				await db
					.delete(user_connections)
					.where(
						or(
							eq(user_connections.userIdLow, user.id),
							eq(user_connections.userIdHigh, user.id),
						),
					)
				const partner = await getUserById(db, partnerId)
				await sendWhatsAppText({
					env,
					waId,
					text: "Unpaired ✅ You no longer share expenses with your partner.",
					operation: "command",
				})
				if (partner) {
					await sendWhatsAppText({
						env,
						waId: partner.waId,
						text: `${displayLabel(user)} ended your expense sharing.`,
						operation: "reply",
					})
				}
				return
			}
		}
	}

	const id = env.AI_CONVERSATION_SERVER.idFromName(user.id)
	const stub = env.AI_CONVERSATION_SERVER.get(id)
	const messageContext: MessageContext = {
		messageId,
		waId,
		userId: user.id,
		defaultEntryCurrency: user.defaultEntryCurrency,
		displayCurrency: user.displayCurrency,
		timezone: user.timezone,
		reportsTime: user.reportsTime,
		reportsWeeklyDay: user.reportsWeeklyDay,
		reportsPaused: user.reportsPaused,
		isOnboarding,
	}
	try {
		const contentParts: UserContentPart[] = []

		if (text) {
			contentParts.push({ type: "text", text })
		}

		if (media) {
			const fetched = await fetchWhatsAppMedia(env, media.id)
			const resolvedMedia: WhatsAppMedia = {
				...fetched,
				mimeType: fetched.mimeType ?? media.mimeType ?? null,
				filename: fetched.filename ?? media.filename ?? null,
			}
			appendMediaContent(contentParts, media.kind, resolvedMedia)
		}

		const content =
			contentParts.length === 1 && contentParts[0]?.type === "text"
				? contentParts[0].text
				: contentParts
		await sendTypingIndicator({ env, messageId })
		await stub.handleMessage(content, messageContext)
	} catch (error) {
		console.error({
			event: "whatsapp.handle_incoming.failed",
			waId,
			userId: user.id,
			messageId,
			errorName: error instanceof Error ? error.name : undefined,
			errorMessage: error instanceof Error ? error.message : String(error),
		})

		await trySendUserFallback({
			env,
			waId,
			text: "Something went wrong. Please try again.",
			error,
			userId: user.id,
		})
		throw error
	}
	return
}
