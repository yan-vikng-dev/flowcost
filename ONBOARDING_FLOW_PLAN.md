# Onboarding Tour Implementation Plan

## Context
Repo: `flowcost`
- Web app: `apps/webapp/` (TanStack Start + React Query + shadcn/ui)
- DB layer: `packages/data-ops/` (Drizzle + D1)

Relevant existing UI/features:
- Dashboard route: `apps/webapp/src/routes/_auth/app/index.tsx`
- Budgets UI: `apps/webapp/src/routes/_auth/app/-components/budgets-card/index.tsx`
- Recurring UI: `apps/webapp/src/routes/_auth/app/-components/recurring-card/index.tsx`
- Entry form dialog: `apps/webapp/src/routes/_auth/app/-components/entry-dialog.tsx`
- Mobile “+ entry” button: `apps/webapp/src/routes/_auth/-components/mobile-app-nav.tsx`
- Settings route: `apps/webapp/src/routes/_auth/app/settings/index.tsx`
- WhatsApp linking UI: `apps/webapp/src/routes/_auth/app/settings/-components/AssistantCard/whats-app-section.tsx`

## Product Spec (final)
Onboarding is a **tour-style** experience:
- On login, if **any checklist item is incomplete** and the tour is **not dismissed** (localStorage), show a **welcome popup**:
	- Primary: “Start tour”
	- Secondary: “Skip tour”
	- Copy: can always return to the tour later from Settings.
- After “Start tour”, show a floating **checklist UI**:
	- Desktop: fixed bottom-right checklist
	- Mobile: a mobile-friendly **sheet**
- Each checklist item is clickable and skippable (non-blocking).
- Callouts are **click-through** and non-obstructive.
- The tour never auto-navigates; it only prompts the user to navigate (optionally via a user-clicked link/button).
- Callouts should **scroll** to targets on the current page when possible.
- Checklist is dismissable (close), not collapsible, and **auto-dismisses when all items are complete**.
- Settings shows “Resume onboarding” if any checklist item is incomplete (regardless of dismissal).
- Tone: humorous/quirky/non-megacorp; mascot placeholder “guides” the tour (mascot name: **Bob**).

## Checklist Items + Completion Rules (data-driven)
All items are treated as “core” for triggering and completion.

1) **Add an expense entry**
	- Done when at least one `entries` row exists with `entryType === "Expense"` (no restrictions on user/partner/recurring/date).
2) **Add recurring income**
	- Done when at least one recurring template exists with `entryType === "Income"`.
	- UX should steer toward only one recurring income, but completion is “>= 1”.
	- Income category remains user-selectable.
3) **Add a budget**
	- Done when at least one budget exists using the default “include partner” behavior.
4) **Link WhatsApp assistant**
	- Done when `getWhatsappLinkStatus` returns linked (current user).

## Triggering + Persistence
“Missing setup” condition:
- `isMissingSetup = !(expenseDone && incomeDone && budgetDone && whatsappDone)`

Auto-trigger on login:
- Show welcome popup when `isMissingSetup && !localDismissed`.

Resume onboarding entry point:
- Visible in Settings when `isMissingSetup` (not gated by localDismissed).

Local storage:
- Dismissal key: `flowcost:onboarding:dismissedAt` (number timestamp)
- Dismissal persists indefinitely; no automatic reset when checklist logic changes (manual re-entry via Settings only).

## UI Targets (what the tour points at)
Use stable DOM anchors via `data-onboarding="..."` attributes.

Dashboard targets:
- Add expense (desktop): new standalone button `data-onboarding="add-expense"`
- Add expense (mobile): existing bottom nav “+ entry” `data-onboarding="add-expense"`
- Add recurring income (desktop): large standalone button after the Expenses card `data-onboarding="add-income-recurring"`
- Add recurring income (mobile): bottom nav “+ entry” (callout copy guides switching to recurring + Income)
- Add budget: Budgets card create button `data-onboarding="add-budget"`

Settings targets:
- Settings navigation entry point (desktop + mobile): `data-onboarding="nav-settings"`
- Link WhatsApp button: `data-onboarding="link-whatsapp"`
- Resume onboarding button/card: `data-onboarding="resume-onboarding"`

## Required UI Changes
1) Add `data-onboarding="..."` attributes to the relevant controls (main desktop “Add entry” button, mobile “+ entry” button, budget create button, settings nav, WhatsApp link button, resume button).

