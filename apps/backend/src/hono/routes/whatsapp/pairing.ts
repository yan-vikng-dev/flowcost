import type { DrizzleDb } from "@repo/db/database/setup"
import {
	acceptConnectionRequest,
	createConnectionRequest,
	deleteConnectionRequest,
	getPendingConnectionRequestById,
	hasConnection,
} from "@repo/db/drizzle/queries/connections"
import { getUserById } from "@repo/db/drizzle/queries/helpers"
import type { SelectUser } from "@repo/db/drizzle/schemas/index"
import { sendTemplateMessage, sendWhatsAppText } from "@/lib/whatsapp/messages"

export const PAIR_INVITE_TEMPLATE_NAME = "pair_invite"
export const PAIR_INVITE_TEMPLATE_LANG = "en"

const PAIR_BUTTON_ID = /^pair_(accept|decline):(.+)$/
export const PAIR_PICK_ID = /^pair_pick:(.+)$/

export function displayLabel(user: {
	displayName: string | null
	waId: string
}): string {
	return user.displayName?.trim() || user.waId
}

export function parsePairButtonId(
	id: string,
): { action: "accept" | "decline"; requestId: string } | null {
	const match = id.match(PAIR_BUTTON_ID)
	if (!match?.[1] || !match[2]) return null
	const action = match[1]
	if (action !== "accept" && action !== "decline") return null
	return { action, requestId: match[2] }
}

export function parsePairPickId(id: string): { waId: string } | null {
	const match = id.match(PAIR_PICK_ID)
	if (!match?.[1]) return null
	const waId = match[1].replace(/\D/g, "")
	if (!waId) return null
	return { waId }
}

export async function initializeScheduler(env: Env, userId: string) {
	const schedulerId = env.NOTIFICATION_SCHEDULER.idFromName(userId)
	const schedulerStub = env.NOTIFICATION_SCHEDULER.get(schedulerId)
	await schedulerStub.initialize(userId)
}

export async function sendPairingInvite(
	env: Env,
	{
		requester,
		targetWaId,
		requestId,
	}: {
		requester: SelectUser
		targetWaId: string
		requestId: string
	},
): Promise<{ ok: true } | { ok: false }> {
	const result = await sendTemplateMessage({
		env,
		waId: targetWaId,
		templateName: PAIR_INVITE_TEMPLATE_NAME,
		languageCode: PAIR_INVITE_TEMPLATE_LANG,
		bodyParams: [displayLabel(requester)],
		quickReplyPayloads: [
			`pair_accept:${requestId}`,
			`pair_decline:${requestId}`,
		],
	})
	if (!result.ok) return { ok: false }
	return { ok: true }
}

export async function initiatePairingRequest(
	db: DrizzleDb,
	env: Env,
	requester: SelectUser,
	targetWaId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	if (await hasConnection(db, requester.id)) {
		return {
			ok: false,
			message:
				"You're already paired. Use /unpair first to invite someone else.",
		}
	}
	if (targetWaId === requester.waId) {
		return { ok: false, message: "You can't pair with yourself." }
	}

	const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
	const request = await createConnectionRequest(db, {
		requesterUserId: requester.id,
		targetWaId,
		expiresAt,
	})

	const inviteSent = await sendPairingInvite(env, {
		requester,
		targetWaId,
		requestId: request.id,
	})
	if (!inviteSent.ok) {
		const failureMessage = `Couldn't deliver the invite to ${targetWaId} — they may need to message me first.`
		await sendWhatsAppText({
			env,
			waId: requester.waId,
			text: failureMessage,
		})
		return { ok: false, message: failureMessage }
	}

	return { ok: true }
}

export async function handlePairAccept(
	db: DrizzleDb,
	env: Env,
	accepter: SelectUser,
	requestId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const request = await getPendingConnectionRequestById(db, requestId)
	if (!request) {
		return {
			ok: false,
			message: "Could not accept the request. It may have expired.",
		}
	}
	if (request.targetWaId !== accepter.waId) {
		return { ok: false, message: "This pairing request is not for you." }
	}
	if (await hasConnection(db, request.requesterUserId)) {
		await deleteConnectionRequest(db, request.id)
		return {
			ok: false,
			message:
				"That request is no longer valid — the requester is already paired.",
		}
	}
	if (await hasConnection(db, accepter.id)) {
		return {
			ok: false,
			message: "You're already paired with someone. Use /unpair first.",
		}
	}

	const connection = await acceptConnectionRequest(db, {
		requestId: request.id,
		accepterUserId: accepter.id,
	})
	if (!connection) {
		return {
			ok: false,
			message: "Could not accept the request. It may have expired.",
		}
	}

	const requester = await getUserById(db, request.requesterUserId)
	if (requester) {
		await initializeScheduler(env, requester.id)
		await sendWhatsAppText({
			env,
			waId: requester.waId,
			text: `${displayLabel(accepter)} accepted your pairing request. You're now sharing expenses.`,
		})
	}
	await initializeScheduler(env, accepter.id)
	await sendWhatsAppText({
		env,
		waId: accepter.waId,
		text: "Paired ✅ You now share expenses with your partner.",
	})

	return { ok: true }
}

export async function handlePairDecline(
	db: DrizzleDb,
	env: Env,
	decliner: SelectUser,
	requestId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const request = await getPendingConnectionRequestById(db, requestId)
	if (!request) {
		return { ok: false, message: "No pending pairing request found." }
	}
	if (request.targetWaId !== decliner.waId) {
		return { ok: false, message: "This pairing request is not for you." }
	}

	await deleteConnectionRequest(db, request.id)
	const requester = await getUserById(db, request.requesterUserId)
	if (requester) {
		await sendWhatsAppText({
			env,
			waId: requester.waId,
			text: `${displayLabel(decliner)} declined your pairing request.`,
		})
	}
	await sendWhatsAppText({
		env,
		waId: decliner.waId,
		text: "Request declined.",
	})

	return { ok: true }
}
