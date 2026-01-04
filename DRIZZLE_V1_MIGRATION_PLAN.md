# Drizzle ORM v1 RC Migration Plan

This document outlines the step-by-step migration plan from Drizzle ORM v0.44.7 to v1 RC (beta).

## Prerequisites

- [x] Review [Drizzle ORM v1 Upgrade Guide](https://orm.drizzle.team/docs/upgrade-v1)
- [x] Review [Relational Queries v1 to v2 Migration Guide](https://orm.drizzle.team/docs/relations-v1-v2)
- [x] Review latest Drizzle ORM v1 beta release notes (all betas referenced by the upgrade guide)
- [ ] Ensure you have a backup of your database
- [ ] Ensure all current migrations are applied to your database

---

## Phase 1: Dependency Updates

### Step 1.1: Update Drizzle Packages
- [x] **File**: `packages/data-ops/package.json`
  - [x] Update `drizzle-orm` from `^0.44.7` to a pinned v1 beta version
  - [x] Update `drizzle-kit` from `^0.31.6` to a pinned v1 beta version (devDependency)
  - [x] Run `pnpm install` to install beta versions
  - [x] Pin `drizzle-orm` and `drizzle-kit` across `apps/webapp` and `apps/backend-service`

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
- [x] **Action**: Run migration command
  ```bash
  cd packages/data-ops
  pnpm drizzle-kit up
  ```
- [x] **Verify**: Check that `journal.json` has been removed (if it existed)
- [x] **Verify**: Check that SQL files and snapshots are now grouped in separate folders
- [x] **Verify**: Git status shows expected changes to migrations folder

**Expected outcome:**
- Old migrations folder structure updated to v3 format
- No `journal.json` file
- SQL files and snapshots organized in timestamped folders

---

## Phase 3: Relations Schema Migration

### Step 3.1: Create Consolidated Relations File
- [x] **File**: `packages/data-ops/src/drizzle/relations.ts` (NEW FILE)
  - [x] Import `defineRelations` from `drizzle-orm`
  - [x] Import all schema tables
  - [x] Consolidate all relation definitions from individual schema files
  - [x] Use `defineRelations` with the new v2 API (`r.one.<table>`/`r.many.<table>` with `from`/`to`)

**Schema files with relations to consolidate:**
- [x] `packages/data-ops/src/drizzle/schemas/entries.ts` - `entriesRelations`
- [x] `packages/data-ops/src/drizzle/schemas/recurring_entry_templates.ts` - `recurringEntryTemplatesRelations`
- [x] `packages/data-ops/src/drizzle/schemas/user_connections.ts` - `userConnectionsRelations`
- [x] `packages/data-ops/src/drizzle/schemas/user_preferences.ts` - `userPreferencesRelations`
- [x] `packages/data-ops/src/drizzle/schemas/budgets.ts` - `budgetsRelations`
- [x] `packages/data-ops/src/drizzle/schemas/auth_accounts.ts` - `authAccountsRelations`
- [x] `packages/data-ops/src/drizzle/schemas/auth_sessions.ts` - `authSessionsRelations`
- [x] `packages/data-ops/src/drizzle/schemas/auth_users.ts` - `authUsersRelations`
- [x] `packages/data-ops/src/drizzle/schemas/user_connection_invitations.ts` - `userConnectionInvitationsRelations`
- [x] `packages/data-ops/src/drizzle/schemas/whatsapp_links.ts` - `whatsappLinksRelations`

**Example structure:**
```typescript
import { defineRelations } from "drizzle-orm"
import * as schema from "./schemas"

export const relations = defineRelations(schema, (r) => ({
  entries: {
    user: r.one.auth_users({
      from: schema.entries.userId,
      to: schema.auth_users.id,
    }),
    recurringTemplate: r.one.recurring_entry_templates({
      from: schema.entries.recurringTemplateId,
      to: schema.recurring_entry_templates.id,
    }),
  },
  // ... all other relations
}))
```

### Step 3.2: Update Schema Files
- [x] **File**: `packages/data-ops/src/drizzle/schemas/entries.ts`
  - [x] Remove `entriesRelations` export
  - [x] Remove `relations` import from `drizzle-orm`
  - [x] Keep only table definition

- [x] **File**: `packages/data-ops/src/drizzle/schemas/recurring_entry_templates.ts`
  - [x] Remove `recurringEntryTemplatesRelations` export
  - [x] Remove `relations` import from `drizzle-orm`

- [x] **File**: `packages/data-ops/src/drizzle/schemas/user_connections.ts`
  - [x] Remove `userConnectionsRelations` export
  - [x] Remove `relations` import from `drizzle-orm`

- [x] **File**: `packages/data-ops/src/drizzle/schemas/user_preferences.ts`
  - [x] Remove `userPreferencesRelations` export
  - [x] Remove `relations` import from `drizzle-orm`

- [x] **File**: `packages/data-ops/src/drizzle/schemas/budgets.ts`
  - [x] Remove `budgetsRelations` export
  - [x] Remove `relations` import from `drizzle-orm`

- [x] **File**: `packages/data-ops/src/drizzle/schemas/auth_accounts.ts`
  - [x] Remove `authAccountsRelations` export
  - [x] Remove `relations` import from `drizzle-orm`

- [x] **File**: `packages/data-ops/src/drizzle/schemas/auth_sessions.ts`
  - [x] Remove `authSessionsRelations` export
  - [x] Remove `relations` import from `drizzle-orm`

- [x] **File**: `packages/data-ops/src/drizzle/schemas/auth_users.ts`
  - [x] Remove `authUsersRelations` export
  - [x] Remove `relations` import from `drizzle-orm`

- [x] **File**: `packages/data-ops/src/drizzle/schemas/user_connection_invitations.ts`
  - [x] Remove `userConnectionInvitationsRelations` export
  - [x] Remove `relations` import from `drizzle-orm`

- [x] **File**: `packages/data-ops/src/drizzle/schemas/whatsapp_links.ts`
  - [x] Remove `whatsappLinksRelations` export
  - [x] Remove `relations` import from `drizzle-orm`

### Step 3.3: Update Schema Index
- [x] **File**: `packages/data-ops/src/drizzle/schemas/index.ts`
  - [x] Verify all table exports are still present
  - [x] Ensure no relation exports remain

---

## Phase 4: Database Setup Migration

### Step 4.1: Update Database Initialization
- [x] **File**: `packages/data-ops/src/database/setup.ts`
  - [x] Change import from `* as schema` to `{ relations }` from `@/drizzle/relations`
  - [x] Update `drizzle()` call to use `relations` instead of `schema`
  - [x] Update `DrizzleD1Database` type args if required by v2 (relations typing)

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

## Phase 5: Query API Migration (Required for v2)

### Step 5.1: Migrate `where` Clauses to Object Syntax

#### File: `packages/data-ops/src/drizzle/queries/entries.ts`
- [x] **Line 187-192**: `getEntryForUser` function
  - [x] Convert `where: and(eq(...), inArray(...))` to object syntax
  - [x] Use `{ id: entryId, userId: { in: allowedUserIds } }`

#### File: `packages/data-ops/src/drizzle/queries/budgets.ts`
- [x] **Line 60-62**: `fetchBudgetsForUser` function
  - [x] Convert `where: inArray(...)` to `{ userId: { in: allowedUserIds } }`
- [x] **Line 78-83**: `fetchBudgetById` function
  - [x] Convert `where: and(eq(...), inArray(...))` to object syntax
  - [x] Use `{ id: budgetId, userId: { in: allowedUserIds } }`

#### File: `packages/data-ops/src/drizzle/queries/recurring-entries.ts`
- [x] **Line 210-216**: `materializeTemplateEntries` function
  - [x] Convert `where: and(eq(...), inArray(...))` to object syntax
  - [x] Use `{ recurringTemplateId: template.id, executedDate: { in: dateBatch } }`

#### File: `packages/data-ops/src/drizzle/queries/exchange-rates.ts`
- [x] **Line 18-20**: `fetchExchangeRatesForDates` function
  - [x] Convert `where: inArray(...)` to `{ date: { in: dateBatch } }`
  - [x] **Line 25-27**: Convert `orderBy: desc(exchange_rates.date)` to `{ date: "desc" }`
  - [x] **Line 43-45**: Convert `orderBy: desc(exchange_rates.date)` to `{ date: "desc" }`

#### File: `packages/data-ops/src/drizzle/queries/connections.ts`
- [x] **Line 9-14**: `getPartnerUserId` function
  - [x] Convert `where: or(eq(...), eq(...))` to object syntax
  - [x] Use `{ OR: [{ userIdLow: userId }, { userIdHigh: userId }] }`

#### File: `packages/data-ops/src/drizzle/queries/helpers.ts`
- [x] **Line 28-30**: `getUserTimezoneAndCurrency` function
  - [x] Convert `where: eq(...)` to `{ userId: userId }`

### Step 5.2: Migrate `orderBy` Clauses to Object Syntax

#### Files to check for `orderBy`:
- [x] **File**: `packages/data-ops/src/drizzle/queries/exchange-rates.ts`
  - [x] **Line 25-27**: Convert `orderBy: desc(exchange_rates.date)` to `{ date: "desc" }`
  - [x] **Line 43-45**: Convert `orderBy: desc(exchange_rates.date)` to `{ date: "desc" }`

#### Note: Files using SQL builder `orderBy` (not relational queries)
These files use `db.select().from().orderBy()` which is the SQL builder API, not relational queries, so they don't need changes:
- `packages/data-ops/src/drizzle/queries/recurring-entries.ts` (line 276)
- `packages/data-ops/src/core/functions/entries.ts` (if using SQL builder)

---

## Phase 6: Testing & Verification

### Step 6.1: Type Checking
- [x] Run `pnpm fix` from repo root
- [x] Verify no TypeScript errors
- [x] Fix any type errors that appear

### Step 6.2: Build Verification
- [x] Run `pnpm build` from repo root
- [x] Verify all packages build successfully
- [x] Check for any runtime import errors

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

- This plan assumes **v2 relational queries**. You must migrate all `db.query.*` usages to v2 object syntax for `where` and `orderBy`.
- Complex queries with RAW SQL can still use the `RAW` operator in v2.

---

## Resources

- [Drizzle ORM v1 Upgrade Guide](https://orm.drizzle.team/docs/upgrade-v1)
- [Relational Queries v1 to v2 Migration Guide](https://orm.drizzle.team/docs/relations-v1-v2)
- [Drizzle ORM v1 Roadmap](https://orm.drizzle.team/roadmap)
