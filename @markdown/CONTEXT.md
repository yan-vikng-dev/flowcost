**Overview**
- Monorepo SaaS template targeting Cloudflare Workers. Ships a React app (TanStack Start) and a backend Worker (Hono), plus a shared data/auth package (Drizzle ORM + Better Auth). Uses pnpm workspaces for local development and deployment via Wrangler.

**Monorepo Layout**
- `apps/webapp` – React 19 + TanStack Start app running as a Worker. Entry: `apps/webapp/src/server.ts:1`
- `apps/backend-service` – Cloudflare Worker using Hono. Entry: `apps/backend-service/src/index.ts:1`
- `packages/data-ops` – Shared data/auth layer (Drizzle ORM schemas, Better Auth setup, queries). Main setup: `packages/data-ops/src/auth/server.ts:1`, `packages/data-ops/src/database/setup.ts:1`
- Root workspace config: `pnpm-workspace.yaml:1`, `package.json:1`

**Key Capabilities**
- Type-safe, file-based routing and server functions (TanStack Start) in `apps/webapp`
- Authentication with Better Auth (Google OAuth baked in) wired in `apps/webapp/src/server.ts:1` and API route `apps/webapp/src/routes/api/auth.$.tsx:1`
- Payments integration via Polar SDK using server middleware `apps/webapp/src/core/middleware/polar.ts:1`
- Shared Drizzle ORM setup targeting Cloudflare D1 by default; can swap to Postgres/MySQL (see docs in `apps/webapp/public/docs`)

**Tooling & Scripts (root)**
- `pnpm run setup` – Install deps and build the shared `data-ops` package
- `pnpm run dev:webapp` – Dev server for the user app
- `pnpm run dev:backend-service` – Dev for the Hono worker
- `pnpm run deploy:webapp` – Build `data-ops`, then deploy user app via Wrangler
- `pnpm run deploy:backend-service` – Build `data-ops`, then deploy backend-service via Wrangler

**Local Development**
- Install once from repo root: `pnpm run setup`
- Start the user app: `pnpm run dev:webapp` (Vite on port 3000)
- Start the backend-service: `pnpm run dev:backend-service` (Wrangler dev)
- You can work inside each app/package independently; paths are under `apps/*` and `packages/*` (note: README’s “packages/webapp” path is outdated; use `apps/webapp`).

**Cloudflare Configuration**
- User app Worker config: `apps/webapp/wrangler.jsonc:1` (sets `main`, `compatibility_date`, `compatibility_flags`, `routes`, `vars`, and D1 `d1_databases`)
- Data service Worker config: `apps/backend-service/wrangler.jsonc:1`
- Type generation after changing Wrangler config: run `pnpm --filter webapp run cf-typegen` (or from inside `apps/webapp`, `pnpm run cf-typegen`). This updates `apps/webapp/worker-configuration.d.ts:1`

