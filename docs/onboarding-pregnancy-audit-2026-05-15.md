# Pregnancy Onboarding Audit — 2026-05-15

**Scope:** `app/onboarding/pregnancy/{_layout,index}.tsx`, `app/onboarding/due-date.tsx`, `app/onboarding/baby-name.tsx`, `store/usePregnancyOnboardingStore.ts`, `lib/pregnancyWeeks.ts`, `lib/pregnancyData.ts`, `lib/pregnancyInsights.ts`, `lib/pregnancySeeds.ts`.

---

## 1. Flow Map

**Two independent entry points exist; they don't connect.**

### Entry A — legacy shared path (`due-date.tsx`)
```
journey → due-date.tsx → baby-name.tsx → activities.tsx → …
```
Writes only to `useJourneyStore`. **Nothing reaches Supabase.**

### Entry B — behavior-queue path (`pregnancy/index.tsx`, 7 steps)
| # | Step | Input | Required? |
|---|------|-------|-----------|
| 1 | Due date | `DatePickerField` max +10 mo | ✅ |
| 2 | First pregnancy? | Yes/No toggle | ✅ |
| 3 | How feeling? | 6-mood grid | Skippable |
| 4 | Birth place | 4 chips | Skippable |
| 5 | Care provider | TextInput | Skippable |
| 6 | Conditions/allergies | Multiline | Skippable |
| 7 | Partner name | TextInput | Skippable |

→ Completion → `saveAndFinish()` → `behaviors.insert` + `profiles.upsert(health_notes)` + `pregnancy_logs` note + mood + `usePregnancyStore` local.

**Missing from both flows:** LMP entry (Entry B), multiples question, parity count, LMP carryforward from pre-preg onboarding.

---

## 2. Findings

### [Bug] P0 — Week formula is off by one
**Files:** `app/onboarding/pregnancy/index.tsx:80-87`, `lib/pregnancyData.ts:71-76`, `lib/pregnancyWeeks.ts:62-68`

All three:
```ts
const week = 40 - Math.floor(daysLeft / 7)
```

**Sample: due 2026-09-15, today 2026-05-15:**
- daysLeft = 123
- app shows: `40 - floor(123/7) = 40 - 17 = 23`
- correct: `floor((280 - 123) / 7) = 22`

**Every pregnant user sees the wrong week.** Propagates to week ring, baby-size card, week-focus content selection.

**Fix:** `40 - Math.ceil(daysLeft / 7)` (or `Math.floor((280 - daysLeft) / 7)`).

### [Bug] P0 — `behaviors.insert` creates duplicate rows
**File:** `index.tsx:146`. Use `upsert({ user_id, type:'pregnancy', active:true }, { onConflict: 'user_id,type' })`.

### [Bug] P0 — Mode may not flip to `pregnancy`; home renders `KidsHome`
**File:** `hooks/useOnboardingComplete.ts:35-39`. Reads `enrolledBehaviors[0]` after the async save. `useBehaviorStore.enroll('pregnancy')` is never explicitly called in `saveAndFinish`. On fresh install with empty store, `first=undefined`, `setMode` never fires, default `'kids'` wins. **Fix:** pass `'pregnancy'` explicitly to `onboardingComplete`.

### [Bug] P0 — Entry A writes to `useJourneyStore`; `PregnancyHome` reads `usePregnancyStore`
**Files:** `due-date.tsx:70`, `components/home/PregnancyHome.tsx:309-312`

A user routed through Entry A always sees week 1, no baby size — store mismatch. Consolidate to Entry B, or have Entry A also call `usePregnancyStore.setDueDate`.

### [Bug] P1 — UTC date parsing flips week ±1 in evening
**Files:** `due-date.tsx:51`, `index.tsx:81,90` — `new Date('2026-09-15')` = UTC midnight. Use `new Date(dueDateStr + 'T00:00:00')` as `lib/pregnancyWeeks.ts:63` already does.

### [Bug] P1 — Due date never written to `profiles`
**File:** `index.tsx:159-215`. Only persisted in JSON blob (unreadable) + AsyncStorage. Lost on reinstall. Add `profiles.upsert({ id, due_date })`.

### [Bug] P1 — `getBirthFocusForWeek` falls back to "Labor Signs" for weeks 1-3 and 41-42
**File:** `lib/pregnancyInsights.ts:95-98`. `WEEK_FOCUS[2].focus` is the wrong default. Clamp `safeWeek = max(4, min(40, week))`.

