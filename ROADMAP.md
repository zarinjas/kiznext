# ROADMAP.md — KIZ Super App (MVP)

Guna nombor Epic ni bila prompt AI agent, cth: "buat Epic 1 sahaja, jangan sentuh
Epic lain."

Urutan cadangan (ikut dependency): **Epic 0 → Epic 1 → Epic 4 → Epic 2 → Epic 3 → Epic 5**
(Project initialization kena siap dulu sebelum apa-apa. Lepas tu Auth sebelum
module lain sebab semua perlukan role/user context.)

---

## Epic 0: Project Initialization & Setup

**Keperluan:** Setup projek Next.js dari kosong — Prisma, Shadcn UI, folder structure, design system, middleware.

- [x] Initialize Next.js project (App Router + TypeScript + Tailwind)
- [x] Install & configure Prisma + PostgreSQL connection
- [x] Install Shadcn UI with custom design system
- [x] Setup folder structure (app, components, lib, prisma)
- [x] Configure fonts (Fraunces, DM Sans), global CSS, base layout
- [x] Setup middleware skeleton + RBAC guard (lib/rbac.ts)

## Epic 1: Autentikasi & Pengurusan Profil

**Keperluan:** Log masuk guna ID/No. Matrik. Dashboard berbeza ikut 5 role.

- [x] Setup `users` table + role enum (rujuk SCHEMA.md #1)
- [x] ~~**[DECISION NEEDED]** Confirm auth provider (cadangan: Auth.js Credentials)~~ — guna Auth.js
- [x] Login page (matric_id + password)
- [x] Role-based dashboard routing (`/(dashboard)/[role]`)
- [x] Profile settings page
- [x] Kad Maya display — static QR generated dari matric_id (lihat SCHEMA.md gap note)
- [x] RBAC guard function di `lib/rbac.ts`

## Epic 2: Tempahan Bilik & Rumah Tamu

**Keperluan:** Sistem tempahan penginapan untuk tetamu luar/alumni/keluarga.
*(Nota: doc asal letak modul ni bawah "Admin UKMRE" — role tu ditangguhkan untuk
MVP, jadi kelulusan dipegang oleh admin_kiz buat sementara. Lihat AGENTS.md.)*

- [x] Setup `guest_house_bookings` table (rujuk SCHEMA.md #5)
- [x] Booking form — pilih period type (Harian/Mingguan/Bulanan)
- [x] Availability calendar view (overlap check untuk elak double-booking)
- [x] Approval flow — admin_kiz approve/reject (untuk MVP)
- [x] Check-in / check-out status update
- [x] Cancel button untuk pelajar (batalkan tempahan pending)
- [x] Notes field dalam booking form
- [x] `payment_status` field sebagai enum sahaja — **TIADA payment integration**

## Epic 3: Helpdesk & Sokongan Pengguna (Live Chat)

**Keperluan:** Pusat bantuan pelajar ↔ Admin Staff KIZ.

- [x] Setup `helpdesk_tickets` + `helpdesk_messages` table (rujuk SCHEMA.md #6-7)
- [x] Chat UI (pelajar side)
- [x] Chat UI (admin side — reply, assign ticket)
- [x] Office hours logic: Isnin–Jumaat, 8am–5pm (`Asia/Kuala_Lumpur`)
- [x] Auto-reply system bila luar waktu pejabat
- [x] Display ID ringkas (KIZ-001, KIZ-002)
- [x] In-app unread badge untuk mesej baru
- [x] Image URL preview dalam chat
- [x] Availability notice banner (waktu operasi / luar waktu)

## Epic 4: Tempahan Fasiliti Kolej & Navigasi Kampus

**Keperluan:** Digitalisasi tempahan kemudahan pelajar + panduan lokasi.

- [ ] Setup `facilities` + `blocks` table (rujuk SCHEMA.md #2-3)
- [ ] Seed data — senarai fasiliti & blok sedia ada di KIZ
- [ ] Direktori Blok page (info lokasi + navigasi)
- [ ] Time-slot selection UI untuk tempahan fasiliti
- [ ] Approval flow — admin_kiz approve/reject

## Epic 5: Pengumuman (Announcements) & Community Chat

**Keperluan:** Papan kenyataan digital + ruang interaksi awam.

- [ ] Setup `announcements` table (rujuk SCHEMA.md #8)
- [ ] Announcement feed dengan tag filter (Penting, Sukan, dll)
- [ ] Setup `community_chat_messages` table (rujuk SCHEMA.md #9)
- [ ] Community chat UI (single shared room)
- [ ] Soft-delete function untuk Admin

---

## Additional MVP Features (dari doc asal, tak masuk Epic 1-5 secara eksplisit)

### Parcel Tracker
- [ ] Setup `parcels` table (rujuk SCHEMA.md #10)
- [ ] Admin UI — mark parcel arrived
- [ ] Notifikasi ke pelajar (**[DECISION NEEDED]** channel — cadangan in-app dulu)

### Lost & Found
- [ ] Setup `lost_found_items` table (rujuk SCHEMA.md #11)
- [ ] **[DECISION NEEDED]** Confirm file storage untuk photo upload
- [ ] Report form (dengan/tanpa gambar)
- [ ] Community listing page

---

## Explicitly OUT of Scope (jangan buat, walau AI cadangkan)

- Payment Gateway / E-Wallet integration
- Smart Lock / IoT
- KIZ Marketplace

---

## Post-MVP Candidates (bukan sekarang, catat untuk fasa 2)

- Role `admin_ukmre` berasingan — pisahkan kelulusan Rumah Tamu daripada admin_kiz
- Dynamic/rotating QR untuk Kad Maya
- Native mobile app via API (arkitektur MVP kena sokong ni dari awal — lihat PRD.md NFR)
- Audit log system (`audit_logs` table — boleh masuk MVP kalau Hafiz confirm perlu)
- Generic `notifications` table untuk unify parcel/booking/chat alerts (lihat SCHEMA.md gap note)
