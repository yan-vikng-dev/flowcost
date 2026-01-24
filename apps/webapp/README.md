# Webapp

## Design principles
- the majority of the data is current-month centric. budgets, entries, dashboards, everything is fetched for the current month
- entries are keyed to a date string (YYYY-MM-DD), independent of exact time. user timezone is used on creation and fetching for that purpose.

## Onboarding checklist
- dashboard shows a dismissible onboarding checklist stored in localStorage
- completion is derived from entries, budgets, recurring templates, and WhatsApp link status
- users can re-enable it from Settings while the checklist is incomplete

## Analytics
- PostHog is used for client-side analytics (pageviews + user identify) via a `/config/*` reverse proxy.
- Analytics are disabled outside production builds.
- Env vars: `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`.

## Public pages
- Landing page: `/`
- Docs page: `/docs`
- Pricing page: `/pricing`
