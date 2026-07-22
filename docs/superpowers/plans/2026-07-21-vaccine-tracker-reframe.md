# Vaccine Tracker Reframe (Global) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the Kids vaccine feature from a personalized "here's your child's due/overdue schedule" engine into a defensible **tracker + sourced official reference + per-vaccine explanations**, with an honest WHO-reference fallback for uncatalogued countries.

**Architecture:** Keep the existing 4-state date engine for ordering, but (1) make schedule lookup *provenance-aware* so uncatalogued countries get an explicit WHO reference instead of a silent US schedule, (2) route all user-facing status text through neutral "records language" i18n keys (never "overdue"/"due soon"), (3) suppress personalized home nudges in WHO-reference mode, and (4) add on-view source citation + a point-of-use disclaimer. Pure-logic changes are unit-tested; RN visual changes are verified by typecheck + simulator screenshot.

**Tech Stack:** TypeScript (strict), React Native 0.81 + Expo SDK 54, Zustand v5, React Query v5, `jest` + `jest-expo`, local i18n (`lib/i18n/`), Character blob icons (`components/characters/Characters.tsx`).

**Spec:** [docs/superpowers/specs/2026-07-21-vaccine-tracker-reframe-design.md](../specs/2026-07-21-vaccine-tracker-reframe-design.md)

## Global Constraints

- **No clinical verdicts.** The strings "overdue" and "due soon" must NOT appear in any user-facing vaccine string, in any language. Internal enum values (`overdue`, `upcoming`) may keep their names but must never be printed.
- **No silent wrong-country schedule.** Uncatalogued countries render the WHO reference with an explicit banner — never a disguised US schedule.
- **Design tokens only.** Import from `constants/theme.ts` (Diffuse: `useDiffuseTheme()` / `diffuseFont`; cream: `useTheme()` / `font`). No raw hex except SVG path strings. Cards `radius.lg` (28), pills `radius.full` (999). No `shadows.glow*`.
- **Local dates.** Use `toDateStr(new Date())` for any `log_date`, never `toISOString().split('T')[0]`.
- **i18n.** All new copy added to `lib/i18n/en.ts`; the 12 other languages are filled via the existing wave process. Run `npm run i18n:check` to catch key drift.
- **Medical data** carries a `// CLINICAL-REVIEW: pending sign-off` marker (existing convention in `lib/vaccineInfo.ts`) until a clinician confirms it.
- **Tests:** `npx jest <path>` (preset `jest-expo`). **Typecheck:** `npm run typecheck`.

---

### Task 1: Provenance-aware schedule lookup + WHO baseline

**Files:**
- Modify: `lib/vaccineSchedule.ts` (add `WHO` entry to `VACCINE_SCHEDULES` ~line 185; add source map + types; rewrite `getScheduleForCountry` at lines 187-189)
- Test: `lib/__tests__/vaccineSchedule.test.ts` (create)

**Interfaces:**
- Produces:
  - `interface VaccineScheduleSource { authority: string; title: string; url: string; reviewed: string }`
  - `type ScheduleProvenance = 'national' | 'who-reference'`
  - `interface ResolvedSchedule { entries: VaccineEntry[]; provenance: ScheduleProvenance; countryCode: string; source: VaccineScheduleSource }`
  - `getScheduleForCountry(countryCode: string): ResolvedSchedule` (CHANGED — was `VaccineEntry[]`)
  - `VACCINE_SCHEDULE_SOURCES: Record<string, VaccineScheduleSource>`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/vaccineSchedule.test.ts`:

```ts
import { getScheduleForCountry, VACCINE_SCHEDULES } from '../vaccineSchedule'

