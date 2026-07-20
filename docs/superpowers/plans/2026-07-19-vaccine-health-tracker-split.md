# Vaccine + Health Tracker Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the monolithic Kids "Health Overview" sheet (`HealthDetailModal`) into two focused trackers — a **Vaccine Tracker** (vaccine schedule only) and a new **Health Tracker** (growth + allergies + medications + exam insights) — each with its own Kids wallet card; drop Sleep + Activity/Calories from these sheets.

**Architecture:** Extract the two sheets as standalone components in `components/home/kids/`. Add a read-only `useKidsExamInsights` hook over the existing `exams` table. Split the `health` wallet card into `vaccines` + `health` in `lib/kidsWallet.ts`; wire both sheets in `KidsWallet.tsx` (sheets own their state, so `KidsHome` stops threading sleep/activity props). Retire `HealthDetailModal`.

**Tech Stack:** Expo SDK 54 · React Native 0.81 · React 19 · Zustand v5 · TanStack Query v5 · Supabase · Jest · TypeScript strict.

## Global Constraints

- **Test runner:** `npm test` (Jest). Single file: `npm test -- <path>`. Typecheck: `npm run typecheck`.
- **Design tokens only** — `useTheme()` / `useDiffuseTheme()`; no raw hex in JSX. Both sheets MUST keep the Diffuse + cream branches the current modal has.
- **React Query v5 object syntax.** Supabase: single client from `lib/supabase`; destructure `{ data, error }`.
- **CONCURRENT-SESSION DISCIPLINE (critical):** another session actively edits `KidsHome.tsx`, `KidsWallet.tsx`, `lib/kidsWallet.ts`, and i18n on `main`, and has run `git checkout` that wiped uncommitted work. **Commit after EVERY file/task, stage by explicit path, never `git add -A`/`.`.** Before editing a hot file, check `git status --short <file>`; if dirty, patch-stage only your hunks or defer.
- **PHI:** allergies/medications/growth/exams are PHI. Do not bypass RLS. The `exams` query runs under the caller's session; caregivers without access get nothing (correct).
- **User works on `main`** — no worktrees.

---

## Task 1: `useKidsExamInsights` hook + pure mapper

**Files:**
- Modify: `lib/examData.ts` (add `deriveExamInsights` + `useKidsExamInsights`)
- Test: `lib/__tests__/examInsights.test.ts`

**Interfaces:**
- Consumes: existing `Exam` type + `useExams` (`lib/examData.ts`).
- Produces:
  - `interface ExamInsights { recent: Exam[]; flagged: Exam[] }`
  - `function deriveExamInsights(exams: Exam[], recentLimit?: number): ExamInsights` — pure; `recent` = first N by the already-desc order; `flagged` = exams with `extracted?.flagged.length > 0`.
  - `function useKidsExamInsights(childId: string | null | undefined): { data: ExamInsights; isLoading: boolean }` — wraps `useExams({ behavior: 'kids', childId })` + `deriveExamInsights`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/examInsights.test.ts
import { deriveExamInsights } from '../examData'
import type { Exam } from '../examData'

function exam(id: string, flagged: string[] = []): Exam {
  return {
    id, userId: 'u', childId: 'c', behavior: 'kids', title: `Exam ${id}`,
    result: null, notes: null, examDate: `2026-07-${id.padStart(2, '0')}`, photos: [],
    extracted: flagged.length ? { title: null, result: null, examDate: null, provider: null, referenceRange: null, flagged, notes: null } : null,
    provider: null, createdAt: '', updatedAt: '',
  }
}

