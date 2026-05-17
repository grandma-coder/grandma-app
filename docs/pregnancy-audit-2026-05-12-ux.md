# Pregnancy Behavior — UX & Logic Audit
**Date:** 2026-05-12 · Scope: home, agenda, calendar, analytics, onboarding, profile, birth-plan, pillar detail
**Findings only — no fixes applied.**

Severity legend: **H**igh = data-loss / silently-broken / blocks user · **M**ed = degraded UX or hidden surface · **L**ow = polish / a11y / i18n.

---

## A. Pregnancy Home & home/pregnancy/*

### `components/home/PregnancyHome.tsx`
- **L** 371 — `toLocaleDateString('en-US', …)` hardcodes English weekday label; ignores `useLanguageStore`.
- **M** 323-328 — `userId` resolved via one-shot `supabase.auth.getSession()`; no listener on `onAuthStateChange`. If session restores later (e.g. cold start race), child components like `TodaySummaryCard` (`userId &&`) render in a half-broken state with no recovery.
- **L** 234-244 — Routine chips lack `accessibilityLabel`/`accessibilityRole="button"`. State (`✓ Sleep` / `+ Sleep`) is encoded only as text glyph.
- **L** 442-465 — Birth Guide entry: `Pressable` has no `accessibilityLabel`, no `accessibilityRole`.

### `components/home/pregnancy/AffirmationRevealCard.tsx`
- **H** 21, 71, 77 — Three uses of `new Date().toISOString().split('T')[0]` for the daily cache key. West-of-UTC users will see "today's" affirmation flip at 5–8pm local. Should be `toDateStr(new Date())`.
- **M** 30-39 — RPC error from `get_daily_affirmation` is fully swallowed; user always sees fallback list. No telemetry/log, so a broken RPC is invisible.
- **L** 267-283 — Three `Animated.loop`s started in mount effect with no cleanup; cards re-render at deps changes can leak running animations.
- **L** 463 — Hardcoded English: "Reveal today's →", "Come back tomorrow for a new affirmation" (473), "Your daily wisdom awaits..." (444), "Share ↗" (493). No i18n.
- **L** 447-465 — Reveal button has no `accessibilityLabel`/`Role`.

### `components/home/pregnancy/TodayDashboardModal.tsx`
- **H** 41, 61 — Two `toISOString().split('T')[0]` calls used to build the 7-day window query and per-day match keys. Evening logs west of UTC will be missed from the sparkline and bar chart even though they exist.
- **M** 78-89 — `Promise.all([…])` has no `.catch`; if any of the three `fetchHistory` requests rejects, `setLoading(false)` never fires → spinner forever.
- **M** 51 — `fetchHistory` silently returns `[]` when `error` is set. No UI distinction between "no data" and "fetch failed".
- **L** No `EmptyState` or `Skeleton` used; raw `ActivityIndicator` for charts (254, 273).

### `components/home/pregnancy/PregnancyUserReminders.tsx`
- **H** 93-103 — `supabase.from('notifications').insert(...)` wrapped in bare `try {…} catch {}` — any RLS / column / network failure is silently dropped and the local reminder is still persisted to AsyncStorage. UI claims a server notification exists when it doesn't.
- **H** 133, 139, 152 — Notification updates fire-and-forget via `.then(() => {})`. Errors not surfaced; user can mark "done" while the server row stays unread.
- **M** 128 — `archivedAt: new Date().toISOString()` (UTC) is fine for archive but inconsistent with project convention (`toDateStr`) if displayed.
- **M** 105-111 — `id: Date.now().toString()` for client-generated reminders; race condition if two are added in the same ms (rare but possible).
- **L** AsyncStorage key namespaced by user — switching users leaves stale data in storage permanently (no cleanup).
- **L** Only 2 a11y labels (458, 460); add/delete/flag/edit buttons (542-549) lack any.

### `components/home/pregnancy/RemindersSection.tsx`
- **L** 81-82 — Hardcoded English copy ("Log your kick count", "Track 10 movements…").
- **L** No `accessibilityLabel` on reminder rows.
- **M** Renders nothing (`return null` line 89) when no items — fine, but a "you're all caught up" empty card would be a stronger UX signal here.

