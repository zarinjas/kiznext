# ROOM-SELECTION.md — Bilik (Room Selection) module

Design spec for the premium room-selection module. Read `SPEC.md` for the app
data model, `AGENTS.md` for the design system, and `STATUS.md` for build state.

Status: **built.** Schema pushed, routes live (`bilik` + `urus-bilik`), seed data
added, `tsc`/`lint`/`build` all pass.

> **Block map:** the block picker is an image-based campus map (user-supplied
> HTML/CSS layout). Map image lives at `/uploads/campus-map.png` — upload the
> file there; a placeholder with a 4:3 fallback shows until it exists. Zone
> positions are percentage-based in `MAP_ZONES` inside
> `components/shared/bilik/campus-block-map.tsx` (tune them against the real
> image). Residence-block names must equal the zone codes (K18A…K19A) to be
> selectable — the seed now creates K18A/K18B/K18C.

---

## 1. What this is

Students accepted through the external **eKolej** system pick their physical KIZ
room during an admin-defined window. The interaction is modelled on cinema seat
selection (GSC/TGV) but adapted to hostel rooms: pick a **block → floor → room →
bed slot** on a visual map, see who already occupies each slot, and change the
choice freely until the deadline locks it.

Two audiences, one module:

- **Student (`ahli`)** — a guided, native-feeling seat picker.
- **Admin (`admin_kiz` / `superadmin`)** — import the accepted list, define the
  window, model the building, and monitor + backfill occupancy live.
- **Principal (`pengetua`)** — read-only occupancy dashboard (reuses the admin
  monitor in view mode).

Route slug: `bilik` (member) and `urus-bilik` (admin), matching the Malay-slug
convention already in the app.

---

## 2. Decisions locked

| Question | Decision |
|---|---|
| Import format | **CSV only**, hand-rolled parser (`lib/csv.ts`). No new dependency — honours the no-new-libs rule. Admin exports the eKolej Excel to CSV first. |
| Payment | Out of scope, as everywhere else. Rooms are free to select. |
| Realtime | Same as chat: no WebSocket. Occupancy grid polls a Server Action every 5s while the picker is open, plus optimistic update on the student's own action. |
| Storage | No file persistence needed — CSV is parsed in-memory on upload, only parsed rows are stored. |
| Gender model | A block is restricted to one gender. Eligibility is derived from the imported `Jantina` field, never from a free choice. |
| Naming | New models are prefixed `Residence*` to avoid colliding with the existing `Block`/`Facility` (which are facility-grouping blocks, a different concept). |

---

## 3. Data model (Prisma additions)

All new models carry `id`, `createdAt`, `updatedAt`, `deletedAt` per the
project rule. Enums are added to `schema.prisma`.

### Enums

| Enum | Values | Notes |
|---|---|---|
| `Gender` | `male`, `female` | Maps from eKolej `Jantina` (`L`/`Lelaki` → male, `P`/`Perempuan` → female). |
| `RoomType` | `single`, `double` | single = 1 bed slot, double = 2 (left/right). |
| `RoomStatus` | `available`, `maintenance`, `closed` | Admin-controlled per room. `full`/`partial` are *derived*, not stored. |
| `BedPosition` | `single`, `left`, `right` | A single room has one `single` bed; a double has `left` + `right`. |
| `IntakeStatus` | `draft`, `imported`, `active`, `archived` | Lifecycle of an accepted-student import batch. |

### Models

```
ResidenceBlock        # a physical residential block
  name            String @unique        # "Blok A"
  gender          Gender                # who may live here
  floors          Int                   # number of floors, for grid rendering
  description     String?
  sortOrder       Int    @default(0)
  rooms           ResidenceRoom[]

ResidenceRoom
  blockId         -> ResidenceBlock
  floor           Int                    # 1..n
  number          String                 # "A-3-12" (display) — unique per block
  type            RoomType
  status          RoomStatus @default(available)
  sortOrder       Int                    # position on the floor grid
  beds            Bed[]
  @@unique([blockId, number])

Bed
  roomId          -> ResidenceRoom
  position        BedPosition
  occupantId      -> EligibleStudent?    # null = free slot
  @@unique([roomId, position])
  @@unique([occupantId])                 # one student, one bed

SelectionWindow                         # single active config row (soft-deleted history kept)
  name            String                 # "Sesi 2026/2027"
  opensAt         DateTime
  closesAt        DateTime
  isActive        Boolean @default(true)
  closingSoonHours Int    @default(24)   # threshold for the "closing soon" state

Intake                                   # one CSV import batch
  name            String
  status          IntakeStatus @default(imported)
  importedById    -> User
  rowCount        Int
  students        EligibleStudent[]

EligibleStudent                          # a row from the accepted list
  intakeId        -> Intake
  matricId        String                 # No. Matrik
  name            String                 # Nama
  gender          Gender
  faculty         String?                # Fakulti
  yearOfStudy     String?                # Tahun Pengajian
  religion        String?                # Agama
  race            String?                # Bangsa
  nationality     String  @default("Malaysia")   # derived; eKolej sheet has no column
  currentCollege  String?                # Kolej Semasa
  choice1         String?                # Pilihan 1
  applicationDate DateTime?              # Tarikh Permohonan
  applicationStatus String?             # Status Permohonan
  isB40           Boolean @default(false)# B40
  isOku           Boolean @default(false)# OKU (disability)
  isUniform       Boolean @default(false)# Uniform (uniformed unit)
  merit           Float?                 # Markah
  userId          -> User?               # linked login account, once matched
  bed             Bed?                   # their chosen slot (nullable until picked)
  selectedAt      DateTime?
  assignedByAdmin Boolean @default(false)# true if backfilled after deadline
  @@unique([intakeId, matricId])
```

