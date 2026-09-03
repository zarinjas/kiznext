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
| **Minimal SaaS visual system** | Done | Re-tokened to a clean, minimalist modern SaaS look (Linear/Vercel/Stripe school): pure-white surfaces, neutral near-black ink, hairline structure instead of shadows, single sans (`Inter`) with tight tracking — no serif. Decoration is soft lavender/sky gradients only (`gradient.hero/.rail/.mesh/.panel`). Sidebar is now a light rail with a gradient wash (the dark-green slab is gone); mobile BottomNav is a flush frosted 5-slot tab bar; MoreSheet is a bottom sheet. Admin "N bookings pending" hero + student eCard are soft-gradient panels. Gradients and glass fall back correctly in dark mode. |
| **Primary colour decided — teal** | Done | `color.brand[*]` in `lib/theme/tokens.ts` swapped from the placeholder neutral ramp to a teal scale (`#0891B2` primary). Re-skins the whole app automatically (no component changes needed) since every component reads from the token. |
| **Sidebar regrouping** | Done | Admin nav (`nav-config.ts`) split the old catch-all "Admin" group into three clearer groups — **Approvals** (facility/guest-house/room/helpdesk requests), **Content** (announcements/facilities/offices), **System** (users/settings) — so the rail reads as a hierarchy instead of one long list. Member groups (Overview/Bookings/Support/Community) unchanged. |
| **Layout/overlap fixes** | Done | Audited every shared shell/list/card primitive and fixed concrete overlap bugs: `StatusChip` dot no longer uses a margin hack that could crowd long labels; `ListRow` trailing cluster wraps instead of colliding with the chevron on narrow screens; notification badge (top bar), "More" tab badge (bottom nav), and room-selection badges (nav rail/drawer) now sit on fixed-size icon wrappers instead of floating on unbounded ones (was bleeding past its button on multi-digit counts / narrow rails); `MetricTile`'s emphasis dot no longer fights baseline alignment with the big number; chat bubble max-width now shrinks when an admin delete button is also present so the row can't overflow at 320–360px; campus-map free-bed badge insets instead of overhanging into neighbouring zones; admin room-card delete button clearance widened; facility/guest-house admin cards standardized on the `radius.cardLg` token and their 2-col detail grid now truncates instead of wrapping unevenly; CSV import-preview "reason" cell truncates with a tooltip instead of stretching row height; `PageHeader` actions no longer force-equal-flex 3+ buttons into uneven wrap rows; helpdesk assignee trailing info now hides until `md` instead of `sm`; announcement feed date pinned with `ml:auto` instead of a `flex:1` spacer that stops working once the row wraps. |
| **Copywriting pass** | Done | Success/error toasts, empty states, and key-moment copy (booking submitted, room selected/released, profile updated, logo updated, login error, admin CRUD toasts) rewritten from formal/corporate tone to a friendlier, lightly fun tone app-wide (e.g. "Yay! Booking sent 🎉", "Inbox zero 🎉", "Nice, bed locked in! 🛏️"). Destructive-action confirmation dialogs (delete facility/user/guest house) were deliberately left as-is — clarity matters more than fun when the action is irreversible. |
| **Label/placeholder overlap fixed globally** | Done | Every `TextField` that set both `label` and `placeholder` (29+ fields across login, user/facility/guest-house/booking/report forms) rendered the floating label unshrunk over the placeholder text on first paint — MUI only shrinks the label on focus/value by default. Fixed once at the theme level: `MuiTextField` now defaults `slotProps.inputLabel.shrink = true` (`lib/theme/theme.ts`), so the label always sits on the outline notch and never collides with a placeholder, app-wide, including future forms. Also widened `SmartTable`'s MUI X DataGrid cell/header horizontal padding (`components/kiz/patterns/smart-table.tsx`) from the library's tight 10px default so table text (e.g. `urus-pengguna` Users table) isn't flush against cell edges. |
| **Bento dashboards + native mobile** | Done | New primitives: `ListGroup`/`ListRow`/`Surface` (`components/kiz/primitives/list-group.tsx`) and `Bento`/`BentoItem`/`MetricTile`/`ActionTile`/`HeroTile` (`components/kiz/patterns/bento.tsx`). Both dashboards rebuilt as 12-col bento mosaics so the fold is dense (hero + metrics side by side). `PageHeader` compacted. Every list surface (my bookings, more, helpdesk ×2, guest house ×2, approval center, parcels ×2) migrated off the duplicated inline card recipe onto `ListRow` — grouped inset cards with internal dividers, iOS Settings style. Mobile gets real native behaviour: no tap-highlight/callout, no overscroll bounce, 56px touch rows, `.scroll-x` snap rails for filter chips. |
| **Mobile sidebar + student dashboard refresh + room-pick reminders** | Done | (a) Mobile gets the full menu back: hamburger in the top bar opens `NavDrawer` (left drawer mirroring the desktop NavRail) so nothing is phone-unreachable; `lagi` menu also gained a "Choose room" entry it was missing. (b) Student dashboard is more app-like: tinted quick-action icon chips (per-item accent/success/warning/danger/info colours), "Resident" hero eyebrow chip, and an editable avatar on the right of the greeting (camera overlay → `/api/upload` → `updateAvatar` action). (c) Room selection: when the window is open, "Choose Room" shows an amber **Open** badge everywhere (rail, mobile drawer, More sheet, `lagi`) and the bottom-nav More tab gets a dot; the student dashboard shows a reminder banner ("Time to pick your room" + close deadline) only for eligible students who haven't picked yet (`getBilikReminder`). (d) eCard page lets the student change their photo in place — same `avatarUrl` drives the dashboard hero, eCard and profile. |
| **Responsive/accessibility audit** | Done | Audited every form, dialog, card, list, and input across all roles for mobile/tablet/desktop layout and large-text robustness. Fixes: facility name + block chip in the admin facility list now shrink/ellipsize properly (`flex:1; minWidth:0`); announcement bodies wrap unbroken long tokens (`overflowWrap: anywhere` on both the member feed and the admin manage list); `BottomNav` height is now `minHeight` so tab labels never clip; `StatusChip` and the global `MuiChip` small size use `minHeight` + vertical label padding so chips grow instead of clipping at large text sizes. Everything else (bento grids, `ListRow`/`Surface`, dialogs, drawer sheets, chat bubbles, `.scroll-x` rails) was verified responsive already. |
| **Hydration hardening** | Done | Eliminated every render-time SSR/CSR divergence that could throw "hydrated but attributes didn't match": the `min` date attribute on the facility/guest-house/announcement forms (was `new Date()` computed inline → now set post-mount), the announcement "New" badge + `urus-bilik` deadline flag (were `Date.now()` state initializers → now mount-guarded), the availability-calendar "today" highlight (mount-guarded), and the student-dashboard greeting (now computed server-side and passed down). Date/time and `Intl` output were verified identical between Node and Chrome; `useMediaQuery`/`useColorScheme` are hydration-safe via `useSyncExternalStore`/undefined-on-hydration. Verified by a headless-Chrome crawl across all routes in desktop + mobile viewports. |
| Auth & profile | Done | Credentials login, JWT session, role routing, profile edit. The proxy reads Auth.js v5's secure and local session-cookie names, so a successful login is recognised before role routing on both HTTPS and localhost. |
| **Demo login accounts** | Done | Login screen has one-click student, Admin KIZ, and Super Admin demo buttons. Re-running the seed resets these three accounts to the active `kiz123` password, so existing stale credentials cannot prevent testing. |
| **Student card redesign (UKM card style)** | Done | `KadMayaCard` (`components/shared/kad-maya-card.tsx`) branches by role: `ahli` (student) renders `StudentCardFace` (`components/shared/student-card-face.tsx`) — responsive width (`maxWidth` 380) with a **fixed 550px height** (no longer the 639×1125 aspect-ratio canvas): centered admin-uploaded logo only at top (no "MyKIZ" text) — logo enlarged (header 60px/logo up to 54px), centered fixed 150px student photo, name bar directly below the photo (15px gap), room number directly below the name bar (number only, no "Room:" label) — photo/name/room grouped as one tight info block (logo row → photo is 35px). QR is rendered **inside** the student card, just below the room number, at a compact 90×90px; the standalone below-card QR section was removed. Same static QR from matric ID as before (data URL generated server-side on `/[role]/kad-maya` and passed into the card). Admin settings (`urus-tetapan` → "Student Card Design") has: background upload (PNG/JPG, max 4MB, guidance text "639px × 1125px", stored via `AppSetting` keys `student_card_bg`), name-bar colour picker with an optional second colour + gradient toggle (`student_card_color`/`student_card_color_end`, `lib/settings.ts`), and a live preview using the real `StudentCardFace` component. |
| Kad Maya | Done | Static QR from matric ID. |
| Guest house booking | Done | Booking, approval, check-in/out, manual payment flag. |
| Helpdesk | Done | Tickets, chat thread, assign, close, out-of-hours auto-reply. |
| Facility booking | Done | Availability calendar, approval, PDF slip with `KIZ-BKG-NNNN` ref. |
| Announcements | Done | Tags, pinning, scheduling, expiry, attachments, "New" badge. |
| Community chat | Done | Single room, 3s polling, admin soft-delete. |
| Lost & Found | Done | Report with photo, status lost/found/claimed. |
| **Accommodation Applications** | Done | `bilik` is now a privacy-safe student application flow, not a room picker. Eligible students choose single (admin review), double (same-gender roommate by matric ID), or flexible placement. Only the requested roommate sees race/religion and must explicitly make the pair final; no student sees blocks, floors, rooms, beds, or names during application. No application remains KIV for admin allocation. Physical `Residence*`/`Bed` inventory is retained for final admin allocation after the window. `RoomApplication` records preference and request status; `Bed.occupantId` remains the final allocation source of truth. Admin Students now exposes gender, race, religion, nationality, faculty, merit, flags, application status, and roommate pairing to support allocation. |
| **Role differentiation (admin vs student)** | Done | (a) **"Choose Room" is student-only** — removed from the sidebar/drawer/⌘K/mobile menu for `superadmin`/`admin_kiz`/`pengetua` (`navForRole` filters by `item.roles`; the `lagi` page builds its menu per role). `bilik` page + its actions are `ahli`-gated (non-students are redirected to their own dashboard). Admins manage rooms via `urus-bilik` instead. (b) **Guest house management** — new `GuestHouse` model (name, description, images, price, capacity, max stay, requires-approval). The admin `urus-rumah-tamu` page gained a **Bookings / Guest Houses** tab (searchParams-driven): add/edit/soft-delete guest houses; deleting is refused while a guest house still has active bookings. The member `rumah-tamu` flow now picks a guest house first (per-house availability calendar, `maxDays` and per-house clash checks in `createGHBooking`, guest-house name shown on admin rows and "My Bookings"). (c) **`[role]` segment enforced for every child route** (new `(dashboard)/[role]/layout.tsx` redirects to the session's own segment) — closes old issue #6. (d) **`pengetua` occupancy crash fixed** — occupancy summary extracted to a read-only `lib/bilik.ts` helper; the gated action wraps it, the page uses it directly for `pengetua`. |
| Parcel tracker | Hidden | Module removed from all navigation & shortcuts (nav, quick actions, admin dashboard, `lagi` menu). Route files `/parcel` & `/urus-parcel` kept in place but unreachable via UI. |
| App settings | Done | Logo upload/remove by superadmin/admin_kiz. |
| **Administrative Offices module** | Done | New `Office` model + `/pejabat` (all roles) and `/urus-pejabat` (admin). Student page shows an **interactive block panorama** — one wide shot covering both offices, **drag-to-pan** left/right via framer-motion `drag="x"` (no 360 lib), with two labels glued to the image at admin-configurable % positions (left = Pejabat Pentadbiran KIZ, right = Pejabat UKM Real Estate) that pan with the building. Below: two office cards (featured photo, function) opening a photo dialog with clickable gallery thumbnails. Admin `urus-pejabat` edits office name/function + uploads featured/gallery, and edits the panorama (uploads image + two X-position sliders). Uploads go through **validated server actions** (`lib/offices.ts`, MIME allowlist + 12 MB cap, `public/uploads/pejabat/`) — deliberately NOT the unvalidated `/api/upload` (issue #5). Labels derive from `Office.name` (single source of truth). Note: local-FS storage caveat (#8) applies. |
| **User management** | Done | New `/urus-pengguna` admin module (superadmin + admin_kiz). Full CRUD on all accounts: add (with password), edit (name/email/phone/role; matric ID immutable), soft-delete (blocks login, keeps history), and **reset password** (generate/copy or type a new one). Guards: only Super Admin can manage/create/delete/demote Super Admin accounts; can't delete yourself; can't delete or demote the last Super Admin. Re-adding a soft-deleted matric ID restores the account. Login already rejects `deletedAt` users. Roles rendered via `StatusChip` (role tones/labels added to `lib/theme/status.ts`). |
| **Live deployment** | Done | Running on the VPS behind CyberPanel/OpenLiteSpeed at `mykiz.my` (single VPS, PostgreSQL 16, `mykiznext` systemd service on `127.0.0.1:3010`). Deploy = `./deploy.sh` (lint → auto-commit → push to `main`) → GitHub Action → `scripts/remote-deploy.sh` on the server (pull, npm ci, prisma db push, build, restart). `.env` + uploads stay server-side only — the GitHub repo is public. Note: the server `.env` must set `AUTH_URL=https://mykiz.my` — Next/Auth.js otherwise builds redirect URLs from the backend origin (`localhost:3010`) instead of the public host. |
| Dark mode | Done | Dual color schemes via MUI CSS variables; toggle in the top bar; follows system by default. |
| UI language | Done | Interface is English. URL slugs kept Malaysian (`pengumuman`, `tempahan`, etc.) by design; not converted to avoid breaking links. Seed `umum/penting/aktiviti` tags changed to English form values (`general`/`important`/`event`); dates localized to `en-MY`. |

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

### #1b — ~~`/ahli/bilik` locks page scroll after selecting a room~~ FIXED

On desktop the mobile bottom-sheet `Drawer` in `room-picker.tsx` was always mounted
with `open={Boolean(openRoom)}`, hidden only via `sx display:{md:none}`. MUI's
`ModalManager` sets `body.style.overflow = 'hidden'` whenever a modal is open —
regardless of CSS visibility — so clicking any room card (which drives the desktop
side panel) invisibly locked body scroll and the page couldn't scroll. Fixed by
gating the drawer on `useMediaQuery(theme.breakpoints.down('md'))`; on desktop it
never opens, on mobile it opens/closes normally and releases the lock.

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

### #6 — ~~Child routes don't re-check the `[role]` segment~~ FIXED

`[role]/page.tsx` verifies that the URL role matches the session role, but nested
routes did not. Added `(dashboard)/[role]/layout.tsx` which validates the `[role]`
segment for every child route and redirects to the session's own segment, so a
student loading `/admin_kiz/...` is bounced to `/ahli/...` immediately.

### #7 — RBAC is applied inconsistently (medium)

`AGENTS.md` says use `requireRole()`. In practice most `actions.ts` files do inline
`session.user.role` checks, and `urus-tetapan` does its own check plus a redirect
instead of using the helper. Same outcome today, but each inline copy is a place to
forget a role.

### #8 — Local filesystem storage won't survive deployment (blocker for launch)

All uploads (facility images, announcement attachments, lost & found photos,
booking PDFs, app logo) are written to `public/uploads/`. On a stateless host such
as Vercel these vanish on every deploy and are not shared between instances.

*Status:* partially resolved for the single-VPS deploy — the app now lives in
`/home/mykiz.my/kiznext` on a persistent volume, so uploads survive deploys.
Still not shared across instances; revisit object storage only if we ever scale
out.

### #9 — Room selection: CSV-only import, no block editor for single-room work (low)

The `urus-bilik` Building tab now has a full block/floor/room editor: add a block
(name, gender, floors, sort order), add a single room (block, floor, number,
single/double), bulk-generate a floor, rename a block (dialog), and soft-delete
blocks/rooms (refuses when a room still has an occupant). Import is still
**CSV only** by design (no `.xlsx` — no spreadsheet lib in the stack); admins
export the eKolej sheet to CSV first. `nationality` is defaulted to `Malaysia`
because the eKolej column list has no nationality field. The campus map zones in
the student picker are still a code-defined percentage layout — a new block
won't appear on the map image until its zone is added (the map is a fallback;
the grid picker picks it up automatically).

### #10 — Kad Maya QR is static and unsigned (low)

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
| Hosting | Live on VPS behind CyberPanel/OpenLiteSpeed (`mykiz.my`) — deploy via GitHub Actions. Run `./deploy.sh` locally: lint → auto-commit → push → action SSHes in, `scripts/remote-deploy.sh` pulls + rebuilds + restarts `mykiznext` systemd service. PostgreSQL 16 on the same VPS. `.env`/uploads live only on the server (repo is public). |
