**Budgets: Data Model & Plan**

This doc defines the schema and integration plan for monthly budgets across one or more categories. Budgets are owned by a single user via `userId`. Visibility and edit rights extend to a connected partner through server-side authorization (same pattern as entries).

**Goals**
- Each user can create and manage multiple budgets.
- A budget is a monthly limit across one or more categories.
- Connected users see and can manage each other’s budgets (shared-by-policy, not by owner type).
- Support currency-aware comparisons and per-month progress.

**Data Model (single table, JSON categories)**
- Table: `budgets`
  - `id` text primary key (uuid)
  - `amountMonthly` real not null
  - `currency` enum `currencies` not null
  - `categories` text with `{ mode: 'json' }` (array of `Category`) not null
  - `userId` text not null, references `auth_users.id` on delete cascade
  - timestamps via shared `timestamps`
  - Indexes:
    - `by_user` on `(userId)`
    - Optional dedupe in app logic: avoid exact duplicate category sets for the same user

Example Drizzle (SQLite) schema snippet
```ts
import { type Category, currencies } from '@repo/shared-config'
import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core'
import { timestamps } from '../helpers'
import { auth_users } from './auth_users'

export const budgets = sqliteTable('budgets', {
  id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
  amountMonthly: real().notNull(),
  currency: text({ enum: currencies }).notNull(),
  categories: text('categories', { mode: 'json' }).$type<Category[]>().notNull(),
  userId: text().notNull().references(() => auth_users.id, { onDelete: 'cascade' }),
  ...timestamps,
}, (t) => ({
  byUser: index('budgets_by_user_idx').on(t.userId),
}))

export type InsertBudget = typeof budgets.$inferInsert
export type SelectBudget = typeof budgets.$inferSelect
```

Rationale
- No `ownerType` or `isActive` fields. Ownership is always a single `userId` and “sharing” comes from query/authorization that includes a connected partner.
- Storing categories as JSON array keeps the schema simple and avoids a join table for now.

Pros/Cons: JSON categories vs join table
- JSON array (this plan)
  - Pros: simpler schema and code; fewer joins; easy read/write; well-suited when the main workload is “list all budgets and compute per-month progress”.
  - Cons: weak queryability by category (no native indexing on elements); uniqueness of categories per budget enforced in app code; harder to run cross-budget analytics “by category” server-side without scanning.
- Join table (`budget_categories`)
  - Pros: normalized; can index `category`; easy to query and report budgets that include a category; natural uniqueness `(budgetId, category)`.
  - Cons: more tables/joins; slightly heavier write path; more migration churn.

When to revisit join table
- If we need server-side filters like “find budgets including Food” efficiently, or aggregate reports grouped by category across budgets, move to a join table.

**Sharing & Authorization**
- Read/list: use `allowedUserIds = [actorId, partnerId?].filter(Boolean)` and fetch budgets where `userId IN (allowedUserIds)`.
- Mutations (create/update/delete): authorize if `budget.userId` is in `allowedUserIds` (mirrors entries behavior).

**Server Functions (apps/webapp/src/core/functions/budgets.ts)**
- `createBudget({ amountMonthly, currency, categories })`
  - Zod: `name: string.min(1)`, `amountMonthly: number.gt(0)`, `currency: enum(currencies)`, `categories: array(enum(categories)).min(1)`; optionally de-duplicate categories app-side before insert.
  - Insert one row with `userId = session.userId`.

- `updateBudget({ id, amountMonthly?, currency?, categories? })`
  - Authorize `budget.userId ∈ allowedUserIds`.
  - Apply partial updates; when `categories` provided, write the new array (sorted, distinct) as JSON.

- `deleteBudget({ id })`
  - Authorize and delete; nothing else to cascade.

- `listBudgetsWithProgress({ month = now })`
  - Fetch budgets for `allowedUserIds`.
  - Prefer Drizzle `db.query.*` APIs (findMany/findFirst) for reads to keep code consistent with the codebase.
  - Fetch all entries for `allowedUserIds` within the month once, then compute per-budget totals in the requestor’s displayCurrency using `exchange_rates` (per-entry date for `spentDisplay`, latest for `amountDisplay`).
  - Output per budget: `{ id, amount, currency, categories, displayCurrency, amountDisplay, spentDisplay, remainingDisplay, utilizationPct }`.

Currency conversion
- Same as `listEntriesThisMonth`: use rates for entry date when available; fallback to latest; convert entry amount to budget currency for aggregation.

Timezone
- Month window should respect `user_preferences.timezone` of the requesting user, as with entries.

**UI Plan (Dashboard Card)**
- Location: main dashboard page `apps/webapp/src/routes/_auth/app/index.tsx` grid.
- Component: `apps/webapp/src/routes/_auth/app/-components/BudgetsCard.tsx`.
- Loader: optionally prefetch in the route loader via `ensureQueryData({ queryKey: ['budgets:list'], queryFn: () => listBudgetsWithProgress() })`.
- Rendering
  - List budgets with progress bars; show allocation and spent in display currency.
  - Render categories with icons (using `getCategoryIcon`) + labels.
  - “New Budget” dialog inline from the card: categories (multi-select), amount, currency.
  - Row actions: Edit (open dialog), Delete (confirm).
- Queries/Mutations
  - Query key: `['budgets:list']` for `listBudgetsWithProgress`.
  - Mutations: `createBudget`, `updateBudget`, `deleteBudget` → invalidate `['budgets:list']` on success.
- Multi-select categories
  - Implement `CategoryMultiSelect` component (command list with check indicators) or a simple checkbox list in a `ScrollArea` as an initial version.
- Notes
  - No dedicated budgets route initially; the single card provides CRUD and progress visibility.
  - Future: if needed, extract to `/app/budgets` without changing server functions.

**Edge Cases**
- Duplicate category sets: optional app-level guard to prevent exact duplicates per user; we can canonicalize arrays (sort, dedupe) before saving.
- Category set updates: rewriting JSON is fine; totals recompute on next query.
- Categories enum changes: treat as a migration + data rewrite when needed.

**Next Steps**
1) Implement `budgets` schema with JSON categories and export from `schemas/index.ts`.
2) Generate/apply migrations.
3) Add server functions with Zod validators and shared authorization (like entries).
4) Build the budgets UI under `_auth/app/budgets`.
5) Optimize progress computation if needed (cache or pre-aggregate later).