### `components/home/pregnancy/TodaySummaryCard.tsx`
- **M** 150-158 — `TodayDashboardModal` only mounts if `userId` is truthy; the parent Pressable still opens (`setOpen(true)`) when `userId` is `undefined`, leaving a no-op tap with no feedback.
- **L** 98-102 — All English literals ("Beautifully balanced day.", etc.).

### `components/home/pregnancy/AppointmentDetailModal.tsx`
- Generally well-formed (`onRequestClose`, backdrop tap, close button, scroll).
- **L** 122, 129 — `router.push('/(tabs)/agenda')` after `onClose()` from inside a `ScrollView` — works but rapid double-tap could race the close animation.
- **L** Body strings (`PREP`, `WHAT TO EXPECT`, `QUESTIONS TO ASK`, "Schedule in agenda") all hardcoded.

### `components/home/pregnancy/WeightTrendCard.tsx`
- **M** 92 — `(profileRes.data?.birth_preferences as any)` — exactly the cast pattern called out as dangerous; this is also where `prePregnancyWeight` and `height` are read. A column rename or `birth_preferences` becoming `null` is hidden.
- **M** 87-88 — `.map((r: any) => …)` cast hides the real shape; if `log_date` was renamed nothing would error at build time.
- **M** 68-105 — No error handling; `weightRes`/`profileRes` errors silently produce empty entries → "no data" state with no distinction from real-empty.
- **L** No `EmptyState` component used when `derived.current === null` and `loading` is false; card just renders "—" placeholders.

### `components/home/pregnancy/WeekDetailModal.tsx`
- Modal has `onRequestClose` and backdrop tap (231-233). OK.
- **L** No `KeyboardAvoidingView`; if anything ever puts an input in here later it'll be cut off (currently read-only, so OK).

### `components/home/pregnancy/AffirmationShareModal.tsx`
- **M** Uses `presentationStyle="pageSheet"` (143) — pageSheet on iOS swallows `onRequestClose` for back-button on Android only, but Android falls back fine. Acceptable.
- **L** Hardcoded English: style toggle labels (~186-203).

### `components/home/pregnancy/WeekCard.tsx`
- **L** 120-188 — Pressable with no `accessibilityLabel` (visually shows week + days but the label is split across multiple Texts).

---

## B. components/pregnancy/*

### `PregnancyJourneyRing.tsx`
- **H** 79, 309 — `toISOString().split('T')[0]` for the week range and fallback window queries. Edge-of-day west-of-UTC bug.
- **M** 313-323 — Query throws on error (good), but no `EmptyState` for "no logs this week" path in the consuming UI (logs panel just renders nothing).
- **M** Polls via `refetchOnMount: 'always'` + `useFocusEffect` (330-334); not real-time. OK per CLAUDE.md.

### `BirthGuideModal.tsx`
- **L** All tile titles/subtitles (44-58) hardcoded English.
- **L** Tile `Pressable`s lack `accessibilityLabel`/`Role`.
- OK on modal dismiss.

### `BirthDetailModal.tsx`
- **L** 432 — `Linking.openURL(s.url).catch(() => {})` swallows URL errors silently; if a deeplink is malformed user gets no feedback.

### `MilkControl.tsx`
- **H** 30-50 — `onStartSession` is called but no error / loading / persistence path exists in the component; the prop is optional. If parent doesn't wire it, every tap is a **dead button** with no visual feedback.
- **L** All English; "Milk Control", "Track breast, bottle, and pump sessions", "Today's Sessions" hardcoded.
- **L** Uses raw emoji 🤱 🍼 ⏱️ in `FEED_BUTTONS` — accessibility readers say "person breastfeeding emoji".

### `PartnerDashboard.tsx`
- **H** 49-58 — "Shared appointments" and "Partner's guide" are rendered as `View` rows with **no `Pressable` / `onPress`** but visually look like buttons. **Pure dead UI**.
- **L** Uses `colors.accent` import (line 40) from the legacy `colors` export rather than `useTheme()`.

