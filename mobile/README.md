# MyKIZ Mobile

React Native (Expo) app for Kolej Ibu Zain residents — the mobile counterpart of
the Next.js web app at the repo root. It talks to the web app's REST API
(`/api/v1/*`) over bearer-token auth; it never touches the database directly.

> **Status: feature-complete (Phases 0–8).** Everything a resident needs is
> live — sign-in **plus self-registration, password reset and biometric app
> lock**, first-launch **onboarding carousel** (admin-editable), dashboard
> widgets, announcements (reactions + read state + attachments), eCard + QR,
> Digital Guide with an **in-app PDF reader**, helpdesk, **KIZ-AI concierge**,
> community chat (attachments + reporting), room selection, facility &
> guest-house booking with native date/time pickers, in-app check-in with a
> signature pad, a native counter-QR scanner, laundry reminders, Lost & Found,
> Offices, the AR Directory camera compass + Leaflet minimap, AR Translate with
> **text-to-speech**, **offline caching**, profile/avatar and push registration.
> The office gets an
> **admin subset**: helpdesk inbox, approval centre (facility + guest house) and
> check-in records. Remaining gaps are listed at the bottom — see
> `../docs/STATUS.md`.

---

## Requirements

- Node 22+
- An Expo account and the EAS CLI (`npx eas-cli@latest`) for cloud builds
- iOS: an Apple Developer account (you have one)
- Android: a Google Play Console account (you have one)

## Run it

```bash
cd mobile
npm install

# Point at a backend. Defaults to https://mykiz.my when unset.
cp .env.example .env        # edit EXPO_PUBLIC_API_URL if needed

npm start                   # Expo dev server (scan the QR with a dev build)
npm run ios                 # local iOS simulator
npm run android             # local Android emulator
```

Push notifications and the camera need a **development build** — they do not work
in Expo Go on Android:

```bash
npx eas-cli@latest login
npx eas-cli@latest init            # creates extra.eas.projectId in app.json
npx eas-cli@latest build --profile development --platform ios
npx eas-cli@latest build --profile development --platform android
```

Then, for the stores:

```bash
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --profile production --platform all
```

## Build & release

Shortcuts live in `package.json`: `npm run build:ios`, `build:android`,
`build:preview` (APK), `build:dev`, `submit:ios`, `submit:android`, `doctor`.

Everything below is run from `mobile/`. `eas.json` already defines the
`development` / `preview` / `production` profiles, and all three set
`EXPO_PUBLIC_API_URL=https://mykiz.my` so a store build always points at the
live backend.

### 1. One-time setup

```bash
npx eas-cli@latest login            # sign in with your Expo account
npx eas-cli@latest init             # links the project, writes extra.eas.projectId
```

`eas init` writes `extra.eas.projectId` into `app.json` — **push notifications
need it**, so run this before your first build.

### 2. Credentials (EAS manages them)

```bash
npx eas-cli@latest credentials --platform ios      # generates/downloads the iOS cert + provisioning profile
npx eas-cli@latest credentials --platform android  # generates the Android keystore
```

You already have an Apple Developer account and a Google Play Console account.
For iOS, EAS can create the App Store Connect app record for you on first submit.
For Android, create the Play Console app (package `my.kiz.app`) and download a
service-account JSON, then either reference it in `eas.json` under
`submit.production.android.serviceAccountKeyPath` or let `eas submit` prompt.

### Push notifications (extra setup)

In-app notifications work out of the box. **Remote push** additionally needs:

- **`extra.eas.projectId`** — written by `eas init` (step 1). Without it the app
  logs `[push] No EAS projectId — run \`eas init\`` and skips registration
  entirely, so no device ever receives a push.
- **iOS** — EAS generates the APNs key during your first iOS build; inspect or
  replace it with `npx eas-cli@latest credentials --platform ios`.
- **Android** — Expo push uses **Firebase Cloud Messaging (FCM) v1**. Create a
  Firebase project, add an Android app with package `my.kiz.app`, download the
  service-account JSON, then upload it:
  `npx eas-cli@latest credentials --platform android` → *Google Service Account*.
- Expo Go cannot receive remote push on Android (SDK 53+). Test with a
  development build.

### 3. Development build (for testing on a device)

```bash
npx eas-cli@latest build --profile development --platform ios
npx eas-cli@latest build --profile development --platform android
```

Install the resulting build, then `npm start` and point it at the dev client.
Push, camera, location and the signature WebView only work in a dev/release
build — not in Expo Go.

### 4. Production build + submit

```bash
# Bump the marketing version when you want (versionCode/buildNumber auto-increment)
# in app.json: "version": "1.0.0"

npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --profile production --platform all
```

`eas submit` uploads to TestFlight (iOS) and the chosen Play track (Android —
`internal` by default, per `eas.json`).

