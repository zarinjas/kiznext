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
| Laundry | Reminder-based machine status. No laundry-machine API exists, so each machine's live status is inferred from the reminders residents set: **No Active Reminder** → **Active Reminder** (timer running) → **Timer Ended** (finished, inside a grace window) or **Out of Service** (admin closed it). Students pick a machine, set a cycle duration (30/45/60/custom), and get a running timer; a newer reminder replaces the running one. Admins manage the machine list, mark a machine out of service, and clear stuck reminders. |
| Guest House Booking | Admins configure the guest houses (name, description, photos, price, capacity, max stay). Students pick a guest house and book it daily/weekly/monthly; admin approves, then check-in/check-out. Payment marked manually. |
| Helpdesk | Per-student support threads with two channels: **Live Chat** (quick questions, no form) and **Support Ticket** (structured, tracked requests/applications, e.g. room change). Admin inbox splits the two; chat thread, assign, close, and out-of-hours auto-reply are shared. |
| KIZ-AI Concierge | A Gemini/Ollama-powered robot (`KIZ-AI`, admin-uploaded mascot with **3 emotions × 3 animated frames** — idle/thinking/happy — plus a name) that answers resident questions from the app's own content via retrieval-augmented generation (announcements, facilities, offices, guest houses, events, contacts, and an **admin-curated FAQ knowledge base**). Chat and embeddings can use different providers, and retrieval falls back to keyword search. Replies cite their sources and follow the asker's language. When it can't answer, it offers a one-tap handoff to the KIZ office, creating a pre-filled helpdesk request. Every unanswered question is logged so staff can turn it into a FAQ — the feedback loop that keeps improving answers. |
| Announcements | Admin-posted feed. Tags, pinning, scheduling, expiry, file attachments. |
| Digital Guide | Admin-uploaded PDF library (orientation, rules, programme handbooks) that every role reads in-app as a flipbook or downloads. Per-user read state drives a "New" badge. |
| Community Chat | One shared room for all residents, staff & fellows. Reactions, replies, reports to the KIZ team, presence (members/online), image & PDF attachments, and a community info rail (guidelines, team, Helpdesk route). |
| Parcel Tracker | Admin registers an arriving parcel against a matric ID; student sees it and it is marked collected on pickup. |
| Lost & Found | Community-reported lost/found items with a photo. |
| Accommodation Applications | Accepted students (imported from eKolej via CSV) request a single room, a same-gender double-room roommate by matric ID, or flexible placement during an admin-defined window. Students never choose or see physical rooms; admins allocate final rooms after review. See `ROOM-SELECTION.md`. |
| Directory | AR Directory — pick a destination and a camera-compass arrow + live distance guide you to it (outdoor GPS/compass; indoor rooms are pinned by lat/lng inside the single-floor admin building). Admin manages the destination pins. |
| Smart Ordering (KIZ Cafe) | The campus cafe has no app of its own. The cafe uploads a photo of its menu; **KIZ-AI's vision model reads it into orderable items** (the admin reviews + publishes them, or adds items by hand). Students build a cart and hand the order off to **WhatsApp** — a `wa.me` deep link pre-filled with an itemised receipt and a `#KIZ-CAFE-NNNN` pickup reference, so the cafe receives a normal WhatsApp message and there is no payment gateway (paid at pickup). Orders are stored for history + one-tap reorder, and a highlight card promotes the feature on the member dashboard. **Opening hours are a per-weekday schedule** (open/close per day, any day marked closed) plus a **closed-dates list for holidays**, so the cafe can open mornings or evenings and shut for cuti — a master "accepting orders" switch pauses everything. A dedicated **`kafe` role** lets the operator manage the cafe and view its orders and nothing else. |
| App Settings | Superadmin uploads the app logo shown in the shell. |
| Invitations | Superadmin invites people (student or admin) to self-register by email — one at a time or in bulk. An invited student whose matric is already on the active intake is marked a resident and activated on registration; admin invitations never need an intake match. |

### Explicitly out of scope

- Payment gateway (Stripe / ToyyibPay / e-wallet). `paymentStatus` is a manual flag.
- Smart lock / IoT door access.
- Marketplace / buy-and-sell.

