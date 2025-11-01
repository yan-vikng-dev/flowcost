import { DurableObject } from "cloudflare:workers"
import { getDb, initDatabase } from "@repo/data-ops/database/setup"
import {
	type BudgetProgressEntry,
	calculateBudgetProgress,
	fetchBudgetsForUser,
	fetchConvertedEntriesForRange,
	fetchExchangeRatesForDates,
} from "@repo/data-ops/drizzle/queries"
import {
	user_preferences,
	whatsapp_links,
} from "@repo/data-ops/drizzle/schemas/index"
import type { Currency } from "@repo/shared-config"
import { formatCurrency } from "@repo/shared-config"
import { eq } from "drizzle-orm"
import { DateTime } from "luxon"
import { sendWhatsAppText } from "@/handlers/whatsapp/helpers"
import {
	aggregateCategoryTotals,
	determineReportType,
	findMostUsedCategory,
	findTopSpendingDay,
	formatProgressBar,
	getReportDateRange,
	type ReportType,
} from "./report-helpers"

export class NotificationScheduler extends DurableObject {
	userId: string | null = null

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env)
		void ctx.blockConcurrencyWhile(async () => {
			console.debug("NotificationScheduler constructor called", {
				id: ctx.id.toString(),
				idName: ctx.id.name ?? null,
			})
			initDatabase(env.DB)
			const storedUserId = await ctx.storage.get<string>("userId")
			this.userId = storedUserId ?? null
			console.debug("NotificationScheduler constructor completed", {
				id: ctx.id.toString(),
				userId: this.userId,
				hadStoredUserId: storedUserId !== null,
			})
		})
	}

	async initialize(userId: string) {
		console.debug("NotificationScheduler initialize called", {
			providedUserId: userId,
			currentUserId: this.userId,
			id: this.ctx.id.toString(),
			idName: this.ctx.id.name ?? null,
		})
		if (this.ctx.id.name && this.ctx.id.name !== userId) {
			console.warn("NotificationScheduler initialize userId mismatch", {
				provided: userId,
				idName: this.ctx.id.name,
				id: this.ctx.id.toString(),
			})
		}
		this.userId = userId
		await this.ctx.storage.put("userId", userId)
		console.debug("NotificationScheduler userId persisted", { userId })
		await this.scheduleNextAlarm()
		console.debug("NotificationScheduler initialize completed", { userId })
	}

	async revoke() {
		console.debug("NotificationScheduler revoke called", {
			userId: this.userId,
			id: this.ctx.id.toString(),
		})
		const currentAlarm = await this.ctx.storage.getAlarm()
		console.debug("NotificationScheduler current alarm before revoke", {
			userId: this.userId,
			alarmTime: currentAlarm ? new Date(currentAlarm).toISOString() : null,
		})
		await this.ctx.storage.deleteAlarm()
		console.debug(`Revoked scheduler for user ${this.userId ?? "unknown"}`, {
			userId: this.userId,
			id: this.ctx.id.toString(),
		})
	}

	async alarm() {
		console.debug("NotificationScheduler alarm triggered", {
			userId: this.userId,
			id: this.ctx.id.toString(),
			timestamp: new Date().toISOString(),
		})
		const db = getDb()
		if (!this.userId) {
			console.error(
				"NotificationScheduler DO ID has no name and no stored userId",
				{ id: this.ctx.id.toString() },
			)
			return
		}
		const userId = this.userId

		console.debug("NotificationScheduler fetching user preferences", { userId })
		const prefs = await db.query.user_preferences.findFirst({
			where: eq(user_preferences.userId, userId),
		})

		if (!prefs) {
			console.warn(`No preferences found for user ${userId}`, { userId })
			return
		}
		console.debug("NotificationScheduler preferences loaded", {
			userId,
			timezone: prefs.timezone,
			displayCurrency: prefs.displayCurrency,
			reportsDailyEnabled: prefs.reportsDailyEnabled,
			reportsWeeklyEnabled: prefs.reportsWeeklyEnabled,
			reportsMonthlyEnabled: prefs.reportsMonthlyEnabled,
			reportsTime: prefs.reportsTime,
			reportsWeeklyDay: prefs.reportsWeeklyDay,
		})

		console.debug("NotificationScheduler fetching WhatsApp link", { userId })
		const whatsappLink = await db.query.whatsapp_links.findFirst({
			where: eq(whatsapp_links.userId, userId),
		})

		if (!whatsappLink) {
			console.warn(
				`No WhatsApp link found for user ${userId}, skipping report`,
				{
					userId,
				},
			)
			await this.scheduleNextAlarm()
			return
		}
		console.debug("NotificationScheduler WhatsApp link found", {
			userId,
			waId: whatsappLink.waId,
		})

		const now = DateTime.now().setZone(prefs.timezone)
		console.debug("NotificationScheduler determining report type", {
			userId,
			now: now.toISO(),
			timezone: prefs.timezone,
		})
		const reportType = determineReportType(now, {
			reportsMonthlyEnabled: prefs.reportsMonthlyEnabled,
			reportsWeeklyEnabled: prefs.reportsWeeklyEnabled,
			reportsDailyEnabled: prefs.reportsDailyEnabled,
			reportsWeeklyDay: prefs.reportsWeeklyDay,
			timezone: prefs.timezone,
			displayCurrency: prefs.displayCurrency,
		})

		if (!reportType) {
			console.debug(
				"NotificationScheduler no report type determined, rescheduling",
				{
					userId,
				},
			)
			await this.scheduleNextAlarm()
			return
		}
		console.debug("NotificationScheduler report type determined", {
			userId,
			reportType,
		})

		console.debug("NotificationScheduler generating report", {
			userId,
			reportType,
		})
		const report = await this.generateReport(db, userId, reportType, now, prefs)
		if (report) {
			console.debug("NotificationScheduler report generated, sending", {
				userId,
				reportType,
				reportLength: report.length,
			})
			await sendWhatsAppText({
				env: this.env,
				waId: whatsappLink.waId,
				text: report,
			})
			console.debug("NotificationScheduler report sent via WhatsApp", {
				userId,
				waId: whatsappLink.waId,
				reportType,
			})

			const messageId = `report:${reportType}:${now.toISODate()}`
			await this.appendToConversationHistory(userId, messageId, report)
		} else {
			console.debug("NotificationScheduler no report generated", {
				userId,
				reportType,
			})
		}

		console.debug("NotificationScheduler rescheduling next alarm", { userId })
		await this.scheduleNextAlarm()
		console.debug("NotificationScheduler alarm completed", { userId })
	}

	private async generateReport(
		db: ReturnType<typeof getDb>,
		userId: string,
		type: ReportType,
		now: DateTime,
		prefs: {
			timezone: string
			displayCurrency: Currency
		},
	): Promise<string | null> {
		const timeZone = prefs.timezone
		const displayCurrency = prefs.displayCurrency

		const { start, end, title } = getReportDateRange(type, now)
		console.debug("NotificationScheduler report date range", {
			userId,
			type,
			start: start.toISO(),
			end: end.toISO(),
			title,
		})

		console.debug("NotificationScheduler fetching entries", {
			userId,
			type,
			start: start.toJSDate().toISOString(),
			end: end.toJSDate().toISOString(),
			timezone: timeZone,
			displayCurrency,
		})
		const entriesResult = await fetchConvertedEntriesForRange(db, userId, {
			start: start.toJSDate(),
			end: end.toJSDate(),
			timezone: timeZone,
			displayCurrency,
			entryType: "Expense",
		})

		console.debug("NotificationScheduler entries fetched", {
			userId,
			type,
			entryCount: entriesResult.entries.length,
		})

		if (entriesResult.entries.length === 0) {
			console.debug("NotificationScheduler no entries found for period", {
				userId,
				type,
			})
			return `${title}\n\nNo expenses recorded for this period.`
		}

		console.debug("NotificationScheduler fetching exchange rates", { userId })
		const { latest } = await fetchExchangeRatesForDates(db, [])
		console.debug("NotificationScheduler exchange rates fetched", {
			userId,
			ratesCount: Object.keys(latest.rates).length,
		})

		console.debug("NotificationScheduler fetching budgets", { userId })
		const budgetsList = await fetchBudgetsForUser(db, userId)
		console.debug("NotificationScheduler budgets fetched", {
			userId,
			budgetCount: budgetsList.length,
		})

		const categoryTotals = aggregateCategoryTotals(entriesResult.entries)
		console.debug("NotificationScheduler category totals calculated", {
			userId,
			categoryCount: categoryTotals.size,
		})

		const budgetProgress = calculateBudgetProgress(
			budgetsList,
			entriesResult.entries,
			latest.rates,
			displayCurrency,
		)
		console.debug("NotificationScheduler budget progress calculated", {
			userId,
			budgetProgressCount: budgetProgress.size,
		})

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
				`Total spending: ${formatCurrency(totalSpent, displayCurrency)}`,
			)
			lines.push("")
			lines.push("By category:")
		}

		const categoriesWithSpending = Array.from(categoryTotals.entries())
			.sort((a, b) => b[1] - a[1])
			.filter(([, amount]) => amount > 0)

		for (const [category, amount] of categoriesWithSpending) {
			lines.push(`• ${category}: ${formatCurrency(amount, displayCurrency)}`)
			const budget = budgetProgress.get(category)
			if (budget) {
				const bar = formatProgressBar(budget.utilizationPct)
				lines.push(
					`    Budget: ${bar} ${Math.round(budget.utilizationPct)}% (${formatCurrency(budget.spentDisplay, displayCurrency)} / ${formatCurrency(budget.amountDisplay, displayCurrency)})`,
				)
				if (budget.utilizationPct >= 100) {
					lines.push("    ⚠️ Over budget")
				}
			}
		}

		lines.push("━━━━━━━━━━━━━━━")
		lines.push(`Total: ${formatCurrency(totalSpent, displayCurrency)}`)

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
				`vs Last week: ${sign}${formatCurrency(diff, displayCurrency)}`,
			)
		}

		if (type === "monthly") {
			const allBudgetsTotal = Array.from(budgetProgress.values()).reduce(
				(sum, b: BudgetProgressEntry) => sum + b.amountDisplay,
				0,
			)
			const allBudgetsSpent = Array.from(budgetProgress.values()).reduce(
				(sum, b: BudgetProgressEntry) => sum + b.spentDisplay,
				0,
			)
			const remaining = allBudgetsTotal - allBudgetsSpent
			lines.push("")
			lines.push(
				`Total budget: ${formatCurrency(allBudgetsSpent, displayCurrency)} / ${formatCurrency(allBudgetsTotal, displayCurrency)}`,
			)
			lines.push(`Remaining: ${formatCurrency(remaining, displayCurrency)}`)

			const topSpendingDay = findTopSpendingDay(entriesResult.entries, timeZone)
			if (topSpendingDay) {
				lines.push(
					`Top spending day: ${topSpendingDay.date} (${formatCurrency(topSpendingDay.amount, displayCurrency)})`,
				)
			}

			const mostUsedCategory = findMostUsedCategory(entriesResult.entries)
			if (mostUsedCategory) {
				lines.push(
					`Most used category: ${mostUsedCategory.category} (${mostUsedCategory.count} transactions)`,
				)
			}
		}

		return lines.join("\n")
	}

	private async scheduleNextAlarm(): Promise<void> {
		console.debug("NotificationScheduler scheduleNextAlarm called", {
			userId: this.userId,
		})
		const db = getDb()
		if (!this.userId) {
			console.error(
				"NotificationScheduler DO ID has no name and no stored userId",
				{ id: this.ctx.id.toString() },
			)
			return
		}
		const userId = this.userId

		console.debug("NotificationScheduler fetching preferences for scheduling", {
			userId,
		})
		const prefs = await db.query.user_preferences.findFirst({
			where: eq(user_preferences.userId, userId),
		})

		if (!prefs) {
			console.warn(`No preferences found for user ${userId}, cannot schedule`, {
				userId,
			})
			return
		}

		const hasAnyReportEnabled =
			prefs.reportsDailyEnabled ||
			prefs.reportsWeeklyEnabled ||
			prefs.reportsMonthlyEnabled

		if (!hasAnyReportEnabled) {
			console.debug(`No reports enabled for user ${userId}, not scheduling`, {
				userId,
				reportsDailyEnabled: prefs.reportsDailyEnabled,
				reportsWeeklyEnabled: prefs.reportsWeeklyEnabled,
				reportsMonthlyEnabled: prefs.reportsMonthlyEnabled,
			})
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
			console.debug(
				"NotificationScheduler next run is in the past, adding one day",
				{
					userId,
					nextRun: nextRun.toISO(),
					now: now.toISO(),
				},
			)
			nextRun = nextRun.plus({ days: 1 })
		}

		const nextRunUtc = nextRun.toUTC()
		const alarmTime = nextRunUtc.toMillis()

		const currentAlarm = await this.ctx.storage.getAlarm()
		console.debug("NotificationScheduler setting alarm", {
			userId,
			alarmTime: new Date(alarmTime).toISOString(),
			nextRunLocal: nextRun.toISO(),
			timeZone,
			reportsTime,
			previousAlarm: currentAlarm ? new Date(currentAlarm).toISOString() : null,
		})
		await this.ctx.storage.setAlarm(alarmTime)
		console.debug(
			`Scheduled next alarm for user ${userId} at ${nextRunUtc.toISO()} (${nextRun.toISO()} ${timeZone})`,
			{
				userId,
				alarmTime: new Date(alarmTime).toISOString(),
				nextRunUtc: nextRunUtc.toISO(),
				nextRunLocal: nextRun.toISO(),
				timeZone,
			},
		)
	}

	private async appendToConversationHistory(
		userId: string,
		messageId: string,
		report: string,
	): Promise<void> {
		console.debug(
			"NotificationScheduler appending report to conversation history",
			{
				userId,
				messageId,
				reportLength: report.length,
			},
		)
		try {
			const conversationId = this.env.AI_CONVERSATION_SERVER.idFromName(userId)
			const conversationStub =
				this.env.AI_CONVERSATION_SERVER.get(conversationId)
			await conversationStub.appendReport(messageId, report)
			console.debug("NotificationScheduler report appended to conversation", {
				userId,
				messageId,
			})
		} catch (error) {
			console.error(`Error appending report to conversation:`, {
				userId,
				messageId,
				error,
			})
		}
	}
}
