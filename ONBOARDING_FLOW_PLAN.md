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
- Tone: humorous/quirky/non-megacorp; mascot placeholder “guides” the tour.

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

## Required UI Changes (includes sidequests)
1) **Desktop expense button**: add a new standalone “Add expense” button on the dashboard (tour target).
2) **Desktop recurring income button**: add a large standalone “Add recurring income” button after the Expenses card (tour target).
3) **Recurring card cleanup (sidequest)**: replace/remove the Recurring card header “+ / new entry” affordance so the standalone button becomes the primary creation entry point.
4) Add `data-onboarding="..."` attributes to the relevant controls (budget create button, settings nav, WhatsApp link button, new dashboard buttons, resume button).

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
	- Desktop: fixed bottom-right `Card` with checklist + dismiss button.
	- Mobile: `Sheet` with the checklist.
	- Each item click selects/focuses that step; “skip” only dismisses the callout/focus (does not mark complete).
6) **Callouts / overlays**
	- Implement a click-through callout anchored to the target element:
		- No focus trap; no blocking backdrop (or very light, click-through highlight).
		- Scroll-to-target on selection when the target exists.
	- If the target isn’t present on the current page, show copy pointing to the navigation target (e.g., Settings).
7) **Step behaviors (real UI usage)**
	- Expense: callout points to the new desktop button / mobile “+ entry”; uses existing `EntryDialog` (Expense, non-recurring).
	- Income: callout points to desktop income button / mobile “+ entry”; uses existing recurring template creation flow; category selectable.
	- Budget: callout points to Budgets “+” and uses existing budget dialog.
	- WhatsApp: callout prompts user to navigate to Settings; once on Settings, anchor to WhatsApp link button and reuse existing linking behavior.
8) **Settings “Resume onboarding”**
	- Add a Settings card/button shown when `isMissingSetup`; clicking re-opens the checklist (does not need to clear dismissal).
9) **Auto-dismiss when complete**
	- When all items are done, close checklist/callout automatically.
10) **Polish**
	- Quirky copy + mascot placeholder presence in welcome + callouts.
	- Ensure z-index/positioning plays nicely with nav + dialogs + sheets.

## UI Components (no new installs)
- `Dialog` (welcome popup)
- `Sheet` (mobile checklist)
- `Card`, `Button`, `Separator`, `Progress` (checklist)
- `Popover` or a lightweight custom positioned layer (callouts)

## Copy/Tone Notes
- Voice: humorous, quirky, down-to-earth.
- Use mascot placeholders in copy (we’ll replace with art later):
	- `[mascot]` / `[mascot_name]`
	- Example: “Psst… I’m `[mascot]`. I’ll get you set up in 60 seconds.”
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