---

## 3. Roles & access

Enum `Role`: `superadmin`, `admin_kiz`, `pengetua`, `fellow`, `ahli`, `staf`, `kafe`.

| Capability | superadmin | admin_kiz | pengetua | fellow | ahli | staf | kafe |
|---|---|---|---|---|---|---|---|
| Own profile, Kad Maya, directory | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | profile |
| Submit bookings / tickets / reports | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Read announcements & community chat | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Approve bookings (facility + guest house) | ✓ | ✓ | ✓ | — | — | — | — |
| Answer & close helpdesk tickets (`urus-helpdesk`) | ✓ | ✓ | ✓ | ✓ | — | ✓ | — |
| Manage accommodation (`urus-bilik`) & check-in/out (`urus-checkin`) | ✓ | ✓ | ✓ | — | — | ✓ | — |
| Manage guest house (`urus-rumah-tamu`) | ✓ | ✓ | ✓ | — | — | — | — |
| Post / edit announcements | ✓ | ✓ | ✓ | — | — | — | — |
| Manage digital guides (`urus-panduan`) | ✓ | ✓ | ✓ | — | — | — | — |
| Soft-delete chat messages / review reports | ✓ | ✓ | ✓ | — | — | — | — |
| Manage facilities, parcels | ✓ | ✓ | ✓ | — | — | — | — |
| Manage KIZ Cafe (`urus-kafe`) | ✓ | ✓ | ✓ | — | — | — | ✓ |
| Order from KIZ Cafe (`kafe`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| App settings (logo) | ✓ | ✓ | ✓ | — | — | — | — |
| View-only reporting | ✓ | ✓ | ✓ | — | — | — | — |
| Submit an accommodation application (`bilik`) | — | — | — | — | ✓ | — | — |
| Set a laundry reminder (`laundry`) | — | — | — | — | ✓ | — | — |
| Manage laundry machines (`urus-laundry`) | ✓ | ✓ | ✓ | — | — | — | — |

`pengetua` (principal) has full admin access — the same `urus-*` surfaces as
`superadmin`/`admin_kiz` (approvals, announcements, helpdesk, accommodation,
guest house, laundry, reports, content, users, settings, AI). The only
superadmin-only surface is `urus-jemputan` (issuing admin invitations), and only
a `superadmin` may edit or demote another `superadmin` account.

`fellow` (residential college fellow) is a member role — resident-style home with
a visible "Fellow" tag, community chat/bookings/eCard — **except** `bilik`
(student-only). Fellows also sit on the **support desk**: they reach the helpdesk
admin inbox (`urus-helpdesk`) and can reply to and close tickets. They have no
other `urus-*` access. Fellows are created by an admin via user management
(`urus-pengguna`); they never self-register.

`staf` (staff) is a self-registered UKM staff account (`@ukm.edu.my`). Member
experience is identical to `fellow` (resident home, bookings, chat, eCard)
**except** `bilik` (accommodation application is student-only). Staff also run the
office day-to-day: they get the **helpdesk admin inbox** (`urus-helpdesk`,
reply/close), full **accommodation** (`urus-bilik`) and **check-in/out**
(`urus-checkin`) management. They have no access to the other `urus-*` modules
(announcements, facilities, users, settings, AI). The role carries a visible
"Staff" tag. A superadmin can still promote a staff account to `admin_kiz` or
`superadmin` via user management for full access.

`admin_ukmre` (external guest-house operator) is post-MVP: add the enum value and
route guest-house approvals to it. No schema restructure needed.

`kafe` (cafe operator) is a single-purpose account for the campus cafe. It reaches
**only** `urus-kafe` (cafe settings + menu + orders) plus its own profile / Digital
Resident ID — every other route is blocked in `proxy.ts`, and `navForRole` returns
a bespoke one-item menu. It is created by an admin via user management
(`urus-pengguna`); it never self-registers. `CAFE_MANAGE_ROLES` (in `lib/rbac.ts`)
is `superadmin` / `admin_kiz` / `kafe`.

### Registration & verification

Students and staff register themselves (`/daftar`) and must confirm their email
through a Resend link before their first sign-in. The email domain selects the
role — `@siswa.ukm.edu.my` → `ahli`, `@ukm.edu.my` → `staf`. Accounts created by
an admin (or the seed) default to `active` and skip email verification.

A superadmin can also **invite** people (`/urus-jemputan`): the invitation email
links to `/daftar?invite=<token>`, where the email and role are fixed by the
invitation (so the UKM-domain check is bypassed and admin staff may use any
address). An invited student whose matric matches the active intake is flagged
**resident** and becomes active + linked on email verification.

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
| `Role` | superadmin, admin_kiz, pengetua, fellow, ahli, staf |
| `AccountStatus` | unverified, pending, active |
| `BookingStatus` | pending, approved, rejected, cancelled |
| `GuestHouseBookingStatus` | pending, approved, rejected, checked_in, checked_out, cancelled |
| `PeriodType` | daily, weekly, monthly |
| `PaymentStatus` | unpaid, paid_manual |
| `HelpdeskCategory` | accommodation_room, room_change, maintenance_repair, facilities_booking, cleanliness_waste, internet_technology, safety_security, payment_charges, student_welfare, general_enquiry |
| `HelpdeskStatus` | submitted, under_review, in_progress, more_info_required, resolved, closed |
| `HelpdeskChannel` | live, ticket |
| `LostFoundStatus` | lost, found, claimed |
| `GuideCategory` | orientation, rules, program, other |
| `LaundryMachineStatus` | available, out_of_service |
| `LaundryReminderEndReason` | cancelled, superseded, cleared |

### Models

| Model | Table | Notable fields |
|---|---|---|
| `User` | users | `matricId` unique (login ID), `email` unique, `emailVerifiedAt`, `accountStatus` (enum), `passwordHash`, `role`, `block`, `roomNumber`, `residentCardQr`, `phone`, `avatarUrl` |
| `Block` | blocks | `name` unique, `description`, `navigationNotes` |
| `Destination` | destinations | AR Directory pin — `name`, `type` (enum), `latitude`/`longitude`, `indoor` (bool, for rooms in the single-floor admin building), `building`, `verified` (bool, default false — has this pin's lat/lng been confirmed against a real device or Google Maps), `sortOrder`. Admin CRUD at `urus-direktori`. |
| `Office` | offices | `name`, `description`, `featuredImage`, `gallery`, `sortOrder` |
| `GuestHouse` | guest_houses | `name` unique, `description`, `featuredImage`, `gallery` (String[]), `price`, `capacity`, `maxDays`, `requiresApproval` |
| `Facility` | facilities | `blockId`, `featuredImage`, `gallery` (String[]), `price`, `capacity`, `timeSlotDuration`, `maxPerDay` (default 3), `requiresApproval` |
| `FacilityBooking` | facility_bookings | `timeSlotStart/End`, `purpose`, `status`, `approvedById`, `bookingRef` unique, `pdfUrl`, `adminNotes` |
| `GuestHouseBooking` | guest_house_bookings | `guestHouseId`, `guestName`, `periodType`, `startDate`/`endDate` (`@db.Date`), `status`, `approvedById`, `paymentStatus` |
| `HelpdeskTicket` | helpdesk_tickets | `displayId` (autoincrement, human-friendly), `subject`, `category` (enum, default general_enquiry), `channel` (`live`/`ticket`), `origin` (`web`/`concierge`), `status`, `locationBlock` (e.g. K18A), `locationDetail` (room number or facility), `assignedTo` |
| `HelpdeskMessage` | helpdesk_messages | `ticketId`, `senderId`, `message`, `isAutoReply` |
| `Announcement` | announcements | `title`, `content`, `tag` (default `umum`), `attachmentUrl/Type`, `isPinned`, `scheduledAt`, `expiresAt`, `postedBy` |
| `Guide` | guides | Digital Guide PDF — `title`, `description`, `category` (enum), `fileUrl`, `fileSize`, `coverImage`, `pageCount`, `published`, `isPinned`, `sortOrder`, `uploadedById`. Admin CRUD at `urus-panduan`; read by all roles at `panduan`. |
| `GuideRead` | guide_reads | Per-user "opened this guide" marker (`@@unique([guideId, userId])`) — drives the library's New badge. |
| `CommunityChatMessage` | community_chat_messages | `userId`, `message`, `replyToId` (inline quote thread), `attachmentUrl/Type/Name`, `deletedBy` (admin who removed it) |
| `ChatMessageReaction` | chat_message_reactions | `userId`, `messageId`, `emoji` — unique (user×message×emoji), soft delete |
| `ChatMessageReport` | chat_message_reports | `messageId`, `reporterId`, `reason` (preset), `note`, soft delete; admins delete the message / dismiss |
| `User` | users | + `lastSeenAt` — presence heartbeat for the community-chat online count |
| `Parcel` | parcels | `userId`, `description`, `status` (plain String: `arrived`/`collected`), `notifiedAt`, `collectedAt` |
| `LostFoundItem` | lost_found_items | `reportedBy`, `itemName`, `photoUrl`, `status`, `locationFound` |
| `LaundryMachine` | laundry_machines | `name`, `location` (free text), `imageUrl`, `status` (enum `available`/`out_of_service`), `sortOrder`. Admin CRUD at `urus-laundry`. A shared fallback photo lives in `AppSetting` `laundry_default_image` (uploaded at `urus-laundry`; square 800×800 px recommended). |
| `LaundryReminder` | laundry_reminders | `machineId`, `userId`, `durationMinutes`, `startedAt`/`endsAt` (KL), `endedAt`/`endedReason` (null while running). The latest non-ended reminder drives a machine's derived state (see `lib/laundry-meta.ts`). |
| `AppSetting` | app_settings | `key` unique / `value`. Only key in use: `app_logo`. No `createdAt`/`deletedAt`. |
| `VerificationToken` | verification_tokens | single-use email-verify links. `userId`, `tokenHash` unique (SHA-256 of the raw token — never stored), `expiresAt`, `usedAt`. Soft-deleted when consumed. |
| `Invitation` | invitations | superadmin-issued self-registration invite. `email`, `role` (ahli/admin_kiz), optional `matricId`/`name`, `tokenHash` unique (SHA-256, 14-day expiry), `resident` (matric matched the active intake), `acceptedAt`/`acceptedById`, `revokedAt`, `lastSentAt`, `sentCount`, `invitedById`. |
| `ResidenceBlock` | residence_blocks | `name` unique, `gender`, `floors`, `sortOrder`. Physical residential block, gender-restricted. Distinct from `Block` (facility grouping). |
| `ResidenceRoom` | residence_rooms | `blockId`, `floor`, `number` (`@@unique([blockId, number])`), `type` (single/double), `status` (available/maintenance/closed). |
| `Bed` | beds | `roomId`, `position` (single/left/right), `occupantId` unique → `EligibleStudent`. `@@unique([roomId, position])`. Single room = 1 bed, double = 2. |
| `SelectionWindow` | selection_windows | `name`, `opensAt`, `closesAt`, `closingSoonHours`, `isActive`. One active at a time. |
| `Intake` | intakes | one CSV import batch. `name`, `status` (draft/imported/active/archived), `importedById`, `rowCount`. One `active` intake = the current accepted list. |
| `EligibleStudent` | eligible_students | a row from the eKolej accepted list. `matricId`, `name`, `gender`, `religion`, `race`, `nationality`, B40/OKU/Uniform flags, `merit`, `userId` (linked on first login), `selectedAt`, `assignedByAdmin`. `@@unique([intakeId, matricId])`. |
| `RoomApplication` | room_applications | one soft-deletable preference per applicant: `type` (single/double/flexible), status, optional same-gender roommate, submission and response times. This does not allocate a physical bed. |
| `AiKnowledge` | ai_knowledge | KIZ-AI retrieval index over app content. `sourceType` (announcement/facility/office/content/guesthouse/event/faq), `sourceId`, `title`, `content`, `embedding` (JSON `number[]`), `hash` (sha256, skip-unchanged), `href` (citation route suffix). Rebuilt by an admin "Re-index" action. |
| `AiUnansweredLog` | ai_unanswered_log | Questions KIZ-AI couldn't answer: `userId`, `question`, `bestScore`, `ticketId` (set when escalated), `resolved`. Powers the admin "top unanswered" feedback loop. |
| `Faq` | faqs | Admin-curated Q&A that KIZ-AI answers (the "training" surface — no fine-tuning): `category`, `question`, `answer`, `keywords` (alt phrasings/BM/ZH), `language`, `published`, `sortOrder`. Importable/exportable as CSV. Published + answered rows are indexed into `ai_knowledge`. |
| `CafeItem` | cafe_items | A single orderable item on the KIZ Cafe menu. AI-extracted rows start `published = false` (draft) until an admin reviews them. `name`, `price`, `category`, `description`, `dietary` (String[] — halal/vegetarian/spicy/contains_nuts), `imageUrl`, `isAvailable`, `published`, `sortOrder`. Admin CRUD at `urus-kafe`. |
| `CafeOrder` | cafe_orders | A student's cafe order. `refCode` unique (`KIZ-CAFE-NNNN`), `items` (JSON snapshot `[{ name, price, qty }]`), `subtotal`, `pickupTime`, `note`, `whatsappSentAt` (set when the student opens the WhatsApp deep link). Powers "My Orders" + one-tap reorder; payment is settled at pickup. |

New enums: `Gender` (male/female), `RoomType` (single/double), `RoomApplicationType`
(single/double/flexible), `RoomApplicationStatus`, `RoomStatus`
(available/maintenance/closed), `BedPosition` (single/left/right), `IntakeStatus`
(draft/imported/active/archived), `DestinationType`
(block/facility/office/room/hall/seminar/meeting/admin).

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
| `/daftar` | Self-service registration. Email domain picks the role (`@siswa.ukm.edu.my` → student, `@ukm.edu.my` → staff); sends a Resend verification link. With `?invite=<token>` the email + role come from the invitation instead. |
| `/sahkan` | Email-verification landing. Consumes the token, marks the account, matches against the active intake (see §3). |

### Member routes

| Route | Feature |
|---|---|
| `/` | Dashboard. `ahli`/`staf` render the member home (`ahli-home`, hero tag Resident/Staff); everyone else `admin-home` (pending-count cards). |
| `pengumuman` | Announcement feed — tag filter, pinned first, "Baru" badge for 24h. |
| `panduan`, `panduan/[id]` | Digital Guide library (category tabs, New badge) and the PDF reader — a flipbook (two-page spread on desktop, single page on mobile) with prev/next, keyboard/swipe, and a Download button. All roles. |
| `chat` | Community chat — wide two-pane room (chat + community info rail), polls every 3s. |
| `tempahan-fasiliti` | Facility booking — list, availability calendar, booking form. |
| `laundry` | Laundry (`ahli` only) — Machine Status grid + Set Reminder, and My Laundry Reminder (active timer + history). Status is reminder-derived, not sensor-based. Admins are redirected to `urus-laundry`. |
| `rumah-tamu` | Guest house booking + own bookings + cancel. Admins (incl. `pengetua`) are redirected to `urus-rumah-tamu`. |
| `helpdesk`, `helpdesk/[ticketId]` | Ticket list, new ticket, chat thread. The support desk (`superadmin`/`admin_kiz`/`pengetua`/`staf`/`fellow`) is redirected to `urus-helpdesk`. |
| `hilang` | Lost & Found report form + list. |
| `kafe` | Smart Ordering — the KIZ Cafe menu (photo + item cards with dietary tags), a cart, and a WhatsApp checkout. The order opens in WhatsApp pre-filled; the app stores it with a `#KIZ-CAFE-NNNN` reference for pickup and one-tap reorder. |
| `bilik` | Room selection — eligibility gate, window status, visual block/floor/room/bed picker. Desktop grid + detail panel; mobile bottom-sheet + sticky confirm bar. |
| `parcel` | My parcels. Currently behind a hardcoded "coming soon" banner. |
| `kad-maya` | Digital ID card for every role, QR generated server-side from matric ID. Same layout for all; students show room/session, non-students show their role label (Admin KIZ / Staff / Fellow / Principal). |
| `direktori` | AR Directory — camera viewfinder with a destination selector, a compass-relative arrow, and live distance. Falls back to a directions list/map on devices without a camera or motion sensors. |
| `profile` | View / edit own profile. |
| `lagi` | "More" menu for the mobile shell. |
| `tempahan`, `tempahan/[facilityId]` | **Legacy** facility booking. Superseded — see `STATUS.md`. |

### Admin routes (`urus-` prefix)

| Route | Feature |
|---|---|
| `urus-pengumuman` | Announcement CRUD + soft delete. |
| `urus-panduan` | Digital Guide CRUD — upload/replace a PDF (`/api/upload` → `public/uploads/guides/`), auto-detect page count, optional cover image, category, publish/draft, pin, order; soft delete. `superadmin`/`admin_kiz`/`pengetua`. |
| `urus-pejabat` | Administrative-office CRUD (name/function, featured + gallery photos) and the block panorama image + label positions. |
| `urus-direktori` | AR Directory destination pins — add/edit/soft-delete a place (name, kind, lat/lng, indoor flag, building) with a live map preview of the pin. |
| `urus-tempahan-fasiliti` | Approve / reject / cancel facility bookings, PDF link. |
| `urus-rumah-tamu` | Approve / reject / check-in / check-out / mark paid, plus a **Bookings / Guest Houses** tab (add / edit / soft-delete the guest houses students book via `?tab=guest-houses`). |
| `urus-helpdesk`, `urus-helpdesk/[ticketId]` | Ticket queue, reply, assign, close. `superadmin`/`admin_kiz`/`pengetua`/`staf`/`fellow` (the support desk). |
| `urus-checkin` | QR counter check-in/out — create sessions, print the QR sheet, view/export records, manual check-in. `superadmin`/`admin_kiz`/`pengetua`/`staf`. |
| `urus-fasiliti` | Facility CRUD. |
| `urus-laundry` | Laundry machine CRUD, Out of Service toggle, and force-clear a stuck reminder. `superadmin`/`admin_kiz`/`pengetua`. |
| `urus-parcel` | Register arrived parcel by matric ID, mark collected. |
| `urus-kafe` | **Smart Ordering admin** — cafe details (name, WhatsApp number, location, hours, accepting-orders toggle), upload the menu photo, **"Extract menu with AI"** (KIZ-AI vision → reviewable item drafts), edit/publish/remove items, and a live WhatsApp message preview. `superadmin`/`admin_kiz`/`pengetua`. |
| `urus-bilik` | Room selection admin — 5 tabs: CSV intake import + preview, selection window, building (blocks/floors/rooms/maintenance), live occupancy monitor, students (selected/not, manual post-deadline assign). `superadmin`/`admin_kiz`/`pengetua`/`staf`. |
| `urus-tetapan` | App settings — upload / remove logo; student-card design; Resend email config (API key + From address). |
| `urus-jemputan` | **Superadmin only.** Invite people to self-register by email (one at a time or in bulk), choosing Student or Admin KIZ; manage issued invitations (status, resend, revoke, soft-delete). |
| `urus-ai` | KIZ-AI admin — chat/embedding providers (Gemini / Ollama), robot mascot + emotion frames, retrieval mode, **Test connection**, knowledge index + re-index, unanswered questions. |
| `urus-faq` | FAQ knowledge base — CRUD, publish/draft, CSV import/export, downloadable template, "Add starter questions", and promote an unanswered question into a FAQ. |
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
- **Laundry status.** Derived, never stored: `lib/laundry-meta.ts` maps the latest
  non-deleted reminder + `machine.status` + a configurable grace window
  (`AppSetting` `laundry_timer_grace_minutes`, default 30) to
  `no_active`/`laundry_active`/`timer_ended`/`out_of_service`. No cron. The member
  client polls a Server Action every 20s and ticks the countdown locally; a newer
  reminder supersedes whatever was running (residents chose overwrite over queueing)
  and each student holds at most one active reminder.
- **Seed.** `npm run seed` creates sample users, blocks, facilities, bookings, and
  announcements. Login IDs are in `prisma/seed.ts`.
