# SPEC.md — KIZ Super App

Product scope, data model, and route map. For build status and known issues see
`STATUS.md`. For coding rules see `../AGENTS.md`.

---

## 1. Purpose

A single app for residents of Kolej Ibu Zain (KIZ), UKM, replacing the mix of
WhatsApp groups, paper forms, and notice boards used for college admin.

Primary users: students (`ahli`) and college admins (`admin_kiz`).

---

## 2. Modules

| Module | What it does |
|---|---|
| Auth & Profile | Login with matric ID + password. Role-based dashboard. Editable profile. |
| Kad Maya | Digital resident card with a QR code, for identification at the gate/office. |
| Facility Booking | Browse college facilities, view availability, book a time slot, admin approves. Approved bookings get a PDF slip. |
| Guest House Booking | Admins configure the guest houses (name, description, photos, price, capacity, max stay). Students pick a guest house and book it daily/weekly/monthly; admin approves, then check-in/check-out. Payment marked manually. |
| Helpdesk | Per-student support tickets with a chat thread. Auto-reply outside office hours. |
| Announcements | Admin-posted feed. Tags, pinning, scheduling, expiry, file attachments. |
| Community Chat | One shared room for all residents. Admins can soft-delete messages. |
| Parcel Tracker | Admin registers an arriving parcel against a matric ID; student sees it and it is marked collected on pickup. |
| Lost & Found | Community-reported lost/found items with a photo. |
| Accommodation Applications | Accepted students (imported from eKolej via CSV) request a single room, a same-gender double-room roommate by matric ID, or flexible placement during an admin-defined window. Students never choose or see physical rooms; admins allocate final rooms after review. See `ROOM-SELECTION.md`. |
| Directory | Block and facility listing with navigation notes. |
| App Settings | Superadmin uploads the app logo shown in the shell. |

### Explicitly out of scope

- Payment gateway (Stripe / ToyyibPay / e-wallet). `paymentStatus` is a manual flag.
- Smart lock / IoT door access.
- Marketplace / buy-and-sell.

---

## 3. Roles & access

Enum `Role`: `superadmin`, `admin_kiz`, `pengetua`, `ahli`, `staf`.

| Capability | superadmin | admin_kiz | pengetua | ahli | staf |
|---|---|---|---|---|---|
| Own profile, Kad Maya, directory | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit bookings / tickets / reports | ✓ | ✓ | ✓ | ✓ | ✓ |
| Read announcements & community chat | ✓ | ✓ | ✓ | ✓ | ✓ |
| Approve bookings (facility + guest house) | ✓ | ✓ | — | — | — |
| Answer & close helpdesk tickets | ✓ | ✓ | — | — | — |
| Post / edit announcements | ✓ | ✓ | — | — | — |
| Soft-delete chat messages | ✓ | ✓ | — | — | — |
| Manage facilities, parcels | ✓ | ✓ | — | — | — |
| App settings (logo) | ✓ | ✓ | — | — | — |
| View-only reporting | ✓ | ✓ | ✓ | — | — |
| Submit an accommodation application (`bilik`) | — | — | — | ✓ | — |
| Configure guest houses | ✓ | ✓ | — | — | — |

`pengetua` (principal) is read-only by design — no approval rights.

`staf` (staff) is a self-registered UKM staff account (`@ukm.edu.my`). Member
experience is identical to `ahli` (resident home, bookings, helpdesk, chat,
eCard) **except** `bilik` (accommodation application is student-only) and with no
access to any `urus-*` route — until a superadmin promotes them to `admin_kiz`
or `superadmin` via user management. The role carries a visible "Staff" tag.

`admin_ukmre` (external guest-house operator) is post-MVP: add the enum value and
route guest-house approvals to it. No schema restructure needed.

### Registration & verification

Students and staff register themselves (`/daftar`) and must confirm their email
through a Resend link before their first sign-in. The email domain selects the
role — `@siswa.ukm.edu.my` → `ahli`, `@ukm.edu.my` → `staf`. Accounts created by
an admin (or the seed) default to `active` and skip email verification.

The identity anchor is the matric ID, **not** the email: the eKolej KIZ intake
CSV has no email column, so a student is matched to the official list by matric.
The state machine is `AccountStatus`: `unverified` (link not clicked; login
blocked) → `pending` (email verified but matric not yet on an active intake;
login allowed but the app shows a status wall) → `active`. Unlock happens
automatically when the office uploads + activates an intake containing the
matric (`reconcileIntakeStudents`, called on intake activation and at login),
or manually via user management (`urus-pengguna`).

**Enforcement.** `requireRole(role, [...])` from `lib/rbac.ts` throws on failure.
Every page also calls `await auth()` and redirects to `/login` when there is no
session. See `STATUS.md` for gaps in this.

---

## 4. Data model

Postgres via Prisma 7. Generated client lives in `app/generated/prisma`
(gitignored). Every model carries `id` (uuid), `createdAt`, `updatedAt`, and
`deletedAt` for soft delete — except `AppSetting`, which is a known deviation.

