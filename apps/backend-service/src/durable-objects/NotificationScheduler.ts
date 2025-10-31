import { DurableObject } from "cloudflare:workers"
import { getDb, initDatabase } from "@repo/data-ops/database/setup"
import {
	fetchBudgetsForUser,
	fetchConvertedEntriesForRange,
	fetchExchangeRatesForDates,
} from "@repo/data-ops/drizzle/queries"
import {
	user_preferences,
	whatsapp_links,
} from "@repo/data-ops/drizzle/schemas/index"
import type { Category, Currency } from "@repo/shared-config"
import { eq } from "drizzle-orm"
import { DateTime } from "luxon"
import { sendWhatsAppText } from "@/handlers/whatsapp/helpers"

export class NotificationScheduler extends DurableObject {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env)
		void ctx.blockConcurrencyWhile(async () => {
			initDatabase(env.DB)
			await this.scheduleNextAlarm()
		})
	}

	async initialize() {
		await this.scheduleNextAlarm()
	}

	async revoke() {
		await this.ctx.storage.deleteAlarm()
		console.debug(`Revoked scheduler for user ${this.ctx.id.name}`)
	}

	async alarm() {
		const db = getDb()
		const userId = this.ctx.id.name
		if (!userId) {
			console.error("NotificationScheduler DO ID has no name")
			return
		}

		const prefs = await db.query.user_preferences.findFirst({
			where: eq(user_preferences.userId, userId),
		})

		if (!prefs) {
			console.warn(`No preferences found for user ${userId}`)
			return
		}

		const whatsappLink = await db.query.whatsapp_links.findFirst({
			where: eq(whatsapp_links.userId, userId),
		})

		if (!whatsappLink) {
			console.warn(`No WhatsApp link found for user ${userId}, skipping report`)
			await this.scheduleNextAlarm()
			return
		}

		const now = DateTime.now().setZone(prefs.timezone)
		const reportType = this.determineReportType(now, prefs)

		if (!reportType) {
			await this.scheduleNextAlarm()
			return
		}

		const report = await this.generateReport(db, userId, reportType, now, prefs)
		if (report) {
			await sendWhatsAppText({
				env: this.env,
				waId: whatsappLink.waId,
				text: report,
			})

			const messageId = `report:${reportType}:${now.toISODate()}`
			await this.appendToConversationHistory(userId, messageId, report)
		}

		await this.scheduleNextAlarm()
	}

	private determineReportType(
		now: DateTime,
		prefs: {
			reportsMonthlyEnabled: boolean | null
			reportsWeeklyEnabled: boolean | null
			reportsDailyEnabled: boolean | null
			reportsWeeklyDay: number | null
		},
	): "daily" | "weekly" | "monthly" | null {
		const isLastDayOfMonth = now.day === now.endOf("month").day
		const weeklyDay = prefs.reportsWeeklyDay ?? 0
		const dayOfWeek = now.weekday === 7 ? 0 : now.weekday

		if (isLastDayOfMonth && prefs.reportsMonthlyEnabled) {
			return "monthly"
		}
		if (dayOfWeek === weeklyDay && prefs.reportsWeeklyEnabled) {
			return "weekly"
		}
		if (prefs.reportsDailyEnabled) {
			return "daily"
		}
		return null
	}

	private async generateReport(
		db: ReturnType<typeof getDb>,
		userId: string,
		type: "daily" | "weekly" | "monthly",
		now: DateTime,
		prefs: {
			timezone: string
			displayCurrency: Currency
		},
	): Promise<string | null> {
		const timeZone = prefs.timezone
		const displayCurrency = prefs.displayCurrency

		let start: DateTime
		let end: DateTime
		let title: string

		if (type === "daily") {
			start = now.startOf("day")
			end = start.plus({ days: 1 })
			title = `Daily Report - ${now.toFormat("LLL d")}`
		} else if (type === "weekly") {
			start = now.startOf("week")
			end = start.plus({ weeks: 1 })
			const monthStart = now.startOf("month")
			const monthEnd = now.endOf("month")
			if (start < monthStart) start = monthStart
			if (end > monthEnd) end = monthEnd.plus({ days: 1 })
			title = `Weekly Report - ${start.toFormat("LLL d")}-${end.minus({ days: 1 }).toFormat("LLL d")}`
		} else {
			start = now.startOf("month")
			end = start.plus({ months: 1 })
			title = `Monthly Report - ${now.toFormat("LLLL yyyy")}`
		}

		const entriesResult = await fetchConvertedEntriesForRange(db, userId, {
			start: start.toJSDate(),
			end: end.toJSDate(),
			timezone: timeZone,
			displayCurrency,
			entryType: "Expense",
		})

		if (entriesResult.entries.length === 0) {
			return `${title}\n\nNo expenses recorded for this period.`
		}

		const { latest } = await fetchExchangeRatesForDates(db, [])

		const budgetsList = await fetchBudgetsForUser(db, userId)

		const categoryTotals = new Map<Category, number>()
		for (const entry of entriesResult.entries) {
			if (entry.convertedAmount !== null) {
				const current = categoryTotals.get(entry.category as Category) || 0
				categoryTotals.set(
					entry.category as Category,
					current + entry.convertedAmount,
				)
			}
		}

		const budgetProgress = await this.calculateBudgetProgress(
			budgetsList,
			entriesResult.entries,
			latest.rates,
			displayCurrency,
		)

		const totalSpent = Array.from(categoryTotals.values()).reduce(
			(sum, val) => sum + val,
			0,
		)

		const lines: string[] = [title, ""]

		if (type === "daily") {
			lines.push("Today's spending:")
		} else if (type === "weekly") {
			lines.push("This week's spending:")
		} else {
			lines.push(
				`Total spending: ${this.formatCurrency(totalSpent, displayCurrency)}`,
			)
			lines.push("")
			lines.push("By category:")
		}

		const categoriesWithSpending = Array.from(categoryTotals.entries())
			.sort((a, b) => b[1] - a[1])
			.filter(([, amount]) => amount > 0)

		for (const [category, amount] of categoriesWithSpending) {
			lines.push(
				`• ${category}: ${this.formatCurrency(amount, displayCurrency)}`,
			)
			const budget = budgetProgress.get(category)
			if (budget) {
				const bar = this.formatProgressBar(budget.utilizationPct)
				lines.push(
					`    Budget: ${bar} ${Math.round(budget.utilizationPct)}% (${this.formatCurrency(budget.spentDisplay, displayCurrency)} / ${this.formatCurrency(budget.amountDisplay, displayCurrency)})`,
				)
				if (budget.utilizationPct >= 100) {
					lines.push("    ⚠️ Over budget")
				}
			}
		}

		lines.push("━━━━━━━━━━━━━━━")
		lines.push(`Total: ${this.formatCurrency(totalSpent, displayCurrency)}`)

		if (type === "weekly") {
			const previousWeekStart = start.minus({ weeks: 1 })
			const previousWeekEnd = start
			const previousWeekResult = await fetchConvertedEntriesForRange(
				db,
				userId,
				{
					start: previousWeekStart.toJSDate(),
					end: previousWeekEnd.toJSDate(),
					timezone: timeZone,
					displayCurrency,
					entryType: "Expense",
				},
			)

			const previousWeekTotal = previousWeekResult.entries.reduce(
				(sum, entry) => sum + (entry.convertedAmount ?? 0),
				0,
			)

			const diff = totalSpent - previousWeekTotal
			const sign = diff >= 0 ? "+" : ""
			lines.push(
				`vs Last week: ${sign}${this.formatCurrency(diff, displayCurrency)}`,
			)
		}

		if (type === "monthly") {
			const allBudgetsTotal = Array.from(budgetProgress.values()).reduce(
				(sum, b) => sum + b.amountDisplay,
				0,
			)
			const allBudgetsSpent = Array.from(budgetProgress.values()).reduce(
				(sum, b) => sum + b.spentDisplay,
				0,
			)
			const remaining = allBudgetsTotal - allBudgetsSpent
			lines.push("")
			lines.push(
				`Total budget: ${this.formatCurrency(allBudgetsSpent, displayCurrency)} / ${this.formatCurrency(allBudgetsTotal, displayCurrency)}`,
			)
			lines.push(
				`Remaining: ${this.formatCurrency(remaining, displayCurrency)}`,
			)

			const topSpendingDay = this.findTopSpendingDay(
				entriesResult.entries,
				timeZone,
			)
			if (topSpendingDay) {
				lines.push(
					`Top spending day: ${topSpendingDay.date} (${this.formatCurrency(topSpendingDay.amount, displayCurrency)})`,
				)
			}

			const mostUsedCategory = this.findMostUsedCategory(entriesResult.entries)
			if (mostUsedCategory) {
				lines.push(
					`Most used category: ${mostUsedCategory.category} (${mostUsedCategory.count} transactions)`,
				)
			}
		}

		return lines.join("\n")
	}

	private async calculateBudgetProgress(
		budgetsList: Array<{
			id: string
			amount: number
			currency: string
			categories: unknown
		}>,
		entries: Array<{
			category: string
			convertedAmount: number | null
		}>,
		latestRates: Record<Currency, number>,
		displayCurrency: Currency,
	): Promise<
		Map<
			Category,
			{ spentDisplay: number; amountDisplay: number; utilizationPct: number }
		>
	> {
		const result = new Map<
			Category,
			{ spentDisplay: number; amountDisplay: number; utilizationPct: number }
		>()

		for (const budget of budgetsList) {
			const budgetCategories = budget.categories as Category[]
			let spentDisplay = 0

			for (const entry of entries) {
				if (!budgetCategories.includes(entry.category as Category)) continue
				if (entry.convertedAmount !== null) {
					spentDisplay += entry.convertedAmount
				}
			}

			const srcBudgetRate = latestRates[budget.currency as Currency]
			const dstBudgetRate = latestRates[displayCurrency]
			const amountDisplay =
				typeof srcBudgetRate === "number" &&
				srcBudgetRate > 0 &&
				typeof dstBudgetRate === "number"
					? budget.amount * (dstBudgetRate / srcBudgetRate)
					: budget.amount

			const utilizationPct =
				amountDisplay > 0
					? Math.min(100, (spentDisplay / amountDisplay) * 100)
					: 0

			for (const category of budgetCategories) {
				const existing = result.get(category)
				if (existing) {
					existing.spentDisplay += spentDisplay
					existing.amountDisplay += amountDisplay
					existing.utilizationPct = Math.min(
						100,
						(existing.spentDisplay / existing.amountDisplay) * 100,
					)
				} else {
					result.set(category, {
						spentDisplay,
						amountDisplay,
						utilizationPct,
					})
				}
			}
		}

		return result
	}

	private formatProgressBar(percentage: number): string {
		const filled = Math.round((percentage / 100) * 10)
		const empty = 10 - filled
		return "■".repeat(filled) + "□".repeat(empty)
	}

	private formatCurrency(amount: number, currency: Currency): string {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount)
	}

	private findTopSpendingDay(
		entries: Array<{ executedAt: Date; convertedAmount: number | null }>,
		timeZone: string,
	): { date: string; amount: number } | null {
		const dayTotals = new Map<string, number>()

		for (const entry of entries) {
			if (entry.convertedAmount === null) continue
			const isoDate = DateTime.fromJSDate(entry.executedAt, {
				zone: timeZone,
			}).toISODate()
			const dateKey = isoDate || ""
			if (!dateKey) continue
			const current = dayTotals.get(dateKey) || 0
			dayTotals.set(dateKey, current + entry.convertedAmount)
		}

		let topDay: { date: string; amount: number } | null = null
		for (const [date, amount] of dayTotals.entries()) {
			if (!topDay || amount > topDay.amount) {
				const dt = DateTime.fromISO(date, { zone: timeZone })
				topDay = {
					date: dt.toFormat("LLL d"),
					amount,
				}
			}
		}

		return topDay
	}

	private findMostUsedCategory(
		entries: Array<{ category: string }>,
	): { category: string; count: number } | null {
		const categoryCounts = new Map<string, number>()
		for (const entry of entries) {
			const current = categoryCounts.get(entry.category) || 0
			categoryCounts.set(entry.category, current + 1)
		}

		let topCategory: { category: string; count: number } | null = null
		for (const [category, count] of categoryCounts.entries()) {
			if (!topCategory || count > topCategory.count) {
				topCategory = { category, count }
			}
		}

		return topCategory
	}

	private async scheduleNextAlarm(): Promise<void> {
		const db = getDb()
		const userId = this.ctx.id.name
		if (!userId) {
			console.error("NotificationScheduler DO ID has no name")
			return
		}

		const prefs = await db.query.user_preferences.findFirst({
			where: eq(user_preferences.userId, userId),
		})

		if (!prefs) {
			console.warn(`No preferences found for user ${userId}, cannot schedule`)
			return
		}

		const hasAnyReportEnabled =
			prefs.reportsDailyEnabled ||
			prefs.reportsWeeklyEnabled ||
			prefs.reportsMonthlyEnabled

		if (!hasAnyReportEnabled) {
			console.debug(`No reports enabled for user ${userId}, not scheduling`)
			return
		}

		const timeZone = prefs.timezone || "UTC"
		const reportsTime = prefs.reportsTime || "20:00"
		const [hourStr, minuteStr] = reportsTime.split(":")
		const hour = Number.parseInt(hourStr || "20", 10)
		const minute = Number.parseInt(minuteStr || "0", 10)

		const now = DateTime.now().setZone(timeZone)
		let nextRun = now.set({ hour, minute, second: 0, millisecond: 0 })

		if (nextRun <= now) {
			nextRun = nextRun.plus({ days: 1 })
		}

		const nextRunUtc = nextRun.toUTC()
		const alarmTime = nextRunUtc.toMillis()

		await this.ctx.storage.setAlarm(alarmTime)
		console.debug(
			`Scheduled next alarm for user ${userId} at ${nextRunUtc.toISO()} (${nextRun.toISO()} ${timeZone})`,
		)
	}

	private async appendToConversationHistory(
		userId: string,
		messageId: string,
		report: string,
	): Promise<void> {
		try {
			const conversationId = this.env.AI_CONVERSATION_SERVER.idFromName(userId)
			const conversationStub =
				this.env.AI_CONVERSATION_SERVER.get(conversationId)
			await conversationStub.appendReport(messageId, report)
		} catch (error) {
			console.error(`Error appending report to conversation:`, error)
		}
	}
}
