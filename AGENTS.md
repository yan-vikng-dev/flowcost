# Repository Guidelines

## Project Structure

- `apps/webapp/`: user-facing web app (Vite + React/TanStack), static assets in `apps/webapp/public/`.
- `apps/backend-service/`: Cloudflare Worker backend (Wrangler), source in `apps/backend-service/src/`.
- `packages/data-ops/`: database/auth/schema layer (Drizzle + shared queries), source in `packages/data-ops/src/`.
- `packages/shared-lib/`: shared types and utilities, source in `packages/shared-lib/src/`.
- Build outputs: `dist/` folders inside each package/app.
- each app's and package's README.md should be updated with the latest context of that project.

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
- text defaults to text-foreground, so no need to set explicitly, unless a different semantic text color is desired
- prefer parent `space-y-x` and `gap` over individual children `mb-x` and `mt-x`
- when creating icon-only buttons, use `size="icon"`, `size="icon-sm"`, or `size="icon-lg"` variants. When using these icon size variants, no need to add an explicit size class to the icon.
- import icons explicitly with the Icon suffix, e.g PencilIcon instead of Pencil (lucide has Icon suffix alias for all icons)
- Avoid wrapper divs that only have one child unless the wrapper provides necessary layout context or the child can't accept the wrapper's styling directly.

  Example - avoid unnecessary nesting:
  ```tsx
  // ❌ Bad: unnecessary wrapper divs
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        <Badge>Label</Badge>
      </div>
    </div>
    <span>Text</span>
  </div>

  // ✅ Good: direct children when wrapper adds no value
  <div className="flex items-center justify-between">
    <Badge>Label</Badge>
    <span>Text</span>
  </div>
  ```

## Rules
- always run `pnpm fix` when finished making all desired changes, the check command lints, formats and typechecks the codebase.
- prefer drizzle .query api over .select
- generic desktop breakpoint is tailwind's `md` breakpoint (768px). can be accessed with the `useIsDesktop` hook.
- consider your CloudFlare knowledge deprecated. their platform changes on a daily basis, and fresh docs should be fetched for every cloudflare-related task.