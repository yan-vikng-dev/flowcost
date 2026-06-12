import {
	type Currency,
	getCurrentMonthRange as getCurrentMonthRangeUtil,
} from "@repo/shared-lib"
import { eq } from "drizzle-orm"
import type { DrizzleDb } from "../../database/setup"
import { type SelectUser, users } from "../schemas/index"
import { getPartnerUserId } from "./connections"

export type UserCreationSeeds = {
	displayName?: string | null
	timezone?: string
	defaultEntryCurrency?: Currency
	displayCurrency?: Currency
}

export async function getAllowedUserIds(
	db: DrizzleDb,
	userId: string,
	includePartner = true,
	partnerId?: string | null,
): Promise<string[]> {
	if (!includePartner) {
		return [userId]
	}
	if (partnerId !== undefined) {
		return partnerId ? [userId, partnerId] : [userId]
	}
	const resolvedPartnerId = await getPartnerUserId(db, userId)
	return resolvedPartnerId ? [userId, resolvedPartnerId] : [userId]
}

export async function getUserById(
	db: DrizzleDb,
	userId: string,
): Promise<SelectUser | undefined> {
	return db.query.users.findFirst({
		where: eq(users.id, userId),
	})
}

export async function getUserByWaId(
	db: DrizzleDb,
	waId: string,
): Promise<SelectUser | undefined> {
	return db.query.users.findFirst({
		where: eq(users.waId, waId),
	})
}

export async function upsertUserByWaId(
	db: DrizzleDb,
	waId: string,
	seeds?: UserCreationSeeds,
): Promise<{ user: SelectUser; created: boolean }> {
	const existing = await getUserByWaId(db, waId)
	if (existing) {
		return { user: existing, created: false }
	}

	await db
		.insert(users)
		.values({
			waId,
			displayName: seeds?.displayName ?? null,
			timezone: seeds?.timezone ?? "UTC",
			defaultEntryCurrency: seeds?.defaultEntryCurrency ?? "USD",
			displayCurrency: seeds?.displayCurrency ?? "USD",
		})
		.onConflictDoNothing({ target: users.waId })

	const user = await getUserByWaId(db, waId)
	if (!user) {
		throw new Error(`Failed to upsert user for waId: ${waId}`)
	}

	return { user, created: true }
}

export async function markUserOnboarded(
	db: DrizzleDb,
	userId: string,
): Promise<void> {
	await db
		.update(users)
		.set({ onboardedAt: new Date() })
		.where(eq(users.id, userId))
}

export { getCurrentMonthRangeUtil as getCurrentMonthRange }
