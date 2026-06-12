import { DurableObject } from "cloudflare:workers"
import { getDb, initDatabase } from "@repo/db/database/setup"
import {
	getAllowedUserIds,
	getUserById,
} from "@repo/db/drizzle/queries/helpers"
import type { SelectUser } from "@repo/db/drizzle/schemas/index"
import type { Currency } from "@repo/shared-lib"
import { DateTime } from "luxon"
import {
	sendTemplateMessage,
	sendWhatsAppText,
	WhatsAppApiError,
} from "@/lib/whatsapp/messages"
import {
	determineReportType,
	generateMonthlyReport,
	generateWeeklyReport,
	type ReportType,
} from "./reports"

export const REPORT_READY_TEMPLATE_NAME = "report_ready"
export const REPORT_READY_TEMPLATE_LANG = "en"

const RE_ENGAGEMENT_ERROR_CODE = 131047

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

	async sendReportNow(
		reportType: "weekly" | "monthly",
		dateISO: string,
	): Promise<void> {
		const db = getDb()
		if (!this.userId) {
			console.error("NotificationScheduler sendReportNow: no stored userId", {
				id: this.ctx.id.toString(),
			})
			return
		}
		const userId = this.userId

		const user = await getUserById(db, userId)
		if (!user) {
			console.warn(`No user found for sendReportNow ${userId}`, { userId })
			return
		}

		const reportDate = DateTime.fromISO(dateISO, { zone: user.timezone })
		if (!reportDate.isValid) {
			console.warn("NotificationScheduler sendReportNow: invalid dateISO", {
				userId,
				dateISO,
			})
			return
		}

		const allowedUserIds = await getAllowedUserIds(db, userId, true)
		const partnerId =
			allowedUserIds.length > 1
				? (allowedUserIds.find((id) => id !== userId) ?? null)
				: null
		const prefs = {
			timezone: user.timezone,
			displayCurrency: user.displayCurrency as Currency,
		}
		const report = await this.generateReport(
			userId,
			reportType,
			reportDate,
			prefs,
			allowedUserIds,
			partnerId,
		)
		if (!report) {
			console.warn("NotificationScheduler sendReportNow: no report generated", {
				userId,
				reportType,
				dateISO,
			})
			return
		}

		try {
			await sendWhatsAppText({
				env: this.env,
				waId: user.waId,
				text: report,
			})
			console.debug("NotificationScheduler sendReportNow delivered", {
				userId,
				reportType,
				dateISO,
			})

			const messageId = `report:${reportType}:${reportDate.toISODate()}`
			await this.appendToConversationHistory(userId, messageId, report)
		} catch (error) {
			console.error("NotificationScheduler sendReportNow failed", {
				userId,
				reportType,
				dateISO,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			})
		}
	}

	override async alarm() {
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

		const user = await getUserById(db, userId)
		if (!user) {
			console.warn(`No user found for ${userId}`, { userId })
			return
		}

		if (user.reportsPaused) {
			console.debug("NotificationScheduler skipping report — paused", {
				userId,
			})
			await this.scheduleNextAlarm()
			return
		}

		const now = DateTime.now().setZone(user.timezone)
		const reportType = determineReportType(now, {
			reportsWeeklyDay: user.reportsWeeklyDay,
			timezone: user.timezone,
		})

		if (!reportType) {
			await this.scheduleNextAlarm()
			return
		}

		console.debug("NotificationScheduler sending report", {
			userId,
			reportType,
		})

		const allowedUserIds = await getAllowedUserIds(db, userId, true)
		const partnerId =
			allowedUserIds.length > 1
				? (allowedUserIds.find((id) => id !== userId) ?? null)
				: null
		const prefs = {
			timezone: user.timezone,
			displayCurrency: user.displayCurrency as Currency,
		}
		const report = await this.generateReport(
			userId,
			reportType,
			now,
			prefs,
			allowedUserIds,
			partnerId,
		)
		if (report) {
			await this.deliverReport(user, reportType, now, report)
		}

		await this.scheduleNextAlarm()
	}

	private async deliverReport(
		user: SelectUser,
		reportType: ReportType,
		reportDate: DateTime,
		report: string,
	): Promise<void> {
		const userId = user.id
		const dateISO = reportDate.toISODate()

		try {
			await sendWhatsAppText({
				env: this.env,
				waId: user.waId,
				text: report,
			})
			console.debug("NotificationScheduler report sent via WhatsApp", {
				userId,
				waId: user.waId,
				reportType,
			})

			const messageId = `report:${reportType}:${dateISO}`
			await this.appendToConversationHistory(userId, messageId, report)
		} catch (error) {
			if (
				error instanceof WhatsAppApiError &&
				error.code === RE_ENGAGEMENT_ERROR_CODE
			) {
				console.info(
					"NotificationScheduler re-engagement window closed — sending template fallback",
					{
						userId,
						reportType,
						dateISO,
					},
				)
				const templateResult = await sendTemplateMessage({
					env: this.env,
					waId: user.waId,
					templateName: REPORT_READY_TEMPLATE_NAME,
					languageCode: REPORT_READY_TEMPLATE_LANG,
					bodyParams: [reportType],
					quickReplyPayloads: [`send_report:${reportType}:${dateISO}`],
				})
				if (!templateResult.ok) {
					console.error("NotificationScheduler template fallback failed", {
						userId,
						reportType,
						dateISO,
						status: templateResult.status,
						errorBody: templateResult.errorBody,
					})
				}
				return
			}

			console.error("NotificationScheduler failed to send WhatsApp message", {
				userId,
				waId: user.waId,
				reportType,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			})
		}
	}

	private async generateReport(
		userId: string,
		type: ReportType,
		now: DateTime,
		prefs: {
			timezone: string
			displayCurrency: Currency
		},
		allowedUserIds: string[],
		partnerId: string | null,
	): Promise<string | null> {
		const db = getDb()
		const params = {
			env: this.env,
			db,
			userId,
			now,
			prefs,
			allowedUserIds,
			partnerId,
		}
		switch (type) {
			case "weekly":
				return generateWeeklyReport(params)
			case "monthly":
				return generateMonthlyReport(params)
		}
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

		const user = await getUserById(db, userId)
		if (!user) {
			console.warn(`No user found for ${userId}, cannot schedule`, {
				userId,
			})
			return
		}

		const timeZone = user.timezone || "UTC"
		const reportsTime = user.reportsTime || "20:00"
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
