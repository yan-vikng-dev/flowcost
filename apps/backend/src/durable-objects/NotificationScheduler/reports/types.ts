import type { Currency } from "@repo/shared-lib"
import type { DateTime } from "luxon"

export type ReportType = "weekly" | "monthly"

export type ReportGeneratorParams = {
	env: Env
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
