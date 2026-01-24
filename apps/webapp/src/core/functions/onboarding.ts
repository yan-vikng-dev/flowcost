import { getDb } from "@repo/db/database/setup"
import {
	budgets,
	type EntryType,
	entries,
	recurring_entry_templates,
	whatsapp_links,
} from "@repo/db/drizzle/schemas/index"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, inArray } from "drizzle-orm"
import { protectedFunctionMiddleware } from "@/core/middleware/auth"

export type OnboardingStatus = {
	expenseDone: boolean
	incomeDone: boolean
	budgetDone: boolean
	whatsappDone: boolean
	isMissingSetup: boolean
}

const hasEntryForType = async (
	db: ReturnType<typeof getDb>,
	userIds: string[],
	entryType: EntryType,
) =>
	await db.query.entries.findFirst({
		where: and(
			inArray(entries.userId, userIds),
			eq(entries.entryType, entryType),
		),
		columns: {
			id: true,
		},
	})

export const getOnboardingStatus = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx) => {
		const db = getDb()
		const allowedUserIds = ctx.context.allowedUserIds ?? [ctx.context.userId]

		const [expenseEntry, recurringIncome, budgetRow, whatsappLink] =
			await Promise.all([
				hasEntryForType(db, allowedUserIds, "Expense"),
				db.query.recurring_entry_templates.findFirst({
					where: and(
						inArray(recurring_entry_templates.userId, allowedUserIds),
						eq(recurring_entry_templates.entryType, "Income"),
					),
					columns: {
						id: true,
					},
				}),
				db.query.budgets.findFirst({
					where: inArray(budgets.userId, allowedUserIds),
					columns: { id: true },
				}),
				db.query.whatsapp_links.findFirst({
					where: eq(whatsapp_links.userId, ctx.context.userId),
					columns: { userId: true },
				}),
			])

		const expenseDone = Boolean(expenseEntry)
		const incomeDone = Boolean(recurringIncome)
		const budgetDone = Boolean(budgetRow)
		const whatsappDone = Boolean(whatsappLink)
		const isMissingSetup = !(
			expenseDone &&
			incomeDone &&
			budgetDone &&
			whatsappDone
		)

		return {
			expenseDone,
			incomeDone,
			budgetDone,
			whatsappDone,
			isMissingSetup,
		}
	})