### Enums

| Enum | Values |
|---|---|
| `Role` | superadmin, admin_kiz, pengetua, ahli, staf |
| `AccountStatus` | unverified, pending, active |
| `BookingStatus` | pending, approved, rejected, cancelled |
| `GuestHouseBookingStatus` | pending, approved, rejected, checked_in, checked_out, cancelled |
| `PeriodType` | daily, weekly, monthly |
| `PaymentStatus` | unpaid, paid_manual |
| `HelpdeskStatus` | open, in_progress, closed |
| `LostFoundStatus` | lost, found, claimed |

### Models

| Model | Table | Notable fields |
|---|---|---|
| `User` | users | `matricId` unique (login ID), `email` unique, `emailVerifiedAt`, `accountStatus` (enum), `passwordHash`, `role`, `block`, `roomNumber`, `residentCardQr`, `phone`, `avatarUrl` |
| `Block` | blocks | `name` unique, `description`, `navigationNotes` |
| `GuestHouse` | guest_houses | `name` unique, `description`, `featuredImage`, `gallery` (String[]), `price`, `capacity`, `maxDays`, `requiresApproval` |
| `Facility` | facilities | `blockId`, `featuredImage`, `gallery` (String[]), `price`, `capacity`, `timeSlotDuration`, `maxPerDay` (default 3), `requiresApproval` |
| `FacilityBooking` | facility_bookings | `timeSlotStart/End`, `purpose`, `status`, `approvedById`, `bookingRef` unique, `pdfUrl`, `adminNotes` |
| `GuestHouseBooking` | guest_house_bookings | `guestHouseId`, `guestName`, `periodType`, `startDate`/`endDate` (`@db.Date`), `status`, `approvedById`, `paymentStatus` |
| `HelpdeskTicket` | helpdesk_tickets | `displayId` (autoincrement, human-friendly), `subject`, `status`, `assignedTo` |
| `HelpdeskMessage` | helpdesk_messages | `ticketId`, `senderId`, `message`, `isAutoReply` |
| `Announcement` | announcements | `title`, `content`, `tag` (default `umum`), `attachmentUrl/Type`, `isPinned`, `scheduledAt`, `expiresAt`, `postedBy` |
| `CommunityChatMessage` | community_chat_messages | `userId`, `message`, `deletedBy` (admin who removed it) |
| `Parcel` | parcels | `userId`, `description`, `status` (plain String: `arrived`/`collected`), `notifiedAt`, `collectedAt` |
| `LostFoundItem` | lost_found_items | `reportedBy`, `itemName`, `photoUrl`, `status`, `locationFound` |
| `AppSetting` | app_settings | `key` unique / `value`. Only key in use: `app_logo`. No `createdAt`/`deletedAt`. |
| `VerificationToken` | verification_tokens | single-use email-verify links. `userId`, `tokenHash` unique (SHA-256 of the raw token — never stored), `expiresAt`, `usedAt`. Soft-deleted when consumed. |
| `ResidenceBlock` | residence_blocks | `name` unique, `gender`, `floors`, `sortOrder`. Physical residential block, gender-restricted. Distinct from `Block` (facility grouping). |
| `ResidenceRoom` | residence_rooms | `blockId`, `floor`, `number` (`@@unique([blockId, number])`), `type` (single/double), `status` (available/maintenance/closed). |
| `Bed` | beds | `roomId`, `position` (single/left/right), `occupantId` unique → `EligibleStudent`. `@@unique([roomId, position])`. Single room = 1 bed, double = 2. |
| `SelectionWindow` | selection_windows | `name`, `opensAt`, `closesAt`, `closingSoonHours`, `isActive`. One active at a time. |
| `Intake` | intakes | one CSV import batch. `name`, `status` (draft/imported/active/archived), `importedById`, `rowCount`. One `active` intake = the current accepted list. |
| `EligibleStudent` | eligible_students | a row from the eKolej accepted list. `matricId`, `name`, `gender`, `religion`, `race`, `nationality`, B40/OKU/Uniform flags, `merit`, `userId` (linked on first login), `selectedAt`, `assignedByAdmin`. `@@unique([intakeId, matricId])`. |
| `RoomApplication` | room_applications | one soft-deletable preference per applicant: `type` (single/double/flexible), status, optional same-gender roommate, submission and response times. This does not allocate a physical bed. |

New enums: `Gender` (male/female), `RoomType` (single/double), `RoomApplicationType`
(single/double/flexible), `RoomApplicationStatus`, `RoomStatus`
(available/maintenance/closed), `BedPosition` (single/left/right), `IntakeStatus`
(draft/imported/active/archived).

Not implemented (post-MVP candidates): `audit_logs`, `notifications`.

---

## 5. Route map

All app routes live under `app/(dashboard)/[role]/`. The `[role]` segment matches
the session role — `/dashboard` redirects to `/{role}`. Admin routes use the
`urus-` prefix ("manage" in Malay).

### Public routes (outside the dashboard shell)

