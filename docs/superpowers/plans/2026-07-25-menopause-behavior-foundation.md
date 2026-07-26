# Menopause Behavior — E1 Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new self-standing **Menopause** behavior (4th journey mode) with 3 self-identified stages, direct onboarding, its own `menopause_logs` data model, symptom logging, home, basic analytics, and Dev Panel tooling.

**Architecture:** Mirror the existing Cycle (pre-pregnancy) behavior's shape. Extend the `JourneyMode`/`Behavior` unions and the mode/behavior plumbing; add a `menopause_logs` table + `profiles` stage/date columns; build a pure symptom taxonomy + analytics lib (like `cycleSymptoms`/`cycleAnalytics`); a `useMenopauseStore`; a direct onboarding flow; a `MenopauseHome`; a `MenopauseAnalytics` screen; and Dev Panel seed/inspect tools.

**Tech Stack:** Expo SDK 54 + React Native 0.81 + React 19, TypeScript strict, Zustand v5 (`persist`), TanStack Query v5, Supabase (Postgres + RLS), jest-expo + @testing-library/react-native, design tokens from `constants/theme.ts`.

## Global Constraints

- **Clinical guardrail (non-negotiable):** never diagnose. Stage is always user-set + editable. The only computed metric is factual "months since last period"; the 12-month prompt is an *offer* the user confirms — never an automatic label flip. Copy stays warm, non-prescriptive, points to a clinician.
- Internal behavior id is `menopause` (1:1 in DB — no alias remap, unlike pre-pregnancy→`'cycle'`). User-facing label is **"Menopause"**.
- Design tokens only — colors/fonts/radii/shadows from `constants/theme.ts`. Mode color via a new `brand.menopause` token + `getModeColor('menopause', isDark)`. No raw hex in components (SVG sticker files exempt).
- Zustand v5 named import `import { create } from 'zustand'`. Persisted stores MUST have a `hydrated` flag + `onRehydrateStorage` that flips it via `setState` (see `useBehaviorStore`).
- React Query v5 object syntax. Expo Router `router.push/replace`, never `navigation.navigate`.
- Local dates: `toDateStr(new Date())` for `date`, never `toISOString().split('T')[0]`.
- Migrations: `CREATE TABLE IF NOT EXISTS`, `ENABLE ROW LEVEL SECURITY`, owner policy `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`, indexes on `user_id`/`date`/`created_at`, `ON DELETE CASCADE`, end with `NOTIFY pgrst, 'reload schema';`.
- `profiles.id` IS the auth user UUID (filter `.eq('id', userId)`), but log tables use `user_id`.
- `npm run typecheck` must pass after every task. Run tests with `npx jest <path>`.
- Out of scope (do NOT build): signal engine / auto-transition (E2), pillars / daily content / Grandma AI context / LLM insights (E3), HRT & long-term health (E4), surgical/medical/premature onboarding nuance, community forum topic.

---

### Task 1: Behavior foundation (unions, theme, modeConfig, boot, pill) — green build

Adding `'menopause'` to `JourneyMode` makes `Record<JourneyMode, ModeConfig>` and the `_layout` behavior union fail to compile until updated. This task bundles every type-coupled change so the build stays green, plus the mode color and the ModeSwitcher pill.

**Files:**
- Modify: `types/index.ts:31`
- Modify: `store/useBehaviorStore.ts:13`
- Modify: `store/useOnboardingStore.ts:18-22`
- Modify: `constants/theme.ts` (brand palette ~L36-38, `getModeColor` L335-344, `getModeColorSoft` L346-352)
- Modify: `lib/modeConfig.ts` (add config + `MODE_CONFIGS` L116-120)
- Modify: `app/_layout.tsx:385` (serverTypes union)
- Modify: `components/home/ModeSwitcher.tsx:19-23`
- Test: `store/__tests__/menopauseFoundation.test.ts`

**Interfaces:**
- Produces: `JourneyMode`/`Behavior` include `'menopause'`; `getModeColor('menopause', isDark)`, `getModeColorSoft('menopause', isDark)`; `getModeConfig('menopause')` returns a valid `ModeConfig`.

- [ ] **Step 1: Write the failing test**

`store/__tests__/menopauseFoundation.test.ts`:
```ts
import { behaviorFromDbType } from '../useBehaviorStore'
import { getModeConfig } from '../../lib/modeConfig'
import { getModeColor } from '../../constants/theme'

describe('menopause foundation', () => {
  it('round-trips the menopause behavior db type 1:1', () => {
    expect(behaviorFromDbType('menopause')).toBe('menopause')
  })
  it('has a mode config with library + exchange hidden and vault as Analytics', () => {
    const cfg = getModeConfig('menopause')
    expect(cfg.tabs.library.visible).toBe(false)
    expect(cfg.tabs.exchange.visible).toBe(false)
    expect(cfg.tabs.vault.visible).toBe(true)
    expect(cfg.aiContextLabel).toBe('menopause')
  })
  it('resolves a distinct mode color for menopause', () => {
    expect(getModeColor('menopause', false)).toBe('#E8975A')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest store/__tests__/menopauseFoundation.test.ts`
Expected: FAIL (menopause not in configs / color falls through to pregnancy).

- [ ] **Step 3: Extend the unions**

`types/index.ts:31`:
```ts
export type JourneyMode = 'pre-pregnancy' | 'pregnancy' | 'kids' | 'menopause'
```
`store/useBehaviorStore.ts:13`:
```ts
export type Behavior = 'pre-pregnancy' | 'pregnancy' | 'kids' | 'menopause'
```
`store/useOnboardingStore.ts:18-22`:
```ts
const PRIORITY: Record<Behavior, number> = {
  pregnancy: 0,
  kids: 1,
  'pre-pregnancy': 2,
  menopause: 3,
}
```
`app/_layout.tsx:385` — extend the explicit union so `behaviorFromDbType`'s return type still assigns:
```ts
      const serverTypes: ('pre-pregnancy' | 'pregnancy' | 'kids' | 'menopause')[] =
```

