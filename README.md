# KIZ Super App

One-stop digital platform for Kolej Ibu Zain (KIZ) residents, UKM.

> ⚠️ **Under development.** Not ready for production use.

---

## Prerequisites

Make sure you have these installed:

- **Node.js** 18+
- **PostgreSQL**
- **Git**

---

## Installation Guide

### 1. Clone the repo

```bash
git clone <repo-url>
cd kiznext
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup PostgreSQL database

Make sure PostgreSQL is running, then create a new database:

```bash
psql -U postgres -c "CREATE DATABASE kiznext;"
```

### 4. Configure environment variables (`.env`)

A `.env` file is already provided. Update the database URL:

```
DATABASE_URL="postgresql://user:password@localhost:5432/kiznext"
AUTH_SECRET="<any-random-string>"
```

Replace `user:password` with your PostgreSQL credentials.

### 5. Setup database tables

```bash
npx prisma generate
npx prisma db push
```

### 6. (Optional) Seed dummy data

```bash
npm run seed
```

### 7. Start the dev server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Useful Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run lint` | Check code for errors |
| `npx prisma studio` | Open database UI |
| `npm run seed` | Seed dummy data |
| `docker compose up -d` | Start PostgreSQL via Docker |

---

## Docs

- [docs/SPEC.md](docs/SPEC.md) — Modules, roles, data model, route map
- [docs/STATUS.md](docs/STATUS.md) — What's built, known issues, backlog
- [AGENTS.md](AGENTS.md) — Tech stack and conventions (for AI coding agents)
