# Backend

Cloudflare Worker that receives WhatsApp messages, runs the expense-tracking AI agent, and sends scheduled reports.

## Identity

A user **is** their WhatsApp ID. The first inbound message upserts a `users` row keyed by `waId` — no login, link tokens, or web verification step. New users get a `NotificationScheduler` Durable Object initialized automatically.

## WhatsApp flow

1. Meta posts to `/whatsapp/webhook` (HMAC-verified).
2. `handleIncomingMessage` upserts the user, then routes slash commands or normal chat to the agent.
3. Normal text (and optional media) goes to the `AgentServer` Durable Object (Gemini + Vercel AI SDK tool calling).
4. Replies are sent via WhatsApp Cloud API (`sendWhatsAppText`, `sendTypingIndicator`).

## Slash commands

| Command | Action |
|---------|--------|
| `/new` | Reset the AI conversation |
| `/help` | Show command hints |
| `/pair <phone>` | Send a pairing request to another WhatsApp number |
| `/accept` | Accept a pending pairing request |
| `/decline` | Decline a pending pairing request |
| `/unpair` | End the active 1:1 partner connection |

Phone numbers in `/pair` are normalized to digits (non-digits stripped). Pairing uses `connection_requests` with a 24h expiry.

## AI agent tools (expense-only)

- `create_entry` — log an expense
- `get_entries` — fetch entries for a date range (amounts converted to the user's display currency)
- `update_entry` / `delete_entry` — modify existing entries
- `update_preferences` — timezone, currencies, report schedule prefs

Budget, income, and recurring tools are removed.

## Reports (`NotificationScheduler` DO)

Weekly and monthly reports are **always on** — no enable/disable toggles.

- Schedule is driven by `users.reportsTime`, `reportsWeeklyDay`, and `timezone`.
- On the last day of the month → monthly report; otherwise on the configured weekday → weekly report.
- Reports are expense-only (category breakdown, totals, partner aggregation). No daily reports.
- Amounts are converted via Frankfurter v2 rates cached in KV — there is no FX cron or `exchange_rates` table.

## Currency conversion

`src/lib/currency.ts` wraps the shared-lib Frankfurter client with `env.CACHE` and exposes `convertEntries()`. Used by reports and the `get_entries` tool. Raw entries in D1 are never converted at the query layer.

## Env & bindings

**Wrangler bindings:** `DB` (D1), `CACHE` (KV), `AI_CONVERSATION_SERVER`, `NOTIFICATION_SCHEDULER`.

**Plaintext vars** (in `wrangler.jsonc`): `POSTHOG_HOST`, `POSTHOG_KEY`, `WHATSAPP_PHONE_NUMBER_ID`.

**Secrets** (local `.env.local`, typed in `worker-configuration.d.ts`): `WHATSAPP_WEBHOOK_SECRET`, `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `GEMINI_API_KEY`.

There are no cron triggers.

## Commands

```bash
pnpm dev          # wrangler dev
pnpm build        # wrangler build
pnpm typecheck    # tsc --noEmit
pnpm cf:types     # regenerate worker-configuration.d.ts
```