| Route | Feature |
|---|---|
| `/login` | Credentials sign-in. |
| `/daftar` | Self-service registration. Email domain picks the role (`@siswa.ukm.edu.my` → student, `@ukm.edu.my` → staff); sends a Resend verification link. |
| `/sahkan` | Email-verification landing. Consumes the token, marks the account, matches against the active intake (see §3). |

### Member routes

| Route | Feature |
|---|---|
| `/` | Dashboard. `ahli`/`staf` render the member home (`ahli-home`, hero tag Resident/Staff); everyone else `admin-home` (pending-count cards). |
| `pengumuman` | Announcement feed — tag filter, pinned first, "Baru" badge for 24h. |
| `chat` | Community chat, one shared room, polls every 3s. |
| `tempahan-fasiliti` | Facility booking — list, availability calendar, booking form. |
| `rumah-tamu` | Guest house booking + own bookings + cancel. |
| `helpdesk`, `helpdesk/[ticketId]` | Ticket list, new ticket, chat thread. |
| `hilang` | Lost & Found report form + list. |
| `bilik` | Room selection — eligibility gate, window status, visual block/floor/room/bed picker. Desktop grid + detail panel; mobile bottom-sheet + sticky confirm bar. |
| `parcel` | My parcels. Currently behind a hardcoded "coming soon" banner. |
| `kad-maya` | Digital resident card, QR generated server-side from matric ID. |
| `direktori` | Blocks & facilities with navigation notes. |
| `profile` | View / edit own profile. |
| `lagi` | "More" menu for the mobile shell. |
| `tempahan`, `tempahan/[facilityId]` | **Legacy** facility booking. Superseded — see `STATUS.md`. |

### Admin routes (`urus-` prefix)

| Route | Feature |
|---|---|
| `urus-pengumuman` | Announcement CRUD + soft delete. |
| `urus-tempahan-fasiliti` | Approve / reject / cancel facility bookings, PDF link. |
| `urus-rumah-tamu` | Approve / reject / check-in / check-out / mark paid, plus a **Bookings / Guest Houses** tab (add / edit / soft-delete the guest houses students book via `?tab=guest-houses`). |
| `urus-helpdesk`, `urus-helpdesk/[ticketId]` | Ticket queue, reply, assign, close. |
| `urus-fasiliti` | Facility CRUD. |
| `urus-parcel` | Register arrived parcel by matric ID, mark collected. |
| `urus-bilik` | Room selection admin — 5 tabs: CSV intake import + preview, selection window, building (blocks/floors/rooms/maintenance), live occupancy monitor, students (selected/not, manual post-deadline assign). `pengetua` sees the occupancy tab read-only. |
| `urus-tetapan` | App settings — upload / remove logo. |
| `urus-tempahan` | **Legacy** booking approvals. Superseded. |

### Layout

`(dashboard)/layout.tsx` picks the shell by role: `ahli` gets the mobile shell
(`MobileTopBar` + `MobileBottomNav`), everyone else gets the desktop sidebar
(`DashboardNav`).

---

## 6. Engineering notes

- **Auth.** Credentials provider, `matricId` + bcrypt. Users with `deletedAt` set
  are rejected at sign-in. JWT strategy; `id`, `role`, `matricId`, and
  `accountStatus` are injected into the token and session in `lib/auth.ts`.
  Self-service accounts (`/daftar`) must click a Resend verification link
  (`/sahkan`) before first sign-in; unverified logins throw a dedicated error
  code (`EMAIL_NOT_VERIFIED`) surfaced by the login form with a resend action.
  Matching against the KIZ intake happens in `lib/registration.ts` — the intake
  list has no email column, so matric ID is the join key. Dev fallback: without
  `RESEND_API_KEY` the verification link is logged to the server console.
- **Timezone.** Everything renders in `Asia/Kuala_Lumpur` via `lib/timezone.ts`
  (`nowMalaysia()`, `formatMalaysia()`). Never show raw UTC.
- **Office hours.** Mon–Fri, 08:00–17:00 (`lib/office-hours.ts`). A helpdesk
  message sent outside those hours triggers an auto-reply row with
  `isAutoReply = true`.
- **Booking PDF.** On facility booking, `lib/pdf.ts` builds an A4 slip with
  `pdf-lib` into `public/uploads/pdfs/`. Reference format `KIZ-BKG-0001`, derived
  from the row count.
- **QR.** `kad-maya-card.tsx` renders a static QR encoding the matric ID. Not
  rotating/signed — anyone can reproduce it from a known matric ID.
- **Uploads.** `POST /api/upload` writes to `public/uploads/fasiliti/`.
  `lib/settings.ts` handles logo uploads with a 2 MB cap and a MIME allowlist
  (png/jpeg/webp/svg). The generic route has neither.
- **Chat realtime.** Client polls a Server Action every 3s. No WebSocket layer.
- **Seed.** `npm run seed` creates sample users, blocks, facilities, bookings, and
  announcements. Login IDs are in `prisma/seed.ts`.
