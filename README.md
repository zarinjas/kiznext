# KIZ Super App

Platform digital satu henti (one-stop centre) untuk penghuni Kolej Ibu Zain (KIZ), UKM.

> ⚠️ **Dalam fasa pembangunan.** Belum siap untuk digunakan.

---

## Keperluan

Sebelum install, pastikan laptop ada:

- **Node.js** versi 18 atau lebih baru
- **PostgreSQL** — database yang digunakan
- **Git** — untuk clone repo

---

## Cara Install (Langkah demi Langkah)

### 1. Clone repo

```bash
git clone <url-repo-ini>
cd kiznext
```

### 2. Install dependency

```bash
npm install
```

### 3. Setup database PostgreSQL

Pastikan PostgreSQL dah jalan. Lepas tu buat database baru:

```bash
psql -U postgres -c "CREATE DATABASE kiznext;"
```

### 4. Setup fail persekitaran (`.env`)

Fail `.env` dah disediakan. Isi URL database PostgreSQL korang:

```
DATABASE_URL="postgresql://user:password@localhost:5432/kiznext"
AUTH_SECRET="<guna mana-mana string random sebagai secret>"
```

Gantikan `user:password` dengan username dan password PostgreSQL korang.

### 5. Setup table database

```bash
npx prisma generate    # jana Prisma client
npx prisma db push     # push schema ke database
```

### 6. (Optional) Seed data dummy

Kalau nak isi data contoh untuk testing:

```bash
npm run seed
```

### 7. Jalan server

```bash
npm run dev
```

Buka `http://localhost:3000` dalam browser.

---

## Command Berguna

| Command | Guna |
|---|---|
| `npm run dev` | Jalan server untuk development |
| `npm run build` | Build untuk production |
| `npm run lint` | Check kod ada error/style tak betul |
| `npx prisma studio` | Buka UI untuk tengok database |
| `npm run seed` | Isi data dummy |

---

## Tech Stack

- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Framework:** Next.js (App Router)
- **Backend:** Server Actions & API Routes
- **Database:** PostgreSQL
- **ORM:** Prisma

---

## Dokumentasi Lain

- [PRD.md](docs/PRD.md) — Spesifikasi penuh projek
- [SCHEMA.md](docs/SCHEMA.md) — Struktur database
- [ROADMAP.md](docs/ROADMAP.md) — Task ikut epic
