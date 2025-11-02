import { inArray } from "drizzle-orm"
import type { DrizzleDb } from "../../database/setup"
import { budgets, type SelectBudget } from "../schemas/index"
import { getAllowedUserIds } from "./helpers"

export async function fetchBudgetsForUser(
	db: DrizzleDb,
	userId: string,
	includePartner = true,
): Promise<SelectBudget[]> {
	const allowedUserIds = await getAllowedUserIds(db, userId, includePartner)

	return await db.query.budgets.findMany({
		where: inArray(budgets.userId, allowedUserIds),
	})
}