describe('getScheduleForCountry', () => {
  it('returns a national schedule with source for a catalogued country', () => {
    const r = getScheduleForCountry('US')
    expect(r.provenance).toBe('national')
    expect(r.countryCode).toBe('US')
    expect(r.entries.length).toBeGreaterThan(0)
    expect(r.source.authority).toMatch(/CDC/i)
    expect(r.source.url).toMatch(/^https?:\/\//)
    expect(r.source.reviewed).toMatch(/^\d{4}-\d{2}/)
  })

  it('falls back to the WHO reference for an uncatalogued country (never US)', () => {
    const r = getScheduleForCountry('ZZ')
    expect(r.provenance).toBe('who-reference')
    expect(r.countryCode).toBe('ZZ')
    expect(r.entries).toEqual(VACCINE_SCHEDULES['WHO'])
    expect(r.entries).not.toEqual(VACCINE_SCHEDULES['US'])
    expect(r.source.authority).toMatch(/WHO/i)
  })

  it('has a source entry for every catalogued country and WHO', () => {
    for (const code of Object.keys(VACCINE_SCHEDULES)) {
      const r = getScheduleForCountry(code)
      expect(r.source?.url).toMatch(/^https?:\/\//)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/vaccineSchedule.test.ts -t getScheduleForCountry`
Expected: FAIL — `r.provenance` undefined (getScheduleForCountry still returns an array).

- [ ] **Step 3: Add the WHO baseline entry to `VACCINE_SCHEDULES`**

Add as a new key inside the `VACCINE_SCHEDULES` object (after `IN`, before the closing `}` at ~line 185). This is the WHO Expanded Programme on Immunization essential schedule (weeks expressed in whole months to match the existing `IN` catalog convention: 6wk→1, 10wk→2, 14wk→3):

```ts
  // ── WHO EPI essential schedule (global reference baseline) ──────────────
  // CLINICAL-REVIEW: pending sign-off. Source: WHO recommended routine
  // immunizations for children. Used only as a reference for countries not in
  // this catalog — see VACCINE_SCHEDULE_SOURCES['WHO'].
  WHO: [
    { name: 'BCG',            ages: ['Birth'],                                 monthRanges: [[0,1]] },
    { name: 'Hepatitis B',    ages: ['Birth'],                                 monthRanges: [[0,1]] },
    { name: 'OPV (Polio)',    ages: ['Birth', '6 weeks', '10 weeks', '14 weeks'], monthRanges: [[0,1],[1,1],[2,2],[3,3]] },
    { name: 'IPV',            ages: ['14 weeks'],                              monthRanges: [[3,3]] },
    { name: 'Pentavalent',    ages: ['6 weeks', '10 weeks', '14 weeks'],       monthRanges: [[1,1],[2,2],[3,3]] },
    { name: 'Pneumococcal',   ages: ['6 weeks', '10 weeks', '14 weeks'],       monthRanges: [[1,1],[2,2],[3,3]] },
    { name: 'Rotavirus',      ages: ['6 weeks', '10 weeks'],                   monthRanges: [[1,1],[2,2]] },
    { name: 'Measles (MR)',   ages: ['9 months', '15-18 months'],             monthRanges: [[9,9],[15,18]] },
  ],
```

- [ ] **Step 4: Add source types + `VACCINE_SCHEDULE_SOURCES` map**

Insert directly above the existing `export function getScheduleForCountry` (currently line 187):

```ts
export interface VaccineScheduleSource {
  authority: string   // e.g. "US CDC/ACIP"
  title: string       // e.g. "CDC childhood immunization schedule"
  url: string
  reviewed: string    // ISO-ish "2026-07" — forcing-function against silent drift
}

export type ScheduleProvenance = 'national' | 'who-reference'

export interface ResolvedSchedule {
  entries: VaccineEntry[]
  provenance: ScheduleProvenance
  countryCode: string
  source: VaccineScheduleSource
}

// CLINICAL-REVIEW: pending sign-off — titles/URLs to be confirmed against each
// authority's current published schedule.
export const VACCINE_SCHEDULE_SOURCES: Record<string, VaccineScheduleSource> = {
  US: { authority: 'US CDC/ACIP', title: 'CDC childhood immunization schedule', url: 'https://www.cdc.gov/vaccines/schedules/', reviewed: '2026-07' },
  BR: { authority: 'Brasil PNI', title: 'Calendário Nacional de Vacinação (PNI)', url: 'https://www.gov.br/saude/pt-br/vacinacao', reviewed: '2026-07' },
  GB: { authority: 'UK NHS', title: 'NHS routine immunisation schedule', url: 'https://www.nhs.uk/vaccinations/nhs-vaccinations-and-when-to-have-them/', reviewed: '2026-07' },
  AU: { authority: 'Australia NIP', title: 'National Immunisation Program schedule', url: 'https://www.health.gov.au/topics/immunisation/nip', reviewed: '2026-07' },
  CA: { authority: 'PHAC Canada', title: 'Canadian Immunization Guide', url: 'https://www.canada.ca/en/public-health/services/canadian-immunization-guide.html', reviewed: '2026-07' },
  PT: { authority: 'Portugal DGS', title: 'Programa Nacional de Vacinação', url: 'https://www.sns.gov.pt/', reviewed: '2026-07' },
  DE: { authority: 'Germany STIKO', title: 'STIKO-Impfkalender', url: 'https://www.rki.de/impfen', reviewed: '2026-07' },
  FR: { authority: 'France', title: 'Calendrier vaccinal', url: 'https://sante.gouv.fr/', reviewed: '2026-07' },
  MX: { authority: 'México CENSIA', title: 'Cartilla Nacional de Vacunación', url: 'https://www.gob.mx/salud/censia', reviewed: '2026-07' },
  AR: { authority: 'Argentina MSAL', title: 'Calendario Nacional de Vacunación', url: 'https://www.argentina.gob.ar/salud', reviewed: '2026-07' },
  IN: { authority: 'India UIP', title: 'Universal Immunization Programme', url: 'https://www.nhp.gov.in/universal-immunisation-programme_pg', reviewed: '2026-07' },
  WHO: { authority: 'WHO', title: 'WHO recommended routine immunizations', url: 'https://immunizationdata.who.int/', reviewed: '2026-07' },
}
```

- [ ] **Step 5: Rewrite `getScheduleForCountry` to return `ResolvedSchedule`**

Replace the current body (lines 187-189):

```ts
export function getScheduleForCountry(countryCode: string): ResolvedSchedule {
  const national = VACCINE_SCHEDULES[countryCode]
  if (national) {
    return {
      entries: national,
      provenance: 'national',
      countryCode,
      source: VACCINE_SCHEDULE_SOURCES[countryCode] ?? VACCINE_SCHEDULE_SOURCES['WHO'],
    }
  }
  // Uncatalogued country → honest WHO reference, NEVER a silent US substitution.
  return {
    entries: VACCINE_SCHEDULES['WHO'],
    provenance: 'who-reference',
    countryCode,
    source: VACCINE_SCHEDULE_SOURCES['WHO'],
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx jest lib/__tests__/vaccineSchedule.test.ts -t getScheduleForCountry`
Expected: PASS (3 passing).
Note: this step breaks `buildVaccineScheduleTree` / `getNextDueVaccines` (they still treat the return as an array) — Task 2 fixes them. `npm run typecheck` will fail until Task 2; that is expected.

- [ ] **Step 7: Commit**

```bash
git add lib/vaccineSchedule.ts lib/__tests__/vaccineSchedule.test.ts
git commit -m "feat(vaccine): provenance-aware schedule lookup + WHO reference baseline"
```

---

### Task 2: Thread provenance through the engine + gate nudges

**Files:**
- Modify: `lib/vaccineSchedule.ts` — `buildVaccineScheduleTree` (line 230), `getNextDueVaccines` (lines 344-348)
- Test: `lib/__tests__/vaccineSchedule.test.ts` (extend)

**Interfaces:**
- Consumes: `getScheduleForCountry(): ResolvedSchedule` (Task 1)
- Produces: `getNextDueVaccines()` returns `[]` when provenance is `who-reference`; `buildVaccineScheduleTree()` unchanged signature (`AgeMilestone[]`), now reads `.entries` internally.

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/vaccineSchedule.test.ts`:

```ts
import { getNextDueVaccines, buildVaccineScheduleTree } from '../vaccineSchedule'

describe('getNextDueVaccines nudge gating', () => {
  const oldBirth = '2024-01-01' // ~2y old relative to 2026 — would trigger nudges

  it('returns no personalized nudges for a WHO-reference (uncatalogued) country', () => {
    expect(getNextDueVaccines(oldBirth, [], 'ZZ')).toEqual([])
  })

  it('still builds a schedule tree for an uncatalogued country (reference view)', () => {
    const tree = buildVaccineScheduleTree(oldBirth, [], 'ZZ')
    expect(tree.length).toBeGreaterThan(0) // WHO reference is shown, just not nudged
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/vaccineSchedule.test.ts -t "nudge gating"`
Expected: FAIL — `getNextDueVaccines` currently returns nudges (and/or a type error because `schedule` is now a `ResolvedSchedule`, not an array).

- [ ] **Step 3: Update `buildVaccineScheduleTree` to read `.entries`**

At line 230, change:

```ts
  const schedule = getScheduleForCountry(countryCode)
```
to:
```ts
  const schedule = getScheduleForCountry(countryCode).entries
```
(The rest of the function — the `for (const v of schedule)` loop — is unchanged.)

- [ ] **Step 4: Update `getNextDueVaccines` to read `.entries` and gate on provenance**

At lines 347-348, change:

```ts
  const result: UpcomingVaccine[] = []
  const schedule = getScheduleForCountry(countryCode)
```
to:
```ts
  const result: UpcomingVaccine[] = []
  const resolved = getScheduleForCountry(countryCode)
  // Reference-mode (uncatalogued country): show the schedule in the sheet, but
  // never push a personalized "next due" nudge — that would be advice about a
  // specific child on a schedule we can't confirm is theirs.
  if (resolved.provenance === 'who-reference') return []
  const schedule = resolved.entries
```
(The rest of the function is unchanged.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest lib/__tests__/vaccineSchedule.test.ts`
Expected: PASS (all Task 1 + Task 2 tests).

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS (the render sites still compile — they call `buildVaccineScheduleTree`, whose signature is unchanged).

- [ ] **Step 7: Commit**

```bash
git add lib/vaccineSchedule.ts lib/__tests__/vaccineSchedule.test.ts
git commit -m "feat(vaccine): read resolved entries + suppress nudges in WHO-reference mode"
```

---

### Task 3: Neutral status-label mapper + i18n keys + disclaimer constant

**Files:**
- Modify: `lib/vaccineSchedule.ts` (add pure label mapper near `MilestoneVaccineItem`, ~line 208)
- Modify: `lib/medicalSources.ts` (add `VACCINE_DISCLAIMER`)
- Modify: `lib/i18n/en.ts` (add keys near existing `kids_home_vaccine_*` block, ~line 1050)
- Test: `lib/__tests__/vaccineSchedule.test.ts` (extend)

**Interfaces:**
- Produces:
  - `function vaccineStatusLabel(status: MilestoneVaccineItem['status'], dueAge: string): { key: string; params?: Record<string, string> } | null` (null for `done` — the given date is shown instead)
  - `function vaccineMilestoneBadge(milestoneStatus: AgeMilestone['milestoneStatus'], done: number, total: number): { key: string; params: Record<string, string> }`
  - `VACCINE_DISCLAIMER: string`
  - i18n keys listed in Step 3.

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/vaccineSchedule.test.ts`:

```ts
import { vaccineStatusLabel, vaccineMilestoneBadge } from '../vaccineSchedule'

describe('neutral status labels (no clinical verdicts)', () => {
  it('maps each status to a neutral i18n key, never overdue/due-soon', () => {
    expect(vaccineStatusLabel('done', '2 months')).toBeNull()
    expect(vaccineStatusLabel('upcoming', '2 months')?.key).toBe('kids_home_vaccine_status_typical_now')
    expect(vaccineStatusLabel('overdue', '2 months')).toEqual({
      key: 'kids_home_vaccine_status_not_logged',
      params: { age: '2 months' },
    })
    expect(vaccineStatusLabel('future', '4 months')).toEqual({
      key: 'kids_home_vaccine_status_typical_around',
      params: { age: '4 months' },
    })
  })

  it('milestone badge keys are records-language, not clinical', () => {
    expect(vaccineMilestoneBadge('done', 5, 5).key).toBe('kids_home_vaccine_badge_done')
    expect(vaccineMilestoneBadge('partial', 1, 5).key).toBe('kids_home_vaccine_badge_partial')
    expect(vaccineMilestoneBadge('future', 0, 5).key).toBe('kids_home_vaccine_badge_ahead')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/vaccineSchedule.test.ts -t "neutral status labels"`
Expected: FAIL — `vaccineStatusLabel` / `vaccineMilestoneBadge` not exported.

- [ ] **Step 3: Add the neutral i18n keys**

In `lib/i18n/en.ts`, add after `kids_home_vaccine_no_info` (line 1050):

```ts
  kids_home_vaccine_status_typical_now: 'Typically around now — you can ask at your next visit',
  kids_home_vaccine_status_not_logged: 'Not yet logged — typically by {{age}}',
  kids_home_vaccine_status_typical_around: 'Typically around {{age}}',
  kids_home_vaccine_badge_done: '{{done}}/{{total}} logged',
  kids_home_vaccine_badge_partial: '{{done}}/{{total}} in your log',
  kids_home_vaccine_badge_ahead: '{{total}} ahead',
  kids_home_vaccine_reference_banner: "We don't have {{country}}'s official schedule yet — showing the WHO reference. Confirm timing with your pediatrician.",
  kids_home_vaccine_source: 'Reference: {{title}} · reviewed {{reviewed}}',
  kids_home_vaccine_disclaimer_banner: 'General information, not medical advice — always confirm timing with your child\'s pediatrician.',
```

- [ ] **Step 4: Add `VACCINE_DISCLAIMER` to medicalSources**

In `lib/medicalSources.ts`, after `VACCINE_SCHEDULE_NOTE` (line 11):

```ts
export const VACCINE_DISCLAIMER =
  "General information, not medical advice. Timing varies by country — always confirm your child's schedule with your pediatrician."
```

- [ ] **Step 5: Add the pure mappers to `lib/vaccineSchedule.ts`**

Insert after the `MilestoneVaccineItem` interface (~line 208):

```ts
// Status → neutral display copy. The engine's state names (overdue/upcoming)
// are internal ordering only and MUST NOT be printed; every user-facing label
// comes from here so "overdue"/"due soon" can never leak into the UI.
export function vaccineStatusLabel(
  status: MilestoneVaccineItem['status'],
  dueAge: string,
): { key: string; params?: Record<string, string> } | null {
  switch (status) {
    case 'done': return null // caller shows the given date instead
    case 'upcoming': return { key: 'kids_home_vaccine_status_typical_now' }
    case 'overdue': return { key: 'kids_home_vaccine_status_not_logged', params: { age: dueAge } }
    case 'future': return { key: 'kids_home_vaccine_status_typical_around', params: { age: dueAge } }
  }
}

export function vaccineMilestoneBadge(
  milestoneStatus: AgeMilestone['milestoneStatus'],
  done: number,
  total: number,
): { key: string; params: Record<string, string> } {
  const params = { done: String(done), total: String(total) }
  if (milestoneStatus === 'done') return { key: 'kids_home_vaccine_badge_done', params }
  if (milestoneStatus === 'partial') return { key: 'kids_home_vaccine_badge_partial', params }
  return { key: 'kids_home_vaccine_badge_ahead', params }
}
```

- [ ] **Step 6: Run tests + typecheck + i18n check**

Run: `npx jest lib/__tests__/vaccineSchedule.test.ts`
Expected: PASS (all).
Run: `npm run typecheck` → PASS.
Run: `npm run i18n:check` → no "missing key" errors for the new keys (other-language gaps handled by the wave process; note them but they are not a blocker).

- [ ] **Step 7: Commit**

```bash
git add lib/vaccineSchedule.ts lib/medicalSources.ts lib/i18n/en.ts lib/__tests__/vaccineSchedule.test.ts
git commit -m "feat(vaccine): neutral status-label mappers + records-language i18n keys + disclaimer"
```

---

### Task 4: Apply reframe to `VaccineScheduleTree` (both variants)

**Files:**
- Modify: `components/home/kids/VaccineScheduleTree.tsx` (Diffuse branch lines 261-425; cream branch 427-724)
- Modify: `components/home/kids/VaccineTrackerSheet.tsx` (pass provenance/source into the tree area)

**Interfaces:**
- Consumes: `getScheduleForCountry`, `vaccineStatusLabel`, `vaccineMilestoneBadge` (Tasks 1,3); `VACCINE_DISCLAIMER` (Task 3)
- Produces: no new exports (UI only).

- [ ] **Step 1: Resolve provenance/source once at the top of `VaccineScheduleTree`**

After the `milestones = useMemo(...)` block (~line 195), add:

```ts
  const resolved = useMemo(
    () => getScheduleForCountry(child.countryCode ?? 'US'),
    [child.countryCode],
  )
```
Add `getScheduleForCountry`, `vaccineStatusLabel`, `vaccineMilestoneBadge` to the existing import from `../../../lib/vaccineSchedule`, and `VACCINE_DISCLAIMER` to the import from `../../../lib/medicalSources` (add the import if absent).

- [ ] **Step 2: Replace the inline English milestone badge (Diffuse branch)**

At lines 274-278 replace the `badgeText` ternary with:

```ts
          const badge = vaccineMilestoneBadge(milestone.milestoneStatus, doneCount, totalCount)
          const badgeText = t(badge.key, badge.params)
```
And in the cream branch replace the equivalent `badgeText` block (lines 442-446) identically.

- [ ] **Step 3: Replace per-dose status copy with the neutral mapper (Diffuse branch)**

In the Diffuse dose row, the `future` branch currently prints `{vax.dueAge}` (line 361) and the `upcoming/overdue` branch prints `SET DATE`/date. Replace the trailing `future` text and add a neutral "typical timing" line. Specifically, change the `future` leaf (line 360-362) to:

```ts
                          ) : (
                            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 9.5, letterSpacing: 0.5, color: dCol.ink3 }}>
                              {(() => { const l = vaccineStatusLabel(vax.status, vax.dueAge); return l ? t(l.key, l.params) : vax.dueAge })()}
                            </Text>
                          )}
```
The `SET DATE` / date affordances for `upcoming`/`overdue` stay (logging is fine); no "due soon" text is printed anywhere.

- [ ] **Step 4: Soften the `overdue` blob away from the red alarm (Diffuse branch)**

In the dose-blob mapping added earlier (lines ~315-323), change `overdue` off the red `warning` blob to a calm neutral marker:

```ts
                    const doseBlob = vax.status === 'done' ? 'checkup'
                      : vax.status === 'upcoming' ? 'clock'
                      : 'vaccine'            // overdue + future both read as a neutral syringe
                    const doseTint = vax.status === 'done' ? dCol.ink
                      : vax.status === 'upcoming' ? acc
                      : dCol.ink3            // no red; "not yet logged" is neutral, not an alarm
```
(Removes the `warning`/`dCol.error` mapping.) In the cream branch, change the `overdue` sticker fill from `ST_PEACH` and the meta color from `#8A3A00` to the neutral `ST_CREAM` / `ink3` used by `future`.

- [ ] **Step 5: Add the source citation + disclaimer + reference banner (Diffuse branch)**

At the top of the returned `<View>` in the Diffuse branch (just before the `{milestones.map(...)}` at line 267), add:

```tsx
        {resolved.provenance === 'who-reference' ? (
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 12, lineHeight: 18, color: dCol.ink2, marginBottom: 12 }}>
            {t('kids_home_vaccine_reference_banner', { country: child.countryCode ?? '' })}
          </Text>
        ) : null}
```
And after the closing of the `{milestones.map(...)}` block but before `<VaccineInfoModal .../>` (line 415), add the citation + disclaimer:

```tsx
        <View style={{ marginTop: 14, gap: 6 }}>
          <Text style={{ fontFamily: diffuseFont.mono, fontSize: 9.5, letterSpacing: 0.5, color: dCol.ink3 }}>
            {t('kids_home_vaccine_source', { title: resolved.source.title, reviewed: resolved.source.reviewed })}
          </Text>
          <Text style={{ fontFamily: diffuseFont.body, fontSize: 11, lineHeight: 16, color: dCol.ink3 }}>
            {VACCINE_DISCLAIMER}
          </Text>
        </View>
```

- [ ] **Step 6: Mirror Steps 3-5 in the cream branch**

Apply the same three additions in the cream `return` (lines 427-724): neutral `future` label via `vaccineStatusLabel`; softened `overdue` colors; and a citation + disclaimer block using `font.body`/`colors.textMuted` tokens, plus the reference banner when `resolved.provenance === 'who-reference'`. Use the existing cream tokens (`colors`, `font`, `ink3`), not Diffuse tokens.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Verify in the simulator (both variants + both themes)**

Launch the app (`npm start`, open the iOS simulator), open a Kids child → Vaccines sheet. Verify with a screenshot for each of: Diffuse light, Diffuse dark, cream light. Confirm:
- No "OVERDUE"/"DUE SOON" text anywhere; past-window doses read "Not yet logged — typically by …" and are visually neutral (no red).
- The source citation line + disclaimer render under the schedule.
- Set the child's country to an uncatalogued one (e.g. Japan) in the profile → the reference banner appears and no home nudge shows.

Use the `mcp__ios-simulator__screenshot` tool; attach/confirm the three screenshots.

- [ ] **Step 9: Commit**

```bash
git add components/home/kids/VaccineScheduleTree.tsx components/home/kids/VaccineTrackerSheet.tsx
git commit -m "feat(vaccine): records-language labels, sourced citation, disclaimer + reference banner in schedule UI"
```

---

### Task 5: Soften Kids-home vaccine nudge copy

**Files:**
- Modify: `components/home/KidsHome.tsx` (nudge rendering around the `getNextDueVaccines` consumer, line 3434; and any string using `kids_home_vaccine_overdue`)
- Modify: `lib/i18n/en.ts` (repurpose `kids_home_vaccine_overdue`, line 1023)

**Interfaces:**
- Consumes: `getNextDueVaccines` (now returns `[]` in reference mode — Task 2); neutral keys (Task 3).

- [ ] **Step 1: Find every home string that renders the nudge**

Run: `grep -n "kids_home_vaccine_overdue\|kids_home_vaccine_next\|getNextDueVaccines\|\.overdue" components/home/KidsHome.tsx`
Read each hit; identify where the `UpcomingVaccine.overdue` boolean drives red styling or "Overdue" copy.

- [ ] **Step 2: Reframe the copy key**

In `lib/i18n/en.ts` line 1023, change:
```ts
  kids_home_vaccine_overdue: 'Overdue vaccine',
```
to:
```ts
  kids_home_vaccine_overdue: 'Not yet logged',
```
(Keep the key name to avoid churn; only the value changes.)

- [ ] **Step 3: Neutralize the nudge styling**

Wherever the nudge uses `overdue` to apply a red/alarm color in `KidsHome.tsx`, change it to the same neutral treatment used for a normal upcoming item (no `brand.error`/red). Show the code you changed in the commit. If a nudge label prints "due soon" inline, replace it with `t('kids_home_vaccine_status_typical_now')`.

- [ ] **Step 4: Typecheck + verify**

Run: `npm run typecheck` → PASS.
Simulator: Kids home for a catalogued country with an un-logged past-window dose shows a neutral "Not yet logged" hint (no red); for an uncatalogued country shows no vaccine nudge. Screenshot to confirm.

- [ ] **Step 5: Commit**

```bash
git add components/home/KidsHome.tsx lib/i18n/en.ts
git commit -m "feat(vaccine): neutral home nudge copy, no clinical 'overdue' framing"
```

---

### Task 6: Per-vaccine explanation coverage (all catalogs + WHO)

**Files:**
- Modify: `lib/vaccineInfo.ts` (add any missing entries + aliases; resolver at line 261)
- Test: `lib/__tests__/vaccineInfo.coverage.test.ts` (create)

**Interfaces:**
- Consumes: `VACCINE_SCHEDULES` (Task 1, incl. `WHO`), `getVaccineInfo` (existing).

- [ ] **Step 1: Write the failing coverage test**

Create `lib/__tests__/vaccineInfo.coverage.test.ts`:

```ts
import { VACCINE_SCHEDULES } from '../vaccineSchedule'
import { getVaccineInfo } from '../vaccineInfo'

describe('vaccineInfo coverage', () => {
  it('resolves an explanation for every vaccine name in every catalog (incl. WHO)', () => {
    const missing: string[] = []
    for (const [code, entries] of Object.entries(VACCINE_SCHEDULES)) {
      for (const v of entries) {
        if (!getVaccineInfo(v.name)) missing.push(`${code}:${v.name}`)
      }
    }
    expect(missing).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails (or passes)**

Run: `npx jest lib/__tests__/vaccineInfo.coverage.test.ts`
Expected: FAIL listing any names that don't resolve (likely including new WHO names like `Pentavalent`, `OPV (Polio)`, `Measles (MR)` if not aliased). If it already PASSES, skip to Step 4.

- [ ] **Step 3: Add missing entries / aliases**

For each name in the failure list, add either a new `VACCINE_INFO` entry or an alias so the fuzzy first-word resolver finds it. Example additions (match the existing `VaccineInfo` shape + `// CLINICAL-REVIEW` marker where clinical):

```ts
  pentavalent: {
    protects: 'Five diseases at once — diphtheria, tetanus, pertussis, hepatitis B, and Hib.',
    why: 'A single combination shot builds immunity to five serious infections with fewer injections, widely used in national and WHO programmes.',
    sideEffects: 'Fever, fussiness, or soreness at the site for 1–3 days.',
  },
  pneumococcal: {
    protects: 'Pneumococcal disease — pneumonia, meningitis, and bloodstream infections.',
    why: 'Protects against the most common cause of bacterial pneumonia in young children.',
    sideEffects: 'Mild fever or soreness at the injection site.',
  },
  // 'measles' likely already exists; ensure 'measles (mr)' resolves via first-word 'measles'.
```
Re-run the test after each addition until green.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/vaccineInfo.coverage.test.ts`
Expected: PASS (`missing` empty).

- [ ] **Step 5: Commit**

```bash
git add lib/vaccineInfo.ts lib/__tests__/vaccineInfo.coverage.test.ts
git commit -m "feat(vaccine): per-vaccine explanation coverage for all catalogs + WHO baseline"
```

---

### Task 7: Vault `VaccineRecord` copy sweep

**Files:**
- Modify: `components/vault/VaccineRecord.tsx` (line ~148 uses `vault_vaccineDue`)
- Modify: `lib/i18n/en.ts` (`vault_vaccineDue`, line 3045)

**Interfaces:** none (copy only).

- [ ] **Step 1: Reframe "Due" to neutral timing**

In `lib/i18n/en.ts` line 3045, change:
```ts
  vault_vaccineDue: 'Due: {{date}}',
```
to:
```ts
  vault_vaccineDue: 'Expected around: {{date}}',
```

- [ ] **Step 2: Confirm no other verdict language in the vault component**

Run: `grep -niE "overdue|due soon|behind|late|must|should get" components/vault/VaccineRecord.tsx`
Expected: no hits. If any, reframe to neutral timing/records language.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck` → PASS.

- [ ] **Step 4: Commit**

```bash
git add components/vault/VaccineRecord.tsx lib/i18n/en.ts
git commit -m "feat(vaccine): neutral timing copy in vault vaccine records"
```

---

### Task 8: Full-surface verification sweep

**Files:** none (verification).

- [ ] **Step 1: Grep the whole app for leaked clinical verdicts**

Run: `grep -rniE "overdue|due soon" lib/i18n/en.ts components/home/kids components/home/KidsHome.tsx components/vault`
Expected: the only hits are internal enum/key *names* (e.g. the key `kids_home_vaccine_overdue`), never a user-facing English **value** containing "overdue"/"due soon". Confirm each hit is a key name, not display copy.

- [ ] **Step 2: Run the full test + typecheck gate**

Run: `npx jest lib/__tests__/ && npm run typecheck`
Expected: all green.

- [ ] **Step 3: Acceptance-criteria walk-through (simulator)**

Confirm each spec §6 criterion with a screenshot: (1) uncatalogued country → WHO reference + banner, no US schedule; (2) no "overdue/due soon" copy, neutral visuals; (3) citation + disclaimer on view; (4) no home nudge in reference mode; (5) every vaccine has an explanation (Task 6 test covers this); (6) typecheck clean.

- [ ] **Step 4: Commit (if any verification-driven fixes were needed)**

```bash
git add -A && git commit -m "chore(vaccine): verification sweep — confirm records-language reframe end-to-end"
```

---

## Self-Review

**Spec coverage:**
- §3.1 provenance lookup + WHO baseline → Task 1 ✓
- §3.2 status reframe (keep math, change claim) → Tasks 2-3 (mappers) + Task 4 (applied) ✓
- §3.3 softened visuals (blob off red) → Task 4 Step 4, Task 5 Step 3 ✓
- §3.4 suppress nudges in reference mode → Task 2 Step 4 + Task 5 ✓
- §3.5 source citation on view → Task 3 (keys/data) + Task 4 Step 5 ✓
- §3.6 point-of-use disclaimer → Task 3 (`VACCINE_DISCLAIMER`) + Task 4 Step 5 ✓
- §3.7 per-vaccine explanation coverage → Task 6 ✓
- §4 files-touched table → all covered across Tasks 1-7; `VaccineRecord.tsx` → Task 7 ✓
- §6 acceptance criteria → Task 8 ✓
- §5 out-of-scope (privacy/consent) → correctly NOT in this plan (separate spec) ✓

**Placeholder scan:** No TBD/TODO; every code step shows real code; medical data carries the existing `// CLINICAL-REVIEW` marker rather than a fake placeholder.

**Type consistency:** `getScheduleForCountry` returns `ResolvedSchedule` (Task 1) and is consumed as `.entries`/`.provenance`/`.source` in Tasks 2 & 4. `vaccineStatusLabel` / `vaccineMilestoneBadge` signatures defined in Task 3 match their calls in Task 4. i18n keys added in Task 3 (`kids_home_vaccine_status_*`, `_badge_*`, `_reference_banner`, `_source`) match their `t(...)` calls in Task 4. `VACCINE_DISCLAIMER` defined in Task 3 matches its use in Task 4.

**Known risk:** the WHO baseline schedule + all `VACCINE_SCHEDULE_SOURCES` titles/URLs carry `// CLINICAL-REVIEW: pending sign-off` and must be confirmed against the authorities' current published schedules before release (this is the whole point of the `reviewed` field). This is flagged, not a placeholder.
