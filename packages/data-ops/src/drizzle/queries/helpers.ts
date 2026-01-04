import {
	type Currency,
	getCurrentMonthRange as getCurrentMonthRangeUtil,
} from "@repo/shared-lib"
import type { DrizzleDb } from "../../database/setup"
import { getPartnerUserId } from "./connections"

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

export async function getUserTimezoneAndCurrency(
	db: DrizzleDb,
	userId: string,
): Promise<{ timezone: string; displayCurrency: Currency }> {
	const prefs = await db.query.user_preferences.findFirst({
		where: {
			userId,
		},
	})
	return {
		timezone: prefs?.timezone || "UTC",
		displayCurrency: prefs?.displayCurrency ?? "USD",
	}
}

export { getCurrentMonthRangeUtil as getCurrentMonthRange }
