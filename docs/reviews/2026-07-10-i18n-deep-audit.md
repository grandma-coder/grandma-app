# i18n Deep Audit — All Behaviors (2026-07-10)

## ⏸ RESUME HERE (progress as of session end)

**Committed & verified** (parity green, no over-escapes, 0 tsc errors in touched files):
- `fe258e1` — Batch 1–3: value-equality misses; 3 translation-template leaks (CycleAnalytics PHASE_VOICE, scan.tsx — **KidsHome sleepQuality/dominantLabel still TODO**); community (`channel/*`) + exams + shared-agenda alerts→t() (~118 keys). **Tooling**: new `scripts/i18n-sync-keys.ts`, hardened `i18n-fill-translations.ts` (imports modules, no key-drop/over-escape), new `scripts/i18n-untranslated.ts`, over-escape guard in `i18n-check.ts`, repaired pre-existing `\n`/quote corruption, normalized `cycleRing_note_*` one-per-line.
- `e732146` — Batch 4: prepreg + cycle-phase **prose** via `useTranslatedContent` (short labels = 32 static keys). English data files unchanged; translate at render.

**The workflow per batch** (proven, repeat it):
1. Dispatch parallel writer agents (general-purpose), each owning DISJOINT files. Rules: reuse `common_*` + existing keys (grep first); prose → `useTranslatedContent(idKey, en)` rendered as per-item sub-components (see `WeekDetailModal.tsx`); short labels → static keys reported back as `keyName | "English"`; add `as TranslationKey` cast so files compile before keys exist; DO NOT edit `lib/i18n/*`.
2. Collect reported keys → **dedup-guard** against existing (Batch 3 hit 6 collisions) → append to `en.ts` + `keys.ts`.
3. `npx tsx scripts/i18n-sync-keys.ts` (adds to all 12 locales) → `npx tsx scripts/i18n-check.ts` → `npx tsc --noEmit | grep -v onboarding/kids/index`.
4. `npx tsx scripts/i18n-fill-translations.ts pt-BR && … es`.
5. Re-verify parity + tsc, then commit **my files only** (see collision note).

**⚠️ Concurrent Diffuse agent** owns/edits (leave dirty, never stage): `app/onboarding/kids/index.tsx` (has a pre-existing syntax error at ~:947 — NOT mine), `components/analytics/KidsPillarCollage.tsx` (tsc errors — theirs), `app/(tabs)/_layout.tsx`, `components/home/cycle/DailyNudgeCard.tsx`, `MoodSymptomPickerSheet.tsx`, `KidsHome.tsx`, `KidsCalendar.tsx`. Verify tsc excluding these.

