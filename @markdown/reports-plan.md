## Reports system plan

### Terminology and defaults

- **Feature name**: "reports" across code, UI, and docs.
- **Report types**: daily, weekly, monthly.
- **Defaults**: all report types are OFF by default for new users.
- **WhatsApp link is source of truth**: when a user links their WhatsApp number, the scheduler is initialized. When unlinked, the scheduler is revoked. Report settings UI is hidden when not linked, but preferences persist in database.

### Data model (extend `user_preferences`)

- Keep `timezone` as the source of truth for scheduling.
- Add fields (all persisted in `user_preferences`):
  - **reportsDailyEnabled**: boolean (default false)
  - **reportsWeeklyEnabled**: boolean (default false)
  - **reportsMonthlyEnabled**: boolean (default false)
  - **reportsTime**: string HH:MM in user's timezone (e.g. "20:00", default "20:00")
  - **reportsWeeklyDay**: number 0–6 (Sunday–Saturday, consistent with Luxon, default 0 for Sunday)

### Scheduling and hierarchy

- **Unified delivery time**: one time-of-day applies to all report types.
- **Weekly day**: user-selectable weekday for the weekly report.
- **Monthly day**: always the last day of the month.
- **Cascading hierarchy at send-time**: monthly > weekly > daily.
  - example for a report decision on last day of month:
  - If it’s the last day of the month and monthly is enabled → send monthly.
  - Else if it’s the selected weekly day and weekly is enabled → send weekly.
  - Else if daily is enabled → send daily.
  - Else no report.

### Period boundaries and data selection

- **Daily**: entries within the user’s local calendar day.
- **Weekly**: entries for the current week, but clamp data to the current month’s window (ensure no cross-month leakage).
- **Monthly**: entries for the user’s local calendar month.
- Include partner-linked entries following the same inclusion logic already used in `get_entries`.
- Convert amounts to the user’s display currency; fall back to latest available exchange rate if a specific date’s rate is missing.

### Report content

**Budget progress bars**: Use visual bars with filled/empty blocks and percentage.
- Format: `■■■■■■■■□□ 80%` (10 blocks total, filled based on percentage)
- Example: `■■■■■■■□□□ 70%` (7 filled, 3 empty)

**Daily report** (very brief):
- Sum spent per category (only categories with entries today)
- Total spent today
- Budget update only for categories that were used this day
- Format: concise, WhatsApp-friendly

**Example daily report**:
```
Daily Report - Jan 15

Today's spending:
• Food: $45.20
    Budget: ■■■■■■■■■□ 85% ($450 / $500)
• Transportation: $12.50
    Budget: ■■■■□□□□□□ 40% ($100 / $250)
• Shopping: $28.00
━━━━━━━━━━━━━━━
Total: $85.70
```

**Weekly report**:
- All budgets and expenses for the week (clamped to current month)
- Week-to-date totals by category
- Budget progress for all active budgets
- Comparison to previous week (within current month)

**Example weekly report**:
```
Weekly Report - Jan 15-21

This week's spending:
• Food: $287.50
    Budget: ■■■■■■■■■□ 95% ($475 / $500)
• Transportation: $89.20
    Budget: ■■■■■■□□□□ 60% ($150 / $250)
• Shopping: $156.30
    Budget: ■■■■□□□□□□ 40% ($200 / $500)
• Bills: $0.00
    Budget: ■■■■■■■■■■ 100% ($200 / $200)
• Entertainment: $45.00
    Budget: ■■■■■■□□□□ 60% ($120 / $200)
━━━━━━━━━━━━━━━
Total: $578.00

vs Last week: +$124.50
```

**Monthly report**:
- All budgets and expenses for the full month
- Complete budget performance with progress bars
- Category breakdowns and trends
- Future: may include AI analysis (insights, patterns, suggestions)

**Example monthly report**:
```
Monthly Report - January 2024

Total spending: $2,347.80

By category:
• Food: $1,245.30
    Budget: ■■■■■■■■■■ 100% ($500 / $500) ⚠️ Over budget
• Transportation: $389.50
    Budget: ■■■■■■■■□□ 80% ($200 / $250)
• Shopping: $523.20
    Budget: ■■■■■■□□□□ 60% ($300 / $500)
• Bills: $200.00
    Budget: ■■■■■■■■■■ 100% ($200 / $200)
• Entertainment: $89.80
    Budget: ■■■■□□□□□□ 40% ($80 / $200)
━━━━━━━━━━━━━━━
Total budget: $1,650 / $1,700
Remaining: $52.20

Top spending day: Jan 18 ($287.50)
Most used category: Food (23 transactions)
```

