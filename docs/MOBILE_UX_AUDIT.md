# MyKIZ Mobile & Tablet — UX / Innovation Audit

**Scope:** `mobile/` Expo app only (iOS/Android phone + iPad). Web app excluded.
**Lens:** AI/AR innovation-competition judging, first-impression quality, demo readiness.
**Date:** Sep 2026 · **Reviewed:** 63 source files, 10,904 LOC

---

## Verdict up front

The engineering is genuinely strong. You have a real camera-compass AR navigator with
OSRM route-following, a real OCR-translate pipeline with box-overlay rendering, a
hold-to-confirm SOS with smart office-hours routing, biometric app lock, offline query
persistence, and 28 screens at near-parity with the web app. **The substance is
competition-grade.**

The *presentation* is not. Three problems will cost you the win:

1. **The AI/AR features are invisible.** KIZ-AI, AR Directory and KIZ Lens are buried
   as plain rows in a 40-item "More" list and as two of eight identical grey icons.
   Nothing on first launch says "this app has AI."
2. **There is not a single animation or haptic in the entire codebase.** Zero
   `reanimated`, zero `Animated`, zero `expo-haptics`. Every transition is an instant
   hard cut. Next to any polished competitor this reads as a prototype.
3. **It is locked to portrait and has no tablet layout at all.** If judges see this
   projected from an iPad — the single most likely demo scenario — they see phone UI
   stretched to 1024pt with 900pt-wide chat bubbles.

Fix the top 8 Critical items and this moves from "impressive student project" to
"winner."

---

# Critical Issues

Ship-blockers. Each one is either visible in the first 30 seconds, breaks during a
live demo, or actively hides your innovation from judges.

---

### C1. The app is hard-locked to portrait — iPad demo is broken by construction

**Problem**
`mobile/app.json:6` sets `"orientation": "portrait"`. `supportsTablet: true` is set
(`app.json:11`), so the app installs on iPad and then refuses to rotate. Meanwhile
**not one of the 28 screens has a tablet branch**: a repo-wide search for
`useWindowDimensions`, `isTablet`, `numColumns` or a responsive `maxWidth` returns
exactly two hits — `onboarding.tsx:23` (paging width) and `sos.tsx:169`. The restyle
theme *defines* a `tablet: 768` breakpoint (`ui/theme.ts:77`) that is never used
anywhere.

Concrete breakage at 1024pt:
- Chat bubbles `maxWidth="78%"` → ~800pt-wide single-line messages (`chat.tsx:123`)
- Helpdesk bubbles `maxWidth="85%"` (`helpdesk/[ticketId].tsx:108`)
- Laundry cards `width: "47%"` → ~490pt cards holding an 84px image (`laundry.tsx:296`)
- Every form field runs the full screen width (profile, all booking sheets)
- `pejabat.tsx` positions panorama labels by **percentage over a fixed 190px-tall
  image** (`:11`, `:49`, `:56`) — the callouts drift off their targets as width grows

**Why it matters**
Judges at AI/AR competitions are handed an iPad, or you present from one. A portrait
lock on a tablet is read as "they only ever tested on their own phone." The 800pt chat
bubble is the kind of detail that ends a demo's credibility in one screenshot. This is
also the single highest-leverage item here: it is the difference between your work
looking deliberate and looking unfinished.

**Recommended fix**
1. `app.json` → `"orientation": "default"`, and add
   `"ios": { "requireFullScreen": false }` so Split View works.
2. Add one hook and one wrapper — this covers ~80% of screens with no per-screen work:
   ```ts
   // src/lib/responsive.ts
   export function useLayout() {
     const { width, height } = useWindowDimensions()
     return {
       isTablet: width >= 768,
       isLandscape: width > height,
       columns: width >= 1024 ? 3 : width >= 768 ? 2 : 1,
       contentMaxWidth: width >= 768 ? 720 : undefined,
     }
   }
   ```
   Then apply `contentMaxWidth` + `alignSelf: "center"` inside `ui/screen.tsx` so
   every `<Screen>` self-constrains. Cap chat/helpdesk bubbles at
   `Math.min(width * 0.78, 520)`.
3. Two-pane on tablet landscape for the three list→detail flows (announcements,
   helpdesk, lost & found). Expo Router supports this cleanly and it is the single
   most "designed for iPad" signal you can send for the least code.
4. Verify AR Directory and KIZ Lens specifically — a rotating camera view is where
   orientation bugs surface.

---

### C2. Zero animation and zero haptics anywhere in the app

**Problem**
A repo-wide search for `reanimated|Animated|withSpring|withTiming|useSharedValue|
LayoutAnimation|Haptics` across all 63 files returns **no matches**.
`react-native-reanimated@4.5.1` is installed (`package.json:44`) and never imported.
`expo-haptics` is not even a dependency.