### [Bug] P1 — `pregnancySeeds.ts:10` uses `toISOString().split('T')[0]`
Violates project local-date rule. Use `toDateStr`. Seeds appear dated in the future for evening users west of UTC.

### [Bug] P1 — `handleClose` missing `store` in deps; `saveAndFinish` lacks return type
`index.tsx:120-123, 127`. Strict-mode violations.

### [Architecture] P1 — LMP from pre-preg onboarding not carried forward
**Files:** `cycle/index.tsx:241-242`, `pregnancy/index.tsx`. Should pre-populate due date from `useCycleOnboardingStore.lastPeriodDate + 280d`.

### [Bug] P2 — Completion CTA hardcodes `'#FFFFFF'` and uses `radius.lg`
`index.tsx:858, completeStyles.button`. Replace with `PillButton`.

### [Architecture] P2 — Baby name + partner name never reach Supabase
`baby-name.tsx:35` → only `useJourneyStore`. Partner → JSON blob only. Lost on reinstall.

### [Architecture] P2 — Store not persisted; app kill drops 5+ steps of work
`store/usePregnancyOnboardingStore.ts`. Add `persist` middleware (partialized to `dueDate`+`firstPregnancy`).

### [Cleanup] P2 — `moodEmoji` applies `Fraunces_600SemiBold` to emoji
Dead style.

### [Cleanup] P2 — `due-date.tsx:91` hardcodes step counter `"4 / 10"`
Will silently drift on flow restructure.

---

## 3. Edge Value Matrix

| Input | App behavior | Bug? |
|---|---|---|
| Due 2026-09-15, today 2026-05-15 | Shows week 23 | Yes — correct 22 |
| Due today (W40) | Shows week 40 | Correct |
| Due 2d ago | daysUntil=0, clamped W42 | Acceptable |
| Due +10 mo (max) | Clamped W1 | Correct |
| LMP > 10 mo ago | Blocked | Correct |
| Week 41-42 overdue | getWeekData clamps to 40 silently; WEEK_FOCUS fallback wrong | Yes (P1) |
| Weeks 1-3 very early | WEEK_FOCUS fallback = "Labor Signs" | Yes (P1) |
| Twins/multiples | Never asked | Gap |
| Pre-preg → pregnancy | LMP not carried forward | Yes (P1) |
| Kill mid-flow | Store not persisted, restart from step 1 | Yes (P2) |
| Re-run onboarding | Duplicate `behaviors` row | Yes (P0) |

---

## 4. Persistence Map

| Data | Storage | Survives reinstall? |
|---|---|---|
| Due date (Entry B) | `usePregnancyStore` + `pregnancy_logs` JSON blob | AsyncStorage only |
| Due date (Entry A) | `useJourneyStore` | No |
| First pregnancy | JSON blob | No |
| Birth place | JSON blob | No |
| Care provider | JSON blob | No |
| Conditions | `profiles.health_notes` | ✅ |
| Mood | `pregnancy_logs` log_type=mood | ✅ |
| Partner name | JSON blob | No |
| Baby name | `useJourneyStore` | No |
| Week number | `usePregnancyStore` | No |

---

## 5. Mode + Landing

Works correctly **only if** `enrolledBehaviors` already contains `'pregnancy'` before completion. Fresh install path with no prior enroll → silently lands in `KidsHome`. See P0 Mode bug above.

---

## 6. Design System Compliance

| Check | Result |
|---|---|
| Mode color via `getModeColor`/`brand` | OK (uses `brand.pregnancy`) |
| No hardcoded hex | FAIL (`'#FFFFFF'` at line 858) |
| Pill CTA `radius.full` | FAIL (`radius.lg`) |
| `getModeColorSoft` | OK (`due-date.tsx:155`) |
| DM Sans for body | Partial (some `fontWeight` without family) |

---

## 7. i18n + a11y

- Zero i18n calls. All English.
- No `accessibilityLabel` on any `Pressable`. TextInputs only announce placeholder.

---

## Top 3 Fixes

1. **Fix week formula** in 3 files — every user currently sees the wrong gestational week.
2. **Fix mode setting** in `useOnboardingComplete` — without it, completing pregnancy onboarding lands users on `KidsHome`.
3. **Consolidate the two due-date entry points** — Entry A produces a broken `PregnancyHome` (week 1, no data).