describe('deriveExamInsights', () => {
  it('takes the first N as recent (input is already date-desc)', () => {
    const out = deriveExamInsights([exam('05'), exam('04'), exam('03'), exam('02')], 3)
    expect(out.recent.map((e) => e.id)).toEqual(['05', '04', '03'])
  })

  it('collects only exams with flagged findings', () => {
    const out = deriveExamInsights([exam('05', ['High WBC']), exam('04'), exam('03', ['Low iron'])])
    expect(out.flagged.map((e) => e.id)).toEqual(['05', '03'])
  })

  it('handles empty input without throwing', () => {
    const out = deriveExamInsights([])
    expect(out).toEqual({ recent: [], flagged: [] })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/__tests__/examInsights.test.ts`
Expected: FAIL — `deriveExamInsights` not exported.

- [ ] **Step 3: Implement in `lib/examData.ts`**

Add near the other exports (after `useExams`):

```ts
export interface ExamInsights {
  recent: Exam[]
  flagged: Exam[]
}

/** Pure derivation — `exams` is expected already sorted date-desc (useExams does). */
export function deriveExamInsights(exams: Exam[], recentLimit = 3): ExamInsights {
  return {
    recent: exams.slice(0, recentLimit),
    flagged: exams.filter((e) => (e.extracted?.flagged?.length ?? 0) > 0),
  }
}

export function useKidsExamInsights(childId: string | null | undefined) {
  const { data: exams = [], isLoading } = useExams({ behavior: 'kids', childId: childId ?? undefined })
  return { data: deriveExamInsights(exams), isLoading }
}
```
(Verify `useExams`'s `filters.childId` accepts `undefined` for "no child" — it does per the signature `childId !== undefined && childId !== null`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/__tests__/examInsights.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/examData.ts lib/__tests__/examInsights.test.ts
git commit -m "feat(health): useKidsExamInsights — recent + flagged exams (read-only)"
```

---

## Task 2: `VaccineTrackerSheet` component

**Files:**
- Create: `components/home/kids/VaccineTrackerSheet.tsx`
- Read first: `components/home/KidsHome.tsx` `HealthDetailModal` (line ~5452) — the vaccine-schedule render (both Diffuse + cream branches), the empty state (`kids_home_vaccine_schedule_empty`), and how `scheduledVaccines`/`onSetVaccineDate`/`onMarkVaccineGiven` are consumed.

**Interfaces:**
- Consumes: `ChildWithRole`, the vaccine catalog/render already in `HealthDetailModal`.
- Produces: `function VaccineTrackerSheet(props: { visible: boolean; onClose: () => void; child: ChildWithRole; childColor?: string; scheduledVaccines: Record<string, string>; onSetVaccineDate: (key: string, date: string | null) => void; onMarkVaccineGiven: (name: string, date: string, key: string) => Promise<void> }): JSX.Element`

- [ ] **Step 1: Extract the vaccine sheet**

Create `VaccineTrackerSheet.tsx`. Copy the sheet shell (DiffuseSheet / LogSheet branch pattern from `HealthDetailModal`) with title `t('kids_vaccines_title')` + child-name chip. Inside, render ONLY the Vaccine Schedule section — locate it in `HealthDetailModal` (search the schedule render that maps milestones → dose rows with "Set date"/mark-given; it uses `scheduledVaccines` + the two handlers, and the empty state `kids_home_vaccine_schedule_empty`). Move that JSX verbatim, adjusting prop names to this component's props. Keep BOTH Diffuse and cream branches. Import tokens from `constants/theme.ts`; no raw hex.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck` → no new errors in `VaccineTrackerSheet.tsx`. (It won't be rendered yet — that's Task 5. This step just proves it compiles standalone.)

- [ ] **Step 3: Commit**

```bash
git add components/home/kids/VaccineTrackerSheet.tsx
git commit -m "feat(health): VaccineTrackerSheet (vaccine schedule only, extracted)"
```

---

## Task 3: `HealthTrackerSheet` component

**Files:**
- Create: `components/home/kids/HealthTrackerSheet.tsx`
- Read first: `HealthDetailModal` growth + allergies + medications render (lines ~5506–5640, both branches); `useKidsExamInsights` (Task 1); the exams `[id]` screen's flagged-findings render for styling reference.

**Interfaces:**
- Consumes: `ChildWithRole`, `HealthHistoryData`, `useKidsExamInsights` (Task 1), `GrowthPercentileChart`, `resolveSex`, `parseGrowthValue`.
- Produces: `function HealthTrackerSheet(props: { visible: boolean; onClose: () => void; child: ChildWithRole; childColor?: string; healthHistory: HealthHistoryData }): JSX.Element`

- [ ] **Step 1: Build the sheet**

Create `HealthTrackerSheet.tsx` with title `t('kids_health_title')` + child chip, both Diffuse + cream branches. Sections in order:
1. **Growth** — move the growth-percentile-charts block + Latest-growth tiles from `HealthDetailModal` verbatim (the `showGrowthCharts` gate + `weightPts/heightPts/headPts` parsing + `GrowthPercentileChart`s, then the `weight`/`height` `DiffuseMetricTile`s).
2. **Allergies** — move the allergy chips + "+ Add" (routes `/profile/kids`) block verbatim.
3. **Medications** — move the `child.medications.length > 0` block verbatim.
4. **Exam insights** — NEW. `const { data: insights } = useKidsExamInsights(child.id)`. Render a `DiffuseSectionHeader` titled `t('kids_health_exams_section')`. If `insights.recent.length === 0` → empty row `t('kids_health_exams_empty')`. Else: a `DiffuseListRow` per recent exam (title + `formatHealthDate(examDate)` + `result` snippet). For each `insights.flagged` exam, a warning-toned row labeled `t('kids_health_exams_flagged')` + the exam title. End with a "See all exams" pressable → `onClose(); router.push('/exams?behavior=kids')`.

Do NOT render Sleep or Activity. Reuse the same `DiffuseSectionHeader` / `DiffuseListRow` / `DiffuseMetricTile` primitives the modal uses (import from wherever `HealthDetailModal` imports them).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck` → no new errors in `HealthTrackerSheet.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/home/kids/HealthTrackerSheet.tsx
git commit -m "feat(health): HealthTrackerSheet (growth + allergies + meds + exam insights)"
```

---

## Task 4: Split the `health` wallet card into `vaccines` + `health`

**Files:**
- Modify: `lib/kidsWallet.ts` (id union + builder)
- Modify: `lib/__tests__/kidsWallet.test.ts` (assertions)
- Modify: `lib/caregiverCards.ts` (add `vaccines` to kids vocabulary)

**Interfaces:**
- Produces: `KidsWalletCardId` gains `'vaccines'`; builder emits `vaccines` immediately before `health`.

- [ ] **Step 1: Update the builder + union**

In `lib/kidsWallet.ts`, add `'vaccines'` to `KidsWalletCardId`, and in `buildKidsWalletCards` insert `{ id: 'vaccines', tone: 'blue', linkOnly: true }` immediately BEFORE the `health` entry (so order is `… goals · vaccines · health · exams …`).

- [ ] **Step 2: Update the builder test**

In `lib/__tests__/kidsWallet.test.ts`, update BOTH `toEqual` arrays to insert `'vaccines'` before `'health'`:
- no-diaper case: `['essentials', 'goals', 'vaccines', 'health', 'exams', 'reminders', 'memories', 'ask_grandma', 'rewards']`
- diaper+leap case: `['essentials', 'goals', 'vaccines', 'health', 'exams', 'diaper', 'growth_leap', 'reminders', 'memories', 'ask_grandma', 'rewards']`
Run: `npm test -- lib/__tests__/kidsWallet.test.ts` → PASS.

- [ ] **Step 3: Add `vaccines` to caregiver vocabulary**

In `lib/caregiverCards.ts`, add `{ id: 'vaccines', label: 'Vaccine schedule', tier: 'child-health' }` to `CAREGIVER_CARDS.kids` (near `health`). Do NOT add it to any `roleDefaultCards` set (medical; matches `health` not being in the nanny default). Run `npm test -- lib/__tests__/caregiverCards.test.ts` → still green (no assertion depends on the exact kids list length; if one does, update it).

- [ ] **Step 4: Commit**

```bash
git add lib/kidsWallet.ts lib/__tests__/kidsWallet.test.ts lib/caregiverCards.ts
git commit -m "feat(health): split kids wallet health card into vaccines + health"
```

---

## Task 5: Wire both sheets into `KidsWallet.tsx`

**Files:**
- Modify: `components/home/KidsWallet.tsx`

**Interfaces:**
- Consumes: `VaccineTrackerSheet`, `HealthTrackerSheet`, and the data they need. **Decision:** the sheets need `child`, `childColor`, `healthHistory`, `scheduledVaccines`, and the two vaccine handlers — which `KidsWallet` does NOT currently receive. Rather than thread all of it, keep the OPENERS as callbacks: `KidsWallet` calls `onOpenVaccines()` / `onOpenHealth()`, and the sheets stay mounted in `KidsHome` (Task 6). So in `KidsWallet`, `vaccines` + `health` cards just invoke callbacks.

- [ ] **Step 1: Add card wiring (callbacks, not sheets)**

In `KidsWallet.tsx`:
- Add `onOpenVaccines: () => void` to `KidsWalletProps` (keep existing `onOpenHealth`).
- `iconFor`: add `case 'vaccines'` (both Diffuse + cream) — use a vaccine glyph (`Character name="vaccine"` if it exists; else reuse the health/shield glyph the vaccine tree uses). `health` icon stays.
- `titleFor`: `case 'vaccines': return t('kids_vaccines_title')`. `health` stays `t('kids_home_section_health_care')` (or rename to `t('kids_health_title')` — pick one; spec uses "Health").
- `softFor`: `case 'vaccines': return stickers.blueSoft`.
- `onHeader`: `case 'vaccines': return onOpenVaccines()`. `health` stays `onOpenHealth()`.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck` → the only expected error is `KidsHome` not yet passing `onOpenVaccines` (fixed in Task 6). Note it; proceed.

- [ ] **Step 3: Commit**

```bash
git add components/home/KidsWallet.tsx
git commit -m "feat(health): kids wallet opens vaccines + health via callbacks"
```

---

## Task 6: Mount the two sheets in `KidsHome`, retire `HealthDetailModal`

**Files:**
- Modify: `components/home/KidsHome.tsx`

**Interfaces:**
- Consumes: `VaccineTrackerSheet`, `HealthTrackerSheet` (Tasks 2–3).

- [ ] **Step 1: Swap state + render**

In `KidsHome.tsx`:
- Rename/replace `healthModalVisible` with two states: `vaccinesVisible` + `healthVisible` (or keep `healthModalVisible` for health, add `vaccinesVisible`).
- In the `<KidsWallet …>` usage (line ~2623), add `onOpenVaccines={() => setVaccinesVisible(true)}` alongside the existing `onOpenHealth={() => setHealthVisible(true)}`.
- Replace the `<HealthDetailModal …/>` render (line ~2710) with:
```tsx
<VaccineTrackerSheet
  visible={vaccinesVisible}
  onClose={() => setVaccinesVisible(false)}
  child={child}
  childColor={CHILD_COLORS[children.findIndex(c => c.id === child?.id) % CHILD_COLORS.length]}
  scheduledVaccines={scheduledVaccines}
  onSetVaccineDate={(key, date) => setVaccineDate(child.id, key, date)}
  onMarkVaccineGiven={(name, date, key) => markVaccineGiven(child.id, name, date, key)}
/>
<HealthTrackerSheet
  visible={healthVisible}
  onClose={() => setHealthVisible(false)}
  child={child}
  childColor={CHILD_COLORS[children.findIndex(c => c.id === child?.id) % CHILD_COLORS.length]}
  healthHistory={healthHistory}
/>
```
- Add imports for both sheets.
- Update `WALLET_CARD_IDS` (line ~742) to include `'vaccines'`: `['goals', 'vaccines', 'health', 'exams', 'diaper', 'growth_leap', 'reminders', 'ask_grandma', 'rewards']`.

- [ ] **Step 2: Delete `HealthDetailModal`**

Remove the entire `HealthDetailModal` function (line ~5452 to its close). Remove the now-unused `activityBreakdown` sub-sheet state IF it was only used by that modal (check: `setActivityBreakdownVisible` usage — if only inside `HealthDetailModal`, it goes with it). Leave `ActivityDetailModal` (separate, still used).

- [ ] **Step 3: Clean dead props/data**

The sleep/activity/feeding/calories values (`rangeData.sleepQuality`, etc.) were passed only to `HealthDetailModal` — verify via grep they're still used elsewhere (the hero tiles + today-summary use `rangeData` too, so `rangeData` stays; just the modal props go). Remove no shared computation; only the deleted JSX props.

- [ ] **Step 4: Typecheck + full test**

Run: `npm run typecheck` → no new errors in `KidsHome.tsx`/`KidsWallet.tsx`. Run `npm test -- --watchAll=false` → all green.

- [ ] **Step 5: Commit**

```bash
git add components/home/KidsHome.tsx
git commit -m "feat(health): mount Vaccine + Health sheets; retire HealthDetailModal"
```

---

## Task 7: i18n keys (13 locales)

**Files:**
- Modify: `lib/i18n/keys.ts`, `lib/i18n/en.ts`, + 11 locale files.

- [ ] **Step 1: Add keys to `keys.ts` + `en.ts`**

New keys:
```
kids_vaccines_title: "Vaccines"
kids_health_title: "Health"
kids_health_exams_section: "Exam insights"
kids_health_exams_empty: "No exams logged yet."
kids_health_exams_seeAll: "See all exams"
kids_health_exams_flagged: "Flagged findings"
```
Add the type lines to `keys.ts` and the English values to `en.ts` (near the other `kids_home_health_*` keys).

- [ ] **Step 2: Spread to 11 locales (English fallback)**

Add the same 6 keys with the English values to `de/es/fr/it/pt-BR/ja/ko/zh/ar/hi/tr` (this codebase ships English fallback for untranslated keys). Match on an adjacent key name per file.

- [ ] **Step 3: Typecheck + commit**

Run: `npm run typecheck` → no `TranslationKeys` errors for the new keys.
```bash
git add lib/i18n/keys.ts lib/i18n/en.ts lib/i18n/de.ts lib/i18n/es.ts lib/i18n/fr.ts lib/i18n/it.ts lib/i18n/pt-BR.ts lib/i18n/ja.ts lib/i18n/ko.ts lib/i18n/zh.ts lib/i18n/ar.ts lib/i18n/hi.ts lib/i18n/tr.ts
git commit -m "i18n(health): vaccines + health tracker keys (all 13 locales)"
```

---

## Task 8: Verify

- [ ] **Step 1: Full suite + typecheck**

Run: `npm test -- --watchAll=false` → all green. `npm run typecheck` → no new errors in touched files (note any pre-existing not-mine errors from the concurrent session).

- [ ] **Step 2: Manual walk (dev)**

In the running app (Kids mode): the wallet shows TWO cards — **Vaccines** (opens the schedule-only sheet) and **Health** (opens growth + allergies + meds + exam insights). Neither shows Sleep or Activity. Confirm exam insights render (log an exam if none) + "See all exams" routes correctly.

---

## Self-Review

**Spec coverage:** §2.1 VaccineTrackerSheet → Task 2 ✓ · §2.2 HealthTrackerSheet → Task 3 ✓ · §2.3 retire modal → Task 6 ✓ · §3 exam insights → Task 1 (data) + Task 3 (render) ✓ · §4 wallet cards → Tasks 4–5 ✓ · §5 i18n → Task 7 ✓ · §6 caregiver → Task 4 Step 3 ✓ · drop sleep/activity → Task 6 ✓.

**Placeholder scan:** No TBD/handle-edge-cases. "Read first" steps name exact line numbers + what to look for (genuine extraction unknowns in a 5000-line file, not hand-waves). The one pick — `health` card label keeps its current key vs rename to `kids_health_title` — is called out explicitly with a default.

**Type consistency:** `ExamInsights`/`deriveExamInsights`/`useKidsExamInsights` stable across Tasks 1/3. Sheet prop shapes in Tasks 2/3 match the call site in Task 6. `vaccines` card id consistent across Tasks 4/5/6 + caregiverCards. `WALLET_CARD_IDS` updated in Task 6 to match the new builder order.

**Concurrent-session risk:** every task commits per-file with explicit-path staging (Global Constraints) — the mitigation for the checkout-wipe that hit earlier this session.