**Environment & Secrets**
- Public/runtime vars (non-secret) live in `wrangler.jsonc` under `vars` (user app). Example: `GOOGLE_CLIENT_ID`.
- Secrets must be set with Wrangler and are NOT read from `.env` at runtime. Use: `wrangler secret put BETTER_AUTH_SECRET`, `wrangler secret put GOOGLE_CLIENT_SECRET`, `wrangler secret put POLAR_SECRET`, etc.
- D1 binding `DB` is defined in `apps/webapp/wrangler.jsonc:1` and exposed via `env.DB` in `apps/webapp/src/server.ts:1`.
- Quick reference of env usage in user app:
  - `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in `apps/webapp/src/server.ts:1`
  - `POLAR_SECRET` in `apps/webapp/src/core/middleware/polar.ts:1`

**Database & Migrations**
- Default runtime database is Cloudflare D1 (SQLite) via Drizzle D1 driver. Init code: `packages/data-ops/src/database/setup.ts:1`
- Drizzle CLI config (D1 HTTP driver) in `packages/data-ops/drizzle.config.ts:1`
- Common tasks (run within `packages/data-ops` or via root workspace):
  - `pnpm run better-auth:generate` – Generate Better Auth schema into `src/drizzle/auth-schema.ts`
  - `pnpm run drizzle:generate` – Generate SQL migrations into `src/drizzle`
  - `pnpm run drizzle:migrate` – Apply migrations to configured database
  - `pnpm run drizzle:pull` – Pull existing schema into TypeScript (optional, bootstrap only)
- See detailed provider guides in `apps/webapp/public/docs/database.md:1` (PostgreSQL/Neon, MySQL/PlanetScale, Cloudflare D1 examples and runtime setup).

**Schema-First Approach**
- We use a schema-first workflow: the Drizzle schema in code is the source of truth.
- Define/own tables under `packages/data-ops/src/drizzle/` (app tables in `schema.ts:1`; auth tables generated into `auth-schema.ts:1`).
- Create migrations from the schema with `pnpm --filter data-ops run drizzle:generate`, then apply with `drizzle:migrate` and commit them.
- `drizzle:pull` is supported to bootstrap from an existing DB, but ongoing development should remain schema-first (code → migrations → DB).

**Authentication Flow (Better Auth)**
- Server initialization happens per-request in `apps/webapp/src/server.ts:1`:
  - Initializes Drizzle DB from `env.DB` (D1)
  - Calls `setAuth(...)` with secret and Google provider keys
- Catch-all API route for auth endpoints at `/api/auth/*`: `apps/webapp/src/routes/api/auth.$.tsx:1`
- Client hooks: `apps/webapp/src/lib/auth-client.ts:1` (`useSession`, `signIn`, `signOut`)
- Protected routing UI and session gate: `apps/webapp/src/routes/_auth/route.tsx:1`
- Extended docs and examples: `apps/webapp/public/docs/authentication.md:1`

**Payments (Polar) Integration**
- Injects Polar SDK via server middleware with secret from Cloudflare: `apps/webapp/src/core/middleware/polar.ts:1`
- Example server functions for products, checkout, and subscriptions: `apps/webapp/src/core/functions/payments.ts:1`
- Docs: `apps/webapp/public/docs/polar.md:1`

**Frontend App (TanStack Start)**
- Server entry: `apps/webapp/src/server.ts:1`
- Start config/middleware: `apps/webapp/src/start.tsx:1`
- Router and Query integration: `apps/webapp/src/router.tsx:1`
- File-based routes live under `apps/webapp/src/routes/` (root route: `apps/webapp/src/routes/__root.tsx:1`)
- UI stack: Tailwind v4 + shadcn/ui components under `apps/webapp/src/components`

**Backend Service (Hono)**
- Entry and router: `apps/backend-service/src/index.ts:1`, app instance in `apps/backend-service/src/hono/app.ts:1`
- Deployed as a separate Worker via `pnpm run deploy:backend-service`

**Shared Package (`@repo/data-ops`)**
- Auth setup and lifecycle: `packages/data-ops/src/auth/setup.ts:1`, `packages/data-ops/src/auth/server.ts:1`
- Drizzle schemas live under `packages/data-ops/src/drizzle/` (Better Auth tables generated into `auth-schema.ts`)
- Queries (example stubs) under `packages/data-ops/src/queries/`
- Build before use: `pnpm --filter data-ops run build` (the root `setup` and deploy scripts do this for you)

**Testing**
- User app: Vitest configured in `apps/webapp/package.json:1`, with `@testing-library` and jsdom
- Data service: Vitest with Workers pool in `apps/backend-service/package.json:1`

**Deployment**
- User app: `pnpm run deploy:webapp` (builds `data-ops`, then `wrangler deploy` using `apps/webapp/wrangler.jsonc:1`)
- Data service: `pnpm run deploy:backend-service` (builds `data-ops`, then `wrangler deploy` using `apps/backend-service/wrangler.jsonc:1`)
- Domain routing for user app is configured in `apps/webapp/wrangler.jsonc:1` under `routes` (update `pattern` before production)

**Gotchas & Tips**
- After changing `wrangler.jsonc` (bindings/vars), always regenerate types: `pnpm --filter webapp run cf-typegen`
- `.env` values are not available to Workers at runtime; set secrets with `wrangler secret put ...`
- Ensure the shared package is built (`pnpm run build:data-ops`) before running apps that import `@repo/data-ops`
- The README “Working with Individual Apps” path should be `apps/webapp` (not `packages/webapp`).

**Adapting This Template**
- Rename Workers (`name`) and domain `routes` in `wrangler.jsonc` under each app
- Configure D1 or another DB provider; update `packages/data-ops/drizzle.config.ts:1` and `packages/data-ops/src/database/setup.ts:1` accordingly
- Set required secrets: `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `POLAR_SECRET`, and any DB credentials your provider needs
- Build `data-ops`, run migrations, and deploy each Worker independently
