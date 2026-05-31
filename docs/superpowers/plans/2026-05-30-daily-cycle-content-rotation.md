# Daily Cycle Content Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Today's Nudge card and the pillar "For you right now" section rotate content day-by-day within a cycle phase, keyed deterministically to cycle day.

**Architecture:** A new pure helper `lib/cyclePhaseRotation.ts` picks an item (or slice) from a per-phase pool by `cycleDay` — deterministic, no `Math.random()`/`Date.now()`. `lib/cycleNudges.ts` keeps log-driven templates as priority overrides but rotates general phase templates. `lib/pillarAdaptive.ts` turns `forYou` into a daily slice. Banks (nudge templates + phase-tagged pillar tips) are expanded so rotation has material.

**Tech Stack:** TypeScript (strict), Jest + jest-expo, React Native / Expo Router, React Query.

---

### Task 1: Rotation engine — `lib/cyclePhaseRotation.ts`

**Files:**
- Create: `lib/cyclePhaseRotation.ts`
- Test: `lib/__tests__/cyclePhaseRotation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/cyclePhaseRotation.test.ts
import { pickForCycleDay, sliceForCycleDay } from '../cyclePhaseRotation'

describe('pickForCycleDay', () => {
  const pool = ['a', 'b', 'c']

  it('is deterministic for the same cycle day', () => {
    expect(pickForCycleDay(pool, 5)).toBe(pickForCycleDay(pool, 5))
  })

  it('advances across consecutive days', () => {
    expect(pickForCycleDay(pool, 1)).not.toBe(pickForCycleDay(pool, 2))
  })

  it('is 1-based: cycle day 1 returns the first item', () => {
    expect(pickForCycleDay(pool, 1)).toBe('a')
  })

  it('wraps around when cycleDay exceeds pool length', () => {
    expect(pickForCycleDay(pool, 4)).toBe('a')
  })

  it('handles a single-item pool', () => {
    expect(pickForCycleDay(['only'], 99)).toBe('only')
  })

  it('returns undefined for an empty pool', () => {
    expect(pickForCycleDay([], 3)).toBeUndefined()
  })

  it('guards against non-positive cycle days', () => {
    expect(pickForCycleDay(pool, 0)).toBe('c')
    expect(pickForCycleDay(pool, -1)).toBe('b')
  })
})

describe('sliceForCycleDay', () => {
  const pool = ['a', 'b', 'c', 'd']

  it('returns the requested count', () => {
    expect(sliceForCycleDay(pool, 1, 2)).toHaveLength(2)
  })

  it('is stable for the same day', () => {
    expect(sliceForCycleDay(pool, 3, 2)).toEqual(sliceForCycleDay(pool, 3, 2))
  })

  it('advances across days', () => {
    expect(sliceForCycleDay(pool, 1, 2)).not.toEqual(sliceForCycleDay(pool, 2, 2))
  })

  it('wraps without going out of bounds', () => {
    expect(sliceForCycleDay(pool, 4, 2)).toEqual(['d', 'a'])
  })

  it('caps count at pool length and never duplicates within a slice', () => {
    expect(sliceForCycleDay(pool, 1, 10)).toHaveLength(4)
  })

  it('returns [] for an empty pool', () => {
    expect(sliceForCycleDay([], 1, 2)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/cyclePhaseRotation.test.ts`
Expected: FAIL — "Cannot find module '../cyclePhaseRotation'".

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/cyclePhaseRotation.ts
/**
 * Deterministic per-phase content rotation keyed to cycle day.
 *
 * Same cycleDay → same result (no flicker when the app is reopened the same
 * day). Pure functions — no Math.random() / Date.now() — so they are testable
 * and safe under the workflow harness.
 */

/** Normalize a 1-based cycle day into a valid array index for `len` items. */
function indexFor(len: number, cycleDay: number): number {
  // cycleDay is 1-based; day 1 → index 0. Modulo handles wraparound and the
  // double-modulo guards negative / zero days.
  return (((cycleDay - 1) % len) + len) % len
}