- [ ] **Step 4: Add the mode color tokens**

`constants/theme.ts` brand palette (after the `kids` line ~L38), add:
```ts
  menopause: '#E8975A',       // warm ember
  menopauseSoft: '#F7E3D2',
```
(If `brand` has `*Soft` companions defined elsewhere in the object, add `menopauseSoft` alongside them; keep both reachable as `brand.menopause` / `brand.menopauseSoft`.)

In `getModeColor` (before the final `return`, L343):
```ts
  if (mode === 'meno' || mode === 'menopause') return isDark ? '#F0B074' : brand.menopause
```
In `getModeColorSoft` (before the final `return`, L351):
```ts
  if (mode === 'meno' || mode === 'menopause') return isDark ? '#3A2C1E' : brand.menopauseSoft
```

- [ ] **Step 5: Add the mode config**

`lib/modeConfig.ts` — add after `KIDS_CONFIG` (before `MODE_CONFIGS`):
```ts
const MENOPAUSE_CONFIG: ModeConfig = {
  tabs: {
    index: { visible: true, label: 'Home', icon: 'home-outline' },
    agenda: { visible: true, label: 'Calendar', icon: 'calendar-outline' },
    // E3 adds education; hidden for now.
    library: { visible: false, label: 'Library', icon: 'book-outline' },
    // Vault slot repurposed as Analytics, exactly like the cycle mode.
    vault: { visible: true, label: 'Insights', icon: 'bar-chart-outline' },
    exchange: { visible: false, label: 'Garage', icon: 'pricetag-outline' },
    settings: { visible: true, label: 'Settings', icon: 'settings-outline' },
  },
  agendaTabs: [
    { id: 'symptoms', label: 'Symptoms', icon: 'pulse-outline' },
  ],
  pillars: [],
  vaultSections: [],
  exchangeFilters: [],
  aiContextLabel: 'menopause',
}
```
And extend `MODE_CONFIGS` (L116-120):
```ts
const MODE_CONFIGS: Record<JourneyMode, ModeConfig> = {
  'pre-pregnancy': PRE_PREGNANCY_CONFIG,
  'pregnancy': PREGNANCY_CONFIG,
  'kids': KIDS_CONFIG,
  'menopause': MENOPAUSE_CONFIG,
}
```

- [ ] **Step 6: Add the ModeSwitcher pill**

`components/home/ModeSwitcher.tsx:19-23` — append to `MODES`:
```ts
    { id: 'menopause', label: 'Menopause' },
```

- [ ] **Step 7: Run test + typecheck**

Run: `npx jest store/__tests__/menopauseFoundation.test.ts && npm run typecheck`
Expected: test PASS (3/3); typecheck clean (union exhaustiveness satisfied).

- [ ] **Step 8: Commit**

```bash
git add types/index.ts store/useBehaviorStore.ts store/useOnboardingStore.ts constants/theme.ts lib/modeConfig.ts app/_layout.tsx components/home/ModeSwitcher.tsx store/__tests__/menopauseFoundation.test.ts
git commit -m "feat(menopause): add menopause behavior foundation (unions, mode color, modeConfig, pill)"
```

---

### Task 2: `menopause_logs` table + `profiles` stage/date columns

**Files:**
- Create: `supabase/migrations/20260725120000_menopause_logs.sql`

**Interfaces:**
- Produces: table `menopause_logs (id, user_id, date, type, value, severity, notes, created_at)` with RLS; `profiles.menopause_stage text`, `profiles.last_period_date date`.

- [ ] **Step 1: Write the migration**

`supabase/migrations/20260725120000_menopause_logs.sql`:
```sql
-- Menopause behavior (E1) — symptom/event logs + profile stage columns.

CREATE TABLE IF NOT EXISTS menopause_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       date NOT NULL,
  type       text NOT NULL,
  value      text,
  severity   smallint,
  notes      text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE menopause_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menopause_logs owner" ON menopause_logs;
CREATE POLICY "menopause_logs owner" ON menopause_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS menopause_logs_user_id_idx   ON menopause_logs (user_id);
CREATE INDEX IF NOT EXISTS menopause_logs_date_idx       ON menopause_logs (date);
CREATE INDEX IF NOT EXISTS menopause_logs_created_at_idx ON menopause_logs (created_at);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS menopause_stage  text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_period_date date;

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Verify locally / review**

Run: review the SQL against `.claude/rules/supabase.md` (idempotent, RLS, indexes, NOTIFY). If a local Supabase stack is available: `supabase db push` and confirm no error. Otherwise dispatch the `db-reviewer` agent for a static check.
Expected: idempotent, RLS enabled, owner policy present, three indexes, both profile columns guarded by `IF NOT EXISTS`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260725120000_menopause_logs.sql
git commit -m "feat(menopause): menopause_logs table + profiles stage/date columns"
```

---

### Task 3: Symptom taxonomy — `lib/menopauseSymptoms.ts`

Mirror `lib/cycleSymptoms.ts` (id union + `ALL_*` list + label + `resolve*` normalizer).

**Files:**
- Create: `lib/menopauseSymptoms.ts`
- Test: `lib/__tests__/menopauseSymptoms.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type MenopauseSymptomId = 'hot_flash'|'night_sweat'|'sleep'|'fatigue'|'low_mood'|'anxiety'|'brain_fog'|'joint_pain'|'headache'|'palpitations'|'weight'|'vaginal_dryness'|'libido'
  type MenopauseGroup = 'vasomotor'|'sleep'|'mood'|'physical'|'genitourinary'
  interface MenopauseSymptom { id: MenopauseSymptomId; label: string; group: MenopauseGroup }
  const ALL_MENOPAUSE_SYMPTOMS: MenopauseSymptom[]
  function menopauseSymptomLabel(id: MenopauseSymptomId): string
  function resolveMenopauseSymptomId(raw: string): MenopauseSymptomId | null
  ```
  (`period` and `note` are log `type`s but NOT symptom ids — they are events, handled by the log sheet, not this list.)

