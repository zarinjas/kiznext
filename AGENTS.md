# AGENTS.md — KIZ Super App

Fail ini dibaca automatik oleh AI coding agent (OpenCode / Claude Code) setiap sesi.
Letak fail ini di **root project**, bukan dalam `/docs`.

## 1. Project Summary

KIZ Super App — platform digital bersepadu (one-stop centre) untuk pengurusan dan
kemudahan penghuni Kolej Ibu Zain (KIZ), UKM. Fokus: komunikasi pengurusan,
tempahan fasiliti, penyewaan ruang, dan sokongan pelajar.

Rujuk `PRD.md` untuk scope penuh, `SCHEMA.md` untuk data model, `ROADMAP.md` untuk
task breakdown ikut Epic.

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend/UI | React + Tailwind CSS + Shadcn UI |
| Framework | Next.js (App Router) |
| Backend | Next.js Server Actions & API Routes |
| Database | PostgreSQL |
| ORM | Prisma *(cadangan — confirm dengan Hafiz, doc asal tak specify ORM)* |
| Realtime (chat) | **[DECISION NEEDED]** — belum ditetapkan. Cadangan: Pusher atau Supabase Realtime untuk MVP (setup paling cepat). Jangan build custom WebSocket server untuk MVP. |
| Auth | **[DECISION NEEDED]** — belum ditetapkan. Cadangan: Auth.js (NextAuth v5) dengan Credentials provider (ID/No. Matrik + password). |
| File/Image storage | **[DECISION NEEDED]** — perlukan untuk Lost & Found photos & Kad Maya QR. Cadangan: Supabase Storage atau UploadThing. |
| Deployment | *(belum ditetapkan — isi bila confirm: Vercel/VPS)* |

> Rule: Jangan install/guna library lain daripada yang disenaraikan di sini tanpa
> tanya dulu. Kalau perlu library baru, stop dan cadangkan — jangan terus install.

## 3. Non-Negotiable Rules (KIV Compliance)

- **JANGAN** masukkan kod integrasi Stripe/ToyyibPay atau sebarang payment SDK.
- **JANGAN** bina Smart Lock/IoT integration.
- **JANGAN** bina KIZ Marketplace.
- Medan `payment_status` disimpan sebagai `string/enum` di schema (untuk future-proof),
  tapi logik pembayaran diuruskan **manual melalui UI Admin** sahaja.
- Semua pengiraan tarikh/masa (Helpdesk, Tempahan Rumah Tamu) **WAJIB** guna timezone
  `Asia/Kuala_Lumpur`. Jangan guna UTC secara default di UI.
- Utamakan **Server Actions** untuk forms & data mutation. Elak API Routes melainkan
  perlu untuk consumption luar (mobile app masa depan, webhook).
- Semua table WAJIB ada `deleted_at` (soft delete pattern), bukan hard delete —
  termasuk Community Chat messages (Admin boleh soft-delete).

## 4. Roles & Access (RBAC)

4 peringkat role untuk MVP — semua route/action kena check role sebelum execute:

1. `superadmin` — full access
2. `admin_kiz` — approve tempahan fasiliti pelajar, urus pengumuman, reply Helpdesk,
   **dan approve tempahan Rumah Tamu (buat sementara — lihat nota di bawah)**
3. `pengetua` — view-only (laporan/statistik), kelulusan tertinggi jika perlu
4. `ahli` (pelajar) — tempah fasiliti, akses direktori, Helpdesk

> **Future role (bukan MVP): `admin_ukmre`** — akan urus kalendar & kelulusan
> tempahan Rumah Tamu secara berasingan daripada `admin_kiz`. Buat masa ni,
> `admin_kiz` pegang tanggungjawab tu sekali supaya tak keliru dengan role baru.
> Bila nak tambah balik: cukup tambah value baru dalam role enum + update
> `approved_by` check di `guest_house_bookings` — tak perlu ubah struktur table.

