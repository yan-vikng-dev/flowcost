**User Connections & Invitations**

This doc covers the data model and flows for connecting exactly two users to share data (read and edit), plus an email-based invitation system.

**Goals**
- Exactly two users per connection. No groups.
- One active connection per user at a time.
- Invitations by email work regardless of registration status.
- No soft deletes; keep history by status changes when useful.

**Tables**
- `packages/data-ops/src/drizzle/schemas/user_connections.ts:1`
  - Row-per-pair model using ordered IDs
  - Columns: `id`, `userIdLow`, `userIdHigh`, `createdAt`, `updatedAt`
  - Constraints: unique pair `(userIdLow, userIdHigh)`; insertion must normalize pair via `min/max` to prevent reversed duplicates
  - Notes: We enforce “one connection per user” in server code (no triggers with push-only workflow)

- `packages/data-ops/src/drizzle/schemas/user_connection_invitations.ts:1`
  - Columns: `id`, `inviterUserId`, `inviteeEmail`, optional `inviteeUserId`, `status` (`pending|accepted|declined|expired`), `expiresAt`, timestamps
  - Works for non-registered invitees (identified by `inviteeEmail`) and can backfill `inviteeUserId` once they register

**Server Functions (co-located under settings route)**
- `apps/webapp/src/routes/_auth/app/settings/-functions/connections.ts:1`
  - `getConnectionState()`
    - Returns current partner info or `null`
    - Returns a single `pending[]` list where each item has `{ id, direction: 'incoming'|'outgoing', user: { id?, name?, email } }` so the UI can consistently render a user row
  - `sendInvitation({ email })`
    - Guards: cannot invite self; inviter must not be already connected; if `inviteeEmail` belongs to a registered and already-connected user, reject
    - Inserts a `pending` invite with 7-day expiry
  - `cancelInvitation({ id })`
    - Inviter-only; invite must be `pending`; deletes the invitation
  - `acceptInvitation({ id })`
    - Invitee-only (by `inviteeUserId` or `inviteeEmail` equals session email); both inviter and invitee must not already be connected
    - Creates one `user_connections` row using normalized `(userIdLow, userIdHigh)`
    - Marks invite `accepted`
  - `declineInvitation({ id })`
    - Invitee-only; marks `declined`
  - `disconnectConnection()`
    - Deletes the single `user_connections` row involving the session user

All functions use `protectedFunctionMiddleware` and Zod validation, and are designed for TanStack Query.

**Settings UI**
- `apps/webapp/src/routes/_auth/app/settings/ConnectionsCard.tsx:1`
  - Header action: “Invite” opens a dialog with an email input
  - Connected: shows a single user row (name + email) with a left-side icon action to disconnect
  - Not connected: shows a unified list of pending invitations as user rows (name/email when available, email otherwise) with left-side icon actions:
    - Incoming: Check (accept), X (decline)
    - Outgoing: Trash (cancel)
  - Query key: `connectionState`; mutations invalidate this and, on connect/disconnect, also invalidate `entries`

**Sharing Model (entries)**
- Desired behavior: both connected users can see and edit all entries (past + future)
- Current implementation: entries are owned by `entries.userId`. To include partner’s entries:
  - Read/list queries should include `WHERE entries.userId IN (:actorId, :partnerId)`
  - Mutations (create/update/delete) should authorize if actor is entry owner or their partner
- Practical next steps:
  - Update server functions to derive partner ID once via a helper and apply it to queries and authorization checks
  - Example helper: resolve partner for a user
    - Select from `user_connections` where `userIdLow = :uid OR userIdHigh = :uid`
    - Partner = `userIdLow === :uid ? userIdHigh : userIdLow`

**Business Rules Recap**
- One active connection per user (enforced in server code before insert)
- Users already in a connection cannot receive or accept more invites
- Unlimited pending invites for solo (not-connected) users
- No soft deletes; invitations are deleted on cancel; accepted/declined remain by status

**Why low/high instead of a pairId membership table?**
- We prefer the single-row-per-pair model for simplicity and compactness
- Enforcing “one row per user across both columns” is done in server logic due to our push-only schema workflow (no triggers)

**Operational Notes**
- We use Drizzle “schema-first” with push/migrate; avoid custom triggers for portability
- Normalize pair ordering server-side to satisfy the unique index
- Prefer queries via the aggregator import: `@repo/data-ops/drizzle/schemas/index:1`

**Open Items**
- Optional: add rate limits or spam mitigation for `sendInvitation`
