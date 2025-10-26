# Docs Index

A quick guide to this repo’s documentation: what each file covers and when to read it.

## Quick chooser
- **New to the repo?** Read `CONTEXT.md` first
- **Planning user connections & invites?** Read `connections.md`
- **Working on UI/components or Tailwind?** See `shadcn/*` and `STYLEGUIDE.md`
- **Building charts (Recharts)?** See `shadcn/charts/chart.md` and the bar/pie examples
- **Adding a data table (TanStack Table)?** See `shadcn/table.md`
- **Building forms (TanStack Form + Zod)?** See `shadcn/forms/tanstack-form.md` and `shadcn/forms/field.md`
- **Need a combobox, date picker, or toasts?** See `shadcn/combo-box.md`, `shadcn/date-picker.md`, `shadcn/toast.md`
- **Server functions/middleware (TanStack Start)?** See `tanstack/tanstack-server-functions.md`
- **Using the dedicated UI builder agent?** See `shadcn/shadcn-ui-builder.md`
- **Personal scratch notes?** Use `NOTES.md`

## Core docs in this folder
### `CONTEXT.md`
- **Purpose**: High-level overview of the monorepo, apps, packages, Cloudflare Workers setup, environment variables, database/migrations, and key workflows.
- **When to read**: First-time onboarding, deployment questions, changing Wrangler bindings/secrets, or wiring DB/auth/payments.

### `STYLEGUIDE.md`
- **Purpose**: Short, practical UI/layout tips tailored to this codebase (Tailwind v4 setup and spacing conventions).
- **When to read**: While implementing or reviewing UI to keep styling consistent.

### `NOTES.md`
- **Purpose**: Free-form scratch space for ideas, todos, and temporary notes.
- **When to read**: Your own working notes; optional to commit.

## Shadcn/UI component guides (`@markdown/shadcn/`)
These are copy‑paste friendly references aligned to our setup (Tailwind v4, CSS variables, React 19).

- `badge.md`, `card.md`: Basic building blocks and patterns.
- `charts/`:
  - `chart.md`: Core concepts and theming for Recharts in this project.
  - `bar-chart-*.md`, `pie-chart-*.md`: Ready examples for common chart types.
- `forms/`:
  - `field.md`: Accessible form field composition (labels, descriptions, errors, groups).
  - `tanstack-form.md`: Complete patterns with TanStack Form + Zod.
- `combo-box.md`: Combobox patterns (popover/command/drawer responsive).
- `date-picker.md`: Date selection variants (single, input, time, natural language).
- `toast.md`: Sonner usage and project-specific Toaster setup.
- `shadcn-ui-builder.md`: How to approach component work with our design system and composition patterns.

**When to read**: Any time you are implementing or modifying UI; pick the doc matching the component you’re building.

## TanStack Start server functions (`@markdown/tanstack/`)
### `tanstack-server-functions.md`
- **Purpose**: Patterns for server functions, input validation (Zod), middleware composition, error handling, and full-stack type safety.
- **When to read**: Creating or updating server functions, adding auth/validation middleware, or wiring to TanStack Query on the client.

## Related in-repo docs (outside this folder)
- `apps/webapp/CLAUDE.md`: App architecture, commands, and stack details for the web app. Useful alongside `CONTEXT.md` when working on routes, Query integration, and SSR.

## Picking the right doc by task
- **Add an authenticated server endpoint**: `tanstack/tanstack-server-functions.md` (+ see `apps/webapp/CLAUDE.md` for app wiring)
- **Create a responsive chart**: `shadcn/charts/chart.md` then a specific example in `shadcn/charts/*`
- **Build a data table**: `shadcn/table.md`
- **Implement a form with validation**: `shadcn/forms/tanstack-form.md` and `shadcn/forms/field.md`
- **Add a combobox/date picker/toast**: respective docs in `shadcn/`
- **Check environment/secrets/DB**: `CONTEXT.md` (Cloudflare, D1, Wrangler vars/secrets)
- **UI consistency check**: `STYLEGUIDE.md`

## Contributing docs here
- Keep new guides under a clear subfolder (`shadcn/`, `tanstack/`, or a new scoped folder).
- Prefer small, task-focused docs with copy‑paste examples tailored to this repo’s setup.
- Cross-link related docs (e.g., charts ↔ theme tokens, forms ↔ fields) to aid discovery.

If you’re unsure where to start, skim `CONTEXT.md` and then jump to the section above that matches your task.
