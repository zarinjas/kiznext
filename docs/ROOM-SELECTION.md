# ROOM-SELECTION.md - Accommodation Applications module

Status: **built.** The former cinema-seat student room picker was replaced by a
privacy-safe accommodation application flow. Physical rooms remain admin-only
inventory for final allocation.

## Student flow

Route: `/ahli/bilik`.

1. The student must match an `EligibleStudent` record in the active eKolej
   intake. Otherwise the page only shows a KEmpty eligibility message.
2. The application window has `not_open`, `open`, `closing_soon`, and `closed`
   states, calculated in `Asia/Kuala_Lumpur`. `open` and `closing_soon` accept
   changes; every Server Action re-checks this.
3. While open, a student chooses exactly one accommodation preference:
   - `single`: a limited-room request, pending KIZ office review.
   - `double`: request a named-by-matric roommate. The requester sees no name;
     only the matched student's race and religion are returned for compatibility.
   - `flexible`: no room or roommate preference; KIZ assigns both later.
4. A double request validates server-side that the other matric ID is in the
   active intake, is not the requester, is the same gender, and has no active
   roommate request. Different genders can never be roommates.
5. The receiving student can approve or reject after logging in. Approval has a
   mandatory final confirmation and makes the pair immutable to both students.
   A student with an existing preference must withdraw it before approval.
6. A rejected/unconfirmed double request is not a loss of accommodation. It is a
   double preference without a confirmed roommate; the office may pair the
   student later. Students with no request are KIV for office assignment.
7. The student never sees room inventory, block, floor, bed, capacity, or other
   student names. Once allocation is completed, their assigned block and room
   are displayed here.

## Data model

`RoomApplication` holds one request per applicant and is soft-deletable:

- `type`: `single`, `double`, or `flexible`.
- `status`: `single_pending`, `roommate_pending`, `roommate_confirmed`,
  `flexible_submitted`, `roommate_rejected`, `allocated`, or `withdrawn`.
- `applicantId` and optional `roommateId` reference `EligibleStudent`.

`Bed.occupantId` remains the only source of truth for physical allocation.
Applications never claim, reserve, or expose beds. `User.block` and
`User.roomNumber` are updated only during final admin allocation.

## Admin preparation

`/urus-bilik` keeps CSV intake, window, building, occupancy, and Students tabs.
The Students tab separates each student's gender, race, religion, nationality,
faculty, merit, support flags, application type/status, roommate, and final
room. It has filters for applied, KIV/no preference, and allocated students so
the office can review compatible groups before assigning the physical rooms.

The existing final allocation guard is retained: manual bed allocation opens
after the application deadline, verifies gender and room availability, and
updates allocation status. A confirmed double pair must be placed by the office
in the same double room.
