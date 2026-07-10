# v2 Design System — Entry & System Surfaces Spec (auth · onboarding · menu · settings · notifications)

**Date:** 2026-06-27
**Purpose:** Companion to the [surface logic spec](2026-06-27-v2-surface-logic-spec.md). That doc covers in-behavior surfaces (home/calendar/analytics/forms). **This doc covers the entry + system surfaces**: authentication, the full onboarding flows, the central "where to?" menu, the settings layers, and the notifications inbox — with real anatomy + data + states from the code.

These are mostly **behavior-agnostic** (they pick up the active behavior's accent/font but layout is identical), except onboarding, which is per-behavior. Hand this to Claude Design alongside the contract + surface logic spec.

Behavior keys: **Cycle** = `pre`, **Pregnancy** = `preg`, **Raising** = `kids`.

---

## A · AUTH (`app/(auth)/`)

Shared shell: cream canvas, a sticker or two (absolute, rotated), Fraunces display heading (often two lines: bold + italic), DM Sans body, ink-fill pill CTAs (58px, radius 999), reusable **InputField** (radius 20, label 10px uppercase + letter-spacing, input 18px). All errors are native `Alert`. Post-auth routes to home via the root auth listener (and resumes `?invite=` caregiver flow if present).

### Welcome (`welcome.tsx`)
- **Anatomy:** sticker collage (blob/burst/flower/heart) · GrandmaLogo 104 (sparkle) · "welcome to" (italic muted) · **grandma** wordmark (Fraunces 68/700) · "sees you." (italic coral) · body line · **Continue with Apple** (ink pill, iOS only) · **Continue with Google** (paper pill) · "Already have an account? **Sign in**".
- **Data/handlers:** `signInWithApple()` (nonce + Supabase id-token), `signInWithGoogle()` (OAuth browser session), `isAppleSignInAvailable()`.
- **States:** idle (fade+slide-up entry) · loading:apple / loading:google (opacity 0.6 + spinner) · error (Alert, cancel suppressed).

### Sign-in (`sign-in.tsx`)
- **Anatomy:** burst sticker · back pill · "Welcome / back, dear." (bold + italic) · "Grandma's been waiting." · Apple + Google pills · divider "or sign in with email" · **Email** field (email keyboard) · **Password** field (secure) · "Forgot Password?" (right link) · **Sign in →** ink pill ("Signing in…" while loading) · "New here? **Create account**".
- **Validation:** email regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`; password presence.
- **States:** idle · loading · error (missing info / invalid email / sign-in failed / network) — each a titled Alert, resets loading.

### Sign-up (`sign-up.tsx`)
- **Anatomy:** squishy + heart stickers · back pill · "What should / grandma / call you?" (bold×2 + italic) · subtitle · **Email** + **Password** (min 6) fields · **Continue →** ("Creating…") · "Sign in" link · terms line ("Terms of Serenity" + "Privacy Policy", underlined).
- **States:** idle · loading · errors (missing info / invalid email / password too short / sign-up failed / network) · **success** → toast "Welcome aboard! Check your email…" (3.2s) → replace to sign-in.

### Forgot password (`forgot-password.tsx`)
- **Anatomy:** heart sticker · back pill · "Forgot / password?" · prompt (or sent message) · **Email** field (hidden once sent) · CTA "Send reset link →" ("Sending…") → on success becomes "Back to sign in".
- **States:** idle · loading · error (missing/invalid/send-failed) · **sent** (hides input, shows success copy).

---

## B · ONBOARDING (`app/onboarding/`)

Shared shell: **OnboardingStep** — top bar (back pill · "N / Total" counter · skip/close) · Fraunces question (32) + optional italic suffix + optional sticker (rotated 8°) · input area · bottom **Continue →** ink pill (disabled until valid). `OnboardingNavContext` provides back/close without prop threading.

**Stores:** `useOnboardingStore` (persisted queue: behaviors in priority order pregnancy>kids>pre-preg; survives app kill) · `useJourneyStore` (persisted: parentName, dueDate, weekNumber, babyName) · ephemeral per-flow stores (Cycle/Pregnancy/Kids — cleared after successful Supabase write). Enrollment is **deferred until server writes succeed**. Re-entrancy guarded by `savingRef`.

### Entry — Journey picker (`journey.tsx`)
- **Anatomy:** header "1 / 10" · 3 journey cards (Cycle/Flower → `/onboarding/cycle`; Pregnancy/Heart → `/onboarding/pregnancy`; Raising/Star → `/onboarding/kids`) · Continue (appears when ≥1 selected).
- **Modes:** first-time = multi-select (queued); add-mode (`?addMode=true`) = single-select unenrolled (enrolled cards dimmed 0.55 "Active"). Empty state when all enrolled → "Back to Profile".
- **States:** card press toggles; continue enrolls first + routes to its flow.

### Transition (`transition.tsx`)
Between-flow celebration; auto-advances 8s. Per next behavior: sticker + heading (pregnancy "You're growing a human" / kids "Welcome to parenthood" / pre "Let's track your cycle") · mode-colored progress bar · Continue · Skip.

### Cycle onboarding (`cycle/`) — 5 steps (+3 if TTC)
1. **Last period date** — DatePickerField (max today, min −90d), required. (Flower)
2. **Cycle length + TTC toggle** — number 1–60 (default 28) + "I don't know" chip + Yes/No TTC. (Moon)
3. **Period duration** — chips [3–8] (default 5). (Drop)
4. **Health conditions** — multi chips (PCOS / Endometriosis / Other→free-text / Prefer not to say [exclusive]). (Leaf)
5. **Temp unit** — Celsius/Fahrenheit (default C). (Sun)
TTC extra: **trying duration** (just starting / few months / over a year) · **already tracking BBT?** (yes/not yet) · **supplements** (free text).
**Complete** — "All set!" → `saveAndFinish`: profiles (journey_mode pre-pregnancy + name), behaviors (cycle, active), cycle_logs (period_start row + JSON notes of all answers); sets cycle intent ttc/tracking.

### Pregnancy onboarding (`pregnancy/`) — 7 steps
1. **Due date** — DatePickerField (min today, max +10mo); pre-fills from pre-preg LMP+280d; week badge "week X — Y days to go". Required. (Heart)
2. **First pregnancy?** — Yes/No, required. (Star)
3. **Mood** — 6 cards (Excited/Happy/Calm/Anxious/Tired/Nauseous). (Sun)
4. **Birth place** — Hospital/Birth center/Home/Undecided. (Cloud)
5. **Care provider** — text. (Flower)
6. **Conditions** — multiline text. (Moon)
7. **Partner name** — text + hint. (Heart)
**Complete** — "You're growing a human!" + days-until-due countdown → `saveAndFinish`: profiles (+ due_date, health_notes), behaviors (pregnancy — **blocks on failure**), pregnancy_logs (note row + mood row), background `seedPregnancyData`.

### Kids onboarding (`kids/`) — dynamic: 1 + 6×N + partner + caregiver + complete
1. **Child count** — counter 1–6. (Star)
Per child (×N): **name** (req) · **DOB** (max today, min −18y; >6y warning; age badge) · **country** (search + 11-country chips, default US) · **photo** (AvatarPickerModal: photo or icon grid) · **allergies** (multi chips + Other→text) · **conditions** (multiline).
Then: **partner name** (text) · **caregiver** (role chips Partner/Nanny/Family/Doctor + name).
**Complete** — "Welcome to the family!" + child cards → `saveAndFinish`: profiles, behaviors (kids), children insert (+ photo upload post-insert to `child-photos`, compress 1600/0.7), child_caregivers (parent auto-accepted — **blocks, retries once**), care_circle (parent + pending partner/caregiver), Skeleton provision (fire-and-forget).

---

## C · CENTRAL MENU — "where to, {name}?" (`app/(tabs)/_layout.tsx` CenterTabButton)

Opened by the elevated coral **Burst (+)** in the tab strip. Modal + scrim, fan-opening animation.

- **Prompt:** "· menu ·" kicker · "where to, **{name}**?" (Fraunces 34, name in mode accent; name = profile.name → parentName → "dear", first word) · rule · "pick a corner".
- **5 fan items** (84px stickers, 168px radius, 210°–330° arc; label pill counter-rotated flat + italic subtitle):
  1. **Insights** "what grandma sees" — Burst/yellow → `/insights`
  2. **Daily** (rewards) "little gifts" — Flower/pink → `/daily-rewards`
  3. **Grandma** "voice · live" — Blob/lilac → `/grandma-talk`
  4. **Village** (garage) "pass it on" — Squishy/green → `/connections`
  5. **Channels** "find your people" — Blob/peach → `/connections?tab=channels`
- **Ambient confetti:** star (yellow) · heart (coral) · drop (blue).
- **Scrim:** cream (light) / dark ink (dark), fades 260ms; tap scrim closes.
- **Animation:** + button spins 135° + pulse; items fan out staggered (i×60ms, spring); close reverses (i×25ms) then `router.push` after 360ms. Item press: opacity 0.75 + scale 0.96.

### Tab strip (CollageStripTabBar)
84px, torn-paper top edge. 5 tabs: **Home** (yellow), **Agenda** (blue), **center +** (coral burst 72px elevated), **Vault** (green; icon = BarChart3/FileText/Shield per mode), **Settings** (lilac; coral unread badge if count>0). Each tab = 46px circle sticker + label (bold when focused, italic muted when not).

---

## D · SETTINGS (two layers)

### D1 · Settings tab (`app/(tabs)/settings.tsx`) — profile hub
- **Hero:** NotificationBell + gear (→ app settings) · ProfileHero (avatar + name + mode-aware subtitle) · BadgesStrip (5 recent + "See all") · MyJourneyPillGrid (Cycle/Expecting/Raising active selector → `setMode`).
- **Menu card rows** (icon + label + trailing + chevron):
  1. Care Circle — `{N} people` → care-circle
  2. Pregnancy — `Week X` / `Due {date}` → pregnancy *(if preg)*
  3. Cycle — "Tracking" → home *(if pre)*
  4. Kids Profile — `{N} children` → kids *(if kids)*
  5. Memories — "—" → memories *(if kids)*
  6. Health History — `Since {year}` → health-history *(if kids)*
  7. Emergency & Insurance — "Ready"/"Not set" → emergency-insurance
  8. Notifications — → notifications prefs
  9. Account & Security — → account
  10. Data & Privacy — → privacy
  11. Subscription & Plan — "Premium"/"Upgrade" → paywall
- **Footer:** Sign Out (confirm alert) · version (5-tap dev-panel easter egg).

### D2 · App settings (`app/profile/settings.tsx`)
- **DISPLAY:** Dark Mode switch → `useThemeStore`.
- **LANGUAGE:** "Select Language" row → picker modal (current chip "EN · English"); list of SUPPORTED_LANGUAGES (code chip + native + English name; active = yellow bg + check) → `useLanguageStore`.
- **UNITS:** Temperature segmented (°C/°F) · Weight segmented (kg/lbs) — active segment = yellow bg + hard shadow. *(local state; units store is a follow-up.)*
- **ACCOUNT:** **Sign Out** (lavender pill) → modal (Sign Out local / Sign Out All Devices / Cancel) · **Delete Account** (coral pill) → confirm → "contact support".

### D3 · Other profile screens (rows/fields)
- **account** — email (update) · password (change, eye toggle) · sign-out-all · delete.
- **privacy** — toggles (share w/ care circle, health data, photos, AI usage, analytics) · actions (export, clear logs/chat/memories/health) · legal links → `profiles.privacy_settings`.
- **notifications (prefs)** — 7 toggles in 3 groups (Daily: log reminder/insights/weekly; Health: appointments/cycle predictions/milestones; Community: care circle). Header "Notifications / how grandma reaches you". Each: sticker + label + description + switch (on = accent). Persisted to AsyncStorage `grandma:notification_prefs:v1`.
- **care-circle** — Members tab (cards: avatar/name/email/role badge/status/child chips/permission chips; Edit/Pause/Remove/resend) + Activity tab (filtered log) → `child_caregivers`, `child_logs`.
- **kids** — child cards (avatar/name/sex/age/allergy·condition·med chips/food/pediatrician) + add/edit sheets (Basic/Health/Food/Pediatrician/Notes) → `children`.
- **memories** — search + child filter + month + grid of photos + full-screen viewer (carousel, edit caption, delete) + add sheet → `child_logs` type photo, `child-photos` bucket.
- **health-history** — quick stat cards (vaccines/meds/temps/milestones) + vaccine tracker + meds + growth mini-chart + milestone timeline + recent events; child filter.
- **emergency-insurance** — emergency contacts (name/phone/relationship/primary) + insurance plans (provider/type/policy); add/edit modals.
- **badges** — summary (earned/locked/points) + sections by category with badge cards (locked = lock; earned = sticker + name + desc + tier + date).
- **personal** — avatar picker · name · language · allergies (chip autocomplete) · location (geocoded).

---

## E · NOTIFICATIONS INBOX (`app/notifications.tsx` + `lib/notifications.ts`)

- **Header:** back pill · "Notifications" + unread count badge (coral, "99+" cap) · "Mark all read" (CheckCheck; hidden when all read).
- **Filter row 1 — behavior** (only if 2+ enrolled): All + per behavior (Kids N / Pre-Preg N / Pregnancy N), each pill colored by behavior + count badge.
- **Filter row 2 — category:** All · Wellness · Health · Goals · Routines · Community · Insights (only categories with count>0; active = ink bg).
- **List:** SectionList grouped by date (sticky "TODAY"/"Yesterday"/date headers).
- **Notification card:** left **sticker badge** (42px circle, color + icon by type) · title (15px, 2-line) + unread dot · body (14px muted, 2-line) · footer = timestamp ("Xm/h/d ago") + category chip (mono, tinted). Read = surface bg; **unread = type-color tint bg + colored border + subtle shadow**. Press = scale 0.99.
- **Empty:** MissingStickers.NotificationsEmpty + title + message (varies by filter). **Loading:** BrandedLoader. **Pull-to-refresh:** runs notification engine.
- **Data:** `notifications` table (id, type, is_read, title, body, data jsonb, created_at; limit 50). Mutations: `markNotificationRead(id)` (optimistic) + `markAllNotificationsRead()`.

### Notification types → icon · sticker color · category (design all)
wellness_drop (TrendingDown·coral·Wellness) · wellness_improve (TrendingUp·green) · missing_data (AlertTriangle·peach) · routine_reminder (CalendarClock·lilac·Routines) · routine_missed (Clock·peach) · health_alert (Activity·coral·Health) · vaccine_due (Shield·blue) · goal_achieved (Target·green·Goals) · goal_missed (Target·peach) · streak (Flame·yellow) · streak_broken (Flame·coral) · insight (Sparkles·lilac·Insights) · milestone (Zap·yellow) · daily_summary (FileBarChart·blue) · weekly_report (FileBarChart·lilac) · mention (AtSign·lilac·Community) · reply (MessageCircle·lilac) · like (Heart·pink) · channel (Hash·blue) · care_circle_invite/accepted (Heart·pink·Care Circle) · pregnancy_week (Sparkles·lilac·Pregnancy) · appointment (CalendarClock·lilac) · reminder (Bell·yellow·Other).

**Deep-link by type:** wellness/summary/health → vault (or /insights in preg/pre) · missing_data/routine → agenda · streak → daily-rewards · insight/milestone → insights · social → channel · care-circle → manage-caregivers · appointment → agenda · pregnancy_week → home. Behavior-gated (only switch mode if enrolled).

---

## Final instruction for Claude Design (paste verbatim)

> Design every surface in this entry/system spec to the **exact anatomy, fields, copy, enums, and states** described — auth (4 screens), onboarding (journey + transition + the 3 per-behavior flows with every step's inputs/validation), the central "where to?" fan menu + tab strip, both settings layers + all profile sub-screens, and the notifications inbox (every notification type with its icon + sticker color + category + tint).
>
> These surfaces are **behavior-agnostic** — design the shared layout once and show how the **active behavior's accent + display font** swaps in (Cycle mono / Pregnancy serif / Raising handcraft), except onboarding which is per-behavior. For each surface produce: layout · element manifest (every field/icon/state, zero `…etc`) · all states (idle/loading/error/empty/success, + sent/filtered/all-read where relevant). Add these surfaces to the **coverage matrix** and resolve every notification type + every onboarding step in the **icon coverage table**. Flag anything you can't represent as an open question — never drop a step, field, or notification type.
