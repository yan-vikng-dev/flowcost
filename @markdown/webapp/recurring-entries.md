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
  - Simple queries and regeneration logic
  - Easy to filter generated vs manual entries

### Generation Timing
- **Approach**: Check on every query using `generationValidUntil` timestamp
- **Rationale**:
  - Always accurate (checks templates every query)
  - Simple logic (no mutation hooks needed)
  - Fast check (timestamp comparison)
  - Works even if mutations happen elsewhere

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
  rrule: text (not null) // RRULE string (RFC 5545), e.g., "FREQ=MONTHLY;BYMONTHDAY=10"
  dtstart: timestamp (not null) // DTSTART for RRULE (when recurrence begins)
  
  // Generation tracking
  generationValidUntil: timestamp (not null) // When current generation expires
  
  // Control
  isActive: boolean (not null, default: true)
  
  // Timestamps
  createdAt: timestamp
  updatedAt: timestamp
}

// Indexes
- by_user: (userId, isActive)
- by_valid_until: (generationValidUntil) // For efficient stale check
```

### Schema: `entry_overrides`

```typescript
entry_overrides {
  id: uuid (primary key)
  templateId: uuid -> recurring_entry_templates.id (onDelete: cascade)
  executedAt: timestamp (not null) // Specific date to override
  
  // All nullable - only override what's different
  amount?: real
  currency?: currency enum
  category?: category enum
  entryType?: entryType enum
  description?: text
  deletedAt?: timestamp // To skip this instance (soft delete)
  
  // Timestamps
  createdAt: timestamp
  updatedAt: timestamp
}

// Indexes
- by_template_date: (templateId, executedAt) // For fast override lookup
- by_date_range: (executedAt) // For range queries
```

### Schema: `entries` (modification)

```typescript
entries {
  // ... existing fields ...
  
  // NEW: Optional link to template
  recurringTemplateId?: text -> recurring_entry_templates.id (onDelete: set null)
  
  // Rationale: set null on delete to preserve historical entries
  // NULL = manually created entry
  // NOT NULL = generated from template
}

// Indexes
- by_recurring_template: (recurringTemplateId) // For regeneration queries
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
  overrides: many(entry_overrides),
}))

// entry_overrides -> recurring_entry_templates
entryOverridesRelations = relations(entry_overrides, ({ one }) => ({
  template: one(recurring_entry_templates, {
    fields: [entry_overrides.templateId],
    references: [recurring_entry_templates.id],
  }),
}))
```

## RRULE Implementation

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

// Weekly on Monday, 10 occurrences
{
  rrule: "FREQ=WEEKLY;BYDAY=MO;COUNT=10",
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
  
  const now = DateTime.now().setZone(timezone)
  
  // 2. Check each template for stale generation
  for (const template of templates) {
    const validUntil = DateTime.fromJSDate(
      template.generationValidUntil,
      { zone: timezone }
    )
    
    // 3. If stale, regenerate
    if (validUntil < now) {
      await regenerateTemplateEntries(
        db,
        template,
        start,
        end,
        timezone
      )
    }
  }
}

/**
 * Regenerate entries for a template
 */
async function regenerateTemplateEntries(
  db: DrizzleDb,
  template: RecurringTemplate,
  queryStart: Date,
  queryEnd: Date,
  timezone: string
): Promise<void> {
  // 1. Calculate generation horizon (end of current month)
  const now = DateTime.now().setZone(timezone)
  const generateUntil = now.endOf('month').toJSDate()
  
  // 2. Get all overrides for this template in the range
  const overrides = await db.query.entry_overrides.findMany({
    where: and(
      eq(entry_overrides.templateId, template.id),
      gte(entry_overrides.executedAt, queryStart),
      lt(entry_overrides.executedAt, generateUntil),
      isNull(entry_overrides.deletedAt) // Only active overrides
    )
  })
  
  // 3. Parse RRULE
  const rrule = parseRRULE(template.rrule, template.dtstart)
  
  // 4. Generate dates from RRULE
  const dates = generateDatesFromRRULE(rrule, queryStart, generateUntil)
  
  // 5. Delete existing generated entries (within query range)
  await db.delete(entries).where(
    and(
      eq(entries.recurringTemplateId, template.id),
      gte(entries.executedAt, queryStart),
      lt(entries.executedAt, generateUntil)
    )
  )
  
  // 6. Generate new entries applying overrides
  const newEntries: InsertEntry[] = dates.map(date => {
    // Find override for this specific date
    const override = overrides.find(
      o => isSameDay(o.executedAt, date) && !o.deletedAt
    )
    
    // Skip if override marks as deleted
    if (override?.deletedAt) {
      return null
    }
    
    // Apply override values, fall back to template defaults
    return {
      amount: override?.amount ?? template.amount,
      currency: override?.currency ?? template.currency,
      category: override?.category ?? template.category,
      entryType: override?.entryType ?? template.entryType,
      description: override?.description ?? template.description,
      executedAt: date,
      recurringTemplateId: template.id,
      userId: template.userId,
    }
  }).filter((entry): entry is InsertEntry => entry !== null)
  
  // 7. Insert new entries
  if (newEntries.length > 0) {
    await db.insert(entries).values(newEntries)
  }
  
  // 8. Update generationValidUntil to end of current month
  await db.update(recurring_entry_templates)
    .set({ generationValidUntil: generateUntil })
    .where(eq(recurring_entry_templates.id, template.id))
}
```

