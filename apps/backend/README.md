# Backend

Cloudflare Worker that receives WhatsApp messages, runs the expense-tracking AI agent, and sends scheduled reports.

## Identity

A user **is** their WhatsApp ID. The first inbound message upserts a `users` row keyed by `waId` — no login, link tokens, or web verification step. New users get a `NotificationScheduler` Durable Object initialized automatically.

## WhatsApp flow

1. Meta posts to `/whatsapp/webhook` (HMAC-verified).
2. `handleIncomingMessage` upserts the user, then routes slash commands, button replies, contact cards, or normal chat to the agent.
3. A WhatsApp `request_welcome` event triggers the welcome flow: an intro message plus interactive buttons (`onboard:confirm` / `onboard:change`) to confirm auto-detected timezone and currency (inferred from the phone number's country). Returning users get a shorter welcome-back message instead.
4. Onboarding is marked complete only after the user taps a welcome button or receives a successful agent reply (not on the welcome text alone).
5. Normal text (and optional media) goes to the `AgentServer` Durable Object (Gemini + Vercel AI SDK tool calling).
6. Replies are sent via WhatsApp Cloud API (`sendWhatsAppText`, `sendTypingIndicator`, interactive buttons, templates).

## Slash commands

| Command | Action |
|---------|--------|
| `/help` | Show what Flowcost can do and list commands |
| `/new` | Clear conversation context (~1h inactivity does this too); logged expenses are kept |
| `/settings` | Show timezone, currencies, report schedule, and pairing status |
| `/start` | Replay the welcome tour |
| `/pair <phone>` | Send a pairing request to another WhatsApp number |
| `/accept` | Accept a pending pairing request |
| `/decline` | Decline a pending pairing request |
| `/unpair` | End the active 1:1 partner connection |

Phone numbers in `/pair` are normalized to digits (non-digits stripped). Sharing a contact card in chat also initiates pairing. Pairing uses `connection_requests` with a 24h expiry.

## AI agent tools (expense-only)

- `create_entry` — log an expense
- `get_entries` — fetch entries for a date range (amounts converted to the user's display currency)
- `update_entry` / `delete_entry` — modify existing entries
- `update_preferences` — timezone, currencies, report schedule prefs, pause/resume reports (`reportsPaused`)

Budget, income, and recurring tools are removed.

## Reports (`NotificationScheduler` DO)

Weekly and monthly reports are **on by default**. Users can pause or resume them by asking the assistant (stored as `users.reportsPaused`).

- Schedule is driven by `users.reportsTime`, `reportsWeeklyDay`, and `timezone`.
- On the last day of the month → monthly report; otherwise on the configured weekday → weekly report.
- Reports are expense-only (category breakdown, totals, partner aggregation). No daily reports.
- Amounts are converted via Frankfurter v2 rates cached in KV — there is no FX cron or `exchange_rates` table.
- If the user has been inactive for more than 24 hours, WhatsApp error `131047` (re-engagement window closed) triggers a fallback: the `report_ready` message template with a **Show report** quick-reply button. The webhook handles payload `send_report:<type>:<date>` and calls `NotificationScheduler.sendReportNow` to regenerate and deliver the report.

## Currency conversion

`src/lib/currency.ts` wraps the shared-lib Frankfurter client with `env.CACHE` and exposes `convertEntries()`. Used by reports and the `get_entries` tool. Raw entries in D1 are never converted at the query layer.

## WhatsApp config-as-code

Desired WhatsApp conversational components and message templates live in `scripts/whatsapp-config.ts` (welcome message, ice-breaker prompts, registered slash commands, and the `report_ready` template). Apply them with:

```bash
pnpm wa:config       # push to Meta Graph API
pnpm wa:config:dry     # read-only diff, no writes
```

Re-run after changing desired state. Deploy the webhook before first enabling the welcome message — Meta sends `request_welcome` to your endpoint when a user opens the chat.

## Env & bindings

**Wrangler bindings:** `DB` (D1), `CACHE` (KV), `AI_CONVERSATION_SERVER`, `NOTIFICATION_SCHEDULER`.

**Plaintext vars** (in `wrangler.jsonc`): `POSTHOG_HOST`, `POSTHOG_KEY`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`.

**Secrets** (local `.env.local`, typed in `worker-configuration.d.ts`): `WHATSAPP_WEBHOOK_SECRET`, `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `GEMINI_API_KEY`.

There are no cron triggers.

## Commands

```bash
pnpm dev          # wrangler dev
pnpm build        # wrangler build
pnpm typecheck    # tsc --noEmit
pnpm cf:types     # regenerate worker-configuration.d.ts
pnpm wa:config    # sync WhatsApp conversational config and templates
pnpm wa:config:dry
```