/** Pick today's single item from a phase pool. Undefined if the pool is empty. */
export function pickForCycleDay<T>(pool: T[], cycleDay: number): T | undefined {
  if (pool.length === 0) return undefined
  return pool[indexFor(pool.length, cycleDay)]
}

/**
 * Pick a deterministic, contiguous slice of `count` items starting at today's
 * index, wrapping around the pool. Never returns more than the pool holds and
 * never repeats an item within a single slice.
 */
export function sliceForCycleDay<T>(pool: T[], cycleDay: number, count: number): T[] {
  if (pool.length === 0 || count <= 0) return []
  const n = Math.min(count, pool.length)
  const start = indexFor(pool.length, cycleDay)
  const out: T[] = []
  for (let i = 0; i < n; i++) {
    out.push(pool[(start + i) % pool.length])
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/cyclePhaseRotation.test.ts`
Expected: PASS (all 13 assertions).

- [ ] **Step 5: Commit**

```bash
git add lib/cyclePhaseRotation.ts lib/__tests__/cyclePhaseRotation.test.ts
git commit -m "feat(cycle): deterministic cycle-day rotation engine"
```

---

### Task 2: Rotate nudge templates within a phase — `lib/cycleNudges.ts`

**Files:**
- Modify: `lib/cycleNudges.ts` (replace `pickCycleNudge`, tag templates as override vs general)
- Test: `lib/__tests__/cycleNudges.test.ts` (create)

**Context:** Today `pickCycleNudge` returns the first matching predicate, so a phase always shows the same template. We split templates into **overrides** (log-driven: `late`, `ovulation-confirmed`, `luteal-pms`) and **general** (phase fallbacks). Overrides keep first-match priority; when none fire, general matches rotate by cycle day.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/cycleNudges.test.ts
import { pickCycleNudge, type NudgeContext } from '../cycleNudges'

const base: NudgeContext = {
  phase: 'luteal',
  cycleDay: 18,
  hasBBTToday: false,
  hasLHToday: false,
  hasCMToday: false,
  moodToday: null,
  daysLate: 0,
  bbtShiftConfirmed: false,
}

describe('pickCycleNudge', () => {
  it('lets a log-driven override win over rotation', () => {
    const ctx = { ...base, moodToday: '1' } // low mood logged
    expect(pickCycleNudge(ctx).id).toBe('luteal-pms')
  })

  it('rotates general luteal templates across cycle days when no override fires', () => {
    const d18 = pickCycleNudge({ ...base, cycleDay: 18 })
    const d19 = pickCycleNudge({ ...base, cycleDay: 19 })
    expect(d18.id).not.toBe(d19.id)
  })

  it('only returns templates eligible for the current phase', () => {
    const n = pickCycleNudge({ ...base, phase: 'follicular', cycleDay: 9 })
    // follicular-only or universal — never a luteal-tagged template
    expect(['luteal-care', 'luteal-pms']).not.toContain(n.id)
  })

  it('always returns a template (fallback never empty)', () => {
    expect(pickCycleNudge(base)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/cycleNudges.test.ts`
Expected: FAIL — the rotation test fails (current code returns the same first-match template for both days).

- [ ] **Step 3: Implement the override/general split + rotation**

In `lib/cycleNudges.ts`, add a `kind` field to the template type and mark the log-driven ones as `'override'`:

```ts
export type CycleNudgeTemplate = {
  id: string
  kind: 'override' | 'general'
  headlineKey: string
  bodyKey: string
  pillarId?: string
  logShortcut?: 'bbt' | 'lh' | 'cm' | 'intercourse'
  predicate: (ctx: NudgeContext) => boolean
}
```

Set `kind: 'override'` on `late`, `window-opens-tomorrow`, `ovulation-confirmed`, `luteal-pms` (the log/signal-driven templates). Set `kind: 'general'` on the four phase fallbacks (`menstruation-rest`, `follicular-energy`, `ovulation-window`, `luteal-care`) and on any new general templates added in Task 4.

Replace `pickCycleNudge`:

```ts
import { pickForCycleDay } from './cyclePhaseRotation'

/**
 * Pick today's nudge: a log-driven override wins if any apply (first match);
 * otherwise rotate among the general templates eligible for this phase, keyed
 * to cycle day.
 */
export function pickCycleNudge(ctx: NudgeContext): CycleNudgeTemplate {
  const override = CYCLE_NUDGE_TEMPLATES.find((t) => t.kind === 'override' && t.predicate(ctx))
  if (override) return override

  const general = CYCLE_NUDGE_TEMPLATES.filter((t) => t.kind === 'general' && t.predicate(ctx))
  const picked = pickForCycleDay(general, ctx.cycleDay)
  return picked ?? CYCLE_NUDGE_TEMPLATES[CYCLE_NUDGE_TEMPLATES.length - 1]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/cycleNudges.test.ts`
Expected: PASS. (Rotation test passes once Task 4 adds a 2nd general luteal template; if running before Task 4, temporarily expect it may share id — but order Task 4 before re-running. See note.)

> **Ordering note:** the "rotates general luteal templates" assertion needs ≥2 general luteal templates. There is currently 1 (`luteal-care`). Run Task 4 (bank expansion) before asserting this test green. Steps 3 here are still committed independently; the failing rotation case is expected until Task 4.

- [ ] **Step 5: Commit**

```bash
git add lib/cycleNudges.ts lib/__tests__/cycleNudges.test.ts
git commit -m "feat(cycle): rotate general nudge templates by cycle day, keep log overrides"
```

---

### Task 3: Pillar "For you" becomes a daily slice — `lib/pillarAdaptive.ts`

**Files:**
- Modify: `lib/pillarAdaptive.ts` (`usePillarTipBuckets` — slice the phase-matched pool)
- Test: `lib/__tests__/pillarTipRotation.test.ts` (create — pure helper extracted)

**Context:** `usePillarTipBuckets` is a hook (uses other hooks), so we extract the pure splitting/rotation into a testable function `splitTips(tips, context, cycleDay)` and have the hook call it. `forYou` = a daily slice (1–2) of phase-matching tips; everything else → `general`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/pillarTipRotation.test.ts
import { splitTips } from '../pillarAdaptive'
import type { PillarTip } from '../../types'

const tips: PillarTip[] = [
  { label: 'L1', text: 'luteal one', phases: ['luteal'] },
  { label: 'L2', text: 'luteal two', phases: ['luteal'] },
  { label: 'L3', text: 'luteal three', phases: ['luteal'] },
  { label: 'U1', text: 'untagged', },
]

describe('splitTips', () => {
  it('puts a daily slice of phase-matching tips in forYou', () => {
    const { forYou } = splitTips(tips, { cyclePhase: 'luteal', cycleDay: 18 }, 18, 2)
    expect(forYou).toHaveLength(2)
    expect(forYou.every((t) => t.phases?.includes('luteal'))).toBe(true)
  })

  it('rotates the forYou slice across cycle days', () => {
    const a = splitTips(tips, { cyclePhase: 'luteal', cycleDay: 18 }, 18, 1)
    const b = splitTips(tips, { cyclePhase: 'luteal', cycleDay: 19 }, 19, 1)
    expect(a.forYou[0].label).not.toBe(b.forYou[0].label)
  })

  it('keeps every non-surfaced tip in general (nothing hidden)', () => {
    const { forYou, general } = splitTips(tips, { cyclePhase: 'luteal', cycleDay: 18 }, 18, 1)
    expect(forYou.length + general.length).toBe(tips.length)
  })

  it('forYou is empty when there is no cycle context', () => {
    const { forYou } = splitTips(tips, {}, 1, 2)
    expect(forYou).toHaveLength(0)
  })
}) 
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/pillarTipRotation.test.ts`
Expected: FAIL — `splitTips` not exported.

- [ ] **Step 3: Extract `splitTips` and wire the hook to it**

In `lib/pillarAdaptive.ts`, add the exported pure function and call it from the hook. The existing `matchesContext` stays as the phase/week/age matcher.

```ts
import { sliceForCycleDay } from './cyclePhaseRotation'

/**
 * Pure split used by usePillarTipBuckets. `forYou` is a daily slice of the
 * phase-matching pool (rotated by cycleDay); everything else goes to `general`
 * so the full tip library stays browsable under "All tips".
 */
export function splitTips(
  tips: PillarTip[],
  context: AdaptiveContext,
  cycleDay: number,
  sliceCount = 2,
): { forYou: PillarTip[]; general: PillarTip[] } {
  const matching = tips.filter((tip) => matchesContext(tip, context))
  const forYou = sliceForCycleDay(matching, cycleDay, sliceCount)
  const forYouSet = new Set(forYou)
  const general = tips.filter((tip) => !forYouSet.has(tip))
  return { forYou, general }
}
```

Update `usePillarTipBuckets` to use it (replacing the inline for-loop split):

```ts
  const context = useAdaptiveContext(pillarId)
  const cycleDay = context.cycleDay ?? 1
  const { forYou, general } = splitTips(tips, context, cycleDay)
  const contextLabel = buildContextLabel(pillarId, context)
  return { forYou, general, context, contextLabel }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/pillarTipRotation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/pillarAdaptive.ts lib/__tests__/pillarTipRotation.test.ts
git commit -m "feat(cycle): pillar For-you becomes a daily cycle-day slice"
```

---

### Task 4: Expand the nudge bank (general templates + copy)

**Files:**
- Modify: `lib/cycleNudges.ts` (add general templates per phase)
- Modify: `lib/i18n/en.ts` (add new `cycle_nudge_*` keys)

**Context:** Rotation needs ≥3–5 general templates per phase. Currently each phase has 1 general fallback. Add new general templates with house-style copy: headline = one `*…*`-italic phrase, body = physiological "why" + one actionable nudge.

- [ ] **Step 1: Add the new copy keys to `lib/i18n/en.ts`**

Insert alongside the existing `cycle_nudge_*` block (after line ~248). Example additions (author ~3 more per phase in this exact voice):

```ts
  // Menstruation extras
  cycle_nudge_menstruation_iron_headline: 'Refill your *iron stores*',
  cycle_nudge_menstruation_iron_body: 'Bleeding draws down iron, dear. Pair a spinach or lentil meal with something citrusy — vitamin C roughly doubles how much you absorb.',
  cycle_nudge_menstruation_warmth_headline: 'Be *gentle* with yourself today',
  cycle_nudge_menstruation_warmth_body: 'Prostaglandins drive the cramping. A heat pad and slow movement ease it as well as most painkillers — and your energy floor is lowest now by design.',
  // Follicular extras
  cycle_nudge_follicular_plan_headline: 'A good day to *plan ahead*',
  cycle_nudge_follicular_plan_body: 'Rising estrogen sharpens focus and mood. Use this build phase for the harder thinking, the bigger workouts, the conversations you have been putting off.',
  cycle_nudge_follicular_hydrate_headline: 'Watch your *cervical mucus*',
  cycle_nudge_follicular_hydrate_body: 'It should start turning clearer and stretchier as the window approaches. Mucus is mostly water — 2 to 2.5 litres a day keeps the signal readable.',
  // Ovulation extras
  cycle_nudge_ovulation_timing_headline: 'The *two days before* matter most',
  cycle_nudge_ovulation_timing_body: 'Sperm live up to five days; the egg only 12 to 24 hours. Aim for the run-up, not the exact day — frequency beats precision.',
  // Luteal extras
  cycle_nudge_luteal_sleep_headline: 'Protect your *sleep* this week',
  cycle_nudge_luteal_sleep_body: 'Progesterone nudges body temperature up and fragments sleep. A cooler room and an earlier wind-down steady mood more than you would expect.',
  cycle_nudge_luteal_move_headline: 'A walk beats the *spiral*',
  cycle_nudge_luteal_move_body: 'Late-luteal dips are hormonal, not a verdict on your life. Twenty minutes of daylight and movement resets the loop better than scrolling does.',
```

- [ ] **Step 2: Add matching general templates in `lib/cycleNudges.ts`**

Add these to `CYCLE_NUDGE_TEMPLATES` (before the existing phase fallbacks is fine — all are `general`, order within a phase only affects the rotation sequence):

```ts
  { id: 'menstruation-iron', kind: 'general', headlineKey: 'cycle_nudge_menstruation_iron_headline', bodyKey: 'cycle_nudge_menstruation_iron_body', pillarId: 'nutrition-prep', predicate: (c) => c.phase === 'menstruation' },
  { id: 'menstruation-warmth', kind: 'general', headlineKey: 'cycle_nudge_menstruation_warmth_headline', bodyKey: 'cycle_nudge_menstruation_warmth_body', pillarId: 'emotional-readiness', predicate: (c) => c.phase === 'menstruation' },
  { id: 'follicular-plan', kind: 'general', headlineKey: 'cycle_nudge_follicular_plan_headline', bodyKey: 'cycle_nudge_follicular_plan_body', pillarId: 'emotional-readiness', predicate: (c) => c.phase === 'follicular' },
  { id: 'follicular-hydrate', kind: 'general', headlineKey: 'cycle_nudge_follicular_hydrate_headline', bodyKey: 'cycle_nudge_follicular_hydrate_body', pillarId: 'fertility', predicate: (c) => c.phase === 'follicular' },
  { id: 'ovulation-timing', kind: 'general', headlineKey: 'cycle_nudge_ovulation_timing_headline', bodyKey: 'cycle_nudge_ovulation_timing_body', pillarId: 'fertility', predicate: (c) => c.phase === 'ovulation' },
  { id: 'luteal-sleep', kind: 'general', headlineKey: 'cycle_nudge_luteal_sleep_headline', bodyKey: 'cycle_nudge_luteal_sleep_body', pillarId: 'emotional-readiness', predicate: (c) => c.phase === 'luteal' },
  { id: 'luteal-move', kind: 'general', headlineKey: 'cycle_nudge_luteal_move_headline', bodyKey: 'cycle_nudge_luteal_move_body', pillarId: 'emotional-readiness', predicate: (c) => c.phase === 'luteal' },
```

Also confirm the existing four fallbacks now carry `kind: 'general'` (from Task 2) and the override templates carry `kind: 'override'`.

- [ ] **Step 3: Run the nudge tests (Task 2 suite now fully green)**

Run: `npx jest lib/__tests__/cycleNudges.test.ts`
Expected: PASS — including "rotates general luteal templates across cycle days" (now 3 general luteal templates: `luteal-care`, `luteal-sleep`, `luteal-move`).

- [ ] **Step 4: Typecheck the new keys**

Run: `npx tsc --noEmit`
Expected: no errors (every `headlineKey`/`bodyKey` resolves to an `en.ts` key).

- [ ] **Step 5: Commit**

```bash
git add lib/cycleNudges.ts lib/i18n/en.ts
git commit -m "feat(cycle): expand nudge bank with on-voice phase templates"
```

---

### Task 5: Expand phase-tagged pillar tips

**Files:**
- Modify: `lib/prePregPillars.ts` (add `phases`-tagged tips so each phase has ≥3 per relevant pillar)

**Context:** Rotation in Task 3 needs ≥3 phase-tagged tips per pillar/phase to feel fresh. `emotional-readiness` has 1 luteal + 1 menstruation tip today; `fertility` has follicular/ovulation coverage. Add tagged tips in Grandma's register (`{ label, text, phases }`).

- [ ] **Step 1: Add tagged tips to the pillars**

For `emotional-readiness`, add (append to its `tips` array):

```ts
      { label: 'Two-week-wait toolkit', text: 'The luteal stretch is the hardest part, dear. Pick one anchor — a book, a class, a standing call — that exists entirely outside the question of whether you are pregnant.', phases: ['luteal'] },
      { label: 'Lower the stakes of one test', text: 'A single negative is data, not a sentence. Most cycles do not work even when everything is perfect — that is biology, not failure.', phases: ['luteal'] },
      { label: 'Let the first days be soft', text: 'If your period came, give yourself the same tenderness you would give a friend. Grief and relief can share a day, and both are allowed.', phases: ['menstruation'] },
      { label: 'Reset the comparison feed', text: 'Follicular energy is a good moment to curate your inputs — mute the accounts that sting and follow the ones that steady you, before the next wait begins.', phases: ['follicular'] },
```

For `fertility`, add:

```ts
      { label: 'Rest is part of the work', text: 'Your body is selecting the next lead follicle right now, love. A quiet period week sets up a stronger cycle — there is nothing to optimize today.', phases: ['menstruation'] },
      { label: 'The window is closing', text: 'After ovulation the egg lives only 12 to 24 hours. If you have been timing things, the work is done — the luteal phase is for waiting, not chasing.', phases: ['luteal'] },
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (all use the existing `PillarTip` shape with valid `CyclePhaseTag` values).

- [ ] **Step 3: Run the pillar rotation suite against real data (sanity)**

Run: `npx jest lib/__tests__/pillarTipRotation.test.ts`
Expected: PASS (unchanged — the suite uses fixtures, but confirms no regression).

- [ ] **Step 4: Commit**

```bash
git add lib/prePregPillars.ts
git commit -m "feat(cycle): expand phase-tagged pillar tips for daily rotation"
```

---

### Task 6: Full regression + manual smoke

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npx jest`
Expected: all suites pass (new `cyclePhaseRotation`, `cycleNudges`, `pillarTipRotation` plus existing cycle tests).

- [ ] **Step 2: Typecheck the project**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Manual smoke (document, no code)**

In the running app (pre-pregnancy mode, with cycle history):
- Open home → Today's Nudge shows a phase-appropriate headline; it is one of the general phase templates unless a log override applies.
- Open a pre-preg pillar (e.g. Emotional Readiness) → "For you right now" shows 1–2 tips, the "Luteal phase · day N" label is correct, and "All tips" still lists the full set.
- (Optional) Temporarily shift `lastPeriodStart` in dev to simulate the next cycle day and confirm the surfaced nudge/tip changes.

- [ ] **Step 4: No commit** (verification task).

---

## Self-Review

**Spec coverage:**
- Rotation engine (spec §Architecture.1) → Task 1. ✓
- Nudge consumer w/ override priority + rotation (spec §2) → Tasks 2, 4. ✓
- Pillar consumer daily slice (spec §3) → Task 3. ✓
- Bank expansion, on-voice (spec §Decisions) → Tasks 4, 5. ✓
- Edge cases: empty pool (Task 1 tests), no cycle context (Task 3 test `forYou` empty), pool<phase length (engine wraparound test). ✓
- Testing approach (spec §Testing) → Tasks 1–3 pure tests + Task 6 regression. ✓

**Type consistency:** `pickForCycleDay`/`sliceForCycleDay` (Task 1) used identically in Tasks 2 & 3. `CycleNudgeTemplate.kind` introduced in Task 2, populated in Task 4. `splitTips(tips, context, cycleDay, sliceCount)` defined and called consistently. `PillarTip`/`CyclePhaseTag` match `types/index.ts`. `NudgeContext` already carries `cycleDay`. ✓

**Placeholder scan:** all copy is concrete; no TBD/TODO. The Task 2→4 ordering dependency is called out explicitly. ✓
