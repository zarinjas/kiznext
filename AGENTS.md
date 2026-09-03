# AGENTS.md — KIZ Super App

Auto-loaded by AI coding agents each session. Keep it short.

## Project

One-stop digital platform for Kolej Ibu Zain (KIZ) residents, UKM. Covers
announcements, facility & guest house booking, helpdesk, community chat, parcels,
and lost & found.

- **What/why + data model** → `docs/SPEC.md`
- **What's built + known issues** → `docs/STATUS.md`

Status: MVP feature-complete, not production-ready.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| UI | MUI v7 (heavily customized) + MUI X DataGrid/Charts/DatePickers + Material Symbols Rounded |
| Animation | Framer Motion |
| Data fetching | Server Components + Server Actions; React Query for polling surfaces |
| Backend | Server Actions (default); API Routes only for external consumers |
| Database | PostgreSQL 16 |
| ORM | Prisma 7 — `prisma-client` generator, output `app/generated/prisma`, `@prisma/adapter-pg` over `pg.Pool` |
| Auth | Auth.js v5 (next-auth beta), Credentials provider (matricId + bcrypt), JWT strategy |
| File storage | Local filesystem under `public/uploads/` |
| Chat realtime | Client polling every 3s against a Server Action (no Pusher/WebSocket) |
| PDF / QR | `pdf-lib` / `qrcode` |
| Deployment | Not decided. Note: local-filesystem uploads will not survive a stateless host. |

> Do not add libraries outside this list. If one seems necessary, stop and ask.

## Design system

Tokens + MUI theme live in `lib/theme/` (tokens.ts, theme.ts, status.ts) — single
source of truth, dual light/dark schemes via CSS variables. Component library in
`components/kiz/` (primitives, patterns, shell). All colors/shadows/radius from
tokens — never hardcode.

**Reach for these before writing markup:**

| Need | Use |
|---|---|
| Row of items (any list) | `ListGroup` + `ListRow` — grouped iOS-style card, one row language app-wide |
| Bordered block | `Surface` |
| Dashboard mosaic | `Bento` + `BentoItem` (12-col; `span` per item) |
| Dashboard tiles | `MetricTile`, `ActionTile`, `HeroTile` |
| Page title | `PageHeader` (already compact — don't add your own h1) |
| Form block | `FormSection` · Empty state | `KEmpty` · Status | `StatusChip` |

Do **not** re-roll the old inline recipe (`borderRadius: 2.5` + 1px divider +
`background.paper` + a 40×40 tinted icon tile). That pattern is replaced by
`ListRow`/`Surface`.

## Non-negotiable rules

- **No** payment SDK (Stripe/ToyyibPay/e-wallet). `paymentStatus` is an enum field
  only; payment is settled manually through the Admin UI.
- **No** smart lock / IoT integration.
- **No** marketplace module.
- Every table needs `deletedAt` — soft delete, never hard delete. Community chat
  messages included (admins soft-delete via `deletedBy`).
- All date/time logic uses `Asia/Kuala_Lumpur`. Never render UTC in the UI.
  Helpers live in `lib/timezone.ts`.
- Prefer Server Actions over API Routes for forms and mutations.
- Check the role before every mutation. Use `requireRole()` from `lib/rbac.ts`
  rather than re-writing inline checks.

## Roles

`superadmin` (full) · `admin_kiz` (approvals, announcements, helpdesk) ·
`pengetua` (view-only reports) · `ahli` (student).

Access matrix in `docs/SPEC.md`. `admin_ukmre` is post-MVP — adding it means a new
enum value plus an `approvedById` check, no schema restructure.

## Design tokens

Clean, minimalist modern SaaS (Linear / Vercel / Stripe school). Source of truth
in `lib/theme/tokens.ts` — change it there and the whole app follows.

- **Primary colour is NOT decided yet.** `color.brand[*]` is a deliberately
  neutral ramp (near-black `#26262B` action, light greys for tints). Swapping
  those 10 values is the only step needed to introduce a brand hue later.
- Surfaces are **pure white** `#FFFFFF` — no off-white/cream canvas.
- Decoration comes from **soft gradients only** (`gradient.hero`, `.rail`,
  `.mesh`, `.panel` — lavender/sky haze). Never solid saturated blocks.
- Type is a **single sans** — `Inter` (`next/font` → `--font-sans`), mono
  `Geist Mono`. No serif anywhere. Tight negative tracking on headings.
- Structure comes from **hairline borders**, not shadows. Elevations are
  near-invisible; cards default to `boxShadow: none` + 1px divider.
- Sidebar is a light rail with a soft gradient wash; mobile uses a flush
  frosted 5-slot tab bar (no raised FAB).

## Structure

```
/app
  /(auth)/login
  /(dashboard)/[role]/...    member routes; admin routes use the `urus-` prefix
  /api/auth, /api/upload
  /generated/prisma          generated, gitignored — never edit
/components/kiz              design system: primitives, patterns, shell
/components/shared           app components (kad-maya card, availability calendar)
/lib/theme                   design tokens + MUI theme (single source of truth)
/lib                         auth, db, rbac, timezone, office-hours, pdf, settings
/prisma                      schema.prisma, seed.ts
/docs                        SPEC.md, STATUS.md
/proxy.ts                    auth guard (Next.js `proxy` middleware at repo root)
```

## Commands

```bash
npm run dev                # dev server
npm run build              # production build
npm run lint               # eslint
npm run seed               # seed dummy data
docker compose up -d       # local PostgreSQL
npx prisma generate        # regenerate client
npx prisma db push         # push schema (dev)
npx prisma studio          # database UI
npx tsc --noEmit           # type check
```

## Working agreements

- Read `docs/STATUS.md` before starting — it lists known issues so you don't
  "fix" something twice or build on a known-broken path.
- Anything conflicting with the non-negotiable rules: stop and ask, don't assume.
- Update `docs/STATUS.md` when you finish a feature or discover a new issue.
