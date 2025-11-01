# Recurring Entries: Implementation Plan

## Overview

Recurring entries allow users to define templates that automatically generate entries on a schedule. Users can override specific instances without affecting past or future entries.

## Sample Use Cases

1. **Monthly salary**: User wants to enter a salary on the 10th of every month (infinite)
2. **Override this month**: User wants to update this month's salary to a different amount without affecting future or past entries
3. **Limited recurrence**: User wants to enter a limited 10-time, weekly Monday entry for an activity

## Design Decisions

### Materialization Strategy
- **Approach**: Lazy materialization into `entries` table
- **Rationale**: 
  - Type safety: Generated entries are real `SelectEntry` types
  - Simple queries: Existing code works unchanged
  - Performance: Only materialize viewed months
  - Consumers don't need to know if entry is real or virtual

### Link Strategy
- **Approach**: Optional column `recurringTemplateId` on `entries` table
- **Rationale**:
  - Matches existing pattern (`userId` is direct column)
  - One-to-many relationship (one template → many entries)

### Generation Timing
- **Approach**: On every entries query, ensure materialization for the requested range. Use a `generationValidUntil` horizon check against the end-of-month of the query range (not "now"). Users do not query future months by design.
- **Rationale**:
  - Correct for past and current months: compares `generationValidUntil` to the query month end
  - Keeps consumers simple: queries stay unaware of recurring
  - Efficient: Only materialize viewed months; no eager future generation
  - Robust to updates: template edits update only non-overridden instances; instance edits persist

## Data Model

### Schema: `recurring_entry_templates`

```typescript
recurring_entry_templates {
  id: uuid (primary key)
  userId: text -> auth_users.id (onDelete: cascade)
  
  // Entry fields (mirrors entries table)
  amount: real (not null)
  currency: currency enum (not null)
  category: category enum (not null)
  entryType: entryType enum (not null)
  description: text (nullable)
  
  // Recurrence configuration
  rrule: text (not null) // RRULE string WITHOUT DTSTART/UNTIL/COUNT, e.g., "FREQ=MONTHLY;BYMONTHDAY=10"
  dtstart: timestamp (not null) // Anchor when recurrence begins (separate column)
  endAt?: timestamp // Optional app-level end bound (separate from RRULE)
  
  // Generation tracking
  generationValidUntil: timestamp (not null) // Horizon up to which entries are materialized
  
  // Control
  isActive: boolean (not null, default: true)
  
  // Timestamps
  createdAt: timestamp
  updatedAt: timestamp
}

// Indexes
- by_user: (userId, isActive)
- by_valid_until: (generationValidUntil)
- by_end_at: (endAt)
```

### Entries: Additional Fields (Overrides-in-Row)

We do not use a separate overrides table. Instance changes are applied directly to the `entries` row and tracked with a flag.

```typescript
entries {
  // ... existing fields ...

  // NEW: Optional link to template
  recurringTemplateId?: text -> recurring_entry_templates.id (onDelete: cascade)

  // NEW: Mark that this instance was customized
  isOverridden: boolean (not null, default: false)
}

// Indexes
- by_recurring_template: (recurringTemplateId)
- unique_recurring_by_executedAt: unique(recurringTemplateId, executedAt)
```

### Schema: `entries` (modification)

```typescript
entries {
  // ... existing fields ...
  
  // NEW: Optional link to template
  recurringTemplateId?: text -> recurring_entry_templates.id (onDelete: set null)

  // NEW: Instance override flag (edits only)
  isOverridden: boolean (not null, default: false)

  // Rationale: cascade on delete to support the nuke option (template deletion removes all generated instances)
  // NULL = manually created entry
  // NOT NULL = generated from template
}

// Indexes
- by_recurring_template: (recurringTemplateId) // For template-scoped queries
- unique_recurring_by_executedAt: unique(recurringTemplateId, executedAt)
```

### Relations

```typescript
// entries -> recurring_entry_templates (optional)
entriesRelations = relations(entries, ({ one }) => ({
  // ... existing relations ...
  recurringTemplate: one(recurring_entry_templates, {
    fields: [entries.recurringTemplateId],
    references: [recurring_entry_templates.id],
  }),
}))

// recurring_entry_templates -> entries (one-to-many)
recurringEntryTemplatesRelations = relations(recurring_entry_templates, ({ one, many }) => ({
  user: one(auth_users, {
    fields: [recurring_entry_templates.userId],
    references: [auth_users.id],
  }),
  entries: many(entries),
}))
```