- [ ] **Step 1: Write the failing test**

`lib/__tests__/menopauseSymptoms.test.ts`:
```ts
import {
  ALL_MENOPAUSE_SYMPTOMS,
  menopauseSymptomLabel,
  resolveMenopauseSymptomId,
} from '../menopauseSymptoms'

describe('menopauseSymptoms', () => {
  it('lists 13 curated symptoms across 5 groups', () => {
    expect(ALL_MENOPAUSE_SYMPTOMS).toHaveLength(13)
    expect(new Set(ALL_MENOPAUSE_SYMPTOMS.map((s) => s.group)).size).toBe(5)
  })
  it('labels an id', () => {
    expect(menopauseSymptomLabel('hot_flash')).toBe('Hot flashes')
  })
  it('resolves id, label, and spacing/case variants', () => {
    expect(resolveMenopauseSymptomId('hot_flash')).toBe('hot_flash')
    expect(resolveMenopauseSymptomId('Hot flashes')).toBe('hot_flash')
    expect(resolveMenopauseSymptomId('night sweats')).toBe('night_sweat')
    expect(resolveMenopauseSymptomId('totally unknown')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/menopauseSymptoms.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the taxonomy**

`lib/menopauseSymptoms.ts`:
```ts
/**
 * menopauseSymptoms — curated symptom IDs, labels, and groups for the
 * Menopause behavior log forms. `period` and `note` are log events, not
 * symptoms, and live in the log sheet — not here.
 */

export type MenopauseGroup = 'vasomotor' | 'sleep' | 'mood' | 'physical' | 'genitourinary'

export type MenopauseSymptomId =
  | 'hot_flash' | 'night_sweat'
  | 'sleep' | 'fatigue'
  | 'low_mood' | 'anxiety' | 'brain_fog'
  | 'joint_pain' | 'headache' | 'palpitations' | 'weight'
  | 'vaginal_dryness' | 'libido'

export interface MenopauseSymptom { id: MenopauseSymptomId; label: string; group: MenopauseGroup }

export const ALL_MENOPAUSE_SYMPTOMS: MenopauseSymptom[] = [
  { id: 'hot_flash',       label: 'Hot flashes',    group: 'vasomotor' },
  { id: 'night_sweat',     label: 'Night sweats',   group: 'vasomotor' },
  { id: 'sleep',           label: 'Sleep trouble',  group: 'sleep' },
  { id: 'fatigue',         label: 'Fatigue',        group: 'sleep' },
  { id: 'low_mood',        label: 'Low mood',       group: 'mood' },
  { id: 'anxiety',         label: 'Anxiety',        group: 'mood' },
  { id: 'brain_fog',       label: 'Brain fog',      group: 'mood' },
  { id: 'joint_pain',      label: 'Joint aches',    group: 'physical' },
  { id: 'headache',        label: 'Headache',       group: 'physical' },
  { id: 'palpitations',    label: 'Palpitations',   group: 'physical' },
  { id: 'weight',          label: 'Weight change',  group: 'physical' },
  { id: 'vaginal_dryness', label: 'Vaginal dryness',group: 'genitourinary' },
  { id: 'libido',          label: 'Low libido',     group: 'genitourinary' },
]

export function menopauseSymptomLabel(id: MenopauseSymptomId): string {
  return ALL_MENOPAUSE_SYMPTOMS.find((s) => s.id === id)?.label ?? id
}

const NORMALIZE = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '')

const ALIASES: Record<string, MenopauseSymptomId> = {
  hotflash: 'hot_flash', hotflashes: 'hot_flash',
  nightsweat: 'night_sweat', nightsweats: 'night_sweat',
  sleeptrouble: 'sleep', insomnia: 'sleep',
  lowmood: 'low_mood', brainfog: 'brain_fog',
  jointaches: 'joint_pain', jointpain: 'joint_pain',
  weightchange: 'weight', vaginaldryness: 'vaginal_dryness',
  lowlibido: 'libido',
}

