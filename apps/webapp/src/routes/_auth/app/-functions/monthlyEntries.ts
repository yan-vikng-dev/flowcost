import { getDb } from "@repo/data-ops/database/setup"
import {
	entries,
	exchange_rates,
	type SelectEntry,
	type SelectExchangeRate,
	user_preferences,
} from "@repo/data-ops/drizzle/schemas/index"
import type { Currency } from "@repo/shared-config"
import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm"
import { DateTime } from "luxon"
import { getPartnerUserId } from "@/core/helpers/connections"
import { protectedFunctionMiddleware } from "@/core/middleware/auth"

export type MonthlyEntryForCharts = Pick<
	SelectEntry,
	"id" | "amount" | "currency" | "category" | "entryType" | "executedAt"
> & {
	amountConverted: number // converted to displayCurrency
}

export type MonthlyEntriesResult = {
	displayCurrency: Currency
	timezone: string
	monthLabel: string // e.g., "October 2025" in user's TZ
	entries: MonthlyEntryForCharts[]
}

export const getMonthlyEntriesForCharts = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx): Promise<MonthlyEntriesResult> => {
		const db = getDb()

		const prefs = await db.query.user_preferences.findFirst({
			where: eq(user_preferences.userId, ctx.context.userId),
		})
		if (!prefs) throw new Error("User preferences not found")
		const displayCurrency = prefs.displayCurrency
		const timeZone = prefs.timezone || "UTC"

		const now = DateTime.now().setZone(timeZone)
		const start = now.startOf("month")
		const end = start.plus({ months: 1 })

		const partnerId = await getPartnerUserId(db, ctx.context.userId)
		const allowedUserIds = partnerId
			? [ctx.context.userId, partnerId]
			: [ctx.context.userId]
		const found = await db.query.entries.findMany({
			where: and(
				inArray(entries.userId, allowedUserIds),
				gte(entries.executedAt, start.toJSDate()),
				lt(entries.executedAt, end.toJSDate()),
			),
			orderBy: desc(entries.executedAt),
		})

		if (found.length === 0) {
			return {
				displayCurrency,
				timezone: timeZone,
				monthLabel: start.toFormat("LLLL yyyy"),
				entries: [],
			}
		}

		const neededDates = Array.from(
			new Set(
				found.map((e) =>
					DateTime.fromJSDate(e.executedAt, { zone: timeZone }).toISODate(),
				),
			),
		).filter((d): d is string => typeof d === "string")

		let ratesForDates: SelectExchangeRate[] = []
		if (neededDates.length > 0) {
			ratesForDates = await db.query.exchange_rates.findMany({
				where: inArray(exchange_rates.date, neededDates),
			})
		}

		const latest = await db.query.exchange_rates.findFirst({
			orderBy: desc(exchange_rates.date),
		})
		if (!latest) throw new Error("No exchange rates available")

		const rateByDate = new Map<string, Record<Currency, number>>(
			ratesForDates.map((r) => [r.date, r.rates]),
		)

		const enriched: MonthlyEntryForCharts[] = found.map((e) => {
			const dateKey =
				DateTime.fromJSDate(e.executedAt, { zone: timeZone }).toISODate() ||
				latest.date
			const rates = rateByDate.get(dateKey) ?? latest.rates
			const src = rates[e.currency]
			const dst = rates[displayCurrency]
			const amountConverted =
				typeof src === "number" && src > 0 && typeof dst === "number"
					? e.amount * (dst / src)
					: 0
			return { ...e, amountConverted }
		})

		return {
			displayCurrency,
			timezone: timeZone,
			monthLabel: start.toFormat("LLLL yyyy"),
			entries: enriched,
		}
	})