### 5. Over-the-air updates (optional)

The app does not ship `expo-updates` yet. If you want JS-only hotfixes without a
store review, add it (`npx expo install expo-updates`), set a `channel` on each
build profile, and run `eas update`. Native changes still need a new build.

### Release checklist

- [ ] `npm run doctor` → 21/21 (already green)
- [ ] `npm run typecheck && npm run lint` clean
- [ ] `npx expo export --platform ios` bundles
- [ ] Replace `assets/images/icon.png` + `splash-icon.png` with the official KIZ logo (current ones are a teal "K" placeholder)
- [ ] `eas init` done (adds `extra.eas.projectId`) — required for push
- [ ] App Store Connect app record + Play Console app created for `my.kiz.app`
- [ ] Store listings: name **MyKIZ**, subtitle, description, screenshots, privacy policy URL
- [ ] iOS encryption: `ios.config.usesNonExemptEncryption: false` is set (expo-secure-store)
- [ ] `EXPO_PUBLIC_API_URL` points at the live backend (set in `eas.json`)

## Verify

```bash
npm run typecheck           # tsc --noEmit
npm run lint                # expo lint
npx expo export --platform ios   # proves the Metro bundle resolves
```

## Architecture

```
mobile/
  app.json, eas.json        Expo + EAS config (bundle id `my.kiz.app`)
  metro.config.js           watches ../packages/shared
  src/
    app/                    Expo Router routes (file = screen)
      _layout.tsx           providers: query client, auth, restyle theme, push + onboarding gate
      onboarding.tsx        first-launch welcome carousel (admin-editable)
      (auth)/login.tsx      sign-in
      (auth)/daftar.tsx     self-registration
      (auth)/lupa-kata-laluan.tsx   forgot password
      (auth)/set-kata-laluan.tsx    reset password (token)
      (app)/_layout.tsx     auth guard + Stack (pushed screens)
      (app)/(tabs)/         bottom tabs: index, pengumuman, chat, kad-maya, lagi
      (app)/profile.tsx     profile + avatar + sign out
      (app)/pdf-viewer.tsx  in-app PDF reader (guides, announcements, chat)
      (app)/kiz-ai.tsx      KIZ-AI concierge chat
      (app)/panduan.tsx     Digital Guide library
      (app)/helpdesk.tsx    helpdesk list + compose
      (app)/helpdesk/[ticketId].tsx   ticket thread
      (app)/bilik.tsx       room selection
      (app)/tempahan-fasiliti.tsx     facility directory + booking
      (app)/rumah-tamu.tsx  guest house + booking
      (app)/tempahan.tsx    my bookings
      (app)/laundry.tsx     laundry machine status + reminders
      (app)/checkin.tsx     in-app check-in with signature pad
      (app)/scan.tsx        native counter-QR scanner
      (app)/hilang.tsx      Lost & Found feed + report
      (app)/pejabat.tsx     offices + block panorama
      (app)/direktori.tsx   AR Directory camera compass
      (app)/urus-helpdesk.tsx            office: support-desk inbox
      (app)/urus-helpdesk/[ticketId].tsx office: ticket actions + reply
      (app)/urus-tempahan.tsx            office: approval centre
      (app)/urus-checkin.tsx             office: check-in records + sessions
    lib/                    api client, auth context, push, nav map, react-query hooks
    ui/                     design system (theme + primitives), from shared tokens
    components/ar-minimap.tsx  WebView + Leaflet minimap
```

### Auth

The web app uses Auth.js cookies. React Native has no cookie jar we depend on, so
the mobile app uses **opaque bearer tokens**: `POST /api/v1/auth/login` returns a
raw token (stored in `expo-secure-store`) and the server keeps only its SHA-256
hash in `mobile_sessions` (same pattern as the email/invitation tokens). Sessions
are 90-day sliding — an active user never gets logged out; a dormant token dies.
`Authorization: Bearer <token>` on every request; a 401 clears the local token.

### Shared code

`packages/shared` holds pure, platform-free code (design tokens, role groups,
timezone helpers, matric normaliser, announcement / helpdesk / chat / direktori /
lost-found metadata, geo + OSRM routing helpers, zod schemas) consumed
by the mobile app via the `@kiz/shared` import. It has no Prisma/Next/React
dependency. The web app still uses its own `lib/*` copies — the two mirror each
other and should be kept in sync; migrating the web to `@kiz/shared` is a later,
incremental step so the fragile VPS build is never disturbed.

### API surface (web `app/api/v1/`)

