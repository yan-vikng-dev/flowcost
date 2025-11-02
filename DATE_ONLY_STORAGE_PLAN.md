# Date-Only Storage Migration Plan

## Goal

- Move to day-only storage: persist ISO dates (YYYY-MM-DD) for entries and recurrence anchors, apply timezone only for generation, month boundaries, “stop today,” and summaries.
- Keep behavior identical for users while eliminating off-by-one timezone bugs and DST surprises.

## Phases

- [ ] Phase 1: Add columns + helpers (dual-write, read-old-first)
- [ ] Phase 2: Switch readers (prefer new columns, fallback to old)
- [ ] Phase 3: Backfill migration
- [ ] Phase 4: Make new columns authoritative (write + read only new)
- [ ] Phase 5: Cleanup old fields and code paths

## Schema Changes (Drizzle)

Entries (`packages/data-ops/src/drizzle/schemas/entries.ts`)

- [ ] Add `executedDate TEXT NOT NULL` (YYYY-MM-DD)
- [ ] Unique index: `uniqueIndex("entries_recurring_unique_by_executed_date_idx").on(recurringTemplateId, executedDate)`
- [ ] Non-unique index: `index("entries_by_executed_date_idx").on(executedDate)`
- [ ] Keep `executedAt` (timestamp) during migration window

Recurring templates (`packages/data-ops/src/drizzle/schemas/recurring_entry_templates.ts`)

- [ ] Add `dtstartDate TEXT NOT NULL` (YYYY-MM-DD)
- [ ] Add `endDate TEXT NULL` (YYYY-MM-DD)
- [ ] Option: add `generationValidUntilDate TEXT NOT NULL` for consistency, or continue to use existing timestamp (keep simple first)
- [ ] Keep `dtstart` and `endAt` during migration window

Migrations

- [ ] Create drizzle migration for new columns + indexes
- [ ] Write backfill migration script (see Data Migration)

## Shared Utils (`packages/shared-lib/src/date.ts`)

- [ ] Add `toIsoDateInTimezone(date: Date, tz: string): string` → ‘YYYY-MM-DD’
- [ ] Add `isoDateToUtcMidnight(dateStr: string): Date` → Date at 00:00 UTC-floating for RRule
- [ ] Add `getMonthRangeIso(today: Date, tz: string): { startDate: string; endDate: string }` where `endDate` is exclusive (first day of next month)
- [ ] Keep existing helpers for compatibility; mark to deprecate later

## Server/API Changes

Create Entry (`apps/webapp/src/core/functions/entries.ts`)

- [ ] On input, compute `executedDate = toIsoDateInTimezone(executedAt, user.tz)`
- [ ] Dual-write: store both `executedDate` and `executedAt` (existing)
- [ ] Return unchanged payload to callers

Update Entry (`apps/webapp/src/core/functions/entries.ts`)

- [ ] If `executedAt` is updated, also update `executedDate` using user tz

Create Recurring Template (`apps/webapp/src/core/functions/recurring-templates.ts`)

- [ ] Compute `dtstartDate = toIsoDateInTimezone(dtstart, user.tz)`
- [ ] If provided, compute `endDate = toIsoDateInTimezone(endAt, user.tz)`
- [ ] Store `dtstartDate`/`endDate` and continue storing `dtstart`/`endAt` during migration
- [ ] Validate RRULE by reconstructing Dates from the ISO date strings as UTC-floating (no tz) for RRule

List/Stop Recurring Templates

- [ ] Use ISO month boundaries derived in user tz for filtering/logic
- [ ] For “stop today”, compute `todayIso = toIsoDateInTimezone(now, user.tz)` and set `endDate = todayIso` (dual-write existing `endAt` for now)

## Generation/Queries (`packages/data-ops/src/drizzle/queries`)

Recurrence generation (`recurring-entries.ts`)

- [ ] Use `dtstartDate`/`endDate` to construct RRule inputs:
  - `dtstart = isoDateToUtcMidnight(dtstartDate)`
  - `until = endDate ? isoDateToUtcMidnight(endDate) : undefined`
- [ ] Materialize occurrences by computing `executedDate = DateTime.fromJSDate(occurrence, { zone: user.tz }).toISODate()` and insert by `executedDate`
- [ ] De-duplicate via new `(recurringTemplateId, executedDate)` unique index
- [ ] Keep existing materialization by timestamps during transition (gate with fallback)

Entries listing (`entries.ts`)

- [ ] Prefer filtering with string ranges: `executedDate >= startDate && executedDate < endDate`
- [ ] For currency conversion, use `executedDate` directly as key for rates
- [ ] Fallback to `executedAt` when `executedDate` is null (pre-backfill)

Ensure Recurring Entries Materialized

- [ ] Compute month horizon via ISO strings; internal `between()` still uses Date for RRule inputs as above

## UI Changes

- No breaking UI changes required; maintain Date pickers

Entry creation flows

- [ ] Keep sending `executedAt` to backend (server computes `executedDate`)

Recurring template flows

- [ ] Keep building RRULE from selected Date using the user tz to form BYxxx (already fixed)

Summaries

- [ ] When parsing for `.toText()`, reconstruct `dtstart` from `dtstartDate` for consistent text

Advanced and Monthly views

- [ ] No changes beyond using the updated APIs

## Data Migration

Backfill `executedDate` for existing entries

- [ ] For each entry, get owner user tz (current preference), compute `executedDate = toIsoDateInTimezone(executedAt, tz)`
- [ ] Write `executedDate` if missing
- [ ] Note: historical tz changes can’t be perfectly reconstructed; choose current tz as the canonical rule

Backfill recurring templates

- [ ] Compute `dtstartDate = toIsoDateInTimezone(dtstart, user.tz)`
- [ ] If `endAt`, compute `endDate` similarly

De-duplication

- [ ] Rebuild unique constraints if needed (data may need de-dup for `(templateId, executedDate)`)

## Feature Flags / Rollout

- [ ] Flag: readers prefer new columns (on), fallback to old
- [ ] Run backfill in batches
- [ ] After backfill, verify counts match for month ranges and a sample of templates
- [ ] Remove fallback to `executedAt` reads
- [ ] Stop dual-write: only write `executedDate`, `dtstartDate`, `endDate`
- [ ] Drop old columns and old indexes in a later cleanup migration

## Testing Checklist

Helpers

- [ ] `toIsoDateInTimezone` for zones: America/Los_Angeles, Europe/Berlin, Asia/Tokyo, Australia/Sydney (DST edges)
- [ ] `isoDateToUtcMidnight` round-trips calendar day

Recurrence

- [ ] Monthly BYMONTHDAY: creating on Nov 4, 2025 yields “4th” everywhere
- [ ] Weekly BYDAY/SETPOS: DST transitions keep correct weekday
- [ ] End bound on specific date includes/excludes correctly

Queries

- [ ] Month range filters using string ranges produce same results as old timestamp logic
- [ ] Currency conversion picks correct date key

UI

- [ ] EntryDialog summary shows correct day text across timezones
- [ ] Recurring template list description stable across DST

## Performance/Indexes

- [ ] Add index on `entries.executedDate`
- [ ] Keep existing timestamp index during migration
- [ ] Ensure generator upserts by `(templateId, executedDate)` only once

## Risks and Mitigations

Historical tz uncertainty

- Mitigation: use current user tz; communicate in release notes

Dual-write complexity

- Mitigation: keep well-scoped phase window and clear flags

Data duplication

- Mitigation: de-dup before enforcing new unique index