export function resolveMenopauseSymptomId(raw: string): MenopauseSymptomId | null {
  const n = NORMALIZE(raw)
  const byId = ALL_MENOPAUSE_SYMPTOMS.find((s) => NORMALIZE(s.id) === n)
  if (byId) return byId.id
  const byLabel = ALL_MENOPAUSE_SYMPTOMS.find((s) => NORMALIZE(s.label) === n)
  if (byLabel) return byLabel.id
  return ALIASES[n] ?? null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/menopauseSymptoms.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add lib/menopauseSymptoms.ts lib/__tests__/menopauseSymptoms.test.ts
git commit -m "feat(menopause): symptom taxonomy (13 symptoms, 5 groups) + resolver"
```

---

### Task 4: `useMenopauseStore` + months-since-period logic

**Files:**
- Create: `store/useMenopauseStore.ts`
- Create: `lib/menopauseStage.ts` (pure helpers — testable without the store)
- Test: `lib/__tests__/menopauseStage.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // lib/menopauseStage.ts
  type MenopauseStage = 'peri' | 'meno' | 'post'
  function monthsSinceDate(fromISO: string | null, now: Date): number | null   // null if no date
  function shouldOfferMenopauseUpdate(stage: MenopauseStage, lastPeriodISO: string | null, now: Date): boolean
  // store/useMenopauseStore.ts
  interface MenopauseStore { stage: MenopauseStage | null; lastPeriodDate: string | null; hydrated: boolean;
    setStage(s: MenopauseStage): void; setLastPeriodDate(iso: string | null): void; setHydrated(v: boolean): void }
  const useMenopauseStore
  ```

- [ ] **Step 1: Write the failing test**

`lib/__tests__/menopauseStage.test.ts`:
```ts
import { monthsSinceDate, shouldOfferMenopauseUpdate } from '../menopauseStage'

const NOW = new Date('2026-07-25T12:00:00Z')

describe('menopauseStage', () => {
  it('returns null months when no date', () => {
    expect(monthsSinceDate(null, NOW)).toBeNull()
  })
  it('counts whole months since a date', () => {
    expect(monthsSinceDate('2026-04-25', NOW)).toBe(3)
    expect(monthsSinceDate('2025-07-25', NOW)).toBe(12)
  })
  it('offers a menopause update only for peri users at >=12 months', () => {
    expect(shouldOfferMenopauseUpdate('peri', '2025-07-25', NOW)).toBe(true)   // 12mo
    expect(shouldOfferMenopauseUpdate('peri', '2026-04-25', NOW)).toBe(false)  // 3mo
    expect(shouldOfferMenopauseUpdate('meno', '2025-01-01', NOW)).toBe(false)  // already meno
    expect(shouldOfferMenopauseUpdate('peri', null, NOW)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/menopauseStage.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the pure helpers**

`lib/menopauseStage.ts`:
```ts
export type MenopauseStage = 'peri' | 'meno' | 'post'

/** Whole calendar months between an ISO date (YYYY-MM-DD) and `now`. null if no date. */
export function monthsSinceDate(fromISO: string | null, now: Date): number | null {
  if (!fromISO) return null
  const [y, m, d] = fromISO.split('-').map(Number)
  if (!y || !m || !d) return null
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)
  if (now.getDate() < d) months -= 1     // not yet a full month into the current one
  return Math.max(0, months)
}

/** Non-diagnostic offer: a peri user with >=12 months since last period. Never auto-applies. */
export function shouldOfferMenopauseUpdate(
  stage: MenopauseStage,
  lastPeriodISO: string | null,
  now: Date,
): boolean {
  if (stage !== 'peri') return false
  const months = monthsSinceDate(lastPeriodISO, now)
  return months !== null && months >= 12
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/menopauseStage.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Implement the store**

`store/useMenopauseStore.ts` (persisted, hydration gate per project rule):
```ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { MenopauseStage } from '../lib/menopauseStage'

interface MenopauseStore {
  stage: MenopauseStage | null
  lastPeriodDate: string | null   // ISO YYYY-MM-DD
  hydrated: boolean
  setStage: (s: MenopauseStage) => void
  setLastPeriodDate: (iso: string | null) => void
  setHydrated: (v: boolean) => void
}

export const useMenopauseStore = create<MenopauseStore>()(
  persist(
    (set) => ({
      stage: null,
      lastPeriodDate: null,
      hydrated: false,
      setStage: (stage) => set({ stage }),
      setLastPeriodDate: (lastPeriodDate) => set({ lastPeriodDate }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'grandma-menopause',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ stage: s.stage, lastPeriodDate: s.lastPeriodDate }),
      onRehydrateStorage: () => () => {
        useMenopauseStore.setState({ hydrated: true })
      },
    },
  ),
)
```

- [ ] **Step 6: Typecheck + commit**

Run: `npm run typecheck`
Expected: clean.
```bash
git add store/useMenopauseStore.ts lib/menopauseStage.ts lib/__tests__/menopauseStage.test.ts
git commit -m "feat(menopause): stage store + months-since-period + 12-month offer logic"
```

---

### Task 5: Analytics lib — `lib/menopauseAnalytics.ts`

Pure, deterministic reads over `menopause_logs` (mirrors `lib/cycleAnalytics.ts`). LLM insights are E3.

**Files:**
- Create: `lib/menopauseAnalytics.ts`
- Modify: `lib/insights.ts` (add `menopause_logs` to the `fetchBehaviorMetrics` table switch)
- Test: `lib/__tests__/menopauseAnalytics.test.ts`

**Interfaces:**
- Consumes: `MenopauseSymptomId` (Task 3).
- Produces (pure functions over a `MenopauseLogRow[]`, so they unit-test without Supabase):
  ```ts
  interface MenopauseLogRow { date: string; type: string; value: string | null; severity: number | null }
  interface SymptomStat { id: string; count: number; avgSeverity: number }
  function computeSymptomStats(rows: MenopauseLogRow[]): SymptomStat[]         // sorted by count desc
  function computeVasomotorFrequency(rows: MenopauseLogRow[]): { date: string; count: number }[]  // per-day hot_flash+night_sweat
  function useMenopauseLogs(): { data: MenopauseLogRow[] | undefined }         // React Query hook
  ```

- [ ] **Step 1: Write the failing test**

`lib/__tests__/menopauseAnalytics.test.ts`:
```ts
import { computeSymptomStats, computeVasomotorFrequency } from '../menopauseAnalytics'

const rows = [
  { date: '2026-07-01', type: 'hot_flash', value: null, severity: 4 },
  { date: '2026-07-01', type: 'hot_flash', value: null, severity: 2 },
  { date: '2026-07-02', type: 'night_sweat', value: null, severity: 3 },
  { date: '2026-07-02', type: 'sleep', value: null, severity: 5 },
  { date: '2026-07-02', type: 'period', value: 'light', severity: null },
]

describe('menopauseAnalytics', () => {
  it('counts symptoms and averages severity, ignoring events', () => {
    const stats = computeSymptomStats(rows)
    const hot = stats.find((s) => s.id === 'hot_flash')!
    expect(hot.count).toBe(2)
    expect(hot.avgSeverity).toBe(3)          // (4+2)/2
    expect(stats.find((s) => s.id === 'period')).toBeUndefined() // events excluded
    expect(stats[0].count).toBeGreaterThanOrEqual(stats[stats.length - 1].count) // sorted desc
  })
  it('sums vasomotor events per day', () => {
    const vaso = computeVasomotorFrequency(rows)
    expect(vaso.find((d) => d.date === '2026-07-01')!.count).toBe(2) // two hot flashes
    expect(vaso.find((d) => d.date === '2026-07-02')!.count).toBe(1) // one night sweat
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/menopauseAnalytics.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the analytics lib**

`lib/menopauseAnalytics.ts`:
```ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { resolveMenopauseSymptomId } from './menopauseSymptoms'

export interface MenopauseLogRow { date: string; type: string; value: string | null; severity: number | null }
export interface SymptomStat { id: string; count: number; avgSeverity: number }

const VASOMOTOR = new Set(['hot_flash', 'night_sweat'])

/** Count + average severity per symptom id, excluding non-symptom events (period/note). */
export function computeSymptomStats(rows: MenopauseLogRow[]): SymptomStat[] {
  const acc = new Map<string, { count: number; sev: number }>()
  for (const r of rows) {
    const id = resolveMenopauseSymptomId(r.type)
    if (!id) continue // skip period/note/unknown
    const cur = acc.get(id) ?? { count: 0, sev: 0 }
    cur.count += 1
    cur.sev += r.severity ?? 0
    acc.set(id, cur)
  }
  return [...acc.entries()]
    .map(([id, v]) => ({ id, count: v.count, avgSeverity: v.count ? v.sev / v.count : 0 }))
    .sort((a, b) => b.count - a.count)
}

/** Per-day count of vasomotor events (hot flashes + night sweats). */
export function computeVasomotorFrequency(rows: MenopauseLogRow[]): { date: string; count: number }[] {
  const byDay = new Map<string, number>()
  for (const r of rows) {
    if (!VASOMOTOR.has(r.type)) continue
    byDay.set(r.date, (byDay.get(r.date) ?? 0) + 1)
  }
  return [...byDay.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date))
}

export function useMenopauseLogs() {
  return useQuery({
    queryKey: ['menopause-logs'],
    queryFn: async (): Promise<MenopauseLogRow[]> => {
      const { data: s } = await supabase.auth.getSession()
      const userId = s.session?.user.id
      if (!userId) return []
      const { data, error } = await supabase
        .from('menopause_logs')
        .select('date, type, value, severity')
        .eq('user_id', userId)
        .order('date', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}
```

- [ ] **Step 4: Extend `fetchBehaviorMetrics`**

In `lib/insights.ts`, find the table selection in `fetchBehaviorMetrics` (keyed by behavior → `cycle_logs`/`pregnancy_logs`/`child_logs`, ~L145-212). Add a `menopause` branch mapping to `menopause_logs` (mirror the `cycle_logs` case exactly, swapping the table name). If it uses a `Record<Behavior, string>` table map, add `menopause: 'menopause_logs'`.

- [ ] **Step 5: Run test + typecheck**

Run: `npx jest lib/__tests__/menopauseAnalytics.test.ts && npm run typecheck`
Expected: test PASS (2/2), typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add lib/menopauseAnalytics.ts lib/insights.ts lib/__tests__/menopauseAnalytics.test.ts
git commit -m "feat(menopause): analytics lib (symptom stats, vasomotor frequency, logs hook)"
```

---

### Task 6: Direct onboarding — store + flow

**Files:**
- Create: `store/useMenopauseOnboardingStore.ts` (ephemeral, non-persisted — mirrors `useCycleOnboardingStore`)
- Create: `app/onboarding/menopause/index.tsx` (single-screen stepped flow is acceptable; mirror `app/onboarding/cycle/index.tsx` structure)
- Modify: the journey-selection screen where behaviors are chosen (`app/onboarding/journey*` — grep for the `Behavior` toggle list) to include `menopause`
- Test: `store/__tests__/menopauseOnboardingStore.test.ts`

**Interfaces:**
- Consumes: `useBehaviorStore.enroll`, `useModeStore.setMode`, `useMenopauseStore.setStage/setLastPeriodDate`, `MenopauseStage`, `MenopauseSymptomId`, `toDateStr`.
- Produces: `useMenopauseOnboardingStore` with `{ stage, lastPeriodDate, symptoms: MenopauseSymptomId[], onHrt: boolean, set*, reset }`.

- [ ] **Step 1: Write the failing test**

`store/__tests__/menopauseOnboardingStore.test.ts`:
```ts
import { useMenopauseOnboardingStore } from '../useMenopauseOnboardingStore'

describe('useMenopauseOnboardingStore', () => {
  beforeEach(() => useMenopauseOnboardingStore.getState().reset())
  it('collects onboarding answers and resets clean', () => {
    const s = useMenopauseOnboardingStore.getState()
    s.setStage('peri'); s.setLastPeriodDate('2026-06-01'); s.setSymptoms(['hot_flash', 'sleep']); s.setOnHrt(true)
    const after = useMenopauseOnboardingStore.getState()
    expect(after.stage).toBe('peri')
    expect(after.symptoms).toEqual(['hot_flash', 'sleep'])
    expect(after.onHrt).toBe(true)
    after.reset()
    expect(useMenopauseOnboardingStore.getState().stage).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest store/__tests__/menopauseOnboardingStore.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the ephemeral store**

`store/useMenopauseOnboardingStore.ts`:
```ts
import { create } from 'zustand'
import type { MenopauseStage } from '../lib/menopauseStage'
import type { MenopauseSymptomId } from '../lib/menopauseSymptoms'

interface MenopauseOnboardingStore {
  stage: MenopauseStage | null
  lastPeriodDate: string | null
  symptoms: MenopauseSymptomId[]
  onHrt: boolean
  setStage: (s: MenopauseStage) => void
  setLastPeriodDate: (iso: string | null) => void
  setSymptoms: (ids: MenopauseSymptomId[]) => void
  setOnHrt: (v: boolean) => void
  reset: () => void
}

export const useMenopauseOnboardingStore = create<MenopauseOnboardingStore>((set) => ({
  stage: null,
  lastPeriodDate: null,
  symptoms: [],
  onHrt: false,
  setStage: (stage) => set({ stage }),
  setLastPeriodDate: (lastPeriodDate) => set({ lastPeriodDate }),
  setSymptoms: (symptoms) => set({ symptoms }),
  setOnHrt: (onHrt) => set({ onHrt }),
  reset: () => set({ stage: null, lastPeriodDate: null, symptoms: [], onHrt: false }),
}))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest store/__tests__/menopauseOnboardingStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Build the onboarding screen**

Create `app/onboarding/menopause/index.tsx`. Read `app/onboarding/cycle/index.tsx` first and mirror its structure (stepped local state, `OnboardingStep`/design-system primitives, safe-area, `PillButton`/`StickerButton`, tokens only). Steps in order:
1. Intro copy (warm, "support + tracking, not diagnosis").
2. Stage self-select → `setStage` (peri/meno/post, plain-language).
3. Last period date (StickerDateModal) → `setLastPeriodDate`; "unknown / long ago" skips (leaves null); skipped entirely for `post`.
4. Symptom multi-select from `ALL_MENOPAUSE_SYMPTOMS` → `setSymptoms`.
5. "On HRT / treatment?" yes/no → `setOnHrt`.
6. **Finish handler** — do exactly:
```ts
const { data: s } = await supabase.auth.getSession()
const userId = s.session?.user.id
if (userId) {
  await supabase.from('profiles').update({
    menopause_stage: stage,
    last_period_date: lastPeriodDate, // may be null
  }).eq('id', userId)
  // 1:1 db behavior type (no alias)
  await supabase.from('behaviors').upsert({ user_id: userId, type: 'menopause' }, { onConflict: 'user_id,type' })
}
useMenopauseStore.getState().setStage(stage!)
useMenopauseStore.getState().setLastPeriodDate(lastPeriodDate)
useBehaviorStore.getState().enroll('menopause')
useModeStore.getState().setMode('menopause')
useMenopauseOnboardingStore.getState().reset()
router.replace('/(tabs)')
```
(Confirm the exact `behaviors` upsert columns/onConflict against `app/onboarding/cycle/index.tsx:181-194` before writing — match that shape, substituting `type: 'menopause'`.)

- [ ] **Step 6: Add menopause to the journey selection**

Grep for the journey behavior toggle (`app/onboarding/journey.tsx` or similar; it uses `toggleBehavior`/the `Behavior` list). Add a `menopause` option ("Menopause") so it can be selected up-front too. Match the existing option card pattern.

- [ ] **Step 7: Typecheck + manual verify + commit**

Run: `npm run typecheck`
Manual (simulator): Dev Panel (Task 10) or journey → menopause onboarding → finish → lands in menopause mode, pill shows enrolled.
```bash
git add store/useMenopauseOnboardingStore.ts store/__tests__/menopauseOnboardingStore.test.ts app/onboarding/menopause/index.tsx app/onboarding/journey.tsx
git commit -m "feat(menopause): direct onboarding flow + ephemeral store + journey option"
```

---

### Task 7: Symptom log sheet + save helper + agenda timeline

**Files:**
- Create: `lib/menopauseLogs.ts` (save/query helpers)
- Create: `components/menopause/MenopauseLogForms.tsx` (symptom + period-event forms; mirror `KidsLogForms`/the shared slider forms)
- Modify: the agenda screen to render a menopause timeline when `mode === 'menopause'` (grep `app/(tabs)/agenda.tsx` for the mode branch; mirror how kids/cycle timelines mount)
- Test: `lib/__tests__/menopauseLogs.test.ts`

**Interfaces:**
- Consumes: `MenopauseSymptomId`, `toDateStr`, `supabase`, `queryClient`.
- Produces:
  ```ts
  async function saveMenopauseLog(input: { date: string; type: string; value?: string | null; severity?: number | null; notes?: string | null }): Promise<void>
  function invalidateMenopauseLogQueries(): void   // invalidates ['menopause-logs']
  ```

- [ ] **Step 1: Write the failing test**

`lib/__tests__/menopauseLogs.test.ts` (mock supabase + queryClient):
```ts
jest.mock('../supabase', () => {
  const insert = jest.fn().mockResolvedValue({ error: null })
  return { supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }) },
    from: jest.fn(() => ({ insert })) }, __insert: insert }
})
jest.mock('../queryClient', () => ({ queryClient: { invalidateQueries: jest.fn() } }))

import { saveMenopauseLog } from '../menopauseLogs'
import { supabase } from '../supabase'

it('inserts a menopause log row with the user id', async () => {
  await saveMenopauseLog({ date: '2026-07-25', type: 'hot_flash', severity: 3 })
  expect(supabase.from).toHaveBeenCalledWith('menopause_logs')
  const insert = (supabase.from as jest.Mock).mock.results[0].value.insert
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1', type: 'hot_flash', severity: 3, date: '2026-07-25' }))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/menopauseLogs.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the save/query helper**

`lib/menopauseLogs.ts`:
```ts
import { supabase } from './supabase'
import { queryClient } from './queryClient'

export function invalidateMenopauseLogQueries() {
  queryClient.invalidateQueries({ queryKey: ['menopause-logs'] })
}

export async function saveMenopauseLog(input: {
  date: string; type: string; value?: string | null; severity?: number | null; notes?: string | null
}): Promise<void> {
  const { data: s } = await supabase.auth.getSession()
  const userId = s.session?.user.id
  if (!userId) throw new Error('Not authenticated')
  const { error } = await supabase.from('menopause_logs').insert({
    user_id: userId,
    date: input.date,
    type: input.type,
    value: input.value ?? null,
    severity: input.severity ?? null,
    notes: input.notes ?? null,
  })
  if (error) throw error
  invalidateMenopauseLogQueries()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/menopauseLogs.test.ts`
Expected: PASS.

- [ ] **Step 5: Build the log forms + agenda timeline**

`components/menopause/MenopauseLogForms.tsx`: read `components/calendar/KidsLogForms.tsx` for the shared `LogSheet` + `StepSlider` severity pattern and mirror it. Provide:
- A **symptom form**: pick a symptom from `ALL_MENOPAUSE_SYMPTOMS` (grouped) → severity 1–5 via `StepSlider` → optional note → `saveMenopauseLog({ date: toDateStr(new Date()), type: id, severity, notes })`.
- A **period-event form** (peri only): flow level (`light|medium|heavy` via chips) → `saveMenopauseLog({ date, type: 'period', value: flow })` AND update `last_period_date` (profile + `useMenopauseStore.setLastPeriodDate`).
Wire the agenda screen (`app/(tabs)/agenda.tsx`) to show a menopause symptom **timeline** reading `useMenopauseLogs()` when `mode === 'menopause'`, mirroring the kids/cycle timeline mount. Tokens only.

- [ ] **Step 6: Typecheck + manual verify + commit**

Run: `npm run typecheck`
Manual: log a hot flash + a period event; confirm rows appear in the agenda timeline.
```bash
git add lib/menopauseLogs.ts lib/__tests__/menopauseLogs.test.ts components/menopause/MenopauseLogForms.tsx app/(tabs)/agenda.tsx
git commit -m "feat(menopause): symptom + period log forms, save helper, agenda timeline"
```

---

### Task 8: `MenopauseHome`

**Files:**
- Create: `components/home/MenopauseHome.tsx`
- Modify: the home screen (`app/(tabs)/index.tsx`) to mount `MenopauseHome` when `mode === 'menopause'` (mirror the `KidsHome`/`CycleHome` branch)

**Interfaces:**
- Consumes: `useMenopauseStore`, `monthsSinceDate`, `shouldOfferMenopauseUpdate`, `useMenopauseLogs`, `saveMenopauseLog`, `ALL_MENOPAUSE_SYMPTOMS`, `getModeColor`.

- [ ] **Step 1: Build the home surface**

Read `components/home/CycleHome.tsx` and `components/home/KidsHome.tsx` for the home composition pattern (hydration gate on the store, `PaperCard`, Quick-Log Kit). Build `MenopauseHome` with, top to bottom:
- **Hero card:** stage label + **"months since last period"** from `monthsSinceDate(lastPeriodDate, new Date())` (show a gentle "—" when null). Mode color via `getModeColor('menopause', isDark)`.
- **12-month offer:** when `shouldOfferMenopauseUpdate(stage, lastPeriodDate, now)` is true, a non-blocking `PaperCard` prompt: "It's been 12 months since your last period — many people consider this menopause. Update your stage?" → confirm sets `useMenopauseStore.setStage('meno')` (+ persist to `profiles.menopause_stage`); dismiss hides it for the session. Never automatic.
- **Quick-log row:** the user's onboarding-picked symptoms (fallback to the top vasomotor+sleep set) → tap → severity sheet → `saveMenopauseLog`.
- **Recent** card: last few `useMenopauseLogs()` entries.
- **Grandma Wisdom** card: one static stage-appropriate line (E3 deepens). Keep the copy inline as a small `Record<MenopauseStage, string>` in this file for now.
- **(Peri only)** a "log a period" affordance opening the period-event form (Task 7).
Respect the store `hydrated` gate before rendering data-derived UI. Tokens only.

- [ ] **Step 2: Mount it**

In `app/(tabs)/index.tsx`, add the branch: `if (mode === 'menopause') return <MenopauseHome />` alongside the existing per-mode home branches.

- [ ] **Step 3: Typecheck + manual verify + commit**

Run: `npm run typecheck`
Manual (with Dev Panel seed, Task 10): hero counter reads right at 3/6/12/14 months; 12-month prompt appears only at ≥12 in peri; quick-log writes; light + dark + both design variants render.
```bash
git add components/home/MenopauseHome.tsx app/(tabs)/index.tsx
git commit -m "feat(menopause): home surface (stage hero, months counter, 12mo offer, quick-log, wisdom)"
```

---

### Task 9: `MenopauseAnalytics` screen

**Files:**
- Create: `components/analytics/MenopauseAnalytics.tsx`
- Modify: the vault tab screen (`app/(tabs)/vault.tsx`) to render `MenopauseAnalytics` when `mode === 'menopause'` (mirror how `CycleAnalytics` mounts in the vault slot)

**Interfaces:**
- Consumes: `useMenopauseLogs`, `computeSymptomStats`, `computeVasomotorFrequency`, `menopauseSymptomLabel`, the shared `components/analytics/shared/*` primitives + `components/charts/SvgCharts`.

- [ ] **Step 1: Build the analytics screen**

Read `components/analytics/CycleAnalytics.tsx` for the composition (header, big chart card, stat-tile grid, detail sheets) and mirror it. Sections:
- **Vasomotor headline** — line/bar of `computeVasomotorFrequency(rows)` (hot flash + night sweat per day). Use an existing chart from `SvgCharts`.
- **Top symptoms** — `computeSymptomStats(rows)` as a stat-tile grid (label via `menopauseSymptomLabel`, count + avg severity).
- **Sleep & mood trend** — filter rows to `sleep`/`low_mood` severities over time.
- **Months-since-last-period** timeline (peri) — from the store's `lastPeriodDate`.
Empty state when there are no logs (mirror CycleAnalytics' empty handling). Tokens only.

- [ ] **Step 2: Mount it in the vault slot**

In `app/(tabs)/vault.tsx`, add: when `mode === 'menopause'`, render `<MenopauseAnalytics />` (same place the pre-pregnancy branch renders `CycleAnalytics`).

- [ ] **Step 3: Typecheck + manual verify + commit**

Run: `npm run typecheck`
Manual (seeded): charts + tiles render; empty state shows with no data; light/dark + both variants.
```bash
git add components/analytics/MenopauseAnalytics.tsx app/(tabs)/vault.tsx
git commit -m "feat(menopause): basic analytics screen (vasomotor, symptom stats, trends)"
```

---

### Task 10: Dev Panel + `seedMenopauseData`

**Files:**
- Modify: `lib/devSeed.ts` (add `seedMenopauseData`; extend `seedAllData`, `wipeAllDemoData`, `repairBehaviorsFromData`)
- Modify: `app/dev-panel.tsx` (MODE button, MENOPAUSE section)

**Interfaces:**
- Consumes: `supabase`, `ALL_MENOPAUSE_SYMPTOMS`, `toDateStr`, `useMenopauseStore`.
- Produces: `async function seedMenopauseData(): Promise<{ inserted: number }>`.

- [ ] **Step 1: Implement `seedMenopauseData`**

In `lib/devSeed.ts`, mirror `seedCycleData` (auth → wipe `menopause_logs` for the user → build rows → insert in chunks). Build ~6 weeks of realistic rows: for each of ~40 recent days, 0–3 symptom rows sampled from `ALL_MENOPAUSE_SYMPTOMS` with `severity` 1–5, weighted toward `hot_flash`/`night_sweat`/`sleep`; plus 1–2 `period` events (type `'period'`, value `'light'|'medium'`) in the last ~2 months. Use `toDateStr` on each date. Return `{ inserted }`.
Then:
- Add `seedMenopauseData()` into `seedAllData()` (sum its `inserted`).
- Add a `menopause_logs` delete into `wipeAllDemoData()` (mirror the `cycle_logs` block).
- In `repairBehaviorsFromData()`: if `menopause_logs` has any row for the user, include `'menopause'` in the enrolled result (mirror the `cycle_logs → pre-pregnancy` block, using DB type `'menopause'`).

- [ ] **Step 2: Wire the Dev Panel**

In `app/dev-panel.tsx`:
- **MODE section** (L355-361): add `<ModeButton current={mode} target="menopause" label="Menopause" onPress={setMode} />`.
- **ENROLLMENT section:** confirm `menopause` appears in the behaviors it maps over (the list is derived from the `Behavior` union / an array — if it's a hardcoded array, add `'menopause'`).
- **New `<Section title="MENOPAUSE">`** with buttons:
  - `Seed menopause data` → `handleSeedMenopause` (wrap `seedMenopauseData()` in the existing `run(...)` helper, like `handleSeedCycle`).
  - Stage: three buttons `Peri` / `Meno` / `Post` → `useMenopauseStore.getState().setStage('peri'|'meno'|'post')` (also update `profiles.menopause_stage` for the current user).
  - Months since last period: buttons `3` / `6` / `12` / `14` → set `useMenopauseStore.getState().setLastPeriodDate(<toDateStr N months ago>)` (compute the date in JS; also write `profiles.last_period_date`).
  - `Menopause onboarding` → `router.push('/onboarding/menopause')`.

- [ ] **Step 3: Typecheck + manual verify + commit**

Run: `npm run typecheck`
Manual: Dev Panel → seed menopause data → set each stage → scrub months (12/14 shows the home prompt) → open home + analytics and confirm everything renders. `repairBehaviorsFromData` picks up menopause after seeding.
```bash
git add lib/devSeed.ts app/dev-panel.tsx
git commit -m "feat(menopause): dev panel tools + seedMenopauseData (mode button, stage/months scrubbers)"
```

---

## Self-Review

**1. Spec coverage:**
- Behavior identity (unions, DB 1:1, pill, mode color, boot) → Task 1. ✓
- Stage state machine + 12-month offer → Tasks 4 (logic/store) + 8 (home prompt). ✓
- `menopause_logs` + profile columns → Task 2. ✓
- Symptom taxonomy → Task 3. ✓
- Direct onboarding + queue priority + journey option → Tasks 1 (PRIORITY) + 6. ✓
- Home → Task 8. ✓ · Symptom log sheet + agenda → Task 7. ✓ · Basic analytics + `insights.ts` table switch → Tasks 5 + 9. ✓
- modeConfig (vault=Analytics, library/exchange hidden) → Task 1. ✓
- Dev Panel (mode button, enrollment, seed, stage picker, months scrubber, jump-to-onboarding, repairBehaviors) → Task 10. ✓
- Clinical guardrail (no auto-diagnosis; 12-month is an offer) → enforced in Task 4 logic + Task 8 UI. ✓
- Non-goals (E2/E3/E4, surgical nuance, forum) → excluded throughout; modeConfig hides library/exchange. ✓
- Testing (unit for symptoms/analytics/stage/store; manual sim; RLS) → per-task tests + manual steps. ✓

**2. Placeholder scan:** none — every code step has concrete code; UI tasks name the exact mirror file + concrete card list + exact finish/save code. Chart-widget choice in Tasks 8/9 references existing `SvgCharts` exports rather than inventing.

**3. Type consistency:** `MenopauseStage` (Task 4) reused by store, onboarding store, analytics; `MenopauseSymptomId` (Task 3) reused by analytics/onboarding/log forms/seed; `saveMenopauseLog` signature (Task 7) matches its call sites in Tasks 7/8/10; `useMenopauseLogs` query key `['menopause-logs']` matches `invalidateMenopauseLogQueries`. Behavior DB type is the literal `'menopause'` everywhere (no alias), consistent with `behaviorFromDbType` returning it unchanged.

**Note for planning-time confirmation:** exact `behaviors` upsert shape (Task 6) and the home/agenda/vault mode-branch mount points (Tasks 7–9) must be confirmed against the live files named — each task tells the implementer to read the mirror file first.
