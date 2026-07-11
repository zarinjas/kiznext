# PRD.md — KIZ Super App (MVP)

## 1. Ringkasan

KIZ Super App ialah platform digital bersepadu (one-stop centre) untuk penghuni
Kolej Ibu Zain (KIZ), UKM. Menguruskan ekosistem kehidupan kampus bukan-akademik:
komunikasi pengurusan, tempahan fasiliti, penyewaan ruang, dan sokongan pelajar.

Arkitektur: web-first (Next.js), akan dikembangkan kepada native app melalui API
pada masa hadapan — jadi struktur backend kena kekal API-friendly walaupun MVP
guna Server Actions.

## 2. Masalah yang Diselesaikan

- Penghuni kolej tiada satu platform berpusat untuk tempahan fasiliti, notis
  bungkusan, lost & found, dan sokongan/Helpdesk.
- Admin KIZ dan UKMRE kekurangan sistem digital untuk urus kelulusan tempahan
  dan pengumuman — kemungkinan besar proses manual/WhatsApp sekarang.

## 3. Users / Roles

| Role | Keperluan Utama |
|---|---|
| Superadmin | Konfigurasi sistem, log, urus semua user |
| Admin Staff KIZ | Lulus tempahan fasiliti, urus pengumuman, reply Helpdesk, **dan lulus tempahan Rumah Tamu (sementara, lihat nota)** |
| Pengetua | View-only laporan/statistik, kelulusan tertinggi |
| Ahli/Pelajar | Tempah fasiliti, akses direktori, guna Helpdesk |

> **Role `Admin Staff UKMRE` ditangguhkan untuk MVP.** Fungsi kelulusan Rumah
> Tamu dipegang oleh Admin Staff KIZ buat sementara supaya tak tambah kerumitan
> role awal-awal. Akan ditambah semula sebagai role berasingan pada fasa akan
> datang bila keperluan dah jelas.

## 4. Scope — MVP (IN)

Ini SAHAJA yang dibina untuk MVP. Rujuk `ROADMAP.md` untuk breakdown per-Epic.

- **Autentikasi & Profil** — login guna ID/No. Matrik, dashboard ikut role,
  Kad Maya (E-Resident Card) sebagai QR code statik/dinamik untuk pengesahan.
- **Tempahan Bilik & Rumah Tamu** — tempoh Harian/Mingguan/Bulanan, availability
  calendar (elak double-booking), logik kelulusan + check-in/check-out status.
  **Tiada pembayaran** — payment_status field disediakan tapi diuruskan manual.
- **Helpdesk & Live Chat** — chat interface pelajar ↔ Admin Staff KIZ. Waktu
  pejabat: Isnin–Jumaat, 8am–5pm. Luar waktu → wajib auto-reply.
- **Tempahan Fasiliti Kolej & Navigasi Kampus** — senarai fasiliti & blok,
  direktori blok dengan panduan navigasi, time-slot booking dengan
  kelulusan/tolakan oleh Admin Staff KIZ.
- **Pengumuman & Community Chat** — feed pengumuman dengan tag (Penting, Sukan),
  group chat rasmi untuk semua penghuni, soft-delete untuk Admin.
- **Parcel Tracker** — notifikasi bungkusan tiba di pejabat.
- **Lost & Found** — ruang komuniti untuk laporan barang hilang.
- **Direktori & Navigasi Blok** — panduan lokasi blok/pejabat/fasiliti.

## 5. Scope — KIV / OUT untuk MVP

**JANGAN bina benda ni.** Kalau AI agent cadangkan/generate kod untuk mana-mana
item ni, reject:

- Payment Gateway (E-Wallet / Stripe / ToyyibPay)
- Kunci Pintar (Smart Access via IoT)
- KIZ Marketplace

## 6. Design System

- Primary (KIZ Official): `#91C953`
- Dark Green: `#004B23`
- Background: `#F5F7F5`
- Font: `Fraunces` (headings), `DM Sans` (body)

## 7. Non-Functional Requirements

- Semua tarikh/masa guna timezone `Asia/Kuala_Lumpur`.
- Mobile-responsive wajib (web-first tapi majoriti penghuni akan akses guna phone).
- Data schema kena future-proof untuk native app API consumption — elak tight
  coupling antara UI logic dan data logic.
- **[DECISION NEEDED]** Berapa concurrent user dijangka untuk MVP pilot? (Ini
  tentukan sama ada perlu connection pooling untuk Postgres dari awal.)
- **[DECISION NEEDED]** Adakah perlu audit log untuk tindakan Admin (approve/
  reject tempahan, delete chat)? Cadangan: ya, minimal — table `audit_logs`
  simple (actor, action, target, timestamp).

## 8. Open Decisions (kena confirm sebelum dev bermula)

| # | Isu | Cadangan Default |
|---|---|---|
| 1 | Realtime engine untuk chat | Pusher / Supabase Realtime |
| 2 | Auth provider | Auth.js (NextAuth v5) Credentials |
| 3 | File/image storage | Supabase Storage / UploadThing |
| 4 | Notification channel Parcel Tracker | In-app sahaja untuk MVP (elak kos SMS/email gateway) |
| 5 | ORM | Prisma |
| 6 | Hosting/Deployment | Belum ditetapkan |