**Nationality note.** The eKolej column list has no nationality field. To satisfy
the "occupied slot shows … nationality" requirement without inventing data, we
default `nationality` to `Malaysia` and expose it as an editable field in the
admin room/student editor. If eKolej later adds the column, the CSV mapper picks
it up automatically.

**Occupancy is derived, never stored.** A room's live state (`available` /
`partial` / `full`) is computed from its beds' `occupantId` at read time. Storing
it would create a second source of truth to keep in sync.

### Eligibility & identity

- A student is **eligible** iff their `matricId` exists in an `EligibleStudent`
  row under an `active` intake, and their `gender` matches a block.
- On first visit, if the logged-in `User.matricId` matches an `EligibleStudent`
  with no `userId`, we link them (`userId = user.id`). This is how the login
  account joins the imported record.
- The occupant card shown on a taken slot reads from `EligibleStudent`
  (short name, matric, religion, race, nationality) — no join to `User` needed,
  so it works even for students who haven't logged in yet.

---

## 4. Selection window states

Computed in `lib/room-selection.ts` from `SelectionWindow` + `nowMalaysia()`:

| State | Condition | Student sees |
|---|---|---|
| `not_open` | `now < opensAt` | Countdown to open, picker locked, read-only preview allowed. |
| `open` | `opensAt ≤ now < closesAt − closingSoonHours` | Full picker. |
| `closing_soon` | within `closingSoonHours` of `closesAt` | Full picker + amber urgency banner + live countdown. |
| `closed` | `now ≥ closesAt` | Picker locked. Shows their final room, or a "not selected — contact admin" state. |

Colour mapping reuses `status.ts` tones: `not_open` → neutral, `open` → success,
`closing_soon` → warning, `closed` → danger.

---

## 5. Seat / slot status system

The heart of the "cinema seat" feel. Six states, each a token-driven colour. Added
to `lib/theme/status.ts` as a dedicated `seatTone()` so it stays the single source
of truth (never hardcoded).

| Seat state | Meaning | Tone | Fill | Interaction |
|---|---|---|---|---|
| `available` | free slot | neutral outline, white fill | hairline border | tappable |
| `selected_me` | the slot I hold | **accent** (lavender) solid + ring | filled | tappable (to release/keep) |
| `partial` | double room, one bed taken | success-tinted, half-glyph | half fill | tappable (join the free bed) |
| `full` | all beds taken by others | ink/neutral solid, muted | filled disabled | view occupants only |
| `maintenance` | admin-blocked | warning hatch | striped | non-selectable |
| `closed` | window closed / room closed | disabled grey | flat | non-selectable |

A **double room card** renders two mini bed-glyphs side by side (left / right) so
partial occupancy is legible at a glance without opening the detail panel.

Legend chips sit above the grid on desktop and in the filter sheet on mobile.

---

## 6. Student flow & screens

Route: `/[role]/bilik`

### 6.1 Gate (eligibility + window)

Server component resolves, in order:

1. Not eligible → `KEmpty` hero: "You're not on the current intake list. If you
   were accepted through eKolej, contact the KIZ office." (no picker).
2. Eligible, `not_open` → **HeroTile** countdown, block previews visible but
   locked.
3. Eligible, `open`/`closing_soon` → full picker.
4. Eligible, `closed` → result screen (their room or unassigned notice).

The `closing_soon` and `not_open` heroes intentionally echo the existing
"You have 1 booking pending your approval" hero pattern (`HeroTile` with
`tone="alert"`), as requested.

### 6.2 Desktop picker (≥ md)

Three-zone layout:

