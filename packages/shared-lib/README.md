# @repo/shared-lib

Isomorphic types and utilities shared across the backend and webapp.

## Modules

| Module | Purpose |
|--------|---------|
| `currencies.ts` | `Currency` union + static list (Frankfurter v2 quoted set) |
| `categories.ts` | Expense-only category enum |
| `currency.ts` | `convertCurrency(amount, from, to, rates)` |
| `frankfurter.ts` | Frankfurter v2 client with pluggable KV cache (`getUsdRatesForDate`, `getLatestUsdRates`, `getUsdRatesForDates`) |
| `date.ts`, `timezones.ts`, `crypto.ts`, `constants.ts`, `user.ts` | Shared helpers |

Currency formatting uses `Intl.NumberFormat` — symbol/name lookup helpers were removed with the authenticated webapp UI.

FX rates are fetched on demand from [Frankfurter v2](https://api.frankfurter.dev/v2/) and cached in KV. There is no server-side rate table or daily cron.

## Commands

```bash
pnpm build        # tsc → dist/
pnpm typecheck    # tsc --noEmit
```
