# Repository Guidelines

## Project Structure

- `apps/webapp/`: user-facing web app (Vite + React/TanStack), static assets in `apps/webapp/public/`.
- `apps/backend-service/`: Cloudflare Worker backend (Wrangler), source in `apps/backend-service/src/`.
- `packages/data-ops/`: database/auth/schema layer (Drizzle + shared queries), source in `packages/data-ops/src/`.
- `packages/shared-lib/`: shared types and utilities, source in `packages/shared-lib/src/`.
- Build outputs: `dist/` folders inside each package/app.

## Build, Lint and Development Commands

From the repo root:

- `pnpm dev`: run the web app dev server (filters to `webapp`).
- `pnpm build`: build all packages/apps via Turbo.
- `pnpm ship`: deploy via Turbo (runs each app’s `deploy` script).
- `pnpm fix`: format + lint with Biome, then `turbo typecheck`.
- `pnpm cf:types`: generate Cloudflare env types (runs `wrangler types` in `apps/webapp/` and `apps/backend-service/`).
- `pnpm studio`: open Drizzle Studio for `packages/data-ops/`.
- `pnpm db:push`: push schema changes using Drizzle Kit (D1/DB config required).

## Coding Style & Naming Conventions

- Formatting/linting: Biome (`biome.jsonc`). Indentation uses **tabs**; semicolons are “as needed”.
- Run `pnpm fix` before opening a PR.
- TSX file naming: `kebab-case` for `**/*.tsx` (Biome override), except route-like files matching `**/*$*.tsx`.