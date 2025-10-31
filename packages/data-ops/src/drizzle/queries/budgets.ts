import { inArray } from "drizzle-orm"
import type { DrizzleDb } from "../../database/setup"
import { budgets, type SelectBudget } from "../schemas/index"
import { getPartnerUserId } from "./connections"

export async function fetchBudgetsForUser(
	db: DrizzleDb,
	userId: string,
	includePartner = true,
): Promise<SelectBudget[]> {
	let allowedUserIds: string[] = [userId]
	if (includePartner) {
		const partnerId = await getPartnerUserId(db, userId)
		if (partnerId) {
			allowedUserIds = [userId, partnerId]
		}
	}

	return await db.query.budgets.findMany({
		where: inArray(budgets.userId, allowedUserIds),
	})
}
