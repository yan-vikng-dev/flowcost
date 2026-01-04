# Temporary Workaround for Drizzle Kit v1 RC

This directory contains **temporary copies** of constants from `@repo/shared-lib` to work around a bundling issue in Drizzle Kit v1 RC (beta.8) with ESM workspace packages.

## The Issue

Drizzle Kit's internal bundler fails to resolve `@repo/shared-lib` imports in schema files when running commands like `drizzle-kit studio` and `drizzle-kit push`. This causes a "require is not defined" error.

## The Workaround

We created local copies of:
- `categories.ts` - copied from `packages/shared-lib/src/categories.ts`
- `currencies.ts` - copied from `packages/shared-lib/src/currencies.ts`

And updated imports in the following schema files:
- `src/drizzle/schemas/budgets.ts`
- `src/drizzle/schemas/entries.ts`
- `src/drizzle/schemas/exchange_rates.ts`
- `src/drizzle/schemas/recurring_entry_templates.ts`
- `src/drizzle/schemas/user_preferences.ts`

## When to Revert

Once Drizzle Kit fixes the workspace package bundling issue, you can:

1. **Delete this entire directory** (`src/temp-lib/`)

2. **Revert the imports in all schema files above** from:
   ```typescript
   import { categories } from "../../temp-lib/categories"
   import { currencies } from "../../temp-lib/currencies"
   ```
   Back to:
   ```typescript
   import { categories } from "@repo/shared-lib"
   import { currencies } from "@repo/shared-lib"
   ```

3. **Test** that `pnpm studio` and `pnpm drizzle:push` work without errors

## Tracking

- Related to Drizzle Kit v1 RC workspace package resolution
- Created during upgrade from Drizzle v0.x to v1.0.0-beta.8-dbc3565
- Check Drizzle Kit release notes for fixes related to ESM/workspace packages
