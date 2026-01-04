import type { Currency } from "@repo/shared-lib"
import type { DateTime } from "luxon"

export type ReportType = "daily" | "weekly" | "monthly"

export type ReportPreferences = {
	reportsMonthlyEnabled: boolean | null
	reportsWeeklyEnabled: boolean | null
	reportsDailyEnabled: boolean | null
	reportsWeeklyDay: number | null
	timezone: string
	displayCurrency: Currency
}

export type ReportGeneratorParams = {
	db: ReturnType<typeof import("@repo/db/database/setup").getDb>
	userId: string
	now: DateTime
	prefs: {
		timezone: string
		displayCurrency: Currency
	}
	allowedUserIds: string[]
	partnerId: string | null
}