**Remaining batches** (in `docs/reviews/2026-07-10-i18n-deep-audit.md` worklist below):
- **Batch 5 — Analytics** (NOT STARTED; agents were cut off by session limit, PregnancyAnalytics partial edit reverted): PregnancyAnalytics (~90 sites, mostly static stat/label keys + prose tips/takeaways), KidsAnalytics (~50: health-tips prose + labels), CycleDetailSheets (empty-states→prose, mood/legend→static). Plus **KidsHome `sleepQuality`/`dominantLabel` leak** (keep as stable non-localized keys used for lookups; localize at render via label map + translate `qualityCopy` tag/blurb).
- **Batch 6 — Profile**: care-circle (~80), pregnancy (~55), kids (~50), notifications (settings 7×2 + 3 groups), + alert bodies in account/personal/privacy/memories/emergency-insurance/health-history.
- **Batch 7 — Calendar/log forms**: PregnancyCalendar (~25, several are 1-line reuse of existing keys the diffuse branch already uses), PregnancyLogForms (~45, incl 14× `Alert.alert('Error',…)`→`common_error`/`common_unknownError`), KidsCalendar/KidsLogForms (persisted routine-name issue — needs type→key lookup), CycleLogForms (9× Error alert), Simple/Meal forms.
- **Batch 8 — Chat + garage**: GrandmaTalk (quick-chips 18 label+18 prompt, idle/ready/typing/thinking pools ~40, greetings 16, error fallback), garage/* (CATEGORIES/CONDITIONS/AGE_GROUPS, photo-safety alert, GarageScreen empty states), lib/channelPosts.ts (3 system-msg templates).
- **Batch 9 — Shared + home + KidsHome**: PaperAlert/DatePickerField/SavedToast defaults, PeriodSelector, CustomRangeModal, AppointmentDetailModal, CalendarView, paywall (trial/CTA/legal), daily-rewards (quests), leaderboard; home cycle cards (MOOD_META/CM/LH dupes → reuse dashboard keys); **KidsHome datasets**: vaccineInfo (→useTranslatedContent) + growthLeaps (**dedupe KidsHome's copy to import lib/growthLeaps.ts first**, then wire) — all Diffuse-owned, coordinate.

---


Deep language review across all journey modes + shared surfaces, focused on the classes the lint guard **cannot** catch: `title=`/`label=`/`placeholder=`/`accessibilityLabel=` props, data arrays / object literals, function-return strings, `Alert.alert()` args, and English ternaries — plus registry keys whose translated value is byte-identical to English.

Two detection methods:
1. **Value-equality report** (`scripts/i18n-untranslated.ts`) — keys in the registry that pt-BR/es never actually translated. ~10 genuine misses after filtering neutral tokens.
2. **6 parallel `i18n-auditor` sweeps** — found un-extracted hardcoded strings (never keys at all). This is the bulk.

---

## Headline

The app's **chrome** (screen titles, buttons, nav) is well-translated. The gap is concentrated in:
- **Content datasets** in `lib/` (growth leaps, vaccine info, cycle-phase copy, prep-guide) — hundreds of strings, 0% wrapped.
- **`Alert.alert()` bodies** everywhere — the single most common miss (confirmation dialogs, error toasts). Lint guard is blind to these.
- **Option/picker data arrays** — roles, permissions, categories, conditions, symptom lists, mood labels.
- **Analytics & profile detail screens** — stat-tile labels, section headers, tips.
- **`fn-return` label helpers** — `formatAge`, `logTitle`, phase labels, "Today"/"Yesterday".

**Rough total: ~1,500+ user-facing strings** across ~60 files. Two `lib/` datasets (`growthLeaps.ts` + its `KidsHome` duplicate, `vaccineInfo.ts`) alone are ~575.

---

## Value-equality misses (registry keys never translated) — QUICK WINS

These are already keys; pt-BR/es just hold the English string. Fix by translating the value.

| Key | English value | Note |
|---|---|---|
| `channelInfo_deleteBodyAfter` | " and all its messages. This can't be undone." | prose |
| `cycleOnboarding_q_supplements` | "Any supplements you're taking?" | question |
| `kids_home_grandma_cta_title` | "Grandma knows best" | |
| `preg_onboard_dueDate_placeholder` | "mm/dd/yyyy" | should be locale date fmt |
| `preg_weight_kgTotal` | "kg total" | |
| `agendaHeader_title` | "Agenda." | |
| `insights_screenTitle` | "Insights" | |
| `cycleOnboarding_tempCelsius` / `_tempFahrenheit` | "°C Celsius" / "°F Fahrenheit" | |
| `preg_analytics_stat_volume` | "Volume" | |
| `grandmaTalk_header_talk` | "talk" | |

(Full list: `npx tsx scripts/i18n-untranslated.ts`)

---

## Un-extracted hardcoded strings by area (from 6 auditor sweeps)

### 🔴 lib/ content datasets — highest volume, best leverage
- `lib/growthLeaps.ts` — **~240** strings (10 leaps × name/desc/brainNote/phases/signs/skills/activities/tip). 100% untranslated. **Duplicated** in `components/home/KidsHome.tsx` (~240 more) — a known P1 dedupe ticket; dedupe before/with extraction.
- `lib/vaccineInfo.ts` — **~95** (protects/why/sideEffects × ~35 entries).
- `lib/cycleLogic.ts` — **~30+** phase labels/descriptions/tips/activities/nutrition/hydration. Feeds home ring, DailyInsights, CycleTracker.
- `lib/prepGuide.ts` — **~150+** (ICON_GUIDES why/how/watch × ~45, TITLE_OVERRIDES × 11, FALLBACK).
- `lib/prepregnancyData.ts` — learningModules (6) + preparationChecklist (10), title+desc each.
- `lib/birthData.ts` (out of listed scope) — birth-plan item/category names render raw. Flag.

### 🔴 Analytics (heaviest component files)
- `components/analytics/PregnancyAnalytics.tsx` — **~90+** sites: PILLAR_META blurbs, stat-tile labels, section titles/subtitles, hero captions, trimester tips, takeaway ternaries, score bands.
- `components/analytics/KidsAnalytics.tsx` — health-tips engine (~50), PILLAR_CONFIG labels, activity guide (duplicated 2×), score-breakdown labels, eat/sleep-quality labels.
- `components/analytics/CycleDetailSheets.tsx` — empty-state copy, legend text, MOOD_LABELS.
- `components/analytics/CycleAnalytics.tsx` — **PHASE_VOICE template leak**: raw English `voice.line` interpolated into a translated `t()` string (half-translated render). High priority.

### 🔴 Profile / account
- `app/profile/care-circle.tsx` — largest profile offender (~80 sites): ROLES, PERMISSION_LEVELS, `formatActivitySummary`, `friendlyTypeLabel`, invite/share messages, step titles, dozens of alerts.
- `app/profile/pregnancy.tsx` — ~55: SectionCard titles/subtitles, 12 checklist items, option arrays, alerts.
- `app/profile/kids.tsx` — ~50: SEX_OPTIONS, form labels/placeholders (duplicated Edit+Add forms), Missing-Info alerts.
- `app/profile/notifications.tsx` — NOTIFICATION_SETTINGS (7 label+desc) + GROUPS (3). Clean isolated array.
- `app/notifications.tsx` (inbox) — filter tabs, category labels, `timeAgo`, Today/Yesterday, empty states.
- `app/profile/account.tsx`, `personal.tsx`, `privacy.tsx`, `emergency-insurance.tsx`, `memories.tsx` — Alert.alert bodies only (chrome is clean).

### 🔴 Calendar / log forms
- `components/calendar/PregnancyCalendar.tsx` — ~25: WEEKDAYS, LOG_FORM_TITLE, LOG_META, MOOD_LABEL, big-display metric labels, delete alerts, tab labels. Several are one-line reuse of existing keys (diffuse branch already wired, classic branch not).
- `components/calendar/PregnancyLogForms.tsx` — ~45: 14× `Alert.alert('Error', …'Unknown error')` (→ `common_error`), APPOINTMENT_TYPES, EXERCISE_TYPES, NUTRITION_TAGS, NESTING/BIRTH_PREP categories, `${formatDate}` titles, placeholders.
- `components/calendar/KidsCalendar.tsx` — `formatLogDisplay` fn-return (meal/diaper/quality labels), routine-name placeholders, mood/diaper arrays.
- `components/calendar/KidsLogForms.tsx` — allergen/photo-fail alerts, routine-name fallbacks (persisted to DB — needs key-based redesign).
- `components/calendar/CycleLogForms.tsx` — 9× `Alert.alert('Error','Save failed')` (→ shared helper).
- `SimplePregnancyLogForm.tsx`, `PregnancyMealForm.tsx` — CONFIGS labels/placeholders, toast copy.

### 🔴 Chat
- `components/chat/GrandmaTalk.tsx` — quick-chips (18 labels + 18 prompts = 36), idle/ready/typing/thinking message pools (~40), greetings (16), error fallback, "Today/Yesterday", placeholder.

### 🔴 Community / marketplace
- `app/channel/[id].tsx` (~30) + `app/channel/info/[id].tsx` (~24) — almost entirely `Alert.alert` triples (transfer/delete/join/leave flows). Heavy reuse of `common_cancel`/`common_error` possible.
- `app/channel/create.tsx` — CATEGORIES array.
- `components/connections/GarageScreen.tsx` (~20), `app/garage/create.tsx` (~24: CATEGORIES/CONDITIONS/AGE_GROUPS + photo-safety alert + placeholders), `app/garage/[id].tsx`.
- `lib/channelPosts.ts` — 3 system-message templates.

### 🔴 Home components
- `components/home/KidsHome.tsx` — the GROWTH_LEAPS duplicate (~240) + MOOD_LABELS, DIAPER_COLOR_META, ACTIVITY_PILLARS, TIME_BUCKETS, goals slider labels, leap status badges, **interpolation leaks** (`sleepQuality`/`dominantLabel` English fallbacks fed into `t()` templates).
- `components/home/cycle/*` — CycleTodaySummaryCard (MOOD_META/CM_LABEL/LH_LABEL — dupes of already-translated dashboard keys), CyclePillarsGrid, FertileWindowModal/Card, FertilitySignalsCard (LogSheet titles).
- `components/home/MomentsOfCare.tsx` — MOMENTS array (also possibly mode-mismatched content).
- `components/prepreg/*` — WeekStrip DAYS, HormoneChart phases, HealthDashboard folic tip, DailyInsights PHASE_INSIGHTS (12 title+body).

### 🔴 Shared / cross-mode
- `components/ui/PaperAlert.tsx` (default "OK"), `DatePickerField.tsx`, `SavedToast.tsx` defaults.
- `components/analytics/shared/PeriodSelector.tsx` (Week/Month/3mo/Year/Custom), `CustomRangeModal.tsx` (From/To/Cancel/Apply), `AnalyticsHeader.tsx` default title.
- `components/calendar/AppointmentDetailModal.tsx` — STATUS_LABEL, section titles.
- `components/agenda/AppointmentList.tsx`, `ContractionTimer.tsx`, `CalendarView.tsx` — a11y labels, save-fail alerts, weekday/view-mode arrays.
- `app/(tabs)/_layout.tsx` — "dear" fallback name.
- `app/scan.tsx` — "camera"/"photo library" injected into translated permission string (leak).
- `app/paywall.tsx` — trial/CTA lines, "/year"/"/month" suffix (×3), legal disclaimer.
- `app/daily-rewards.tsx` — CATEGORY_CONFIG labels, per-mode quest copy.
- `app/leaderboard.tsx` — title, "Anonymous" fallback.
- `components/onboarding/OnboardingStep.tsx` — default `continueLabel='Continue →'`.

---

## Cross-cutting patterns (fix once, apply widely)

1. **`Alert.alert('Error', …)` / `('Cancel')` / `('Save failed')`** — recurs 40+ times. Reuse `common_error`, `common_cancel`, add `common_saveFailed`/`common_unknownError`. Consider a shared `showErrorAlert()` helper.
2. **Translation-template leaks** — English computed values interpolated into `t()` strings so the output is half-translated regardless of locale: `CycleAnalytics` PHASE_VOICE, `KidsHome` sleepQuality/dominantLabel, `app/scan.tsx` permission type. These need their own keys, not just wrapping the outer call.
3. **Diffuse vs classic branch drift** — several components already call `t()` in the Diffuse branch but hardcode English in the classic branch (`PregnancyCalendar` "Done · Week N"/"Soon", mood labels). One-line reuse fixes.
4. **Persisted English** — `KidsLogForms` writes routine names ('Meal','Nap','Bottle') into `child_routines.name`; `KidsCalendar` renders them raw. Can't fix at render — needs a type→key lookup.
5. **Duplicated dictionaries** — MOOD labels defined 4+ times across TodaySummaryCard/TodayDashboardModal/PregnancyCalendar; cycle CM/LH labels twice. Extract to one shared key set.
6. **No plural engine** — many `n !== 1 ? 's' : ''`. Convention: single-form.
7. **`fn-return` label helpers** — `formatAge`→"Newborn", `logTitle`, phase labels, "Today/Yesterday" (reuse `common_today`/`common_yesterday`).

---

## Suggested execution order (highest leverage first)

1. **Quick wins** — value-equality misses (~10) + reuse `common_*` for the 40+ Alert error/cancel literals.
2. **`lib/` datasets** — growthLeaps (dedupe first) + vaccineInfo + cycleLogic + prepGuide + prepregnancyData. ~575 strings, but mechanical and self-contained; unblocks home/analytics indirectly.
3. **Analytics** — PregnancyAnalytics, KidsAnalytics, CycleAnalytics (+ fix PHASE_VOICE leak).
4. **Profile** — care-circle, pregnancy, kids, notifications.
5. **Calendar/log forms** — error-alert helper first, then the data arrays.
6. **Chat** — GrandmaTalk chips + message pools.
7. **Community/marketplace** — channel/garage alert flows.
8. **Shared + home leftovers** — PaperAlert defaults, PeriodSelector, interpolation leaks.

After each batch: `npx tsx scripts/i18n-fill-translations.ts pt-BR && … es`, then `npm run i18n:check` + `npm run typecheck`.