```
┌──────────────────────────────────────────────────────────┐
│ PageHeader: "Choose your room"      [window status chip]   │
├──────────────────────────────────────────────────────────┤
│ Filter rail (sticky top): Block segmented ▸ Floor pills ▸ legend │
├───────────────────────────────────────┬──────────────────┤
│                                        │  Room detail      │
│   ROOM GRID                            │  panel (sticky)   │
│   floor plan of cards, one per room    │  ───────────────  │
│   double rooms show L | R bed glyphs   │  room number/type │
│                                        │  bed slots:       │
│                                        │   • occupant card │
│                                        │   • or "choose"   │
│                                        │  [Confirm choice] │
└───────────────────────────────────────┴──────────────────┘
```

- Block is a **segmented control** filtered to the student's gender only.
- Floor is a row of pills; grid re-renders per floor.
- Clicking a room opens the right **detail panel** (no navigation). Selecting a
  bed there and pressing **Confirm** commits via a Server Action.
- The student's current pick is always highlighted across blocks/floors with the
  `selected_me` accent, and a persistent "Your room: A-3-12 (left bed)" summary
  bar sits under the header.

### 6.3 Mobile picker (< md) — native app feel

No shrunk desktop. A dedicated flow using the app's native primitives:

- **Sticky top**: window-status chip + current-pick summary.
- **Block/floor** as horizontal `.scroll-x` snap chip rails (already a shell
  pattern).
- **Room grid**: 2–3 thumb-sized cards per row, 56px+ targets, no tap-highlight.
- Tapping a room opens a **bottom sheet** (`Drawer anchor="bottom"`, `radius.sheet`)
  showing the room, its bed slots, and occupant cards.
- **Sticky confirm bar** pinned above the bottom nav: shows the pending pick and a
  full-width **Confirm** button. Safe-area aware.
- After confirm: a success sheet with a subtle spring, then the bar switches to
  "Your room" with a "Change" affordance (allowed until close).

### 6.4 Occupant card

On any taken bed, both desktop panel and mobile sheet show:

```
[avatar initials]  Nurul A.            ← short name (first + initial)
                   A198765 · Islam
                   Malay · Malaysia
```

Short name = first name + first initial of the rest, to respect privacy while
still being useful for "who's my roommate". Full name is never shown to peers.

---

## 7. Admin flow & screens

Route: `/[role]/urus-bilik`, a **tabbed** admin surface (MUI Tabs, customised):

### Tab 1 — Intake (import)

1. **Upload CSV** (drag/drop or picker). Parsed client-side into rows.
2. **Column mapping preview**: detected headers mapped to fields; unmapped columns
   flagged. Expected headers: `Bil, No. Matrik, Nama, Fakulti, Tahun Pengajian,
   Jantina, Agama, Bangsa, Kolej Semasa, Pilihan 1, Tarikh Permohonan, Status
   Permohonan, B40, OKU, Uniform, Markah`.
3. **Validation table**: each row tagged **OK / Duplicate / Invalid** with reason
   (missing matric, bad gender token, duplicate matric within file or against an
   existing active intake). Counts summarised in a HeroTile.
4. **Confirm import** → creates an `Intake` + `EligibleStudent` rows in one
   transaction. Duplicates/invalids are skipped (never silently merged).

### Tab 2 — Window

- Set `name`, `opensAt`, `closesAt` (MUI X DateTimePickers, `Asia/Kuala_Lumpur`),
  `closingSoonHours`. One active window at a time; activating a new one archives
  the old.
- Live preview of which state students currently see.

### Tab 3 — Building

- Manage `ResidenceBlock` (name, gender, floors), `ResidenceRoom` (floor, number,
  type, status), and beds are auto-created from `type` (single→1, double→2).
- Bulk "generate floor" helper: create N sequential rooms of a type on a floor.
- Toggle a room to `maintenance` / `closed` inline.

### Tab 4 — Occupancy monitor

- Live grid + summary metrics (Bento): total beds, filled, free, maintenance,
  % occupancy, students-not-yet-selected.
- Same visual room grid as the student picker but read-only, colour-coded, with
  occupant names on hover/tap.
- Polls every 5s.

### Tab 5 — Students

- `SmartTable` (MUI X DataGrid) of the active intake: matric, name, gender,
  eligibility flags (B40/OKU/Uniform), **selected room or "—"**, selectedAt.
- Filter: selected / not selected. Search by matric/name.
- **After deadline**: admins can **manually assign** an unselected student to any
  free bed (`assignedByAdmin = true`). Pre-deadline this is disabled (students
  self-serve).
- Export current state to CSV (reuses `lib/csv.ts` stringify).

Principal (`pengetua`) sees Tabs 4 only, read-only.

---

## 8. Server actions (`bilik/actions.ts`, `urus-bilik/actions.ts`)