Every single interaction is an instant hard cut: tab switches, sheet opens, the AR
arrow snapping between headings, the laundry countdown, the SOS ring (hand-rolled with
`requestAnimationFrame` + `setState` at 60fps in `sos.tsx:53-65`, which re-renders the
whole screen every frame), the QR card appearing, list items arriving. Press feedback
is `opacity: 0.68` (`index.tsx:308`) and nothing else.

**Why it matters**
This is the number-one thing separating "looks like a real product" from "looks like a
student project," and judges register it in under five seconds without being able to
articulate why. Motion is also *information*: a sheet that slides up from the button
you pressed tells you where you are; an instant swap does not. For an AR app
specifically, a non-animated compass arrow looks broken even when the math is perfect —
raw sensor data snapping between values reads as jitter.

**Recommended fix**
Highest impact per line of code, in order:
1. **AR arrow** (`direktori.tsx:259`) — drive rotation with a Reanimated shared value
   and `withSpring`. You already low-pass the heading at `:98`; move that to the UI
   thread via `useDerivedValue` so it is smooth at 120Hz and doesn't re-render React.
   This is your headline AR moment — it must feel alive.
2. **Haptics** — `npx expo install expo-haptics`. Add `ImpactFeedbackStyle.Light` on
   every `Pressable` in `KButton`/`ListRow`, `Heavy` at each SOS hold second +
   `Success` on dial, `Light` on QR scan acquire, `Success` on booking confirm.
   Roughly 20 lines total, and it transforms perceived quality.
3. **Rewrite the SOS ring** in Reanimated (`withTiming(1, { duration: 3000 })` driving
   `strokeDashoffset`). Removes 180 React re-renders per hold *and* looks better.
4. `LayoutAnimation.easeInEaseOut()` before every list mutation and sheet toggle — a
   one-liner per call site.
5. Stagger-fade dashboard cards on mount (60ms apart). Cheap, and it makes the first
   screen feel authored.

---

### C3. Your AI and AR features are invisible — the "wow" is buried

**Problem**
You have four genuinely competition-worthy features. Here is how a judge encounters
them:

| Feature | Current discoverability |
|---|---|
| **KIZ Lens** (live OCR + translate, 400 LOC) | Row 7 of 7 in the "Support" group of a 40-row "More" list. Labelled "AR Translate". |
| **AR Directory** (camera + compass + OSRM) | Row 6 of 7 in the same list. |
| **KIZ-AI** (concierge w/ citations) | Row 2 of 7 in the same list. |
| **SOS** (hold-to-confirm, smart routing) | Row 1 of 7 in the same list. |

On the dashboard they appear as three of eight visually identical 56px circles
(`index.tsx:16-25`) — "AR Directory" sits between "SOS" and "Translate", and
"Laundry" gets exactly the same visual weight. **Nothing anywhere in the app says
"AI".** There is no AI badge, no "Powered by Gemini", no mention of OCR, OSRM,
on-device compass fusion, or live translation. The word "AI" appears only inside the
`kiz-ai` screen itself, after you have already found it.

Worse, the "More" tab — the only place the full feature set lives — presents your
crown jewels *interleaved with 13 dead "Soon" rows* (`nav.ts`, `path: null` ×13). A
judge tapping "More" sees a wall of grey text where a third of the entries are
disabled.

**Why it matters**
This is the single biggest scoring loss in the audit. Competition judges give you
30–60 seconds of attention per feature and they do not go spelunking. If the AR
translate overlay isn't on screen in the first minute, it does not exist for scoring
purposes. You have built the hard part and then hidden it behind a settings list.

**Recommended fix**
1. **Promote AI/AR to a dedicated dashboard section**, above Quick Access, visually
   distinct from the utility grid:
   ```
   ┌─────────────────────────────────────────┐
   │ ✦ AI & AR AT KIZ                        │
   │ ┌─────────────┐ ┌─────────────┐        │
   │ │ 📷 KIZ Lens │ │ 🧭 AR Wayfind│       │  ← large cards, live camera
   │ │ Point & read│ │ Follow arrow │        │    thumbnail or gradient
   │ │ any sign    │ │ to any block │        │
   │ └─────────────┘ └─────────────┘        │
   │ ┌─────────────────────────────────┐    │
   │ │ ✦ Ask KIZ-AI — "Where do I pay │    │
   │ │   my room fee?"                 │    │  ← live input affordance,
   │ └─────────────────────────────────┘    │    not just a link
   └─────────────────────────────────────────┘
   ```
   Use `gradient.hero`/`.mesh` from tokens so this block reads as premium against the
   flat utility grid below.