### Override Application Logic

```typescript
/**
 * Check if two dates are the same day (timezone-aware)
 */
function isSameDay(date1: Date, date2: Date, timezone: string): boolean {
  const d1 = DateTime.fromJSDate(date1, { zone: timezone }).startOf('day')
  const d2 = DateTime.fromJSDate(date2, { zone: timezone }).startOf('day')
  return d1.equals(d2)
}

/**
 * Apply override to template entry
 */
function applyOverride(
  template: RecurringTemplate,
  override: EntryOverride | null,
  date: Date
): InsertEntry | null {
  // Skip if deleted
  if (override?.deletedAt) {
    return null
  }
  
  return {
    amount: override?.amount ?? template.amount,
    currency: override?.currency ?? template.currency,
    category: override?.category ?? template.category,
    entryType: override?.entryType ?? template.entryType,
    description: override?.description ?? template.description,
    executedAt: date,
    recurringTemplateId: template.id,
    userId: template.userId,
  }
}
```

## Query Integration

### Modification to `fetchConvertedEntriesForRange`

```typescript
export async function fetchConvertedEntriesForRange(
  db: DrizzleDb,
  userId: string,
  options: FetchConvertedEntriesOptions,
): Promise<FetchConvertedEntriesResult> {
  // NEW: Ensure recurring entries are materialized
  await ensureRecurringEntriesMaterialized(
    db,
    userId,
    options.start,
    options.end,
    options.timezone
  )
  
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

/**
 * Get overrides for a date range
 */
export async function getEntryOverrides(
  db: DrizzleDb,
  templateId: string,
  start: Date,
  end: Date
): Promise<SelectEntryOverride[]> {
  return db.query.entry_overrides.findMany({
    where: and(
      eq(entry_overrides.templateId, templateId),
      gte(entry_overrides.executedAt, start),
      lt(entry_overrides.executedAt, end),
    ),
  })
}
```

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
  rrule: z.string().optional(),
  dtstart: z.date().optional(),
  isActive: z.boolean().optional(),
})

