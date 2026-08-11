# STATUS.md — KIZ Super App

What is built, what is broken, what is next. Update this when you finish a feature
or discover a problem.

**Overall: MVP feature-complete, not production-ready.** All planned modules exist
and work in dev. The gaps below are what stands between this and a real deployment.

---

## 1. Built

| Area | State | Notes |
|---|---|---|
| Project setup | Done | Next.js 16, MUI v7 design system, Prisma 7 + pg adapter, Docker Postgres. |
| **Full UI/UX redesign** | Done | Every page across all roles rebuilt on MUI v7 (previously Tailwind/shadcn). Tokens + dual light/dark theme in `lib/theme/`, component library in `components/kiz/` (primitives, patterns, shell), one shell for all roles (NavRail + GlassTopBar + BottomNav + MoreSheet + ⌘K CommandPalette + NotificationDrawer). `proxy.ts` at root is the auth guard. |
| Auth & profile | Done | Credentials login, JWT session, role routing, profile edit. |
| Kad Maya | Done | Static QR from matric ID. |
| Guest house booking | Done | Booking, approval, check-in/out, manual payment flag. |
| Helpdesk | Done | Tickets, chat thread, assign, close, out-of-hours auto-reply. |
| Facility booking | Done | Availability calendar, approval, PDF slip with `KIZ-BKG-NNNN` ref. |
| Announcements | Done | Tags, pinning, scheduling, expiry, attachments, "New" badge. |
| Community chat | Done | Single room, 3s polling, admin soft-delete. |
| Lost & Found | Done | Report with photo, status lost/found/claimed. |
| Parcel tracker | Done | Member view enabled (`/parcel`), admin registration + collect. |
| App settings | Done | Logo upload/remove by superadmin/admin_kiz. |
| Dark mode | Done | Dual color schemes via MUI CSS variables; toggle in the top bar; follows system by default. |
| UI language | Done | Interface is English. Helpdesk auto-reply text is still Malay. |

---

## 2. Known issues

Ordered roughly by severity. None of these are fixed — they are recorded so you
don't rediscover them or build on top of them.

### #1 — ~~`middleware.ts` in the wrong directory~~ FIXED

Moved to `proxy.ts` at the repo root (Next.js 16 `proxy` convention) and rewritten
to use `getToken` from `next-auth/jwt` so it runs on the Edge runtime without
pulling Prisma in. It now actually guards protected routes and redirects logged-in
users away from `/login`. Role-per-route enforcement still lives in each page
(`auth()` + redirect) and each mutation (`requireRole()`).

### #2 — ~~Duplicate facility booking systems~~ FIXED

Legacy `tempahan/` + `urus-tempahan/` removed. `tempahan-fasiliti/` +
`urus-tempahan-fasiliti/` are the single facility-booking pair, and `tempahan/`
now hosts the merged "My Bookings" timeline.

### #3 — ~~Parcel module hidden behind "coming soon"~~ FIXED

`/parcel` member page now renders live parcel data (was a hardcoded `comingSoon`
banner). Nav labels updated.

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

- **Production hardening** — resolve #4, #5, #8 before any real deployment.
- **`admin_ukmre` role** — external guest-house operator. Add the enum value and
  route guest-house approvals to it; no schema restructure needed.
- **`audit_logs` table** — actor, action, target type/id, JSON meta. Was specced
  but never built; worth having before admins act on real student data.
- **`notifications` table** — generic in-app notifications. Parcel arrival, booking
  approval, and announcement posts currently notify nobody. The notification
  drawer is currently an empty shell.
- **Reports page for `pengetua`** — view-only analytics surfaced from the dashboard
  (bookings per week, ticket status mix). MUI X Charts are installed and ready.
- **Dynamic / signed QR** — addresses #9.
- **Tests** — no test framework is set up at all.

---

## 4. Decisions settled

Recorded so nobody reopens them. All of these were once marked "to decide" and are
now resolved in code.

| Question | Decision |
|---|---|
| Realtime engine | None. Client polling every 3s. No Pusher/Supabase. |
| Auth provider | Auth.js v5 (next-auth beta), Credentials provider. |
| Auth guard | `proxy.ts` at repo root (`getToken` + JWT), per-page `auth()` + redirect, per-mutation `requireRole()`. |
| File storage | Local filesystem `public/uploads/`. Provisional — see #8. |
| ORM | Prisma 7, `prisma-client` generator, `@prisma/adapter-pg`. |
| UI / design system | MUI v7 heavily customized; tokens in `lib/theme/`; dual light/dark via CSS variables; components in `components/kiz/`. |
| Parcel notification channel | In-app only. No email/SMS/push. |
| Task tracking | This file. The Telegram Director Bot and `TASKS.md` were removed. |
| Hosting | Still undecided. |
