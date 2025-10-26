import { getDb } from "@repo/data-ops/database/setup"
import {
	auth_users,
	user_connection_invitations,
	user_connections,
} from "@repo/data-ops/drizzle/schemas/index"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, or } from "drizzle-orm"
import { z } from "zod"
import { protectedFunctionMiddleware } from "@/core/middleware/auth"

// Helpers
function normalizePair(a: string, b: string): [string, string] {
	return a < b ? [a, b] : [b, a]
}

async function findExistingConnection(
	db: ReturnType<typeof getDb>,
	userId: string,
) {
	const [connection] = await db
		.select()
		.from(user_connections)
		.where(
			or(
				eq(user_connections.userIdLow, userId),
				eq(user_connections.userIdHigh, userId),
			),
		)
		.limit(1)
	return connection
}

async function getUserByEmail(db: ReturnType<typeof getDb>, email: string) {
	const [user] = await db
		.select()
		.from(auth_users)
		.where(eq(auth_users.email, email))
		.limit(1)
	return user
}

// getConnectionState
export const getConnectionState = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx) => {
		const db = getDb()

		// Current connection (if any)
		const conn = await findExistingConnection(db, ctx.context.userId)
		let partner: {
			id: string
			name: string
			email: string
			image?: string
		} | null = null
		if (conn) {
			const partnerId =
				conn.userIdLow === ctx.context.userId ? conn.userIdHigh : conn.userIdLow
			const user = await db.query.auth_users.findFirst({
				where: eq(auth_users.id, partnerId),
			})
			if (user)
				partner = {
					id: user.id,
					name: user.name,
					email: user.email,
					image: (user as { image?: string | null }).image ?? undefined,
				}
		}

		// Outgoing pending invites
		const outgoing = await db
			.select()
			.from(user_connection_invitations)
			.where(
				and(
					eq(user_connection_invitations.inviterUserId, ctx.context.userId),
					eq(user_connection_invitations.status, "pending"),
				),
			)

		// Incoming pending invites (by userId or by email)
		const incoming = await db
			.select()
			.from(user_connection_invitations)
			.where(
				and(
					or(
						eq(user_connection_invitations.inviteeUserId, ctx.context.userId),
						eq(user_connection_invitations.inviteeEmail, ctx.context.email),
					),
					eq(user_connection_invitations.status, "pending"),
				),
			)

		// Enrich invites with display info
		// For outgoing: show invitee (user if exists, else email)
		// For incoming: show inviter (user)
		type DisplayUser = {
			id?: string
			name?: string
			email: string
			image?: string
		}
		type PendingInvite = {
			id: string
			direction: "incoming" | "outgoing"
			user: DisplayUser
			expiresAt: Date
		}
		const userIdsToFetch = new Set<string>()
		outgoing.forEach((i) => {
			if (i.inviteeUserId) userIdsToFetch.add(i.inviteeUserId)
		})
		incoming.forEach((i) => {
			userIdsToFetch.add(i.inviterUserId)
		})
		const userMap = new Map<string, DisplayUser>()
		for (const id of userIdsToFetch) {
			const u = await db.query.auth_users.findFirst({
				where: eq(auth_users.id, id),
			})
			if (u)
				userMap.set(id, {
					id: u.id,
					name: u.name,
					email: u.email,
					image: (u as { image?: string | null }).image ?? undefined,
				})
		}

		const pending: PendingInvite[] = [
			...outgoing.map((i) => ({
				id: i.id,
				direction: "outgoing" as const,
				user: i.inviteeUserId
					? (userMap.get(i.inviteeUserId) ?? {
							id: i.inviteeUserId,
							email: i.inviteeEmail,
						})
					: { email: i.inviteeEmail },
				expiresAt: i.expiresAt,
			})),
			...incoming.map((i) => ({
				id: i.id,
				direction: "incoming" as const,
				user: userMap.get(i.inviterUserId) ?? {
					id: i.inviterUserId,
					email: "",
				},
				expiresAt: i.expiresAt,
			})),
		]

		return {
			connection: partner,
			pending,
		} as const
	})

// sendInvitation
export const sendInvitationInput = z.object({
	email: z.string().email(),
})
export type SendInvitationInput = z.infer<typeof sendInvitationInput>

