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
import type { Currency } from "@repo/shared-lib"
import { formatCurrency, getCurrentMonthRange } from "@repo/shared-lib"
import { eq } from "drizzle-orm"
import { DateTime } from "luxon"
import { sendWhatsAppText } from "@/handlers/whatsapp/helpers"
import {
	aggregateCategoryTotals,
	calculateBudgetProgressForBudgets,
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
			initDatabase(env.DB)
			const storedUserId = await ctx.storage.get<string>("userId")
			this.userId = storedUserId ?? null
		})
	}

	async initialize(userId: string) {
		if (this.ctx.id.name && this.ctx.id.name !== userId) {
			console.warn("NotificationScheduler initialize userId mismatch", {
				provided: userId,
				idName: this.ctx.id.name,
				id: this.ctx.id.toString(),
			})
		}
		this.userId = userId
		await this.ctx.storage.put("userId", userId)
		await this.scheduleNextAlarm()
	}

	async revoke() {
		await this.ctx.storage.deleteAlarm()
		console.debug(`Revoked scheduler for user ${this.userId ?? "unknown"}`, {
			userId: this.userId,
		})
	}

	async alarm() {
		console.debug("NotificationScheduler alarm triggered", {
			userId: this.userId,
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

		const prefs = await db.query.user_preferences.findFirst({
			where: eq(user_preferences.userId, userId),
		})

		if (!prefs) {
			console.warn(`No preferences found for user ${userId}`, { userId })
			return
		}

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

		const now = DateTime.now().setZone(prefs.timezone)
		const reportType = determineReportType(now, {
			reportsMonthlyEnabled: prefs.reportsMonthlyEnabled,
			reportsWeeklyEnabled: prefs.reportsWeeklyEnabled,
			reportsDailyEnabled: prefs.reportsDailyEnabled,
			reportsWeeklyDay: prefs.reportsWeeklyDay,
			timezone: prefs.timezone,
			displayCurrency: prefs.displayCurrency,
		})

		if (!reportType) {
			await this.scheduleNextAlarm()
			return
		}

		console.debug("NotificationScheduler sending report", {
			userId,
			reportType,
		})

		const report = await this.generateReport(db, userId, reportType, now, prefs)
		if (report) {
			try {
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
			} catch (error) {
				console.error("NotificationScheduler failed to send WhatsApp message", {
					userId,
					waId: whatsappLink.waId,
					reportType,
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
				})
				// Don't rethrow - we still want to reschedule the next alarm
			}
		}

		await this.scheduleNextAlarm()
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
		const categoryTotals = aggregateCategoryTotals(entriesResult.entries)

		const { start: monthStart, end: monthEnd } = getCurrentMonthRange(timeZone)
		const monthlyEntriesResult = await fetchConvertedEntriesForRange(
			db,
			userId,
			{
				start: monthStart,
				end: monthEnd,
				timezone: timeZone,
				displayCurrency,
				entryType: "Expense",
			},
		)

		const budgetProgressList = calculateBudgetProgressForBudgets(
			budgetsList,
			monthlyEntriesResult.entries,
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
		}

		lines.push("━━━━━━━━━━━━━━━")
		lines.push(`Total: ${formatCurrency(totalSpent, displayCurrency)}`)

		if (budgetProgressList.length > 0) {
			lines.push("")
			lines.push("Budgets:")
			for (const budget of budgetProgressList) {
				const categoryNames = budget.categories.join(", ")
				const bar = formatProgressBar(budget.utilizationPct)
				lines.push(
					`• ${categoryNames}: ${formatCurrency(budget.spentDisplay, displayCurrency)} / ${formatCurrency(budget.amountDisplay, displayCurrency)}`,
				)
				lines.push(`  ${bar} ${Math.round(budget.utilizationPct)}%`)
				if (budget.utilizationPct >= 100) {
					lines.push("  ⚠️ Over budget")
				}
			}
		}

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
			const topSpendingDay = findTopSpendingDay(entriesResult.entries, timeZone)
			if (topSpendingDay) {
				lines.push("")
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
		const db = getDb()
		if (!this.userId) {
			console.error(
				"NotificationScheduler DO ID has no name and no stored userId",
				{ id: this.ctx.id.toString() },
			)
			return
		}
		const userId = this.userId

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
		console.debug("NotificationScheduler scheduled next alarm", {
			userId,
			alarmTime: new Date(alarmTime).toISOString(),
			nextRunLocal: nextRun.toISO(),
			timeZone,
		})
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
			console.error(`Error appending report to conversation:`, {
				userId,
				messageId,
				error,
			})
		}
	}
}