### Delivery and storage for context

- **Channel**: WhatsApp via existing send pipeline.
- **Context**: append each report to `AiConversationServer` conversation history so the assistant can reference prior reports in replies.
- **Idempotency**: deterministic message IDs like `report:{type}:{YYYY-MM-DD}` to prevent duplicates on retries.

### Settings UI (“Assistant” card)

- Create a new **Assistant** card in settings.
- Move the existing WhatsApp integration UI to the top of this card.
- Add a **Reports** section:
  - Toggle: **Monthly** (OFF by default; description: sent on last day of month).
  - Toggle: **Weekly** (OFF by default) and a **weekday picker** (Sun–Sat).
  - Toggle: **Daily** (OFF by default).
  - **Time picker** for a single HH:MM delivery time (applies to all types).
- Saving triggers the server function to persist preferences and invoke backend rescheduling logic inline (no public reschedule endpoint).

### Scheduling flow and orchestration

- **Source of truth**: `user_preferences` in the database (timezone + reports fields).
- **Rescheduling on change**: when preferences are updated via webapp server functions, immediately call backend worker/DO logic to recompute the next alarm and set it; no separate reschedule API is needed.
- **At alarm time**: read latest preferences from DB, resolve the cascading type (monthly > weekly > daily), generate report, send, and then compute/set the next alarm.
- **Timezone handling**: compute the next wall-clock run in the user's timezone, convert to UTC for alarms; use Luxon for DST-safe conversions.

### Durable Object initialization

**NotificationScheduler DO lifecycle**:
- DOs are created lazily when first accessed via `idFromName(userId)` + `get()`
- **Initial creation triggers**:
  1. **Primary**: When user links WhatsApp
     - Creates/initializes the NotificationScheduler DO (via `initialize()`)
     - DO calculates next alarm time and calls `setAlarm()` (if reports are enabled)
     - Report preferences in database remain unchanged (not auto-enabled)
     - Report settings UI becomes visible
  2. **Secondary**: When user preferences are updated and at least one report type is enabled
     - Happens in webapp server function after saving preferences
     - Calls backend worker/DO to reschedule alarms
- **Revocation**: When user unlinks WhatsApp
     - Scheduler is revoked via `revoke()` method (cancels alarms)
     - Report settings UI is hidden
     - Report preferences in database remain unchanged
- **Constructor behavior**: On first creation, DO reads preferences from DB, calculates next alarm time, and calls `setAlarm()`
- **After initialization**: Once an alarm is set, the DO will keep rescheduling itself after each report send (self-perpetuating)
- **If all reports disabled**: DO can be left idle; alarms won't fire, but DO will remain in storage

### Edge cases

- **Preference updates**: updates immediately persist and trigger inline rescheduling; cancel/replace prior alarm if necessary.
- **Cascading at boundaries**: if last day of month and monthly enabled → monthly; if monthly disabled but it’s also the weekly day and weekly enabled → weekly; else daily if enabled.
- **Weekly spanning months**: clamp the data to the current month range to avoid double-counting.
- **DST transitions**: if HH:MM falls into a skipped/repeated hour, schedule at the closest valid local time; rely on idempotent message IDs to avoid duplicates.
- **Timezone changes**: recompute next run immediately upon saving a new timezone.
- **WhatsApp unlinked**: scheduler is revoked (alarms cancelled), report settings UI hidden, but preferences persist in database.
- **WhatsApp linking**: initializes NotificationScheduler DO, makes report settings UI visible, but does not auto-enable reports.
- **Network/API failures**: retry with exponential backoff; maintain idempotent IDs to prevent duplicate content.
- **Worker/DO eviction**: alarms rehydrate; on execution, re-read preferences from DB and proceed.
- **Late/already passed slots**: if fired late, send once for the intended slot and then advance; do not backfill multiple reports.
- **Exchange rates missing**: fallback to latest available rate.
- **Partner-linked accounts**: include partner entries as per existing rules.

### Operational notes

- All report types are OFF by default.
- WhatsApp link is source of truth: scheduler initialized when linked, revoked when unlinked.
- Report settings UI is hidden when WhatsApp is not linked, but preferences persist in database.
- Users can toggle reports on/off and adjust schedules via the Assistant settings card (when WhatsApp is linked).
- Scheduling logic invoked from webapp server functions and backend DO/worker logic.
- Revocation endpoint available: `POST /reports/revoke` to cancel alarms when unlinking.
- Reports are always appended to the assistant conversation history for contextual follow-ups.