## Code Containment Strategy
- Put all onboarding UI/logic under `apps/webapp/src/onboarding/` (provider, context, manifest, callout layer, localStorage helper, quirky copy) so feature code only exposes anchors.
- Mount a single `OnboardingTourProvider` in `apps/webapp/src/routes/_auth/route.tsx`; no other cross-cutting providers.
- Keep server status isolated to one function `apps/webapp/src/core/functions/onboarding.ts` returning booleans + `isMissingSetup`; consumers use one query key.
- Only touch existing components to add `data-onboarding` attributes (no new props); if the tour needs side effects, use onboarding-specific hooks/events inside the onboarding module.
- Add a feature flag escape hatch (env or config in onboarding module) to disable the tour without touching product surfaces.

## Multi-Step Checklist Model
- Represent each checklist item as ordered steps: `navigate` (no target, just copy + link) or `callout` (anchors to `data-onboarding` selector with desktop/mobile fallbacks).
- Steps carry route/device hints: `{ route: "/app", device: "desktop|mobile" }` so callouts only render when relevant; otherwise show navigation copy.
- Selection drives scroll-to-target on the current page; if target missing, show fallback text/button to navigate where the target exists.
- Step progression is manual (Next/Skip); completion still comes from server booleans (creating the entry/budget/etc.). Skipping only dismisses that step’s callout.
- Primary callout steps: Bob appears with short “what/why” copy, pointing at the main action target.
- Secondary detail steps: once on the correct screen/dialog, use small arrows/tooltips on key fields with one-liner explanations.

## Expanded Checklist Steps (click map)
1) **Add an expense entry**
	- Step 1 (navigate): If not on Dashboard (`/app`), prompt to go there.
	- Step 2 (callout, primary): Bob points at main add-entry control (`data-onboarding="add-expense"`; desktop button + mobile “+ entry”). Copy: open the entry dialog and we’ll spend your money responsibly.
	- Step 3 (callout, detail): Inside EntryDialog, arrows to Type (Expense), Amount, Category, Date, and Create button with one-liners (“Pick Expense”, “Add the number”, “Tag it”, “Date it”, “Create”).

2) **Add recurring income**
	- Step 1 (navigate): If not on Dashboard, prompt to go there.
	- Step 2 (callout, primary): Bob points at main add-entry control (`data-onboarding="add-income-recurring"` on desktop; mobile uses same add-entry anchor) with copy to open, switch to Recurring + Income.
	- Step 3 (callout, detail): In EntryDialog, arrows on Recurring toggle, Type=Income, Category, Amount, Date, and Create with brief cues (“Make it repeat”, “Mark as Income”, “Pick a bucket”, “Enter amount”, “Save it”).

3) **Add a budget**
	- Step 1 (navigate): If not on Dashboard, prompt to go there.
	- Step 2 (callout, primary): Bob points at Budgets create button (`data-onboarding="add-budget"`) with “let’s fence the spending.”
	- Step 3 (callout, detail): In Budget dialog, arrows on amount/currency/categories and Create with short helper text.

4) **Link WhatsApp assistant**
	- Step 1 (navigate): Prompt to go to Settings (`/app/settings`), using nav anchor (`data-onboarding="nav-settings"`).
	- Step 2 (callout, primary): Bob points at WhatsApp link button (`data-onboarding="link-whatsapp"`) with “tap to summon chat magic.”
	- Step 3 (callout, detail): Show linked status confirmation/fallback text; remind they can resume tour later.

## Implementation Steps (agent checklist)
1) **Compute onboarding status (server)**
	- Add a server function (e.g. `apps/webapp/src/core/functions/onboarding.ts`) returning:
		- `expenseDone`, `incomeDone`, `budgetDone`, `whatsappDone`
		- `isMissingSetup`
	- Queries must match completion rules above and should be cheap (`limit 1` checks).
2) **Client state + localStorage**
	- Add a hook/util for reading/writing `flowcost:onboarding:dismissedAt`.
	- Derive `shouldShowWelcome = isMissingSetup && !dismissedAt`.
3) **Mount provider under authenticated layout**
	- Add an `OnboardingTourProvider` under `apps/webapp/src/routes/_auth/route.tsx` so it can render across authenticated routes.
