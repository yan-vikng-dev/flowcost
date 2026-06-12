# @repo/db

Drizzle ORM schemas and network-free query helpers for Flowcost's D1 database.

Auth, budgets, recurring templates, exchange rates, and WhatsApp link-token tables are removed. Currency conversion is **not** done here — the backend fetches Frankfurter v2 rates and converts at read time.

## Schema (4 tables)

| Table | Purpose |
|-------|---------|
| `users` | Identity keyed by `waId`; currency/timezone/report prefs |
| `entries` | Expense-only ledger (`amount`, `currency`, `category`, `executedDate`) |
| `user_connections` | Active 1:1 partner link between two users |
| `connection_requests` | Pending WhatsApp phone pairing invites (24h expiry) |

## Queries

Exported from `@repo/db/drizzle/queries`:

- **Users:** `getUserById`, `getUserByWaId`, `upsertUserByWaId`, `getAllowedUserIds`
- **Entries:** `fetchEntriesForRange`, `getEntryForUser` (raw amounts, no conversion)
- **Connections:** `getPartnerUserId`, `hasConnection`, `createConnectionRequest`, `findPendingRequestForWa`, `acceptConnectionRequest`, `deleteConnectionRequest`

## Commands

```bash
pnpm build        # tsc → dist/
pnpm typecheck    # tsc --noEmit
pnpm db:push      # push schema to D1 (requires wrangler/D1 config)
pnpm db:studio    # Drizzle Studio
pnpm db:generate  # generate migrations
```
