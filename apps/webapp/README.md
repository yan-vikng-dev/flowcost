# Webapp

Static marketing site and product docs for Flowcost. The product itself runs entirely over WhatsApp — there is no authenticated dashboard, login, or in-app expense management.

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page with a `wa.me` CTA to start chatting |
| `/docs` | Docs overview |
| `/docs/getting-started` | How to log your first expense |
| `/docs/features/*` | Feature guides (entries, reports, connections) |

The `/pricing` route and all `_auth/**` app routes are removed.

## WhatsApp CTA

The landing page links to `https://wa.me/<number>`. Set the number in `src/config/whatsapp.ts` (`WHATSAPP_NUMBER`, digits only). Production also exposes `WHATSAPP_E164` via `wrangler.jsonc` for server-side use.

## Analytics

PostHog pageviews via a `/config/*` reverse proxy. Analytics are disabled outside production builds.

Env vars: `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` (in `wrangler.jsonc`).

## Stack

TanStack Start (Vite + React) deployed as a Cloudflare Worker. Shares the D1/KV bindings with the backend for any server-side needs, but the UI is static content only.

## Commands

```bash
pnpm dev          # vite dev server
pnpm build        # production client + SSR worker bundle
pnpm typecheck    # tsc --noEmit
pnpm cf:types     # regenerate worker-configuration.d.ts
```