4) **Welcome popup**
	- Use `Dialog`.
	- “Start tour” opens checklist and focuses first incomplete item.
	- “Skip tour” sets dismissal timestamp and closes.
5) **Checklist UI**
	- Desktop: fixed bottom-right `Card` with checklist + dismiss button; style matches alert solids (reuse alert styles or add a card variant for solid background).
	- Mobile: `Sheet` with the checklist; minimal footprint, non-obstructive.
	- Each item click selects/focuses that step; “skip” only dismisses the callout/focus (does not mark complete).
6) **Callouts / overlays**
	- Implement a click-through callout anchored to the target element:
		- No focus trap; no blocking backdrop (or very light, click-through highlight).
		- Scroll-to-target on selection when the target exists.
	- If the target isn’t present on the current page, show copy pointing to the navigation target (e.g., Settings).
	- Primary callouts use Bob + short “what/why”; detail callouts use small arrows and one-liners on fields.
7) **Step behaviors (real UI usage)**
	- Expense: callout points to the main “Add entry” control; uses existing `EntryDialog` (user picks Expense in the dialog).
	- Income: callout points to the main “Add entry” control; uses existing recurring template creation flow (user toggles Recurring + selects Income; callouts point at those controls).
	- Budget: callout points to Budgets “+” and uses existing budget dialog (no prefills).
	- WhatsApp: callout prompts user to navigate to Settings; once on Settings, anchor to WhatsApp link button and reuse existing linking behavior.
8) **Settings “Resume onboarding”**
	- Add a Settings card/button shown when `isMissingSetup`; clicking re-opens the checklist (does not need to clear dismissal).
9) **Auto-dismiss when complete**
	- When all items are done, close checklist/callout automatically.
10) **Polish**
	- Quirky copy with Bob present in welcome + primary callouts; checklist remains minimal/non-obstructive.
	- Ensure z-index/positioning plays nicely with nav + dialogs + sheets.
	- No special handling when switching between mobile/desktop beyond route/device hints on steps.

## UI Components (no new installs)
- `Dialog` (welcome popup)
- `Sheet` (mobile checklist)
- `Card`, `Button`, `Separator`, `Progress` (checklist)
- `Popover` or a lightweight custom positioned layer (callouts)

## Callouts + Portal Simplification
- Single portal root (e.g., `<div id="onboarding-callouts" />`) attached to `document.body`; render all callouts through it.
- Positioning: resolve the target with `document.querySelector('[data-onboarding=...]')`, read `getBoundingClientRect()`, and set absolute `top/left` using `window.scrollX/Y`. Recompute on throttled `scroll`/`resize` and via an optional `ResizeObserver` on the target.
- If the target is off-screen, `scrollIntoView({ behavior: "smooth", block: "center" })` then remeasure once.
- Overlay is backdrop-free; container uses `pointer-events: none` with `pointer-events: auto` on the callout so clicks pass through. Add an optional highlight (outline/glow) applied directly to the target while selected.
- If no target is found after retries, render a compact inline helper near the checklist explaining where to go instead of forcing positioning.
- Use a single high z-index (e.g., 50) on the portal root to sit above dialogs/sheets without extra stacking hacks.

## Copy/Tone Notes
- Voice: humorous, quirky, down-to-earth; mascot is **Bob** (use `[bob]` placeholder if art is pending).
- Primary callouts: Bob speaks briefly about the main action (“Here’s the button, let’s do X because Y”).
- Detail callouts: tiny arrows/tooltips on fields with one-liners (“Pick Expense”, “Add the number”, etc.).
- Checklist copy stays minimal; main guidance lives in callouts.
- Always mention: “You can come back to this tour from Settings.”

## QA Checklist (manual)
- Missing setup + not dismissed: welcome popup appears on login.
- “Skip tour”: welcome doesn’t auto-show again on login.
- “Resume onboarding” is visible in Settings whenever setup is missing (even if dismissed).
- “Start tour”: checklist opens (desktop widget / mobile sheet), items are clickable, callouts are click-through, and selection scrolls to targets.
- Creating an expense entry completes item 1.
- Creating a recurring income completes item 2.
- Creating a budget completes item 3.
- Linking WhatsApp completes item 4.
- When all items complete: checklist auto-dismisses; “Resume onboarding” disappears.