2. **Rename for clarity + impact.** "AR Translate" → **"KIZ Lens"** (you already use
   this name internally at `ar-terjemah.tsx:38` — the nav label just doesn't match).
   "AR Directory" → **"AR Wayfinder"**. Consistent naming everywhere.
3. **Add an AI provenance chip** wherever AI output is shown — `✦ AI` on KIZ-AI
   answers, `✦ Gemini Vision` on Lens results, `✦ AI-triaged` on helpdesk. You
   already have the `auto_awesome` glyph mapped (`icon.tsx:92`) and use it once at
   `ar-terjemah.tsx:324`. Make it systematic. Judges need to *see* the AI.
4. **Hide the 13 "Soon" rows in `nav.ts`** behind a collapsed "Coming soon" footer
   group. Right now they advertise incompleteness on the one screen that should
   advertise breadth.
5. Add a **"Try the demo" entry point** — see C8.

---

### C4. First launch is a dead end: unbranded carousel → bare login form

**Problem**
The 30-second first impression, traced through the code:

1. `onboarding.tsx` renders **whatever slides the admin CMS returns**. If the API is
   unreachable or returns `[]`, the user gets `:37-43` — a blank white screen with one
   unlabelled "Continue" button. No logo, no app name, no explanation. The
   `OnboardingGate` (`_layout.tsx:74`) only routes to onboarding when
   `slideCount > 0`, so a cold/offline first launch skips straight to login with no
   introduction whatsoever.
2. Login (`login.tsx`) is a logo, "MyKIZ", two text fields. **No demo login button** —
   verified absent. The web app has one-click student/admin/superadmin demo buttons
   (per `docs/STATUS.md`), and `A999999`/`kiz123` + `SUPER001`/`kiz123` are guaranteed
   stable accounts. Mobile has none of this.
3. The logo itself is fetched over the network from `${API_BASE_URL}/api/app-icon`
   (`login.tsx:16`). Offline or on venue wifi, **your brand mark is an empty box.**

**Why it matters**
Judges will open this app cold, on conference wifi, possibly without your backend
warm. The realistic worst case is: blank white screen → login wall → they hand the
iPad back. You never get to show the AR. Even in the good case, nothing in the first
30 seconds communicates "AI/AR innovation" — it looks like a generic student portal.

**Recommended fix**
1. **Bundle a fallback onboarding.** Ship 3 hardcoded slides as the default and let
   the CMS *override* them. Never render an empty carousel. Slide content should sell
   the innovation: "Point your camera, read any sign in your language" / "Follow an
   arrow to any block" / "Ask KIZ-AI anything."
2. **Bundle the logo as a local asset** (`assets/images/icon.png` already exists, 847KB
   — resize it) and use the remote URL only as an enhancement. Your brand must never
   depend on the network.
3. **Add demo login buttons** to `login.tsx`, mirroring web: "Student demo" /
   "Admin demo". This is the single highest-value 20 lines in this document — it is the
   difference between a judge exploring your app and a judge watching you type a
   password.
4. Add a one-line value proposition under "MyKIZ": *"AI & AR campus companion for
   Kolej Ibu Zain"* — so the very first screen states the category you're competing in.

---

### C5. Wrong college name on the dashboard hero

**Problem**
`mobile/src/app/(app)/(tabs)/index.tsx:73` renders:
```tsx
<Text numberOfLines={1} style={styles.collegeName}>Kolej Ibrahim Yaakub</Text>
```
The app is for **Kolej Ibu Zain**. Every other string in the codebase is correct
(`login.tsx:92`, `daftar.tsx:63`, `kiz-ai.tsx:34`, `kad-maya.tsx:126`) — this is a
hardcoded one-off, and it sits in the largest, most prominent text block on the home
screen, directly under the logo.

**Why it matters**
It is wrong on the first screen after login, on every screenshot, in every demo, and
in any submitted video. Judges who know UKM colleges will spot it instantly and it
undermines confidence in everything else. A different college's name on your product
is the cheapest possible credibility loss.

**Recommended fix**
Change to `Kolej Ibu Zain`. Better: source it from the `/home` API or a shared
constant in `@kiz/shared` so it can never drift again. Then grep the whole app for
other hardcoded institutional strings — `helpdesk.tsx:109` hardcodes office hours and
`scan.tsx:136` + `checkin.tsx:65` both hardcode *"go to Counter 2 (UKM Real Estate)"*,
which are the same class of bug.

---

### C6. Any network error strands the user on an infinite spinner

**Problem**
The pattern `if (isLoading || !data) return <LoadingScreen />` appears in **10
screens**: `laundry:79`, `chat:279`, `helpdesk/[ticketId]:61`, `bilik:85`,
`hilang:48`, `pejabat:138`, `checkin:29`, `tempahan:49`, `tempahan-fasiliti:79`,
`rumah-tamu:53`.

On a fetch error React Query sets `isLoading: false` and leaves `data` as `undefined`,
so the condition stays true **forever**. `query-client.ts:8` retries once, then stops.
Result: a full-screen spinner with no retry, no message, and no way out except killing
the app. Pull-to-refresh is unreachable because the `ScrollView` never mounts.

Only 3 of 15 screens handle this correctly (`pengumuman`, `panduan`, `helpdesk`) —
and `pengumuman.tsx:54-57` shows the right pattern already exists in-house.

**Why it matters**
Conference wifi drops. Your backend cold-starts. A judge taps "Laundry", sees a
spinner, waits, taps again, and concludes the app is broken. An infinite spinner is
the worst possible failure mode because it is indistinguishable from "very slow" — the
user cannot tell whether to wait or give up.

**Recommended fix**
1. Add an actionable error state to `ui/empty-state.tsx` (it currently accepts only
   `icon`/`title`/`message` — no CTA prop exists, see C7):
   ```tsx
   <KEmpty icon="error_outline" title="Couldn't load this"
     message="Check your connection and try again."
     action={<KButton label="Retry" onPress={refetch} />} />
   ```
2. Replace all 10 guards with `isLoading` only, then an explicit `isError` branch.
3. Set `retry: 2, retryDelay: exponential` in `query-client.ts`.
4. You already persist the query cache (`_layout.tsx:90-93`, 24h `maxAge`) — so
   **show stale cached data with an "offline" chip** instead of a spinner. This turns
   your biggest failure mode into a demo-able offline-first feature.

---

### C7. Empty states are structurally incapable of having a CTA

**Problem**
`ui/empty-state.tsx:5-13` — `KEmpty` accepts `icon`, `title`, `message`. **There is no
`action` prop.** Every one of the ~20 empty states in the app is therefore a dead end
by construction. The two screens that need a next step hack it by stacking a loose
`KButton` *outside* the component (`checkin.tsx:82`, `scan.tsx:234`), which renders
detached and left-aligned below the centred empty block.

The worst offenders:
- `tempahan.tsx:56` — *"No bookings yet / Book a facility or a guest house and it'll
  show up here."* Names the two actions it refuses to let you take. Both screens exist.
- `checkin.tsx:120` — *"No room assigned yet / Check at the KIZ office"* — tells a
  student to physically walk to an office, with no phone link and no helpdesk deeplink.
- `bilik.tsx:92` — ineligibility wall showing a raw server `reason` string, no appeal
  or contact path.
- `pejabat.tsx:155`, `tempahan-fasiliti.tsx:131`, `rumah-tamu.tsx:109` — `title` only,
  no `message`, no action. Bare.
- `scan.tsx:224` — misuses `KEmpty` as a *loading* state ("Preparing camera…").

**Why it matters**
Empty states are where a judge lands constantly on a fresh demo account — nothing is
booked, no tickets exist, no items reported. On a seeded demo device, **empty states
are the majority of what gets seen.** Every dead end is a moment where the app says
"there's nothing here and I won't help you," which is the opposite of the intelligent,
proactive impression you want.

**Recommended fix**
1. Add `action?: React.ReactNode` to `KEmpty` and render it centred under the message.
   One prop unlocks ~20 fixes.
2. Give every empty state a next step: *No bookings* → "Book a facility"; *No room
   assigned* → "Call KIZ office" + "Ask helpdesk"; *Not eligible* → "Contact the
   office"; *No tickets* → "Ask KIZ-AI instead" (routes judges toward your AI feature).
3. Add a separate `<LoadingBlock>` and stop using `KEmpty` for loading at `scan.tsx:224`.
4. Illustration over icon — a 56px grey circle (`empty-state.tsx:17-26`) is the
   lowest-effort empty state possible. A simple gradient-backed illustration is a
   visible polish upgrade on a screen judges see repeatedly.

---

### C8. No demo mode, no seeded showcase path, no offline resilience for AR

**Problem**
Everything worth scoring requires live infrastructure to align:

| Dependency | Failure mode during judging |
|---|---|
| `unpkg.com` for Leaflet JS+CSS (`ar-minimap.tsx:28,42`) | **AR minimap is a blank box** |
| `tile.openstreetmap.org` (`ar-minimap.tsx:56`) | Map renders with no basemap |
| `router.project-osrm.org` public demo server (`packages/shared/src/routing.ts:13`) | Arrow falls back to straight-line; route polyline vanishes |
| GPS fix + magnetometer | AR Directory shows "Waiting for the compass…" (`direktori.tsx:290`) |
| Backend `/api/v1/ar-translate` | KIZ Lens dead |
| Backend `/api/app-icon` | No logo on login |

There is no offline fallback, no cached tile pack, no scripted demo data, and no way to
show any AR feature indoors in a judging room where GPS is poor and wifi is shared.
Note also that **you are shipping a production app against OSRM's free public demo
server**, which is rate-limited and explicitly not for production use.

**Why it matters**
Judging happens in a conference room: bad GPS, saturated wifi, no time to debug. If
your two AR features can't run there, your highest-scoring work never gets seen. This
is a pure risk-management failure — the features work, but their demo probability is
low.

**Recommended fix**
1. **Bundle Leaflet locally.** Vendor `leaflet.js` + `leaflet.css` into
   `assets/` and inline them into the WebView HTML. Removes the single most likely
   demo failure for one afternoon of work.
2. **Add a Demo Mode** (hidden toggle in Profile, or a login-screen long-press):
   - Feeds a scripted GPS track so AR Directory animates a full walk to K18A indoors
   - Serves a canned KIZ Lens result for a bundled sample signboard image
   - Pre-seeds bookings, tickets, laundry timers and chat so no empty states appear
   This is the highest-ROI item in the whole document for competition outcome.
3. Pre-cache OSM tiles for the KIZ bounding box; fall back to a bundled static
   campus map image when tiles fail.
4. Self-host OSRM or add a graceful, *labelled* straight-line fallback so the
   degradation is invisible rather than broken.

---

# High Impact Improvements

Not ship-blockers, but each materially changes how polished and intelligent the app
feels.

---

### H1. Community chat ignores the design system entirely

**Problem** `chat.tsx` hardcodes a WhatsApp palette: `:88` six raw hex sender colors,
`:130` bubbles `#D9FDD3`/`#FFFFFF`, `:522-523` canvas `#EFEAE2`, `:525` `#000000`
shadow. `AGENTS.md` mandates pure-white surfaces with soft-gradient decoration only and
"never hardcode" colors. This is the one screen that looks like a different app.

Also at `:228`: a `check` icon renders on **every** own-message unconditionally. There
is no delivery state in the `ChatMessage` type — **this is a fake read receipt.**

**Why it matters** A judge swiping between tabs sees your design system break on one
screen, which reframes the rest as accidental rather than systematic. The fake
checkmark is worse: it is a UI element that lies, and if a judge asks "is that
delivered?" the honest answer is embarrassing.

**Fix** Re-skin onto `theme.colors` (own = `brand50`, other = `surface`, canvas =
`canvasSunk`). Derive sender colors from a token ramp. Delete the checkmark at `:228`
or implement real delivery state. Replace the four `Alert.alert` calls (`:284`, `:328`,
`:555`, `:557`) with the inline-banner pattern every other screen uses.

---

### H2. Silent mutation failures lose user data

**Problem** Mutations fired with no `onError`:
- `helpdesk/[ticketId].tsx:69-70` — fires `reply.mutate()` then immediately clears the
  input. **A failed reply silently deletes what the user typed.**
- `tempahan.tsx:89,129` — booking cancellation fails silently, with no confirmation
  prompt either
- `hilang.tsx:69` — "mark claimed" fails silently
- `bilik.tsx:193,201` — roommate accept/decline fail silently, on a flow the UI itself
  describes as irreversible (`:175`), with no confirm dialog
- `panduan.tsx:22` — `if (!url) return`: tapping "Read guide" on a guide with no file
  does nothing at all, no feedback

**Why it matters** Silent failure is the most destructive bug class in UX — the user
believes they succeeded and acts on a false model. "I cancelled my booking" followed by
a no-show fee is a real support incident.

**Fix** Add `onError` inline banners to all of the above. Optimistic-update the reply
and restore the draft on failure (the pattern already exists at `chat.tsx:325-327`).
Add confirm dialogs to booking cancellation and roommate accept/decline.

---

### H3. Date/time inputs use device-local time, violating the Asia/Kuala_Lumpur rule

**Problem** `ui/date-time-field.tsx:27-33` builds dates from
`getFullYear/getMonth/getDate/getHours`, and `prettyDate`/`prettyTime` (`:38`, `:44`)
omit `timeZone` from `Intl`. All device-local. Callers compound it:
`tempahan-fasiliti.tsx:174` and `rumah-tamu.tsx:209` use `minimumDate={new Date()}`;
`hilang.tsx:313` uses `maximumDate={new Date()}`; `rumah-tamu.tsx:25` parses
`new Date(\`${value}T00:00:00\`)` in local time.

`rumah-tamu.tsx` is internally inconsistent — `rangeLabel` (`:29-37`) correctly pins
MYT while its inputs do not, so display and entry disagree on the same screen.

**Why it matters** `AGENTS.md`: *"All date/time logic uses Asia/Kuala_Lumpur. Never
render UTC in the UI."* KIZ has many international students; a phone still on a home
timezone books the wrong slot or is blocked from selecting today. Facility slots are
the highest-risk path — a booking is a hard MYT concept.

**Fix** Rewrite `date-time-field.tsx` to construct and format in `Asia/Kuala_Lumpur`
using the helpers in `lib/timezone.ts` (promote the needed ones into
`@kiz/shared`). Replace all `new Date()` bounds with an MYT `todayMalaysia()`.

---

### H4. No skeletons — every screen flashes a full-screen spinner

**Problem** 12 of 15 screens replace their entire content with `LoadingScreen`,
destroying the nav header and tab context on every cold load. `pengumuman.tsx:54-57`
shows the correct in-content pattern already.

**Why it matters** Full-screen spinners make an app feel slower than it is and cause
visible layout thrash when navigating. Skeletons are the single clearest "this was
designed" signal in mobile UI, and judges swipe through screens fast — they will see
the flash on every tab.

**Fix** Build `ui/skeleton.tsx` (a shimmering `Box` — now easy, since you're adding
Reanimated for C2) and per-screen skeleton shapes for the 6 highest-traffic screens:
dashboard, announcements, laundry, helpdesk, my bookings, facilities. Keep the header
mounted.

---

### H5. Accessibility is largely absent

**Problem** Only 17 accessibility props exist across 10,904 lines, and 11 are in one
file (`index.tsx`). Findings:
- **Touch targets:** `pengumuman.tsx:179-216` reaction pills ≈ **26px**;
  chat reaction emoji `:389-397` ≈ 22px; every bottom-sheet "Close" is a bare
  `<Text variant="caption">` ≈ 18px with no `hitSlop` (`laundry:478`, `chat:570`,
  `pengumuman:260`, `hilang:234`, `pejabat:85`, `tempahan-fasiliti:166`,
  `rumah-tamu:162`); all filter/category pills ≈ 34px. Apple's minimum is 44×44.
- `helpdesk.tsx:131-139` — emergency contact rows are ~18px bare text **and are `tel:`
  links**. Dangerously small for an emergency affordance.
- No `Dynamic Type` support: every `fontSize` in the app is a fixed number, and
  `chat.tsx:130` / `laundry.tsx:296` use percentage widths that will clip at large
  text sizes.
- No `accessibilityLabel` on the AR arrow, the QR code, or any icon-only control
  outside `index.tsx`.
- `profile.tsx:65` — `if (!user) return null` renders a **completely blank white
  screen** with no loading or message.

**Why it matters** Accessibility is an explicit judging criterion at most innovation
competitions, and it is the easiest category to lose points in silently. A 26px tap
target is also just a bad experience — judges will mis-tap during their own demo.

**Fix** Enforce `minHeight: 44` + `hitSlop` in `KButton`/`ListRow`/pill primitives.
Replace all text-only "Close" affordances with a 44px icon button. Add
`accessibilityLabel`/`Role` to every icon-only control. Add
`allowFontScaling` + `maxFontSizeMultiplier` and test at 200% text. Give
`profile.tsx:65` a real loading state.

---

### H6. Booking flows have no validation and no conflict checking

**Problem**
- `tempahan-fasiliti.tsx:97` checks only presence — **no end-after-start validation.**
  You can submit 17:00 → 09:00. No availability check, so double-bookings are pushed
  to the server and surface as a generic error.
- `rumah-tamu.tsx:133` — `ranges.slice(0, 4)` **silently truncates** the booked-dates
  list with no "+N more". A user can request a range that looks free and isn't. The
  screen has `activeBookings` in hand and never checks overlap.
- No nights/price total shown before submitting a guest-house booking, despite price
  and capacity being displayed.
- Success banners (`tempahan-fasiliti.tsx:115`, `rumah-tamu.tsx:93`) never clear and
  don't link to My Bookings.
- `profile.tsx:125-128` — no email or phone validation before `PATCH`.

**Why it matters** Booking is the most-used transactional flow and the most likely
thing a judge tries. Server-side-only validation means every mistake costs a round
trip and produces a vague error. Truncated availability means the app shows information
that is actively misleading.

**Fix** Client-side validate end > start and min duration. Check `activeBookings`
overlap before submit and disable unavailable dates in the picker. Show full
availability (scrollable) or "+N more dates". Show a live nights × rate total.
Auto-dismiss success banners and add "View my bookings".

---

### H7. Dashboard hierarchy is flat — 8 equal-weight icons, no intelligence

**Problem** `index.tsx:16-25` — eight quick actions rendered identically at 56px. "SOS"
(life-safety), "AR Directory" (flagship innovation) and "Laundry" (convenience) are
visually interchangeable. `QUICK_ACTIONS` is a **static hardcoded array** — it never
adapts to role, time, or state. A `staf` user sees "Room Selection"; a student at 2am
sees the same grid as one at 9am.

`ThingsToDo` (`:157-174`) shows only **one** task (`:158`) despite rendering a
progress bar over all of them, so "1/5" appears with a single row and no way to see the
rest. `Announcement` (`:133`) shows only `pinnedAnnouncements[0]`.

The hero (`:82-96`) spends 228px of prime real estate on greeting + name + matric +
email + avatar — information the user already knows — while surfacing zero actionable
state (no room, no check-in status, no pending count).

Nine hardcoded hex values in `styles` (`:241-308`) bypass the token system entirely.

**Why it matters** The dashboard is the screen judges see most. A flat grid of equal
icons communicates "we listed our features" rather than "we understand our user." An
AI-powered app whose home screen is a static hardcoded array is a contradiction a sharp
judge will name out loud.

**Fix**
1. Three visual tiers: hero AI/AR block (C3) → 4 primary actions → overflow in More.
2. **Make the dashboard adaptive** — this is your cheapest credible "AI" surface.
   Reorder by role + time + state: laundry timer running → show countdown first;
   room-selection window open → pin it; after 10pm → SOS more prominent. Even
   rule-based, this reads as intelligent and is honest.
3. Show the room/block, check-in status and pending-approval count in the hero instead
   of the email.
4. Expand Things-to-Do to all incomplete tasks with the progress bar.
5. Move the 9 hex values to tokens.

---

### H8. AR Directory's first-run and fallback experience undersells it

**Problem** The intro (`direktori.tsx:177-196`) is a plain white screen with a heading,
one paragraph, and a "Get started" button — no visual, no preview of the AR view. It
gates on `AsyncStorage` (`:26`, `:64`), so it shows **once** and can never be
re-shown for a demo.

Permission handling is fragmented: camera is requested by a button (`:281`) but
location is auto-requested on mount (`:74`), so a user can face three separate system
dialogs with no explanation of why. The fallback row (`:278-298`) stacks up to three
different warning boxes in a `bottom={16} left={12} right={148}` strip that will
overflow on a small phone.

`target = selected ?? destinations[0]` (`:125`) means the screen silently
auto-targets an arbitrary first destination — the user sees an arrow pointing somewhere
they never chose.

**Why it matters** This is your headline AR feature. Its first 10 seconds are a wall of
text and permission prompts, and if the compass is slow the user sees "Waiting for the
compass… wave the phone in a figure-eight" over a black rectangle. That is the moment
judges decide whether AR works.

**Fix** Rebuild the intro as a full-bleed visual with a looping preview video/GIF of
the AR view. Explain all three permissions in one screen, then request together. Add
a "Replay intro" in Profile for demos. Default to *nearest* destination, not
`[0]`, and label it "Nearest: K18A". Consolidate fallbacks into one dismissible card.
Add a distance-based visual scale to the arrow so it feels spatial.

---

### H9. Onboarding slides are right-aligned bottom text with no safe-area guarantee

**Problem** `onboarding.tsx:133-144` — title and body are `alignItems="flex-end"` +
`textAlign="right"` at the bottom of a full-bleed image. Right-aligned body copy is
hard to read in any left-to-right language and unusual enough to read as a mistake.
Text sits directly on an admin-uploaded photo with only a gradient overlay whose
opacity is **admin-controlled** (`:116`, default 60%) — a light image plus a low
setting yields unreadable white-on-white with no runtime contrast guard. `Skip` is a
`rgba(0,0,0,0.25)` pill (`:80`) that will vanish on a dark image.

**Why it matters** These are literally the first pixels of your app. Unreadable
onboarding is a first-impression failure with no recovery, and the failure depends on
CMS content, so it can appear after you've tested.

**Fix** Left-align. Add a non-optional bottom scrim gradient
(`rgba(0,0,0,0.65)` → transparent) beneath the text independent of the admin overlay.
Enforce a minimum overlay opacity. Give `Skip` a solid backdrop. Add a "Back" affordance
and make the dots tappable.

---

# Nice to Have Enhancements

Genuine polish. Do these after Critical and High.

---

### N1. Tab bar is stock Expo Router with a truncation-prone label
`(tabs)/_layout.tsx` uses default `Tabs` with no blur, no custom height, no active
indicator. `"Resident ID"` (`:45`) is the longest label in a 5-slot bar and will
truncate on a 320pt device. You have `expo-glass-effect` and `@expo/ui` **installed and
never imported** — a frosted tab bar is nearly free. **Fix:** `GlassView` background
(iOS), a pill active indicator, shorten to "ID", add haptic on tab press.

### N2. 16 unmapped icon names silently render as a blank circle
`ui/icon.tsx:114` — `GLYPHS[name] ?? "circle"`. Sixteen names used in code have no
mapping, so they render as an empty circle with no dev warning. (Good news: all icons
referenced by `@kiz/shared` meta files *are* mapped — the gaps are local.) **Fix:** add
a `__DEV__` console warning on fallback, and switch the fallback to a visibly-wrong
glyph so gaps surface in testing.

### N3. Digital Resident ID is static and undersells itself
`kad-maya.tsx` renders a flat card with a 120px QR. No flip animation, no live
"verified at HH:MM" timestamp, no animated security shimmer, no brightness boost when
shown to security, no rotating token. **Fix:** boost screen brightness on mount, add a
subtle gradient sheen, show a live MYT timestamp, tap-to-flip for details. This is a
screen students open daily and judges will definitely tap.

### N4. Laundry notice banner never dismisses
`laundry.tsx:163-171` — persists until the next action, no close button, no auto-timeout.
Same for `tempahan-fasiliti.tsx:115` and `rumah-tamu.tsx:93`. **Fix:** a shared
auto-dismissing `<Toast>` with a close button.

### N5. Hardcoded radii and stale brand color bypass tokens
`pejabat.tsx:92` `borderRadius: 14` and `:166` `borderTopLeftRadius: 18` are
`radius.card`/`radius.cardLg` written as raw numbers — exactly the anti-pattern
`AGENTS.md` names. `ui/screen.tsx:31,47` hardcode `#0891B2` for the `RefreshControl`
tint and spinner. **Fix:** use tokens; read brand from theme.

### N6. Offices panorama is labelled "DRAG TO EXPLORE" but is a plain ScrollView
`pejabat.tsx:33` promises exploration; `:28` is a horizontal `ScrollView` over a
190px-tall image with two absolutely-positioned labels. `natural` width is `undefined`
on first render, causing a visible layout jump. **Fix:** either make it a real
pinch-zoom pannable viewer with tappable hotspots, or rename the label to match
reality. Over-promising an AR-adjacent interaction invites scrutiny you don't need.

### N7. Dead code and stubs
`tempahan.tsx:142` — `<Text variant="caption" style={{...}} />`: a self-closing `Text`
with no children, the only reason `useTheme()` is called at `:44`. `chat.tsx:386` —
"Message actions" placeholder copy. `nav.ts` — 13 `path: null` entries. **Fix:** delete.

### N8. QR scanner lacks standard scanning affordances
`scan.tsx` has no torch toggle, no scan-region overlay/reticle, no haptic on acquire,
and **no explicit "Scan again" after a failed scan** — `busy` resets but `error`
persists. **Fix:** add all four; a reticle plus a torch button is what users expect
from any scanner, and judges will demo this in a dim room.

### N9. Notification registration failures are invisible
`_layout.tsx:34-37` swallows `syncDeviceToken` errors with a bare comment. Push may be
silently broken forever. **Fix:** surface push status in Profile → Notifications with a
re-register action.

### N10. No app-wide error boundary
A render error in any screen white-screens the app. **Fix:** add an Expo Router
`ErrorBoundary` with a branded "Something went wrong / Reload" screen. Cheap insurance
against a crash during judging.

### N11. Biometric lock has no escape hatch
`app-lock.tsx:42-52` auto-prompts on mount; a cancel leaves you on the lock screen
with only "Unlock" or "Sign out instead" (`:88-95`). No passcode fallback — a failing
sensor means signing out and re-entering credentials. `biometric.ts` should allow
`DeviceOwnerAuthentication` so the OS passcode works. **Fix:** enable device-passcode
fallback.

### N12. KIZ-AI has no suggested prompts and loses history
`kiz-ai.tsx:30-36` opens with a greeting and an empty input — the hardest possible
start. State is local `useState` (`:30`), so **history is wiped on every navigation**.
No streaming; `busy` shows a static "KIZ-AI is thinking…" (`:117`). **Fix:** add 3–4
tappable starter chips ("Where do I pay my room fee?", "What time does the laundry
close?") — this is the single best way to get a judge to actually use your AI in the
10 seconds they'll spend on it. Persist history to AsyncStorage. Stream tokens.

---

## Suggested order of work

| # | Item | Effort | Why first |
|---|---|---|---|
| 1 | **C5** wrong college name | 2 min | Embarrassing, trivial |
| 2 | **C4** demo login + bundled logo + fallback slides | 2h | Unblocks judges exploring at all |
| 3 | **C6/C7** error states + `KEmpty` action prop | 4h | Removes worst failure mode |
| 4 | **C2** haptics + AR arrow spring + SOS ring | 1d | Biggest perceived-quality jump per hour |
| 5 | **C3** promote AI/AR on dashboard + rename + AI chips | 1–2d | Biggest *scoring* jump |
| 6 | **C1** unlock rotation + `useLayout` + maxWidth caps | 2d | iPad demo viability |
| 7 | **C8** bundle Leaflet + Demo Mode | 2d | Insurance for demo day |
| 8 | H1–H9 | ~1wk | Depth and consistency |
| 9 | N1–N12 | ongoing | Final polish |

**If you only do three things:** C5 (2 minutes), C4 (demo login — judges can't evaluate
what they can't enter), and C3 (surface the AI/AR you already built). Those three change
the competition outcome more than everything else combined.

---

## What is genuinely strong — protect it

Stated plainly so it doesn't get refactored away:

- **AR Directory** is real AR: `expo-camera` viewfinder + `watchHeadingAsync` with
  low-pass smoothing (`direktori.tsx:96-100`), OSRM route-following that aims at the
  *next point along the route* rather than the destination (`:162-165`), 25m-throttled
  refetch (`:140`), and a heading-up rotating radar. This is well beyond typical
  competition entries.
- **KIZ Lens** does OCR + translate + normalised box overlay with a correct
  `fitContain` projection (`ar-terjemah.tsx:25-34`) and TTS per line. The
  language preference persists. Genuinely useful for KIZ's international students —
  and a clear, demonstrable social purpose, which judges reward.
- **SOS** hold-to-confirm with office-hours-aware routing and release-to-cancel
  (`sos.tsx:68-72`) is thoughtful safety design.
- **Architecture:** `@kiz/shared` for pure logic, tokens driving both platforms,
  bearer-token REST layer reusing web `lib/*` helpers with no duplicated transactions,
  persisted offline query cache, biometric lock. This is disciplined work.
- **`pengumuman.tsx`, `panduan.tsx`, `helpdesk.tsx`** already implement the correct
  loading/error pattern — use them as the reference when fixing C6.
