# Backend Service

## Env

secrets: defined localy in .env.local, generated types in worker-configuration.d.ts by wrangler.
plaintext variables: defined in wrangler.jsonc, generated types in worker-configuration.d.ts by wrangler.

## AI Agent (WhatsApp) Flow

- **Linking**: Web app calls `startWhatsappLink` to create a hashed, 5‑minute token and opens a `wa.me` deep link prefilled with `/verify <token>`. On receiving that message, `/whatsapp/webhook` verifies Meta’s HMAC signature, matches the token, stores the `(userId, waId)` pair in `whatsapp_links`, enables all report prefs, and initializes the per-user `NotificationScheduler` DO.
- **Chat handling**: Verified webhook messages route to `handleIncomingMessage`. Slash commands: `/new` resets conversation, `/help` shows hints, `/link` returns the settings URL, `/unlink` removes the link and revokes scheduling. Normal text is proxied to the `AiConversationServer` DO (Gemini 2.5 + PostHog tracing) which uses tools to read/write finance data and returns the reply; Worker relays via WhatsApp Cloud API v19.0.
- **Typing + send**: `sendTypingIndicator` and `sendWhatsAppText` post to `https://graph.facebook.com/v19.0/{WHATSAPP_PHONE_NUMBER_ID}/messages` with `WHATSAPP_ACCESS_TOKEN`.
- **Scheduled reports**: `NotificationScheduler` DO uses `user_preferences` (time, timezone, daily/weekly/monthly flags) to schedule alarms, generate reports, send them over WhatsApp, and append them to conversation history for context. `/reports/reschedule` and `/reports/revoke` endpoints let the web app reschedule or disable alarms after link/unlink.
- **Data model**: `whatsapp_link_tokens` (hashed token, expiry, usedAt) and `whatsapp_links` (userId PK, unique waId) live in D1 via Drizzle. Relinking the same waId moves it between users safely.
- **Required env**: `WHATSAPP_WEBHOOK_SECRET`, `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `GEMINI_API_KEY`, `POSTHOG_API_KEY`, `DB` binding, `AI_CONVERSATION_SERVER`, `NOTIFICATION_SCHEDULER`.

## AI Agent