export const updateRecurringTemplate = createServerFn({ method: "POST" })
  .middleware([protectedFunctionMiddleware])
  .inputValidator(updateRecurringTemplateInput)
  .handler(async (ctx) => {
    const db = getDb()
    const { id, rrule, dtstart, ...updates } = ctx.data
    
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
    
    // Validate RRULE if provided
    if (rrule) {
      const dtstartToUse = dtstart ?? template.dtstart
      try {
        parseRRULE(rrule, dtstartToUse)
      } catch (error) {
        throw new Error(`Invalid RRULE: ${error.message}`)
      }
    }
    
    // Update template
    await db
      .update(recurring_entry_templates)
      .set({
        ...updates,
        ...(rrule && { rrule }),
        ...(dtstart && { dtstart }),
        // Force regeneration by setting validUntil to past
        generationValidUntil: new Date(0),
      })
      .where(eq(recurring_entry_templates.id, id))
    
    // If deactivated, delete future generated entries
    if (updates.isActive === false) {
      const now = DateTime.now().setZone(ctx.context.timezone)
      await db.delete(entries).where(
        and(
          eq(entries.recurringTemplateId, id),
          gte(entries.executedAt, now.startOf('day').toJSDate())
        )
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
    
    // Delete template (cascade deletes overrides)
    await db
      .delete(recurring_entry_templates)
      .where(eq(recurring_entry_templates.id, id))
    
    // Delete future generated entries
    const now = DateTime.now().setZone(ctx.context.timezone)
    await db.delete(entries).where(
      and(
        eq(entries.recurringTemplateId, id),
        gte(entries.executedAt, now.startOf('day').toJSDate())
      )
    )
    
    // Past entries remain (historical record)
    // recurringTemplateId will be set to null due to onDelete: set null
    
    return { success: true }
  })
```

## Override CRUD Operations

### Create Override

```typescript
export const createEntryOverrideInput = z.object({
  templateId: z.string().uuid(),
  executedAt: z.date(),
  amount: z.number().gt(0).optional(),
  currency: z.enum(currencies).optional(),
  category: z.enum(categories).optional(),
  entryType: z.enum(entryTypes).optional(),
  description: z.string().optional(),
})

export const createEntryOverride = createServerFn({ method: "POST" })
  .middleware([protectedFunctionMiddleware])
  .inputValidator(createEntryOverrideInput)
  .handler(async (ctx) => {
    const db = getDb()
    const { templateId, executedAt, ...overrideFields } = ctx.data
    
    // Verify template ownership
    const template = await db.query.recurring_entry_templates.findFirst({
      where: and(
        eq(recurring_entry_templates.id, templateId),
        eq(recurring_entry_templates.userId, ctx.context.userId)
      ),
    })
    
    if (!template) {
      throw new Error("Template not found")
    }
    
    // Check if override already exists
    const existing = await db.query.entry_overrides.findFirst({
      where: and(
        eq(entry_overrides.templateId, templateId),
        eq(entry_overrides.executedAt, executedAt)
      ),
    })
    
    if (existing) {
      // Update existing override
      await db
        .update(entry_overrides)
        .set(overrideFields)
        .where(eq(entry_overrides.id, existing.id))
      
      // Force regeneration of that month
      await invalidateTemplateGeneration(db, templateId, executedAt)
      
      return { id: existing.id }
    }
    
    // Create new override
    const [result] = await db
      .insert(entry_overrides)
      .values({
        templateId,
        executedAt,
        ...overrideFields,
      })
      .returning({ id: entry_overrides.id })
    
    // Force regeneration of that month
    await invalidateTemplateGeneration(db, templateId, executedAt)
    
    return { id: result?.id }
  })
```

### Delete Override (Skip Instance)

```typescript
export const deleteEntryOverrideInput = z.object({
  id: z.string().uuid(),
})

export const deleteEntryOverride = createServerFn({ method: "POST" })
  .middleware([protectedFunctionMiddleware])
  .inputValidator(deleteEntryOverrideInput)
  .handler(async (ctx) => {
    const db = getDb()
    const { id } = ctx.data
    
    // Get override and verify ownership via template
    const override = await db.query.entry_overrides.findFirst({
      where: eq(entry_overrides.id, id),
      with: {
        template: true,
      },
    })
    
    if (!override || override.template.userId !== ctx.context.userId) {
      throw new Error("Override not found")
    }
    
    // Delete override (will restore template default on regeneration)
    await db.delete(entry_overrides).where(eq(entry_overrides.id, id))
    
    // Force regeneration of that month
    await invalidateTemplateGeneration(
      db,
      override.templateId,
      override.executedAt
    )
    
    return { success: true }
  })
```

### Skip Instance (Soft Delete)

```typescript
export const skipRecurringInstanceInput = z.object({
  templateId: z.string().uuid(),
  executedAt: z.date(),
})

export const skipRecurringInstance = createServerFn({ method: "POST" })
  .middleware([protectedFunctionMiddleware])
  .inputValidator(skipRecurringInstanceInput)
  .handler(async (ctx) => {
    const db = getDb()
    const { templateId, executedAt } = ctx.data
    
    // Verify template ownership
    const template = await db.query.recurring_entry_templates.findFirst({
      where: and(
        eq(recurring_entry_templates.id, templateId),
        eq(recurring_entry_templates.userId, ctx.context.userId)
      ),
    })
    
    if (!template) {
      throw new Error("Template not found")
    }
    
    // Create or update override to mark as deleted
    const existing = await db.query.entry_overrides.findFirst({
      where: and(
        eq(entry_overrides.templateId, templateId),
        eq(entry_overrides.executedAt, executedAt)
      ),
    })
    
    if (existing) {
      await db
        .update(entry_overrides)
        .set({ deletedAt: new Date() })
        .where(eq(entry_overrides.id, existing.id))
    } else {
      await db.insert(entry_overrides).values({
        templateId,
        executedAt,
        deletedAt: new Date(),
      })
    }
    
    // Delete generated entry if exists
    await db.delete(entries).where(
      and(
        eq(entries.recurringTemplateId, templateId),
        eq(entries.executedAt, executedAt)
      )
    )
    
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

When a template has `COUNT` in RRULE (e.g., "FREQ=WEEKLY;COUNT=10"):

- Track generated occurrences count
- Stop generating when limit reached
- Option: Add `occurrencesGenerated` column to template
- Or: Count existing entries with `recurringTemplateId`

**Implementation**:
```typescript
function shouldGenerateMore(
  template: RecurringTemplate,
  existingCount: number
): boolean {
  const rrule = parseRRULE(template.rrule, template.dtstart)
  const options = rrule.options
  
  if (options.count === undefined) {
    return true // Infinite
  }
  
  return existingCount < options.count
}
```

### 2. Template Deletion

- **Past entries**: Keep as-is (historical record)
- **Future entries**: Delete generated entries
- **Overrides**: Cascade delete (template deletion removes all overrides)

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

### 4. Override Edge Cases

- **Override for non-existent date**: Create override anyway (will apply if template generates that date)
- **Override deletion**: Restore template default on regeneration
- **Override update**: Update override, regenerate that month

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

### Phase 1: Schema & Migration

1. ✅ Create `recurring_entry_templates` table
2. ✅ Create `entry_overrides` table
3. ✅ Add `recurringTemplateId` column to `entries` table
4. ✅ Add indexes
5. ✅ Update relations
6. ✅ Generate and run migration

### Phase 2: Core Generation Logic

1. ✅ Install `rrule` package
2. ✅ Create RRULE helper functions
3. ✅ Implement `ensureRecurringEntriesMaterialized`
4. ✅ Implement `regenerateTemplateEntries`
5. ✅ Implement override application logic
6. ✅ Integrate into `fetchConvertedEntriesForRange`

### Phase 3: Template CRUD

1. ✅ Create template server functions
2. ✅ Validate RRULE on create/update
3. ✅ Handle template updates (invalidate generation)
4. ✅ Handle template deletion (cleanup future entries)

### Phase 4: Override CRUD

1. ✅ Create override server functions
2. ✅ Implement skip instance functionality
3. ✅ Handle override updates/deletions

### Phase 5: Testing

1. ✅ Unit tests for RRULE parsing
2. ✅ Unit tests for generation logic
3. ✅ Integration tests for CRUD operations
4. ✅ Edge case testing

### Phase 6: UI (Future)

1. Template creation form
2. Template list/management
3. Override UI (edit specific instances)
4. Visual indicators for recurring entries

## Migration Script

```sql
-- Create recurring_entry_templates table
CREATE TABLE recurring_entry_templates (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  category TEXT NOT NULL,
  entryType TEXT NOT NULL,
  description TEXT,
  rrule TEXT NOT NULL,
  dtstart INTEGER NOT NULL,
  generationValidUntil INTEGER NOT NULL,
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

-- Create entry_overrides table
CREATE TABLE entry_overrides (
  id TEXT PRIMARY KEY,
  templateId TEXT NOT NULL REFERENCES recurring_entry_templates(id) ON DELETE CASCADE,
  executedAt INTEGER NOT NULL,
  amount REAL,
  currency TEXT,
  category TEXT,
  entryType TEXT,
  description TEXT,
  deletedAt INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

-- Add recurringTemplateId to entries
ALTER TABLE entries ADD COLUMN recurringTemplateId TEXT REFERENCES recurring_entry_templates(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX recurring_entry_templates_by_user_idx ON recurring_entry_templates(userId, isActive);
CREATE INDEX recurring_entry_templates_by_valid_until_idx ON recurring_entry_templates(generationValidUntil);
CREATE INDEX entry_overrides_by_template_date_idx ON entry_overrides(templateId, executedAt);
CREATE INDEX entry_overrides_by_date_range_idx ON entry_overrides(executedAt);
CREATE INDEX entries_by_recurring_template_idx ON entries(recurringTemplateId);
```

## Open Questions

1. **UI/UX**: How should users create/edit templates? Wizard? Form?
2. **Notifications**: Should users be notified when recurring entries are generated?
3. **Batch operations**: Should users be able to edit multiple templates at once?
4. **Import/Export**: Should templates be exportable/importable?
5. **Analytics**: Should we track template usage statistics?

## References

- [RFC 5545 - iCalendar](https://tools.ietf.org/html/rfc5545)
- [rrule.js Documentation](https://github.com/jkbrzt/rrule)
- [RRULE Generator](https://rrule.js.org/)