| Endpoint | Purpose |
|---|---|
| `POST /auth/login` | Matric + password → bearer token |
| `POST /auth/register` · `/auth/resend-verification` | Self-registration + resend verification |
| `POST /auth/forgot-password` · `/auth/reset-password` | Password reset (token peek via GET) |
| `GET /auth/me` | Current user (session bootstrap) |
| `POST /auth/refresh` | Slide session expiry |
| `POST /auth/logout` | Revoke the session |
| `GET /onboarding` | Public first-launch slides (no auth) |
| `POST /concierge` | KIZ-AI question → reply (sources / office handoff) |
| `GET /profile` · `PATCH /profile` | Read / update profile |
| `POST /avatar` | Upload profile photo |
| `POST /upload` | Generic upload (chat / guides / fasiliti) |
| `POST /devices` · `DELETE /devices` | Register / remove push token |
| `GET /announcements` | Announcement feed (reactions + read state) |
| `POST /announcements/[id]/read` · `/reaction` | Mark read / toggle a reaction |
| `GET /home` | Member dashboard (room, todos, widgets) |
| `GET /ecard` · `POST /ecard/register` | Digital ID card + first-view registration |
| `GET /guides` · `POST /guides/[id]/read` | Digital Guide library + read marker |
| `GET /helpdesk` · `POST /helpdesk` | Ticket list + create (ticket or live chat) |
| `GET /helpdesk/[id]` · `POST /helpdesk/[id]/messages` · `POST /helpdesk/[id]/close` | Thread, reply, close |
| `GET /chat` · `POST /chat` · `POST /chat/[id]/reactions` · `POST /chat/[id]/report` | Community chat (3s poll), send (text/attachment), react, report |
| `GET/POST /bilik` · `POST /bilik/withdraw` · `POST /bilik/roommate` · `POST /bilik/check-roommate` | Room selection |
| `GET /facilities` · `GET /guest-houses` · `GET /bookings` | Booking catalogues + my bookings |
| `POST /bookings/facility` · `POST /bookings/facility/[id]/cancel` | Facility booking |
| `POST /bookings/guest-house` · `POST /bookings/guest-house/[id]/cancel` | Guest-house booking |
| `GET/POST /laundry` | Laundry snapshot + start/cancel reminder |
| `GET/POST /checkin` | In-app check-in / out (signature) |
| `POST /checkin/scan` · `POST /checkin/lookup` · `POST /checkin/submit` · `GET /checkin/directions` | Public counter-QR flow |
| `GET/POST /lost-found` · `POST /lost-found/[id]/claim` | Lost & Found |
| `GET /offices` | Administrative offices + panorama |
| `GET /destinations` | AR Directory pins |
| `GET /admin/helpdesk` · `POST /admin/helpdesk/[id]/status` | Support-desk inbox + lifecycle (assign/resolve/close/reopen/ask info) |
| `GET /admin/bookings` · `POST /admin/bookings/facility/[id]` · `POST /admin/bookings/guest-house/[id]` | Approval centre |
| `GET /admin/checkin` | Check-in sessions + records |

## Adding the next module

1. Add the endpoint under `app/api/v1/…` in the **web** app, reusing `lib/*` data
   helpers and `authenticate()` from `lib/mobile-auth.ts` for auth.
2. Add the screen under `src/app/(app)/…` and a typed hook in `src/lib/`.
3. Flip the item's `path` from `null` to the route in `src/lib/nav.ts`.
4. Run `npm run typecheck && npm run lint` and update `../docs/STATUS.md`.

## Known gaps (post Phase 8)

- **Admin subset only.** Built: helpdesk inbox, approval centre, check-in
  records. Not built: announcement/guide/facility/office/directory CRUD,
  user management, invitations, app settings, KIZ-AI admin, accommodation
  (`urus-bilik`) allocation, CSV import, reports. Those stay on the web.
- Digital Guide opens the PDF in an **in-app reader** (`react-native-pdf`), not
  the web's page-flip flipbook.
- Community chat supports image/PDF attachments and reporting; moderation
  (delete/dismiss) stays on the web.
- **KIZ-AI needs a provider key** (Gemini or Ollama) configured in the web App
  Settings → KIZ-AI; without it the chat replies "isn't switched on yet".
- Offline cache serves the **last data it saw** (24 h); it is not a write queue —
  mutations still need a connection.
- Biometric unlock is a **device-local convenience flag**, not server-enforced.
- Check-in records are read-only on mobile (no manual check-in / session CRUD).
- Password-reset / verification emails still link to the web (`mykiz.my`); deep
  links into the app are not configured (the app has the `set-kata-laluan`
  screen ready for when they are).
- iOS/Android `ios/` and `android/` folders are generated by EAS/prebuild and are
  intentionally gitignored — configure native behaviour in `app.json` only.
- Push, camera, location, the signature WebView and the native PDF reader
  (`react-native-pdf`) need a **development build** (not Expo Go).
- `assets/images/*` are a generated teal "K" placeholder — swap in the official
  KIZ logo before submitting.