## RRULE Implementation

### Rule Storage & Validation
- Store RRULE text without DTSTART/UNTIL/COUNT; those are managed by `dtstart` and `endAt` columns and the app query window.
- On create/update, validate that RRULE contains no `UNTIL` or `COUNT`; reject or strip if provided.
- Effective generation end = min(endAt (if set), end-of-month(queryEnd in user's timezone)).

### Library Choice
- **Package**: `rrule` (npm) - RFC 5545 compliant
- **Alternative**: `rrulejs` (browser/Node compatible)

### RRULE Examples

```typescript
// Monthly on 10th
{
  rrule: "FREQ=MONTHLY;BYMONTHDAY=10",
  dtstart: "2025-01-10T00:00:00Z"
}

// Weekly on Monday (no COUNT; unbounded by rule)
{
  rrule: "FREQ=WEEKLY;BYDAY=MO",
  dtstart: "2025-01-06T00:00:00Z"
}

// Daily, infinite
{
  rrule: "FREQ=DAILY",
  dtstart: "2025-01-01T00:00:00Z"
}

// Every 2 weeks on Friday
{
  rrule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=FR",
  dtstart: "2025-01-03T00:00:00Z"
}
```

### Building RRULE from UI

```typescript
type FrequencyUnit = "day" | "week" | "month" | "year"

type MonthlyMode =
  | { type: "byMonthDay" } // nth day by dtstart.day
  | { type: "byWeekday" } // nth weekday by dtstart (e.g., 3rd Saturday)

type RecurrenceUi = {
  every: number // default 1
  unit: FrequencyUnit // default month
  weeklyDays?: ("SU"|"MO"|"TU"|"WE"|"TH"|"FR"|"SA")[] // if unit=week
  monthlyMode?: MonthlyMode // if unit=month
}

function buildRRuleFromUi(dtstart: Date, ui: RecurrenceUi): string {
  const { every, unit } = ui
  const dt = DateTime.fromJSDate(dtstart)
  const parts: string[] = []
  const freq = unit.toUpperCase()
  parts.push(`FREQ=${freq}`)
  if (every && every > 1) parts.push(`INTERVAL=${every}`)

  if (unit === "week" && ui.weeklyDays?.length) {
    parts.push(`BYDAY=${ui.weeklyDays.join(",")}`)
  }

  if (unit === "month") {
    if (ui.monthlyMode?.type === "byMonthDay") {
      parts.push(`BYMONTHDAY=${dt.day}`)
    } else if (ui.monthlyMode?.type === "byWeekday") {
      const weekday = dt.toFormat("ccc").toUpperCase().slice(0, 2) // MO,TU,...
      const weekOfMonth = Math.ceil(dt.day / 7) // 1..5
      parts.push(`BYDAY=${weekday}`)
      parts.push(`BYSETPOS=${weekOfMonth}`)
    }
  }

  if (unit === "year") {
    // Encode by month and either day or weekday-of-month
    parts.push(`BYMONTH=${dt.month}`)
    // Default to day-of-month; advanced UI could support weekday-of-month similar to monthly
    parts.push(`BYMONTHDAY=${dt.day}`)
  }

  return parts.join(";")
}
```

### RRULE Helper Functions

```typescript
import { RRule } from 'rrule'

/**
 * Parse RRULE string and create RRule instance
 */
function parseRRULE(rruleString: string, dtstart: Date): RRule {
  return RRule.fromString(rruleString, {
    dtstart
  })
}

/**
 * Generate dates between start and end dates
 */
function generateDatesFromRRULE(
  rrule: RRule,
  startDate: Date,
  endDate: Date
): Date[] {
  return rrule.between(startDate, endDate, true) // inclusive
}

/**
 * Check if RRULE has reached its limit (COUNT)
 */
function isRRULEExhausted(rrule: RRule): boolean {
  const options = rrule.options
  return options.count !== undefined && 
         rrule.all().length >= options.count
}
```

## Generation Logic

### Core Generation Flow

```typescript
/**
 * Ensure recurring entries are materialized for a date range
 * Called before every entries query
 */
async function ensureRecurringEntriesMaterialized(
  db: DrizzleDb,
  userId: string,
  start: Date,
  end: Date,
  timezone: string
): Promise<void> {
  // 1. Get all active templates for user
  const templates = await db.query.recurring_entry_templates.findMany({
    where: and(
      eq(recurring_entry_templates.userId, userId),
      eq(recurring_entry_templates.isActive, true)
    )
  })
  
  // 2. Compute target horizon = end of the query's month in user's TZ
  const targetHorizon = DateTime.fromJSDate(end, { zone: timezone })
    .endOf('month')
    .toJSDate()

  // 3. Check each template for stale generation vs target horizon
  for (const template of templates) {
    const validUntil = template.generationValidUntil
    // If stale relative to target horizon, regenerate only for [start, targetHorizon]
    if (validUntil < targetHorizon) {
      await materializeTemplateEntries(
        db,
        template,
        start,
        targetHorizon,
        timezone
      )
    }
  }
}

/**
 * Materialize entries for a template by inserting missing occurrences only
 */
async function materializeTemplateEntries(
  db: DrizzleDb,
  template: RecurringTemplate,
  queryStart: Date,
  queryEnd: Date,
  timezone: string
): Promise<void> {
  // 1. Calculate generation horizon for this run as end-of-month of queryEnd
  const generateUntil = DateTime.fromJSDate(queryEnd, { zone: timezone })
    .endOf('month')
    .toJSDate()

  // 2. Parse RRULE
  const rrule = parseRRULE(template.rrule, template.dtstart)
  
  // 3. Determine effective end bound using optional endAt
  const cappedUntil = template.endAt
    ? new Date(Math.min(template.endAt.getTime(), generateUntil.getTime()))
    : generateUntil
  
  // 4. Generate dates from RRULE within [queryStart, cappedUntil]
  const dates = generateDatesFromRRULE(rrule, queryStart, cappedUntil)
  // 5. Insert new rows for missing occurrences only
  //    Use a unique(recurringTemplateId, executedAt) to make this idempotent
  const newRows: InsertEntry[] = dates.map((date) => ({
    amount: template.amount,
    currency: template.currency,
    category: template.category,
    entryType: template.entryType,
    description: template.description,
    executedAt: date,
    recurringTemplateId: template.id,
    userId: template.userId,
  }))

  if (newRows.length > 0) {
    // Pseudo: ON CONFLICT (recurringTemplateId, executedAt) DO NOTHING
    await db.insert(entries).values(newRows)
  }

  // 6. Update generationValidUntil to end-of-month of queryEnd
  await db.update(recurring_entry_templates)
    .set({ generationValidUntil: generateUntil })
    .where(eq(recurring_entry_templates.id, template.id))
}
```

### Instance Operations

- Edit generated entry: update the row and set `isOverridden = true`.
- Delete generated entry: hard-delete the row. Lazy materialization never backfills within the current month, so deleted instances won’t resurrect.

## Query Integration

### Modification to `fetchConvertedEntriesForRange`

```typescript
export async function fetchConvertedEntriesForRange(
  db: DrizzleDb,
  userId: string,
  options: FetchConvertedEntriesOptions,
): Promise<FetchConvertedEntriesResult> {
  // NEW: Ensure recurring entries are materialized
  // If including partner, ensure both users are materialized for the requested window
  const partnerId = options.includePartner
    ? await getPartnerUserId(db, userId)
    : null
  const materializeUserIds = partnerId ? [userId, partnerId] : [userId]
  for (const uid of materializeUserIds) {
    await ensureRecurringEntriesMaterialized(
      db,
      uid,
      options.start,
      options.end,
      options.timezone
    )
  }
  
  // ... rest of existing code unchanged ...
  // Existing queries work as-is because entries are real rows
}
```

### New Query Functions

```typescript
/**
 * Get all templates for a user
 */
export async function getRecurringTemplates(
  db: DrizzleDb,
  userId: string,
  includeInactive = false
): Promise<SelectRecurringTemplate[]> {
  return db.query.recurring_entry_templates.findMany({
    where: includeInactive
      ? eq(recurring_entry_templates.userId, userId)
      : and(
          eq(recurring_entry_templates.userId, userId),
          eq(recurring_entry_templates.isActive, true)
        ),
    orderBy: desc(recurring_entry_templates.createdAt),
  })
}

```

## Behavior Tree

- Template: Create
  - UI: CreateRecurringTemplate dialog mirrors createEntry, with extra fields:
    - from: date picker (default today)
    - until: optional date picker (maps to endAt)
    - every: number (default 1) and unit select [day(s), week(s), month(s), year(s)] (default month)
    - conditional: if week → pick days (SMTWTFS); if month → choose nth day (by from date) or nth weekday (by from date)
    - no COUNT limit
  - Actions: build RRULE without DTSTART/UNTIL/COUNT; persist template (isActive=true, generationValidUntil=epoch)
  - Result: no rows until the month is queried; “next instance” shown via rrule.after(now) skipping skipped days

- Template: Edit (entry fields only)
  - Allowed: amount, currency, category, entryType, description
  - Immutable: dtstart, rrule, endAt (recurrence is immutable)
  - Actions: update template; set generationValidUntil=epoch
  - Result: on next query, non-overridden instances rematerialize; overridden instances updated via override values

- Template: Pause
  - Actions: set isActive=false; delete generated entries with executedAt >= startOfDay(now, user TZ)
  - Result: future occurrences stop; past remain

- Template: Resume
  - Actions: set isActive=true; set generationValidUntil=epoch
  - Result: repopulates on next query for current month

- Template: Delete (nuke)
  - Actions: delete all entries with recurringTemplateId=template.id (past and future), delete template
  - Result: complete removal

- Instance: Edit
  - Actions: update the entry row and set `isOverridden = true`
  - Result: row reflects custom values; future template updates won’t overwrite it

- Instance: Delete
  - Actions: hard-delete the entry row
  - Result: instance removed permanently; lazy generation will not recreate within the current window

  

## Template CRUD Operations

### Create Template

```typescript
export const createRecurringTemplateInput = z.object({
  amount: z.number().gt(0),
  currency: z.enum(currencies),
  category: z.enum(categories),
  entryType: z.enum(entryTypes),
  description: z.string().optional(),
  rrule: z.string().describe("RRULE string (RFC 5545)"),
  dtstart: z.date().describe("When recurrence begins"),
})

export const createRecurringTemplate = createServerFn({ method: "POST" })
  .middleware([protectedFunctionMiddleware])
  .inputValidator(createRecurringTemplateInput)
  .handler(async (ctx) => {
    const db = getDb()
    const { rrule, dtstart, ...entryFields } = ctx.data
    
    // Validate RRULE
    try {
      parseRRULE(rrule, dtstart)
    } catch (error) {
      throw new Error(`Invalid RRULE: ${error.message}`)
    }
    
    // Set generationValidUntil to now (force generation on next query)
    const now = DateTime.now().setZone(ctx.context.timezone)
    const generationValidUntil = now.toJSDate()
    
    const [result] = await db
      .insert(recurring_entry_templates)
      .values({
        ...entryFields,
        rrule,
        dtstart,
        generationValidUntil,
        userId: ctx.context.userId,
        isActive: true,
      })
      .returning({ id: recurring_entry_templates.id })
    
    return { id: result?.id }
  })
```

### Update Template

```typescript
export const updateRecurringTemplateInput = z.object({
  id: z.string().uuid(),
  amount: z.number().gt(0).optional(),
  currency: z.enum(currencies).optional(),
  category: z.enum(categories).optional(),
  entryType: z.enum(entryTypes).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const updateRecurringTemplate = createServerFn({ method: "POST" })
  .middleware([protectedFunctionMiddleware])
  .inputValidator(updateRecurringTemplateInput)
  .handler(async (ctx) => {
    const db = getDb()
    const { id, ...updates } = ctx.data

    // Verify ownership
    const template = await db.query.recurring_entry_templates.findFirst({
      where: and(
        eq(recurring_entry_templates.id, id),
        eq(recurring_entry_templates.userId, ctx.context.userId)
      ),
    })

    if (!template) {
      throw new Error("Template not found")
    }

    // Update template entry fields and active flag (recurrence is immutable)
    await db
      .update(recurring_entry_templates)
      .set({ ...updates })
      .where(eq(recurring_entry_templates.id, id))

    const tz = ctx.context.timezone
    const now = DateTime.now().setZone(tz)
    const monthStart = now.startOf('month').toJSDate()
    const monthEnd = now.endOf('month').toJSDate()

    // Propagate entry-field changes to non-overridden instances for the current month
    const patch: Partial<InsertEntry> = {
      ...(updates.amount !== undefined && { amount: updates.amount }),
      ...(updates.currency !== undefined && { currency: updates.currency }),
      ...(updates.category !== undefined && { category: updates.category }),
      ...(updates.entryType !== undefined && { entryType: updates.entryType }),
      ...(updates.description !== undefined && { description: updates.description }),
    }

    if (Object.keys(patch).length > 0) {
      await db
        .update(entries)
        .set(patch)
        .where(
          and(
            eq(entries.recurringTemplateId, id),
            eq(entries.isOverridden, false),
            gte(entries.executedAt, monthStart),
            lt(entries.executedAt, monthEnd),
          ),
        )
    }

    // If deactivated, delete future generated entries (today and forward)
    if (updates.isActive === false) {
      await db.delete(entries).where(
        and(
          eq(entries.recurringTemplateId, id),
          gte(entries.executedAt, now.startOf('day').toJSDate()),
        ),
      )
    }

    return { success: true }
  })
```

### Delete Template

```typescript
export const deleteRecurringTemplateInput = z.object({
  id: z.string().uuid(),
})

export const deleteRecurringTemplate = createServerFn({ method: "POST" })
  .middleware([protectedFunctionMiddleware])
  .inputValidator(deleteRecurringTemplateInput)
  .handler(async (ctx) => {
    const db = getDb()
    const { id } = ctx.data
    
    // Verify ownership
    const template = await db.query.recurring_entry_templates.findFirst({
      where: and(
        eq(recurring_entry_templates.id, id),
        eq(recurring_entry_templates.userId, ctx.context.userId)
      ),
    })
    
    if (!template) {
      throw new Error("Template not found")
    }
    
    // Delete template; entries cascade via FK on entries.recurringTemplateId (onDelete: cascade)
    await db
      .delete(recurring_entry_templates)
      .where(eq(recurring_entry_templates.id, id))
    
    return { success: true }
  })
```

## Instance CRUD (Overrides-in-Row)

### Edit Instance

```typescript
export const editRecurringInstanceInput = z.object({
  entryId: z.string(),
  amount: z.number().gt(0).optional(),
  currency: z.enum(currencies).optional(),
  category: z.enum(categories).optional(),
  entryType: z.enum(entryTypes).optional(),
  description: z.string().optional(),
})

export const editRecurringInstance = createServerFn({ method: "POST" })
  .middleware([protectedFunctionMiddleware])
  .inputValidator(editRecurringInstanceInput)
  .handler(async (ctx) => {
    const db = getDb()

    // Only allow editing entries owned by the user
    const row = await db.query.entries.findFirst({
      where: and(
        eq(entries.id, ctx.data.entryId),
        eq(entries.userId, ctx.context.userId),
      ),
    })
    if (!row || !row.recurringTemplateId) throw new Error("Entry not found")

    await db
      .update(entries)
      .set({ ...ctx.data, isOverridden: true })
      .where(eq(entries.id, ctx.data.entryId))

    return { success: true }
  })
```

### Delete Instance

```typescript
export const deleteRecurringInstanceInput = z.object({
  entryId: z.string(),
})

export const deleteRecurringInstance = createServerFn({ method: "POST" })
  .middleware([protectedFunctionMiddleware])
  .inputValidator(deleteRecurringInstanceInput)
  .handler(async (ctx) => {
    const db = getDb()
    await db
      .delete(entries)
      .where(and(eq(entries.id, ctx.data.entryId), eq(entries.userId, ctx.context.userId)))
    return { success: true }
  })
```

## Helper Functions

### Invalidate Template Generation

```typescript
/**
 * Force regeneration of template for a specific month
 */
async function invalidateTemplateGeneration(
  db: DrizzleDb,
  templateId: string,
  date: Date
): Promise<void> {
  // Set generationValidUntil to past to force regeneration
  await db
    .update(recurring_entry_templates)
    .set({ generationValidUntil: new Date(0) })
    .where(eq(recurring_entry_templates.id, templateId))
}
```

### Timezone Helpers

```typescript
/**
 * Get user's timezone
 */
async function getUserTimezone(
  db: DrizzleDb,
  userId: string
): Promise<string> {
  const prefs = await db.query.user_preferences.findFirst({
    where: eq(user_preferences.userId, userId),
  })
  return prefs?.timezone ?? "UTC"
}

/**
 * Get end of month in user's timezone
 */
function getEndOfMonth(timezone: string): Date {
  return DateTime.now().setZone(timezone).endOf('month').toJSDate()
}
```

## Edge Cases & Considerations

### 1. RRULE COUNT Limit

We do not use `COUNT` in stored RRULE. Bound generation with `endAt` (optional) and the query month window; otherwise, recurrence is unbounded.

### 2. Template Deletion

- **Nuke behavior**: Delete template and all its generated entries (past and future)

### 3. Template Edit Scenarios

| Change | Effect |
|--------|--------|
| `amount` changes | Regenerate future months |
| `currency` changes | Regenerate future months |
| `category` changes | Regenerate future months |
| `rrule` changes | Regenerate future months |
| `dtstart` changes | Regenerate all (if moved earlier, generate new entries) |
| `isActive` → false | Delete future generated entries |
| `isActive` → true | Regenerate on next query |

### 4. Instance Edge Cases

- Editing an instance marks `isOverridden = true`; subsequent template updates don’t overwrite it.
- Deleting an instance removes it permanently; lazy generation won’t recreate it in the current month.

### 5. Timezone Handling

- All timestamps stored in UTC
- `generationValidUntil` compared using user's timezone
- RRULE dates generated in user's timezone
- `executedAt` stored as UTC timestamp

### 6. Performance Considerations

- **Indexes**: Ensure indexes on `recurringTemplateId`, `generationValidUntil`, `executedAt`
- **Batch operations**: Generate all templates in single transaction
- **Caching**: Consider caching template queries (but be careful with staleness)

### 7. Concurrent Updates

- Use database transactions for regeneration
- Check `generationValidUntil` after acquiring lock
- Handle race conditions gracefully

## Implementation Steps

### Phase 1: Schema (Drizzle Push)

1. ✅ Add `recurring_entry_templates` schema (Drizzle style: `sqliteTable`, `integer({ mode: "timestamp_ms" })`, `integer({ mode: "boolean" })`)
2. ✅ Modify `entries`: add optional `recurringTemplateId` and `isOverridden` (boolean)
3. ✅ Add indexes in table callbacks, including unique(recurringTemplateId, executedAt)
4. ✅ Update relations
5. ✅ Run `pnpm --filter data-ops run drizzle:push`

### Phase 2: Core Generation Logic

1. ✅ Install `rrule` package
2. ✅ Create RRULE helper functions
3. ✅ Implement `ensureRecurringEntriesMaterialized`
4. ✅ Implement `materializeTemplateEntries` (insert-missing only)
5. ✅ Integrate into `fetchConvertedEntriesForRange`

### Phase 3: Template CRUD

1. ✅ Create template server functions
2. ✅ Validate RRULE on create/update
3. ✅ Handle template updates (invalidate generation)
4. ✅ Handle template deletion (cleanup future entries)

### Phase 4: Instance CRUD

1. ✅ Edit instance: update entry row + set `isOverridden = true`
2. ✅ Delete instance: hard-delete entry row

### Phase 5: Testing

1. ✅ Unit tests for RRULE parsing
2. ✅ Unit tests for generation logic
3. ✅ Integration tests for CRUD operations
4. ✅ Edge case testing

### Phase 6: UI (Future)

1. Template creation form
2. Template list/management
3. Instance edit/delete UI on generated entries
4. Visual indicators for recurring entries

## Drizzle Push Notes

- We use schema-first with Drizzle and push to D1 via the configured HTTP driver (`packages/data-ops/drizzle-kit.config.ts`).
- After updating schemas:
  - Run `pnpm --filter data-ops run drizzle:push`
  - Build `@repo/data-ops` if needed by dependents

## UI & UX Components

- RecurringTemplatesCard
  - Displays all active templates with separator
  - “Create” button opens CreateRecurringTemplate dialog
  - Shows “next instance date” per template
  - Edit mode per template:
    - Edit (entry fields only; recurrence immutable)
    - Pause (set inactive + delete future generated entries; keep template)
    - Delete (nuke): removes template and all generated instances

## Entry Operations Integration

- Deleting a generated entry hard-deletes the row.
- Editing a generated entry updates the row and sets `isOverridden = true`.
- Manual entries (no `recurringTemplateId`) continue through existing create/delete flows.

## Open Questions

1. **UI/UX**: How should users create/edit templates? Wizard? Form?
2. **Notifications**: Should users be notified when recurring entries are generated?
3. **Batch operations**: Should users be able to edit multiple templates at once?
4. **Import/Export**: Should templates be exportable/importable?
5. **Analytics**: Should we track template usage statistics?
6. **Uniqueness**: Ensure `(recurringTemplateId, executedAt)` uniqueness for generated rows; normalize executedAt for recurrences.

## References

- [RFC 5545 - iCalendar](https://tools.ietf.org/html/rfc5545)
- [rrule.js Documentation](https://github.com/jkbrzt/rrule)
- [RRULE Generator](https://rrule.js.org/)
