**Reports Feature**

This doc covers the automated expense reports system that sends daily, weekly, and monthly summaries via WhatsApp. Reports are scheduled using Cloudflare Durable Objects and include budget progress tracking.

**Goals**
- Send automated expense reports at configurable times
- Support three report types: daily, weekly, monthly
- Include budget progress visualization
- Integrate with WhatsApp for delivery
- Append reports to AI conversation history for context

**Data Model**

Report preferences are stored in `user_preferences` table:
- `packages/data-ops/src/drizzle/schemas/user_preferences.ts:14-18`
  - `reportsDailyEnabled`: boolean (default false)
  - `reportsWeeklyEnabled`: boolean (default false)
  - `reportsMonthlyEnabled`: boolean (default false)
  - `reportsTime`: string HH:MM format (default "20:00")
  - `reportsWeeklyDay`: number 0-6 (Sunday-Saturday, default 0)

**Scheduling Logic**

Reports use a cascading hierarchy at send-time:
- Monthly > Weekly > Daily
- Monthly reports sent on the last day of the month
- Weekly reports sent on the user-selected weekday
- Daily reports sent every day (if enabled)
- All reports use the same delivery time (`reportsTime`)

Implementation: `apps/backend-service/src/durable-objects/NotificationScheduler.ts:79-102`
```79:102:apps/backend-service/src/durable-objects/NotificationScheduler.ts
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
```

**Durable Object**

`NotificationScheduler` handles scheduling and report generation:
- `apps/backend-service/src/durable-objects/NotificationScheduler.ts:16-588`
- Uses Cloudflare Durable Object alarms for time-based scheduling
- Initializes on first access via `constructor` or explicit `initialize()` call
- Self-perpetuating: reschedules itself after each report send

Key methods:
- `alarm()`: Executes at scheduled time, determines report type, generates and sends report
- `scheduleNextAlarm()`: Calculates next run time in user's timezone, converts to UTC for alarm
- `generateReport()`: Builds report content based on type (daily/weekly/monthly)
- `determineReportType()`: Applies cascading hierarchy logic

**Report Generation**

Period boundaries:
- Daily: entries within user's local calendar day
- Weekly: entries for current week, clamped to current month boundaries
- Monthly: entries for user's local calendar month

Data inclusion:
- Includes partner-linked entries (via `findPartnerUserId()`)
- Converts amounts to user's display currency using exchange rates
- Falls back to latest available exchange rate if date-specific rate missing

Budget progress bars:
- Visual bars with filled/empty blocks: `■■■■■■■■□□ 80%` (10 blocks total)
- Implementation: `apps/backend-service/src/durable-objects/NotificationScheduler.ts:429-433`

Report content structure:
- Daily: Today's spending by category, budget progress for used categories
- Weekly: Week's spending, budget progress, comparison to previous week
- Monthly: Full month spending, all budgets, top spending day, most used category

Implementation: `apps/backend-service/src/durable-objects/NotificationScheduler.ts:104-336`

**Delivery & Storage**

- Reports sent via WhatsApp using existing `sendWhatsAppText()` helper
- Each report appended to AI conversation history with deterministic message ID: `report:{type}:{YYYY-MM-DD}`
- Implementation: `apps/backend-service/src/durable-objects/NotificationScheduler.ts:574-587`

**Settings UI**

Assistant card in settings (`apps/webapp/src/routes/_auth/app/settings/index.tsx:300-526`):
- WhatsApp integration section at top
- Reports section (only visible when WhatsApp is linked) with:
  - Monthly toggle (description: "Sent on the last day of each month")
  - Weekly toggle with weekday picker (Sunday-Saturday)
  - Daily toggle
  - Time picker (HH:MM format) for unified delivery time

Behavior:
- **WhatsApp link is source of truth**: Report settings are hidden when WhatsApp is not linked
- Weekly day picker disabled if weekly reports not enabled
- Time picker disabled if all reports are disabled
- Preferences save immediately on change via `updatePref()` callback
- Report preferences persist in database even when WhatsApp is unlinked (they're just hidden from UI)
- No automatic enable/disable of reports based on link status

**Server Functions**

Preferences management:
- `apps/webapp/src/core/functions/preferences.ts:49-89`
  - `updateUserPreferences()`: Upserts preferences, triggers reschedule if any report enabled
  - `enableReportsForUser()`: Helper to auto-enable all reports (used on WhatsApp link)

Rescheduling:
- `apps/webapp/src/core/functions/reports.ts:4-13`
  - `rescheduleReports()`: Calls backend endpoint to trigger DO initialization

**Backend Endpoints**

- `apps/backend-service/src/hono/app.ts:74-93`
  - `POST /reports/reschedule`: Accepts `{ userId }`, initializes NotificationScheduler DO

**WhatsApp Integration**

Auto-enable on link:
- When user links WhatsApp, all three report types automatically enabled
- Defaults: time "20:00", weekly day Sunday (0)
- NotificationScheduler DO initialized immediately
- Implementation: `apps/backend-service/src/handlers/whatsapp/index.ts:124-149`

Welcome message:
- Sent after successful WhatsApp link
- Confirms reports are enabled

**Edge Cases**

- Preference updates trigger immediate rescheduling
- Weekly reports clamp to current month to avoid cross-month leakage
- DST transitions handled by Luxon (timezone conversions)
- Timezone changes recompute next run immediately
- WhatsApp unlinked: skips sending, disables all reports
- Network/API failures: retry logic in send pipeline
- DO eviction: alarms rehydrate, preferences re-read from DB
- Late alarms: send once for intended slot, then advance
- Exchange rates missing: fallback to latest available rate
- Partner-linked accounts: entries included per existing rules

**File Locations**

- DO Implementation: `apps/backend-service/src/durable-objects/NotificationScheduler.ts`
- Schema: `packages/data-ops/src/drizzle/schemas/user_preferences.ts`
- Settings UI: `apps/webapp/src/routes/_auth/app/settings/index.tsx`
- Server Functions: `apps/webapp/src/core/functions/preferences.ts`, `apps/webapp/src/core/functions/reports.ts`
- Backend Endpoint: `apps/backend-service/src/hono/app.ts`
- WhatsApp Handler: `apps/backend-service/src/handlers/whatsapp/index.ts`