export const sendInvitation = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(sendInvitationInput)
	.handler(async (ctx) => {
		const db = getDb()
		const { email } = ctx.data

		if (email.toLowerCase() === ctx.context.email.toLowerCase()) {
			throw new Error("You cannot invite yourself")
		}

		// Enforce: sender not already connected
		const existingForSender = await findExistingConnection(
			db,
			ctx.context.userId,
		)
		if (existingForSender) throw new Error("You are already connected")

		const inviteeUser = await getUserByEmail(db, email)
		if (inviteeUser) {
			// If invitee exists and is already connected, block
			const inviteeConn = await findExistingConnection(db, inviteeUser.id)
			if (inviteeConn) throw new Error("Invitee is already connected")
		}

		const now = Date.now()
		const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000)

		await db.insert(user_connection_invitations).values({
			inviterUserId: ctx.context.userId,
			inviteeEmail: email,
			inviteeUserId: inviteeUser?.id,
			token: crypto.randomUUID(),
			expiresAt,
		})

		return { ok: true }
	})

// cancelInvitation
export const cancelInvitationInput = z.object({ id: z.string().uuid() })
export type CancelInvitationInput = z.infer<typeof cancelInvitationInput>

export const cancelInvitation = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(cancelInvitationInput)
	.handler(async (ctx) => {
		const db = getDb()
		const id = ctx.data.id

		const invite = await db.query.user_connection_invitations.findFirst({
			where: eq(user_connection_invitations.id, id),
		})
		if (!invite) throw new Error("Invitation not found")
		if (invite.inviterUserId !== ctx.context.userId)
			throw new Error("Not allowed")
		if (invite.status !== "pending")
			throw new Error("Invitation is not pending")

		await db
			.delete(user_connection_invitations)
			.where(eq(user_connection_invitations.id, id))
		return { ok: true } as const
	})

// acceptInvitation
export const acceptInvitationInput = z.object({ id: z.string().uuid() })
export type AcceptInvitationInput = z.infer<typeof acceptInvitationInput>

export const acceptInvitation = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(acceptInvitationInput)
	.handler(async (ctx) => {
		const db = getDb()
		const id = ctx.data.id

		const invite = await db.query.user_connection_invitations.findFirst({
			where: eq(user_connection_invitations.id, id),
		})
		if (!invite) throw new Error("Invitation not found")
		if (invite.status !== "pending")
			throw new Error("Invitation is not pending")

		const isInvitee =
			invite.inviteeUserId === ctx.context.userId ||
			invite.inviteeEmail.toLowerCase() === ctx.context.email.toLowerCase()
		if (!isInvitee) throw new Error("Not allowed")

		// Enforce: neither side is already connected
		const inviterConn = await findExistingConnection(db, invite.inviterUserId)
		if (inviterConn) throw new Error("Inviter is already connected")
		const inviteeConn = await findExistingConnection(db, ctx.context.userId)
		if (inviteeConn) throw new Error("You are already connected")

		// Create the connection (one row)
		const [low, high] = normalizePair(invite.inviterUserId, ctx.context.userId)
		await db.insert(user_connections).values({
			id: crypto.randomUUID(),
			userIdLow: low,
			userIdHigh: high,
		})

		// Mark accepted and set respondedAt (we keep row for audit; not deleting)
		await db
			.update(user_connection_invitations)
			.set({ status: "accepted", respondedAt: new Date() })
			.where(eq(user_connection_invitations.id, id))

		return { ok: true } as const
	})

// declineInvitation
export const declineInvitationInput = z.object({ id: z.uuid() })
export type DeclineInvitationInput = z.infer<typeof declineInvitationInput>

export const declineInvitation = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(declineInvitationInput)
	.handler(async (ctx) => {
		const db = getDb()
		const id = ctx.data.id

		const invite = await db.query.user_connection_invitations.findFirst({
			where: eq(user_connection_invitations.id, id),
		})
		if (!invite) throw new Error("Invitation not found")

		const isInvitee =
			invite.inviteeUserId === ctx.context.userId ||
			invite.inviteeEmail.toLowerCase() === ctx.context.email.toLowerCase()
		if (!isInvitee) throw new Error("Not allowed")
		if (invite.status !== "pending")
			throw new Error("Invitation is not pending")

		await db
			.update(user_connection_invitations)
			.set({ status: "declined", respondedAt: new Date() })
			.where(eq(user_connection_invitations.id, id))

		return { ok: true } as const
	})

// disconnectConnection
export const disconnectConnection = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(z.void())
	.handler(async (ctx) => {
		const db = getDb()
		const conn = await findExistingConnection(db, ctx.context.userId)
		if (!conn) return { ok: true } as const
		await db.delete(user_connections).where(eq(user_connections.id, conn.id))
		return { ok: true } as const
	})
