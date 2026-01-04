# Drizzle ORM v1 RC Migration Plan

This document outlines the step-by-step migration plan from Drizzle ORM v0.44.7 to v1 RC (beta).

## Prerequisites

- [ ] Review [Drizzle ORM v1 RC Release Notes](https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v1beta2)
- [ ] Review [Relational Queries v1 to v2 Migration Guide](https://orm.drizzle.team/docs/relations-v1-v2)
- [ ] Ensure you have a backup of your database
- [ ] Ensure all current migrations are applied to your database

---

## Phase 1: Dependency Updates

### Step 1.1: Update Drizzle Packages
- [ ] **File**: `packages/data-ops/package.json`
  - [ ] Update `drizzle-orm` from `^0.44.7` to `@beta`
  - [ ] Update `drizzle-kit` from `^0.31.6` to `@beta` (devDependency)
  - [ ] Run `pnpm install` to install beta versions

**Expected changes:**
```json
{
  "dependencies": {
    "drizzle-orm": "@beta"
  },
  "devDependencies": {
    "drizzle-kit": "@beta"
  }
}
```

---

## Phase 2: Migrations Folder Structure

### Step 2.1: Migrate Migrations Folder
- [ ] **Action**: Run migration command
  ```bash
  cd packages/data-ops
  pnpm drizzle-kit up
  ```
- [ ] **Verify**: Check that `journal.json` has been removed (if it existed)
- [ ] **Verify**: Check that SQL files and snapshots are now grouped in separate folders
- [ ] **Verify**: Git status shows expected changes to migrations folder

**Expected outcome:**
- Old migrations folder structure updated to v3 format
- No `journal.json` file
- SQL files and snapshots organized in timestamped folders

---

## Phase 3: Relations Schema Migration

### Step 3.1: Create Consolidated Relations File
- [ ] **File**: `packages/data-ops/src/drizzle/relations.ts` (NEW FILE)
  - [ ] Import `defineRelations` from `drizzle-orm/_relations`
  - [ ] Import all schema tables
  - [ ] Consolidate all relation definitions from individual schema files
  - [ ] Use `defineRelations` with the new v2 API

**Schema files with relations to consolidate:**
- [ ] `packages/data-ops/src/drizzle/schemas/entries.ts` - `entriesRelations`
- [ ] `packages/data-ops/src/drizzle/schemas/recurring_entry_templates.ts` - `recurringEntryTemplatesRelations`
- [ ] `packages/data-ops/src/drizzle/schemas/user_connections.ts` - `userConnectionsRelations`
- [ ] `packages/data-ops/src/drizzle/schemas/user_preferences.ts` - `userPreferencesRelations`
- [ ] `packages/data-ops/src/drizzle/schemas/budgets.ts` - `budgetsRelations`
- [ ] `packages/data-ops/src/drizzle/schemas/auth_accounts.ts` - `authAccountsRelations`
- [ ] `packages/data-ops/src/drizzle/schemas/auth_sessions.ts` - `authSessionsRelations`
- [ ] `packages/data-ops/src/drizzle/schemas/auth_users.ts` - `authUsersRelations`
- [ ] `packages/data-ops/src/drizzle/schemas/user_connection_invitations.ts` - `userConnectionInvitationsRelations`
- [ ] `packages/data-ops/src/drizzle/schemas/whatsapp_links.ts` - `whatsappLinksRelations`

**Example structure:**
```typescript
import { defineRelations } from "drizzle-orm/_relations"
import * as schema from "./schemas"

export const relations = defineRelations(schema, (r) => ({
  entries: {
    user: r.one(schema.auth_users, {
      fields: [schema.entries.userId],
      references: [schema.auth_users.id],
    }),
    recurringTemplate: r.one(schema.recurring_entry_templates, {
      fields: [schema.entries.recurringTemplateId],
      references: [schema.recurring_entry_templates.id],
    }),
  },
  // ... all other relations
}))
```

### Step 3.2: Update Schema Files
- [ ] **File**: `packages/data-ops/src/drizzle/schemas/entries.ts`
  - [ ] Remove `entriesRelations` export
  - [ ] Remove `relations` import from `drizzle-orm`
  - [ ] Keep only table definition

- [ ] **File**: `packages/data-ops/src/drizzle/schemas/recurring_entry_templates.ts`
  - [ ] Remove `recurringEntryTemplatesRelations` export
  - [ ] Remove `relations` import from `drizzle-orm`

- [ ] **File**: `packages/data-ops/src/drizzle/schemas/user_connections.ts`
  - [ ] Remove `userConnectionsRelations` export
  - [ ] Remove `relations` import from `drizzle-orm`

- [ ] **File**: `packages/data-ops/src/drizzle/schemas/user_preferences.ts`
  - [ ] Remove `userPreferencesRelations` export
  - [ ] Remove `relations` import from `drizzle-orm`

- [ ] **File**: `packages/data-ops/src/drizzle/schemas/budgets.ts`
  - [ ] Remove `budgetsRelations` export
  - [ ] Remove `relations` import from `drizzle-orm`

- [ ] **File**: `packages/data-ops/src/drizzle/schemas/auth_accounts.ts`
  - [ ] Remove `authAccountsRelations` export
  - [ ] Remove `relations` import from `drizzle-orm`

- [ ] **File**: `packages/data-ops/src/drizzle/schemas/auth_sessions.ts`
  - [ ] Remove `authSessionsRelations` export
  - [ ] Remove `relations` import from `drizzle-orm`

- [ ] **File**: `packages/data-ops/src/drizzle/schemas/auth_users.ts`
  - [ ] Remove `authUsersRelations` export
  - [ ] Remove `relations` import from `drizzle-orm`

- [ ] **File**: `packages/data-ops/src/drizzle/schemas/user_connection_invitations.ts`
  - [ ] Remove `userConnectionInvitationsRelations` export
  - [ ] Remove `relations` import from `drizzle-orm`

- [ ] **File**: `packages/data-ops/src/drizzle/schemas/whatsapp_links.ts`
  - [ ] Remove `whatsappLinksRelations` export
  - [ ] Remove `relations` import from `drizzle-orm`

### Step 3.3: Update Schema Index
- [ ] **File**: `packages/data-ops/src/drizzle/schemas/index.ts`
  - [ ] Verify all table exports are still present
  - [ ] Ensure no relation exports remain

---

## Phase 4: Database Setup Migration

### Step 4.1: Update Database Initialization
- [ ] **File**: `packages/data-ops/src/database/setup.ts`
  - [ ] Change import from `* as schema` to `{ relations }` from `@/drizzle/relations`
  - [ ] Update `drizzle()` call to use `relations` instead of `schema`
  - [ ] Update type definition if needed

**Expected changes:**
```typescript
// Before
import * as schema from "@/drizzle/schemas"
db = drizzle(d1Db, { casing: "snake_case", schema })

// After
import { relations } from "@/drizzle/relations"
db = drizzle(d1Db, { casing: "snake_case", relations })
```

---

## Phase 5: Query API Migration (Optional but Recommended)

### Step 5.1: Migrate `where` Clauses to Object Syntax

#### File: `packages/data-ops/src/drizzle/queries/entries.ts`
- [ ] **Line 187-192**: `getEntryForUser` function
  - [ ] Convert `where: and(eq(...), inArray(...))` to object syntax
  - [ ] Use `{ id: entryId, userId: { in: allowedUserIds } }`

#### File: `packages/data-ops/src/drizzle/queries/budgets.ts`
- [ ] **Line 60-62**: `fetchBudgetsForUser` function
  - [ ] Convert `where: inArray(...)` to `{ userId: { in: allowedUserIds } }`
- [ ] **Line 78-83**: `fetchBudgetById` function
  - [ ] Convert `where: and(eq(...), inArray(...))` to object syntax
  - [ ] Use `{ id: budgetId, userId: { in: allowedUserIds } }`

#### File: `packages/data-ops/src/drizzle/queries/recurring-entries.ts`
- [ ] **Line 210-216**: `materializeTemplateEntries` function
  - [ ] Convert `where: and(eq(...), inArray(...))` to object syntax
  - [ ] Use `{ recurringTemplateId: template.id, executedDate: { in: dateBatch } }`

#### File: `packages/data-ops/src/drizzle/queries/exchange-rates.ts`
- [ ] **Line 18-20**: `fetchExchangeRatesForDates` function
  - [ ] Convert `where: inArray(...)` to `{ date: { in: dateBatch } }`
- [ ] **Line 25-27**: `fetchExchangeRatesForDates` function
  - [ ] Keep `orderBy` as-is (already using SQL builder, or convert to object)
- [ ] **Line 43-45**: `getLatestExchangeRates` function
  - [ ] Keep `orderBy` as-is (already using SQL builder, or convert to object)

#### File: `packages/data-ops/src/drizzle/queries/connections.ts`
- [ ] **Line 9-14**: `getPartnerUserId` function
  - [ ] Convert `where: or(eq(...), eq(...))` to object syntax
  - [ ] Use `{ OR: [{ userIdLow: userId }, { userIdHigh: userId }] }`

#### File: `packages/data-ops/src/drizzle/queries/helpers.ts`
- [ ] **Line 28-30**: `getUserTimezoneAndCurrency` function
  - [ ] Convert `where: eq(...)` to `{ userId: userId }`

### Step 5.2: Migrate `orderBy` Clauses to Object Syntax

#### Files to check for `orderBy`:
- [ ] **File**: `packages/data-ops/src/drizzle/queries/exchange-rates.ts`
  - [ ] **Line 25-27**: Convert `orderBy: desc(exchange_rates.date)` to `{ date: "desc" }`
  - [ ] **Line 43-45**: Convert `orderBy: desc(exchange_rates.date)` to `{ date: "desc" }`

#### Note: Files using SQL builder `orderBy` (not relational queries)
These files use `db.select().from().orderBy()` which is the SQL builder API, not relational queries, so they don't need changes:
- `packages/data-ops/src/drizzle/queries/recurring-entries.ts` (line 276)
- `packages/data-ops/src/core/functions/entries.ts` (if using SQL builder)

---

## Phase 6: Testing & Verification

### Step 6.1: Type Checking
- [ ] Run `pnpm fix` from repo root
- [ ] Verify no TypeScript errors
- [ ] Fix any type errors that appear

### Step 6.2: Build Verification
- [ ] Run `pnpm build` from repo root
- [ ] Verify all packages build successfully
- [ ] Check for any runtime import errors

### Step 6.3: Database Operations Testing
- [ ] Test basic queries (findMany, findFirst)
- [ ] Test queries with relations (`with` clauses)
- [ ] Test queries with filters (`where` clauses)
- [ ] Test queries with sorting (`orderBy` clauses)
- [ ] Test complex queries with AND/OR conditions
- [ ] Test insert operations
- [ ] Test update operations
- [ ] Test delete operations

### Step 6.4: Integration Testing
- [ ] Test webapp functionality that uses database queries
- [ ] Test backend-service functionality that uses database queries
- [ ] Verify Better Auth adapter still works correctly
- [ ] Test migration generation: `pnpm drizzle:generate`
- [ ] Test Drizzle Studio: `pnpm studio`

---

## Phase 7: Cleanup & Documentation

### Step 7.1: Code Cleanup
- [ ] Remove any unused imports related to old relation syntax
- [ ] Remove any commented-out code from migration
- [ ] Ensure consistent code style

### Step 7.2: Documentation Updates
- [ ] Update `packages/data-ops/README.md` if it mentions relation definitions
- [ ] Update any developer documentation about schema structure
- [ ] Document the new relations file location

---

## Rollback Plan

If issues arise during migration:

1. **Revert dependency changes:**
   ```bash
   cd packages/data-ops
   pnpm add drizzle-orm@^0.44.7
   pnpm add -D drizzle-kit@^0.31.6
   ```

2. **Restore Git changes:**
   ```bash
   git checkout HEAD -- packages/data-ops/
   ```

3. **Restore migrations folder** (if `drizzle-kit up` was run):
   - Restore from Git if committed
   - Or manually restore `journal.json` if needed

---

## Migration Checklist Summary

- [ ] **Phase 1**: Dependencies updated
- [ ] **Phase 2**: Migrations folder migrated
- [ ] **Phase 3**: Relations consolidated to v2 API
- [ ] **Phase 4**: Database setup updated
- [ ] **Phase 5**: Query API migrated (optional)
- [ ] **Phase 6**: All tests passing
- [ ] **Phase 7**: Cleanup complete

---

## Notes

- The v1 API (`db._query.*`) remains available for backward compatibility
- You can migrate queries incrementally - not all need to be migrated at once
- The object syntax for `where` and `orderBy` is optional but recommended for better TypeScript support
- Complex queries with RAW SQL can still use the `RAW` operator in v2

---

## Resources

- [Drizzle ORM v1 RC Release Notes](https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v1beta2)
- [Relational Queries v1 to v2 Migration Guide](https://orm.drizzle.team/docs/relations-v1-v2)
- [Drizzle ORM v1 Roadmap](https://orm.drizzle.team/roadmap)