> Implementation note: guna middleware/guard function pusat (cth. `lib/rbac.ts`)
> untuk check role di setiap Server Action — jangan duplicate check logic di
> setiap file.

## 5. Design System

- Primary (KIZ Official): `#91C953`
- Dark Green (text/primary buttons): `#004B23`
- Background: `#F5F7F5`
- Typography: `Fraunces` (headings/featured cards), `DM Sans` (body/labels/buttons)

## 6. Folder Structure Convention

```
/app
  /(auth)          → login, register
  /(dashboard)     → role-based dashboards
  /api             → API routes (guna hanya bila perlu, lihat rule #3)
  middleware.ts    → auth/role middleware
/components
  /ui              → shadcn components
  /shared          → reusable app components
/lib
  /rbac.ts         → role guard functions
  /db.ts           → Prisma client / DB connection
  /timezone.ts     → date/time helpers (Asia/Kuala_Lumpur)
/prisma
  schema.prisma
/docs
  PRD.md
  SCHEMA.md
  ROADMAP.md
```

## 7. Commands

```bash
npm run dev                    # local dev
npm run build                   # production build
npm run lint                     # lint check
npx prisma generate              # regenerate Prisma client
npx prisma db push               # push schema to DB (dev)
npx prisma migrate dev           # create migration & apply
npx shadcn@latest init           # init Shadcn UI
npx shadcn add <component>       # add Shadcn component
```

## 8. Workflow bila prompt AI agent

- Rujuk nombor Epic dari `ROADMAP.md` (cth: "buat Epic 1 sahaja").
- Kalau AI nampak keperluan yang bercanggah dengan KIV list di atas, AI kena
  **stop dan tanya**, bukan proceed dengan assumption.
- Sebarang `[DECISION NEEDED]` marker dalam docs ni kena diselesaikan dengan
  Hafiz dulu sebelum related Epic dimulakan.

## 9. Task Execution — Director Bot Workflow

Project guna **KIZ Director Bot** (Telegram @CyberocketAssistanceBot) untuk urus
task queue. File `TASKS.md` di root adalah task queue dalam format checklist —
AI dan bot dua-dua baca fail ni.

### Format TASKS.md

```
# Status: approved
# Batch (3 tasks)

- [ ] [Epic 1] Setup `users` table + role enum
- [ ] [Epic 1] Login page
- [x] [Epic 4] Setup facilities table
```

- `# Status: pending` = belum diluluskan (jangan sentuh)
- `# Status: approved` = dah diluluskan (boleh mula coding)
- `- [ ]` = belum siap
- `- [x]` = dah siap
- `[Epic N]` = label epic

### Setiap sesi coding, WAJIB:

1. **Baca `TASKS.md`** — cari `# Status: approved`. Itu signal batch dah siap untuk dikerjakan.
2. **Jika approved**:
   - Cari `- [ ]` pertama — itu task kau.
   - Execute task ikut spec (ROADMAP.md / SCHEMA.md / PRD.md)
   - Bila siap:
     - Tandakan di **TASKS.md**: tukar `- [ ]` ke `- [x]`
     - Tandakan di **ROADMAP.md**: cari task yang sama, tukar `- [ ]` ke `- [x]`
     - Commit dengan message: `Epic N: Task description`
   - Jangan buat task lain — tunggu approval baru
3. **Jika semua task dah `[x]`** (batch habis):
   - Tukar `# Status: approved` ke `# Status: done`
   - Beritahu user batch dah siap
   - Cadangkan check Telegram untuk batch seterusnya
   - Jangan start coding sendiri — tunggu approval di Telegram
4. **Jika TASKS.md kosong/tiada**:
   - Sama macam point 3

### Peraturan:
- Jangan edit ROADMAP.md melainkan untuk mark [x] task yang dah siap
- Kalau ada `[DECISION NEEDED]` dalam task description, STOP dan tanya Hafiz
  sebelum proceed