All guarded with `requireRole` (admin actions) or eligibility+window checks
(student actions). Every mutation re-checks the window state server-side — the UI
lock is not trusted.

Student:
- `getPickerState()` — eligibility, window state, blocks/floors/rooms/beds for the
  student's gender, and their current pick.
- `selectBed(bedId)` — validates: window open, student eligible, bed free, gender
  match; moves the student's occupancy atomically (releases previous bed in the
  same transaction). Optimistic on client.
- `releaseBed()` — clears the student's pick while the window is open.

Admin:
- `previewImport(csvText)` — parse + validate, return row diagnostics (no writes).
- `confirmImport(csvText, name)` — transactional create.
- `saveWindow(...)`, `activateWindow(id)`.
- `upsertBlock/Room`, `setRoomStatus`, `generateFloor`.
- `adminAssign(studentId, bedId)` — post-deadline backfill.
- `getOccupancy()` — live monitor payload (polled).

Concurrency: `selectBed` uses a conditional update (`WHERE occupantId IS NULL`) so
two students racing for the last bed can't both win; the loser gets a friendly
"that bed was just taken" toast and the grid refreshes.

---

## 9. Component inventory (new, under `components/shared/bilik/`)

Built on existing primitives — no re-rolled recipes.

| Component | Role |
|---|---|
| `WindowStatusBanner` | Hero/banner for the four window states (wraps `HeroTile`). |
| `SeatLegend` | Legend chips for the six seat states. |
| `RoomGrid` | Responsive floor grid of `RoomCard`s. |
| `RoomCard` | One room; single shows one glyph, double shows L\|R bed glyphs + status. |
| `BedGlyph` | The seat square; colour from `seatTone()`. |
| `RoomDetailPanel` | Desktop right-side sticky panel. |
| `RoomDetailSheet` | Mobile bottom sheet (same content, sheet chrome). |
| `OccupantCard` | Privacy-safe occupant summary. |
| `PickSummaryBar` | Desktop under-header + mobile sticky confirm bar. |
| `ImportDropzone` + `ImportPreviewTable` | Admin CSV import UI. |
| `OccupancyMonitor` | Admin/principal live grid + metrics. |

Colours strictly from tokens/`seatTone()`; radii from `radius`; motion from
`framer-motion` with the token easings. Dark mode falls back like the rest of the
system.

---

## 10. Out of scope / non-goals

- No payment, no smart-lock, no marketplace (per `AGENTS.md`).
- No email/SMS/push on selection — in-app only, consistent with the app.
- No automatic allocation algorithm — students self-select; admins backfill
  manually. (An auto-allocator could be a later `assignedByAdmin` extension.)
- No `.xlsx` parsing — CSV only.

---

## 11. Refinements (post-MVP pass)

Focused improvements made after the first build, keeping the architecture intact:

1. **Manual assignment is server-enforced post-deadline.** `adminAssign` re-checks
   the active window and rejects unless `windowState === "closed"`, and rejects
   beds in `maintenance`/`closed` rooms. The UI lock was never the guard.
2. **Import confirm matches preview.** `confirmImport` now also drops matrics that
   already exist in the active intake (not just in-file dupes/invalids), so it can
   never silently import a row the preview flagged as "existing". The preview UI
   states the skip rule explicitly (info alert + per-row dot-chips: OK / Dup /
   Invalid / Listed).
3. **Mobile pending-selection flow.** Tapping a bed in the sheet now *stages* it
   (no write); the sheet closes and the sticky bottom bar shows the staged bed
   with **Confirm** / **Cancel**. Commit only happens on Confirm — real
   seat-booking feel. Desktop keeps its immediate commit from the side panel.
   `RoomDetail` gained `selectVerb` + `stagedBedId` to serve both.
4. **Occupant privacy setting.** `AppSetting` key `bilik_occupant_privacy`
   (`full` | `limited`), toggled in the admin Window tab. `full` = short name +
   matric + religion + race + nationality; `limited` = short name + nationality
   only. `buildPickerState` nulls the hidden fields server-side (students always
   see their own full details). `OccupantView.matricId` is now nullable.

Polish: centered cinema-seat bed glyphs + occupancy count on room cards, a compact
mobile seat legend, and richer desktop empty/confirm states.

## 12. Build order

1. Schema + migration (`db push`), regenerate client.
2. `lib/room-selection.ts` (window state, eligibility, seat model) + `lib/csv.ts`.
3. `seatTone()` in `lib/theme/status.ts`.
4. Shared components.
5. Student `bilik` route (server page + client picker, desktop + mobile).
6. Admin `urus-bilik` route (5 tabs).
7. Nav config wiring + seed sample building/intake/window.
8. `tsc --noEmit`, `lint`, update `SPEC.md` / `STATUS.md`.
