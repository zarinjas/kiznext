# STATUS.md — KIZ Super App

What is built, what is broken, what is next. Update this when you finish a feature
or discover a problem.

**Overall: MVP feature-complete, not production-ready.** All planned modules exist
and work in dev. The gaps below are what stands between this and a real deployment.

---

## 1. Built

| Area | State | Notes |
|---|---|---|
| Project setup | Done | Next.js 16, Tailwind v4, Prisma 7 + pg adapter, Docker Postgres. |
| Auth & profile | Done | Credentials login, JWT session, role routing, profile edit. |
| Kad Maya | Done | Static QR from matric ID. |
| Guest house booking | Done | Booking, approval, check-in/out, manual payment flag. |
| Helpdesk | Done | Tickets, chat thread, assign, close, out-of-hours auto-reply. |
| Facility booking | Done | Availability calendar, approval, PDF slip with `KIZ-BKG-NNNN` ref. |
| Announcements | Done | Tags, pinning, scheduling, expiry, attachments, "Baru" badge. |
| Community chat | Done | Single room, 3s polling, admin soft-delete. |
| Lost & Found | Done | Report with photo, status lost/found/claimed. |
| Parcel tracker | Built, hidden | Fully working but gated behind a hardcoded flag — see #3. |
| App settings | Done | Logo upload/remove by superadmin/admin_kiz. |
| UI language | Done | Interface is English. Helpdesk auto-reply text is still Malay. |

---

## 2. Known issues

Ordered roughly by severity. None of these are fixed — they are recorded so you
don't rediscover them or build on top of them.

### #1 — `middleware.ts` is in the wrong directory (high)

`app/middleware.ts` should be at the repo root (or in `src/`). Next.js almost
certainly never executes it, so its auth redirect does nothing.

It is masked because every page independently calls `await auth()` and redirects.
So the app is not wide open — but the middleware is dead code giving a false sense
of a central guard. Note it also does no role checking at all.

*Fix:* move to root, and decide whether role checks belong there or stay per-page.

### #2 — Duplicate facility booking systems (high)

Two parallel implementations coexist:

- `tempahan/` + `urus-tempahan/` — legacy. Nav literally labels it "Manage Bookings (Old)".
- `tempahan-fasiliti/` + `urus-tempahan-fasiliti/` — current.

Both hit the same `facility_bookings` table, so a booking made in one appears in
the other with different UI assumptions. Confusing for admins and for anyone
reading the code.

*Fix:* confirm the legacy pair is unused, then delete it and its nav entries.

### #3 — Parcel module is finished but disabled (medium)

`parcel/page.tsx` has a hardcoded `comingSoon = true` banner and the nav label says
"Coming Soon", but both member and admin flows are complete.

*Fix:* flip the flag and update the nav labels, or move the gate into `app_settings`
so it can be toggled without a deploy.

### #4 — `app_settings` has no `deletedAt` (medium)

The only table missing soft-delete columns — it also lacks `createdAt`. Violates
the project-wide rule in `AGENTS.md`. Low practical impact (it is a key/value
store) but it is an inconsistency.

### #5 — `/api/upload` does not validate uploads (medium)

`POST /api/upload` is authenticated but accepts any file type and any size, writing
straight to `public/uploads/fasiliti/`. `lib/settings.ts` does this correctly
(2 MB cap, MIME allowlist) — the API route should match.

### #6 — Child routes don't re-check the `[role]` segment (medium)

`[role]/page.tsx` verifies that the URL role matches the session role, but nested
routes do not. A student can load `/admin_kiz/...` paths; admin pages still call
`requireRole` so mutations are blocked, but the URL/role mismatch is untidy and
easy to get wrong on the next page someone adds.

### #7 — RBAC is applied inconsistently (medium)

`AGENTS.md` says use `requireRole()`. In practice most `actions.ts` files do inline
`session.user.role` checks, and `urus-tetapan` does its own check plus a redirect
instead of using the helper. Same outcome today, but each inline copy is a place to
forget a role.

### #8 — Local filesystem storage won't survive deployment (blocker for launch)

All uploads (facility images, announcement attachments, lost & found photos,
booking PDFs, app logo) are written to `public/uploads/`. On a stateless host such
as Vercel these vanish on every deploy and are not shared between instances.

*Fix:* pick object storage before going live, or deploy somewhere with a persistent
volume. Hosting is still undecided.

### #9 — Kad Maya QR is static and unsigned (low)

The QR encodes the matric ID as plain text. Anyone who knows a matric ID can
generate an identical code. Fine for casual identification, not for access control.

---

## 3. Backlog

Not started, roughly in priority order.

- **Production hardening** — resolve #1, #2, #5, #8 before any real deployment.
- **`admin_ukmre` role** — external guest-house operator. Add the enum value and
  route guest-house approvals to it; no schema restructure needed.
- **`audit_logs` table** — actor, action, target type/id, JSON meta. Was specced
  but never built; worth having before admins act on real student data.
- **`notifications` table** — generic in-app notifications. Parcel arrival, booking
  approval, and announcement posts currently notify nobody.
- **Dynamic / signed QR** — addresses #9.
- **More shadcn primitives** — only `button`, `card`, `input`, `label` are
  installed; a lot of UI is hand-rolled markup that could be replaced.
- **Tests** — no test framework is set up at all.

---

## 4. Decisions settled

Recorded so nobody reopens them. All of these were once marked "to decide" and are
now resolved in code.

| Question | Decision |
|---|---|
| Realtime engine | None. Client polling every 3s. No Pusher/Supabase. |
| Auth provider | Auth.js v5 (next-auth beta), Credentials provider. |
| File storage | Local filesystem `public/uploads/`. Provisional — see #8. |
| ORM | Prisma 7, `prisma-client` generator, `@prisma/adapter-pg`. |
| Parcel notification channel | In-app only. No email/SMS/push. |
| Task tracking | This file. The Telegram Director Bot and `TASKS.md` were removed. |
| Hosting | Still undecided. |