### `WeeklyInsight.tsx`
- Not read in full but small (101 lines) — likely fine. Worth a follow-up scan.

### `BirthTypeCard.tsx`
- **L** 24 — Pressable `onPress` is optional; if parent passes `undefined` (per `app/birth-plan.tsx` line 58 fallback), it's a dead tap with no visual cue.

---

## C. Agenda

### `components/agenda/AppointmentList.tsx`
- **H** 53-67 — `handleSubmit` calls `onAdd?.(...)` — if parent doesn't pass it, the modal closes but **nothing is saved**. No try/catch, no Alert.
- **H** 133-203 — `Modal` has no `onRequestClose` and **no backdrop tap**. Android back button does nothing; iOS swipe-down only on `presentationStyle="pageSheet"` (not used here, default).
- **M** 5 — Imports legacy `colors, THEME_COLORS` from `constants/theme` — non-tokenized. Visual debt.
- **L** All copy English.
- **L** No `accessibilityLabel` on Add Appointment / Cancel / Submit.

### `components/agenda/ContractionTimer.tsx`
- **H** This component **never writes** to `pregnancy_logs`. It exposes `onSave` prop (13) that is never invoked (`handleReset`/`endSession` don't call it). Even when contractions complete, the data only exists in local state and is lost on unmount. The 5-1-1 alert is also local-only.
- **M** 5 — Uses legacy `THEME_COLORS`/`shadows.pop`.
- **L** No `accessibilityLabel` on start/stop button.

### `components/agenda/KickCounter.tsx`
- **M** 53-61 — `endSession` calls `onSaveSession?.(...)` then resets; if `onSaveSession` is missing the entire session vanishes. No internal save fallback, no user-visible toast confirming the save.
- **M** 5 — Legacy `THEME_COLORS`/`shadows`.
- **L** Empty state: no sessions → no message under "Recent sessions" (component just hides the section). Should use `EmptyState`.

### `components/agenda/SymptomLogger.tsx`
- **M** 43-47 — `onLog?.(...)` optional prop, no internal save. Same dead-button risk if parent forgets the handler.
- **M** Whole module uses legacy `colors`/`THEME_COLORS` imports (line 5).
- **L** No a11y labels on 10 symptom cards.

---

## D. Calendar / Log Forms

### `components/calendar/PregnancyLogForms.tsx`
- Generally solid (`Alert.alert` on error, optimistic patching, proper `log_type`/`log_date`/`user_id` columns).
- **M** 345-346 — Appointment `value` stores `finalType` (the appointment label) and `notes` stores stringified JSON; but later display code in `PregnancyJourneyRing.tsx` (line 99) labels `appointment` as 'Appt' and never parses the JSON to extract doctor/notes.
- **M** 196-209, 308-316 — Symptom and appointment type lists are hardcoded; no i18n.
- **L** No `KeyboardAvoidingView` wrapping any of the 15 forms. The Appointment form has 3 inputs (custom-type, doctor, notes) and the Symptoms/Nutrition forms have multiline notes — keyboard will cover the save button on small devices.
- **L** Weight form 1346-1349 — only checks `isNaN(parsed) || parsed <= 0`; no upper bound (a typo'd `1700` kg saves successfully).
- **L** No `accessibilityLabel` on mood faces / symptom chips / Tap-for-kick button.

### `components/calendar/SimplePregnancyLogForm.tsx`
- **H** 72-83 — Saves optimistically then `try { … } catch { rollback; return }` — error is **completely silent**, no Alert, no toast. User thinks they logged a weight but server insert failed.
- **M** 56 — `if (!userId || !value.trim()) return` — silent no-op when `userId` is missing; button isn't disabled visually in that case.
- **L** No keyboard avoidance (form is rendered inside a sheet).

### `components/calendar/PregnancyCalendar.tsx`
- **M** 488 / 518 — `pregnancy_routines` insert/update uses Alert for failures (good), but `delete` on 539 is fire-and-forget with no error handling.
- **M** 1160-1164 — `Alert.alert('Delete log?', …)` confirmed but the delete itself (`supabase.from('pregnancy_logs').delete().eq('id', log.id)`) has no `.then/.catch` — failures silently leave the row.
- **M** Routine edit modal (875-973) and confirm-delete modal (976-1060) both rely on overlay `Pressable` for backdrop close — OK, but neither calls `onRequestClose` consistently (only outer one).
- **L** 1423 — `new Date().toISOString().split('T')[0]` for `todayKey`. Wrong tz.
- **L** 175-184 — `} catch { }` twice; errors silenced.

### `components/calendar/PregnancyMealForm.tsx`
- Not fully read; flagged for follow-up scan (food-ai edge function flow).

---

## E. Analytics

### `components/analytics/PregnancyAnalytics.tsx`
- **L** 1423 — `new Date().toISOString().split('T')[0]` — same tz bug.
- **L** 175, 184, 304, 326 — multiple `} catch { /* fall through */ }` blocks swallow analytics fetch errors. Charts then render empty with no distinction from real-empty.
- **M** Both detail sheets (859/2049) use full-screen Pressables for backdrop dismiss but **no `onRequestClose`** on the Modal wrapper itself (check at 855 region) — Android back will not close in standard cases. Worth verifying line by line; flagged.
- **L** No `EmptyState` or `Skeleton` integration; raw placeholder text.

---

## F. Onboarding

### `app/onboarding/pregnancy/index.tsx`
- **H** 152 — `new Date().toISOString().split('T')[0]` — UTC date for the onboarding `log_date`. (Was previously called out; still present here.)
- **H** 144-148 — `supabase.from('behaviors').insert(...)` uses `type: 'pregnancy'` and `active: true` with no `await error` check and no error surface. If the insert fails (RLS, duplicate, schema drift) the user enters the app with no behavior row → mode logic may misbehave.
- **H** 188 — Same on `pregnancy_logs.insert(logs)` (multi-row): result not destructured for error, completely silenced.
- **H** 199 — `seedPregnancyData(...).catch(console.warn)` — only logs to console; user sees nothing if seeding fails.
- **H** 201-203 — Outer `catch (e) { console.warn(...) }` — every onboarding-save failure is silenced. User completes happy path UI but data may be missing.
- **M** 194 — `pregnancyStore.setMood(store.mood as any)` — `as any` cast; type mismatch hidden.
- **M** 133-141 — `profiles.upsert({ id: userId, health_notes: … }, { onConflict: 'id' })` — no `await error` check.
- **M** 110-112 — `goSkip` is just `goNext` — "Skip" semantically loses the field; if the field was partially filled the value still persists in the zustand store. Acceptable but worth a UX note.
- **M** 118-121 — `handleClose` clears all and `router.back()` without confirmation; mid-flow accidental tap loses everything.
- **L** 60-67 — MOOD_OPTIONS uses raw emoji 🤩 😊 etc — same a11y issue as MilkControl.
- **L** 220 — `KeyboardAvoidingView` only on iOS (`behavior={Platform.OS === 'ios' ? 'padding' : undefined}`); Android with a software keyboard will overlap the text inputs on conditions (multi-line) and partner-name screens.
- **L** No screen-level form error surface; `Alert.alert` is the only error UX and it fires only once at the end.

### `app/onboarding/due-date.tsx`
- **M** 51 — `new Date(dateInput)` with raw `mm/dd/yyyy` string parsing relies on JS Date heuristics — different locales parse differently.
- **L** 48 — `Alert.alert` is the only error path; no inline `FieldError`.
- **L** No `KeyboardAvoidingView` (probably fine — no text input).
- Skip (75-78) silently drops the data; no confirmation.

### `app/onboarding/baby-name.tsx`
- **L** 96-99 — "We haven't decided yet" link does same `handleContinue`; quietly OK.
- **L** Skip in header (62-65) just continues without saving — acceptable but no visual indicator that name will be blank.
- Has KAV. OK.

---

## G. Profile / `app/profile/pregnancy.tsx`

- **H** 716-732 — `applyDueDate`: updates 4 stores synchronously, then `await persistDueDateToDb(iso)` after a setState. If the DB write fails, the local stores are already mutated → user sees a new due date that doesn't exist server-side. No rollback.
- **H** 855-871 — `saveLmpDate` → `saveBirthPreferences(...)` (no await error rollback) → recomputes due date and writes again. If the first save succeeds but `persistDueDateToDb(newDue)` fails, profile is half-updated. Alert fires only on the second failure.
- **M** 873-887 — `saveProfileField` updates `profiles` with `[field]: value` dynamic key — any caller typo (e.g. `setProfileField('blood_typ', …)`) is an invisible no-op (Postgres errors caught and Alert'd, but unclear which field). Consider whitelisting fields.
- **M** 808-810 — Initial `load()` has a bare `catch { /* silent */ }` — failure to load profile shows the screen with empty defaults and no error.
- **M** 1525-1529 — `setSavedAlertVisible` modal: confirm has `onRequestClose` but no backdrop tap implementation that I can see in the snippet — minor.
- **L** 25 — Has `KeyboardAvoidingView`? **Not imported.** Form has 3 TextInputs inside Modals (177-204, 339-410, 453-510) without KAV wrapping.
- **L** 1331-1358, 1409-1436 — Postpartum / nesting checklists track `done` state in local React state only; **never persisted**. Toggle persists during the session but is gone on reload. Likely a stub.

---

## H. Routes

### `app/birth-plan.tsx`
- **L** 36-40 — Back button has no `accessibilityLabel`.
- **L** 43 — Hardcoded "explore your options, prepare for the big day, dear" (and most other strings) — no i18n.
- Hospital bag checklist items (91-96) render with a `checkCircle` `View` — **looks tappable but isn't**. No `Pressable`, no state. Dead UI presented as interactive.

### `app/pillar/[id].tsx`
- **L** 32-37 — `handleSuggestion` routes to library — fine. No `accessibilityLabel` on chips.
- **L** 11 — Imports legacy `colors, typography, spacing, borderRadius` from `constants/theme` not `useTheme()`.
- **L** Mode-aware: pulls pillar from 3 lists union; works but loses behavior context (no way to know which mode the user was in when entering).

---

## I. Cross-cutting

- **i18n:** ZERO `useLanguageStore`/translation usage across PregnancyHome and all `components/home/pregnancy/*`, `components/pregnancy/*`, `components/agenda/*` (pregnancy-related), `app/profile/pregnancy.tsx`, `app/birth-plan.tsx`, and `app/onboarding/pregnancy/index.tsx`. ~100+ hardcoded English strings.
- **Realtime:** No realtime subscriptions found on any pregnancy surface. OK per CLAUDE.md.
- **Claude direct calls:** None found in this scope. OK.
- **profiles.id vs user_id:** All pregnancy reads of `profiles` correctly use `.eq('id', userId)`. Compliant.
- **Birth-edge logic:**
  - At week 41+, `PregnancyHome` still shows future weeks in carousel; "X days to go" goes negative via `getDaysToGo` — need to verify clamping (not inspected in `lib/pregnancyData.ts`).
  - `app/onboarding/pregnancy/index.tsx` clamps to 1–42 (84-85) — OK.
  - `app/onboarding/due-date.tsx::calculateWeek` (35-44) clamps low (`Math.max(1, …)`) but **no upper clamp** — a date 2 years in the past yields negative `weeksLeft` → week=130. Garbage in store.
  - Past due dates: `getCurrentWeekFromDueDate` not inspected; if it can return negative values, the WeekCard carousel `scrollToIndex(Math.max(0, week-1))` (101) goes to index 0 (week 1) — odd UX.
- **Mode switching exits:** `usePregnancyStore` is not persisted (per CLAUDE.md). Switching to kids leaves no dangling state. The ambient `Animated.loop` in `AffirmationRevealCard` continues running while the card is mounted; if pregnancy home stays mounted under kids (router-dependent), animations keep firing. Likely benign.

---

## Top 15 most impactful (action this first)

1. **H · `app/onboarding/pregnancy/index.tsx:144-203`** — Multiple silent inserts (`behaviors`, `pregnancy_logs`, `profiles`) with no error surfacing; whole onboarding `try/catch` only `console.warn`s. Users complete onboarding while data may be missing.
2. **H · `app/onboarding/pregnancy/index.tsx:152`** — `new Date().toISOString().split('T')[0]` for onboarding `log_date` (UTC tz bug).
3. **H · `components/agenda/ContractionTimer.tsx` whole component** — No persistence path; sessions vanish on unmount, `onSave` prop never invoked internally. Mission-critical late-pregnancy tool.
4. **H · `components/calendar/SimplePregnancyLogForm.tsx:72-83`** — Failed insert rollback is fully silent (`catch { rollback; return }`); user thinks they logged but didn't.
5. **H · `components/home/pregnancy/AffirmationRevealCard.tsx:21/71/77`** — Three UTC `toISOString` usages; daily affirmation flips at evening for west-of-UTC users.
6. **H · `components/home/pregnancy/TodayDashboardModal.tsx:41,61`** — Two UTC date keys breaking 7-day chart joins.
7. **H · `components/pregnancy/MilkControl.tsx`** + **`components/pregnancy/PartnerDashboard.tsx:49-58`** — Buttons / action rows with no `onPress` wiring — dead UI.
8. **H · `components/agenda/AppointmentList.tsx:133-203`** — Modal has no `onRequestClose` / backdrop tap → Android back button trap; `onAdd` is optional, save can silently no-op.
9. **H · `app/profile/pregnancy.tsx:716-732`** — Due-date local store updates before DB write completes, no rollback on failure; UI displays a value the server doesn't have.
10. **H · `components/home/pregnancy/PregnancyUserReminders.tsx:93-152`** — Notification CRUD fire-and-forget with bare `catch {}`; local reminders divergent from server.
11. **M · `app/onboarding/due-date.tsx:35-44 calculateWeek`** — No upper-bound clamp; past LMP dates produce nonsensical week numbers stored in `useJourneyStore`.
12. **M · `app/profile/pregnancy.tsx:1331-1358, 1409-1436`** — Postpartum and nesting checklist state lives only in component state, never persisted. Functional stub presented as a feature.
13. **M · `app/birth-plan.tsx:91-96`** — Hospital bag checklist items render as visual checkboxes but are not interactive (no Pressable / state).
14. **M · `components/agenda/KickCounter.tsx` + `SymptomLogger.tsx`** — Both depend on optional `onSave` / `onLog` props with no internal fallback; if a parent screen forgets to wire, taps are silent no-ops.
15. **M · `components/calendar/PregnancyLogForms.tsx` (all 15 forms)** — No `KeyboardAvoidingView` wrapper; multi-input forms (Appointment, Symptoms/Nutrition with notes) hide the save button behind the keyboard on iPhone SE / smaller Androids.

---

## Quick-win cluster (cheap fixes, big surface)

- Replace all `new Date().toISOString().split('T')[0]` → `toDateStr(new Date())` across the 9 occurrences listed in §A/§B/§D/§E/§F.
- Wrap `LogSheet`-hosted log forms in `KeyboardAvoidingView` once (single edit in `LogSheet`).
- Add `accessibilityLabel` + `accessibilityRole="button"` to the routine chips (PregnancyHome:234), reminder rows (RemindersSection:94), birth-guide tiles (BirthGuideModal), and check-in buttons (KickCounter, ContractionTimer).
- Replace bare `catch { }` blocks with at least a `console.warn` + visible toast/snackbar in: PregnancyUserReminders, PregnancyAnalytics, SimplePregnancyLogForm, onboarding/pregnancy/index, profile/pregnancy load().
- Hook `components/agenda/AppointmentList` `Modal` with `onRequestClose={() => setShowAdd(false)}` and a backdrop `Pressable`.
