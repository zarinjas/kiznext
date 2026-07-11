# Status: done
# Batch (11 tasks)

- [x] [Epic 0] Initialize Next.js project (App Router + TypeScript + Tailwind)
- [x] [Epic 0] Install & configure Prisma + PostgreSQL connection
- [x] [Epic 0] Install Shadcn UI with custom design system
- [x] [Epic 0] Setup folder structure (app, components, lib, prisma)
- [x] [Epic 0] Configure fonts (Fraunces, DM Sans), global CSS, base layout
- [x] [Epic 0] Setup middleware skeleton + RBAC guard (lib/rbac.ts)
- [x] [Epic 1] Setup `users` table + role enum (rujuk SCHEMA.md #1)
- [x] [Epic 1] Login page (matric_id + password)
- [x] [Epic 1] Role-based dashboard routing (`/(dashboard)/[role]`)
- [x] [Epic 1] Profile settings page
- [x] [Epic 1] Kad Maya display — static QR generated dari matric_id (lihat SCHEMA.md gap note)

## Epic 4: Tempahan Fasiliti Kolej & Navigasi Kampus
- [x] Setup `facilities` + `blocks` table (rujuk SCHEMA.md #2-3)
- [x] Seed data — senarai fasiliti & blok sedia ada di KIZ
- [x] Direktori Blok page (info lokasi + navigasi)
- [x] Time-slot selection UI untuk tempahan fasiliti
- [x] Approval flow — admin_kiz approve/reject

## Epic 2: Tempahan Bilik & Rumah Tamu
- [x] Setup `guest_house_bookings` table (rujuk SCHEMA.md #5)
- [x] Booking form — pilih period type (Harian/Mingguan/Bulanan)
- [x] Availability calendar view (overlap check untuk elak double-booking)
- [x] Approval flow — admin_kiz approve/reject (untuk MVP)
- [x] Check-in / check-out status update
- [x] `payment_status` field sebagai enum sahaja — TIADA payment integration

## Epic 3: Helpdesk & Sokongan Pengguna (Live Chat)
- [x] Setup `helpdesk_tickets` + `helpdesk_messages` table (rujuk SCHEMA.md #6-7)
- [x] Chat UI (pelajar side)
- [x] Chat UI (admin side — reply, assign ticket)
- [x] Office hours logic: Isnin–Jumaat, 8am–5pm (Asia/Kuala_Lumpur)
- [x] Auto-reply system bila luar waktu pejabat/hujung minggu

## Epic 5: Pengumuman (Announcements) & Community Chat
- [x] Setup `announcements` table (rujuk SCHEMA.md #8)
- [x] Announcement feed dengan tag filter (Penting, Sukan, dll)
- [x] Setup `community_chat_messages` table (rujuk SCHEMA.md #9)
- [x] Community chat UI (single shared room)
- [x] Soft-delete function untuk Admin

## Additional: Parcel Tracker & Lost & Found
- [x] Setup `parcels` table (rujuk SCHEMA.md #10)
- [x] Admin UI — mark parcel arrived
- [x] Notifikasi ke pelajar (in-app)
- [x] Setup `lost_found_items` table (rujuk SCHEMA.md #11)
- [x] Report form (dengan/tanpa gambar — local upload)
- [x] Community listing page
