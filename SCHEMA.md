# SCHEMA.md — KIZ Super App (MVP Data Model)

Convention: semua table ada `id (uuid)`, `created_at`, `updated_at`, `deleted_at`
(soft delete — nullable). Tak diulang kat bawah untuk ringkaskan.

## 1. `users`

| Field | Type | Note |
|---|---|---|
| matric_id | string, unique | ID/No. Matrik — login identifier |
| name | string | |
| email | string, nullable | |
| password_hash | string | |
| role | enum | `superadmin`, `admin_kiz`, `admin_ukmre`, `pengetua`, `ahli` |
| block | string, nullable | blok tempat tinggal (untuk pelajar) |
| room_number | string, nullable | |
| resident_card_qr | string | data untuk Kad Maya QR (statik/dinamik) |
| phone | string, nullable | |
| avatar_url | string, nullable | |

## 2. `facilities`

| Field | Type | Note |
|---|---|---|
| name | string | |
| block_id | FK → `blocks.id` | |
| description | text | |
| capacity | int, nullable | |
| requires_approval | boolean, default true | |

## 3. `blocks`

| Field | Type | Note |
|---|---|---|
| name | string | |
| description | text | |
| navigation_notes | text, nullable | panduan lokasi antara blok |

> `blocks` + `facilities` sama-sama power Direktori & Navigasi Blok (Epic 4).

## 4. `facility_bookings`

| Field | Type | Note |
|---|---|---|
| facility_id | FK → `facilities.id` | |
| user_id | FK → `users.id` | |
| time_slot_start | datetime (Asia/Kuala_Lumpur) | |
| time_slot_end | datetime | |
| status | enum | `pending`, `approved`, `rejected`, `cancelled` |
| approved_by | FK → `users.id`, nullable | |
| notes | text, nullable | |

## 5. `guest_house_bookings`

| Field | Type | Note |
|---|---|---|
| user_id | FK → `users.id` | tetamu/penaja booking |
| guest_name | string | tetamu luar/alumni/keluarga |
| period_type | enum | `daily`, `weekly`, `monthly` |
| start_date | date | |
| end_date | date | |
| status | enum | `pending`, `approved`, `rejected`, `checked_in`, `checked_out`, `cancelled` |
| approved_by | FK → `users.id`, nullable | `admin_kiz` untuk MVP (role `admin_ukmre` akan handle ni di fasa akan datang — schema tak perlu ubah, hanya role-check di Server Action) |
| payment_status | enum (string) | `unpaid`, `paid_manual` — **diuruskan manual oleh Admin UI, tiada payment gateway** |
| notes | text, nullable | |

> Availability calendar untuk elak double-booking = query overlap check pada
> `start_date`/`end_date` per record, bukan table berasingan.

## 6. `helpdesk_tickets`

| Field | Type | Note |
|---|---|---|
| user_id | FK → `users.id` | |
| status | enum | `open`, `in_progress`, `closed` |
| assigned_to | FK → `users.id`, nullable | admin_kiz |

## 7. `helpdesk_messages`

| Field | Type | Note |
|---|---|---|
| ticket_id | FK → `helpdesk_tickets.id` | |
| sender_id | FK → `users.id` | |
| message | text | |
| is_auto_reply | boolean, default false | flag untuk out-of-office auto-reply |

## 8. `announcements`

| Field | Type | Note |
|---|---|---|
| title | string | |
| content | text | |
| tag | enum | `penting`, `sukan`, `umum`, ... (extensible) |
| posted_by | FK → `users.id` | |

## 9. `community_chat_messages`

| Field | Type | Note |
|---|---|---|
| user_id | FK → `users.id` | |
| message | text | |
| deleted_by | FK → `users.id`, nullable | Admin yang soft-delete |

> Single shared room untuk MVP (bukan multi-channel) — sesuai dengan requirement
> "group chat rasmi untuk semua penghuni".

## 10. `parcels`

| Field | Type | Note |
|---|---|---|
| user_id | FK → `users.id` | penerima |
| description | string, nullable | |
| status | enum | `arrived`, `collected` |
| notified_at | datetime, nullable | |
| collected_at | datetime, nullable | |

## 11. `lost_found_items`

| Field | Type | Note |
|---|---|---|
| reported_by | FK → `users.id` | |
| item_name | string | |
| description | text | |
| photo_url | string, nullable | **perlukan file storage — lihat AGENTS.md #2 decision** |
| status | enum | `lost`, `found`, `claimed` |
| location_found | string, nullable | |

## 12. `audit_logs` *(cadangan — lihat PRD.md open decision #2)*

| Field | Type | Note |
|---|---|---|
| actor_id | FK → `users.id` | |
| action | string | cth: `booking.approved`, `chat.deleted` |
| target_type | string | |
| target_id | uuid | |
| meta | jsonb, nullable | |

---

## Relationship Summary

```
users ──< facility_bookings >── facilities ──< blocks
users ──< guest_house_bookings
users ──< helpdesk_tickets ──< helpdesk_messages
users ──< announcements (posted_by)
users ──< community_chat_messages
users ──< parcels
users ──< lost_found_items
```

## Gaps ditemui semasa mapping doc asal ke schema — sila confirm

- **Kad Maya (`resident_card_qr`)**: doc sebut "Kod QR statik/dinamik" tapi tak
  jelaskan logik dinamik tu macam mana (refresh setiap X minit? sekali sahaja?).
  Untuk MVP, cadangan: static QR (generate sekali dari `matric_id`, cukup untuk
  pengesahan visual). Dynamic QR (rotating token) boleh jadi fasa 2.
- **Facility vs Guest House**: dua sistem tempahan berasingan (`facility_bookings`
  vs `guest_house_bookings`) sebab guest house ada payment_status placeholder
  yang facility booking biasa tak perlu, dan flow approval dijangka berasingan
  bila role `admin_ukmre` ditambah semula kelak. Untuk MVP, kedua-dua diluluskan
  oleh `admin_kiz`. Confirm ni betul ikut apa yang kau nak.
- **Notification storage**: parcel & helpdesk perlukan cara notify user (in-app
  notification table tak wujud lagi). Cadangan tambah `notifications` table
  generic (`user_id`, `type`, `message`, `read_at`) untuk cover semua use-case
  (parcel arrived, booking approved, new chat message) — lebih efficient
  daripada buat notification logic berasingan setiap module.
