import type { Currency } from "@repo/shared-lib"
import { getCurrentMonthRange as getCurrentMonthRangeUtil } from "@repo/shared-lib"
import { eq } from "drizzle-orm"
import type { DrizzleDb } from "../../database/setup"
import { user_preferences } from "../schemas/index"
import { getPartnerUserId } from "./connections"

export async function getAllowedUserIds(
	db: DrizzleDb,
	userId: string,
	includePartner = true,
): Promise<string[]> {
	if (!includePartner) {
		return [userId]
	}
	const partnerId = await getPartnerUserId(db, userId)
	return partnerId ? [userId, partnerId] : [userId]
}

export async function getUserTimezoneAndCurrency(
	db: DrizzleDb,
	userId: string,
): Promise<{ timezone: string; displayCurrency: Currency }> {
	const prefs = await db.query.user_preferences.findFirst({
		where: eq(user_preferences.userId, userId),
	})
	return {
		timezone: prefs?.timezone || "UTC",
		displayCurrency: (prefs?.displayCurrency ?? "USD") as Currency,
	}
}

export { getCurrentMonthRangeUtil as getCurrentMonthRange }
