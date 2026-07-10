# Health Content Verification — Fix & Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply all 26 fixes from the 2026-06-22 Health Content Verification Audit — correcting the 2 factually-wrong clinical items, the high-severity discrepancies, the disputed Wonder Weeks framing, and rolling out a citation + disclaimer traceability layer across the clinical content libraries.

**Architecture:** Each clinical data file gets edited in place to (a) correct values to the audit's cited source values and (b) gain a header source comment. A new shared module `lib/medicalSources.ts` holds the user-facing disclaimer string + canonical source URLs so disclaimers are DRY. Every clinical *value* change carries an inline `// CLINICAL-REVIEW:` comment marking it pending licensed-clinician sign-off (per the chosen "code now, flag for review" gate). No UI components are restructured — disclaimers reuse existing render patterns where they already exist.

**Tech Stack:** TypeScript (strict), React Native / Expo. These are static data files (`lib/*.ts`); there is no existing unit-test harness for them, so verification is via `npx tsc --noEmit` (type-check) + targeted `grep` assertions on the changed content rather than a test runner.

## Global Constraints

- TypeScript strict — no `any`, no implicit returns. Copied verbatim from CLAUDE.md.
- Never hardcode hex/radius/font/shadow in UI; import from `constants/theme.ts`. (Only relevant if a task touches a component.)
- This is a **READ-of-audit → WRITE-to-code** pass. The audit (`docs/reviews/2026-06-22-health-content-verification-audit.md`) is the source of truth for every corrected value. Do not invent clinical numbers beyond what the audit cites.
- **Clinician gate:** every changed clinical *value or instruction* gets an inline `// CLINICAL-REVIEW: pending sign-off — <source>` comment so the diff is auditable before release. Copy/sourcing/labeling-only changes do not need the comment.
- Work directly on `main` (user preference — no worktrees/feature branches).
- Commit after each task with a `fix(health):` prefixed message.
- Use the existing field names exactly as captured in each task's **Interfaces** block — do not rename interface fields.

---

## File Structure

**New file:**
- `lib/medicalSources.ts` — exports `MEDICAL_DISCLAIMER` (the standard user-facing string) and `SOURCES` (a record of canonical source URLs by key). Single source of truth so every clinical file imports the same disclaimer text.

**Modified data files (clinical values + headers):**
- `lib/pregnancyInsights.ts` — glucose-fast WRONG fix
- `lib/cycleLogic.ts` — conception-probability WRONG fix + luteal/fertile-window/cycle-range/hydration copy
- `lib/weekStats.ts` — fetal-length crown-rump→crown-heel splice
- `lib/pregnancyData.ts` — fetal-length reconcile + eyes-open + heartbeat copy
- `lib/vaccineInfo.ts` — HepB framing + file-wide source/disclaimer note
- `lib/growthLeaps.ts` — Wonder Weeks disputed-framework labeling + milestone copy + non-diagnostic disclaimer
- `lib/weekDetailData.ts` — perineal-massage wording + high-risk folate + eyes-open consistency
- `lib/prepGuide.ts` — high-risk folate dose
- `lib/pregnancyAppointments.ts` — surface ACOG attribution
- `lib/cycleAnalytics.ts` — document ±2d regularity band as app metric
- `lib/growthStandards.ts` — WHO URL update + CDC mid-childhood P50 tweaks
- `lib/birthData.ts` — water-birth temp upper bound
- `lib/birthGuide/pain-relief.ts` — epidural instrumental-delivery stat
- `lib/foodCalories.ts` — USDA source header note

**Tracker:**
- `docs/reviews/2026-06-22-health-content-verification-audit.md` — append a "Fix status" column / section as items land (optional, last task).

---

## Task 1: Shared medical-sources module

**Files:**
- Create: `lib/medicalSources.ts`

**Interfaces:**
- Produces: `export const MEDICAL_DISCLAIMER: string` and `export const SOURCES: Record<string, string>`. Later tasks import `MEDICAL_DISCLAIMER` for UI disclaimers and reference `SOURCES` keys in header comments.

- [ ] **Step 1: Create the module**

```ts
// lib/medicalSources.ts
// Single source of truth for the user-facing medical disclaimer and the
// canonical public-health source URLs referenced across the clinical content
// libraries. Roll-out target from the 2026-06-22 health-content audit:
// every clinical data file cites a SOURCES key in its header and surfaces
// MEDICAL_DISCLAIMER wherever clinical values are shown.

export const MEDICAL_DISCLAIMER =
  'This is general information, not medical advice. Follow your clinician and ' +
  "your country's official schedule. Values shown are population estimates, " +
  'not your own measurements.'

export const SOURCES = {
  acogPrenatalScreening:
    'https://www.acog.org/womens-health/faqs/prenatal-genetic-screening-tests',
  acogNutrition:
    'https://www.acog.org/womens-health/faqs/nutrition-during-pregnancy',
  acogGdm: 'https://www.acog.org/womens-health/faqs/gestational-diabetes',
  cdcFolicAcid: 'https://www.cdc.gov/folic-acid/about/index.html',
  cdcHepB: 'https://www.cdc.gov/media/releases/2025/2025-hepatitis-b-immunization.html',
  whoGrowth: 'https://www.who.int/tools/child-growth-standards',
  cdcGrowth: 'https://www.cdc.gov/growthcharts/',
  wilcoxNejm1995: 'https://www.nejm.org/doi/full/10.1056/NEJM199512073332301',
  hadlockPerinatology: 'https://perinatology.com/Reference/Fetal%20development.htm',
  cochranePerineal:
    'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD005123.pub3/full',
  cochraneEpidural:
    'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD000331.pub4/full',
  niceWaterBirth: 'https://www.nice.org.uk/guidance/ng235',
  usdaFdc: 'https://fdc.nal.usda.gov/',
  wonderWeeks: 'https://en.wikipedia.org/wiki/The_Wonder_Weeks',
} as const
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors referencing `lib/medicalSources.ts`).

- [ ] **Step 3: Commit**

```bash
git add lib/medicalSources.ts
git commit -m "feat(health): add shared medical disclaimer + sources module"
```

---

## Task 2: Fix WRONG glucose-fast instruction (High #1)

**Files:**
- Modify: `lib/pregnancyInsights.ts:58`

**Interfaces:**
- Consumes: nothing.
- Produces: corrected bullet text; no signature change.

**Audit basis:** The routine 1-hour 50g glucose challenge needs NO fasting; only the 3-hour follow-up fasts. Current text contradicts the app's own correct copy at `weekDetailData.ts:94`.

- [ ] **Step 1: Replace the bullet**

Find (line 58):
```ts
        { icon: '🧪', text: 'Glucose test around week 24–28. Fast 8 hours beforehand.' },
```
Replace with:
```ts
        // CLINICAL-REVIEW: pending sign-off — Labcorp/ACOG GDM screen. 1-hr 50g GCT needs no fasting; only the 3-hr GTT fasts.
        { icon: '🧪', text: 'Glucose test around week 24–28. No fasting needed for the 1-hour screen — only the follow-up 3-hour test requires fasting.' },
```

- [ ] **Step 2: Verify the wrong text is gone**

Run: `grep -n "Fast 8 hours" lib/pregnancyInsights.ts`
Expected: no output (exit 1).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/pregnancyInsights.ts
git commit -m "fix(health): glucose 1-hr screen needs no fasting (was wrong)"
```

---

## Task 3: Fix WRONG conception-probability magnitudes (High #2)

**Files:**
- Modify: `lib/cycleLogic.ts:390-415` (the `dailyFertilityCurve` doc comment + `probabilityForDay` values)

**Interfaces:**
- Consumes: nothing.
- Produces: `dailyFertilityCurve(cycleLength: number, lutealPhase?: number): number[]` (unchanged signature) and `probabilityForDay` returning rescaled values.

**Audit basis:** Published day-specific peak is ~27–33% (Wilcox/Dunson); current peak of 70 roughly doubles it. Keep the curve *shape*, rescale magnitudes to peak ~33 and relabel as an illustrative estimate.

- [ ] **Step 1: Update the doc comment (lines 388-389)**

Find:
```ts
 * Values are 0–100. The peak day (ovulation) and the day before peak at ~70.
 * Calibration matches the FAM-based estimates used by the Fertile Window
 * card: peak at the two days before ovulation, sharp drop-off either side,
 * "low" baseline 5–8% during menstruation + early follicular.
 */
```
Replace with:
```ts
 * Values are 0–100, representing the published day-specific probability of
 * conception from a single cycle (Wilcox NEJM 1995 / Dunson Hum Reprod 2002):
 * peak ~33% the day before/of ovulation, sharp drop-off either side, low
 * baseline during menstruation + early follicular. This is a population
 * estimate, not a personal prediction.
 */
```

- [ ] **Step 2: Rescale `probabilityForDay` (lines 400-415)**

Find:
```ts
function probabilityForDay(day: number, ovulationDay: number): number {
  const diff = day - ovulationDay
  // Peak: days ovulation−1 and ovulation
  if (diff === -1 || diff === 0) return 70
  // High: ovulation+1, ovulation−2
  if (diff === 1 || diff === -2) return 48
  // Medium: ovulation−3, ovulation+2
  if (diff === -3 || diff === 2) return 22
  // Low: ovulation−4, ovulation−5
  if (diff === -4 || diff === -5) return 12
  // Tail: ovulation−6 / ovulation+3 (sperm survival edge / very early luteal)
  if (diff === -6 || diff === 3) return 8
  // Baseline outside the window: 1–6% depending on phase
  if (diff < -6) return 6
  return 3
}
```
Replace with:
```ts
// CLINICAL-REVIEW: pending sign-off — Wilcox NEJM 1995 / Dunson Hum Reprod 2002.
// Day-specific conception probabilities; peak ~33% (was 70 — overstated ~2x).
function probabilityForDay(day: number, ovulationDay: number): number {
  const diff = day - ovulationDay
  // Peak: days ovulation−1 and ovulation
  if (diff === -1 || diff === 0) return 33
  // High: ovulation+1, ovulation−2
  if (diff === 1 || diff === -2) return 22
  // Medium: ovulation−3, ovulation+2
  if (diff === -3 || diff === 2) return 12
  // Low: ovulation−4, ovulation−5
  if (diff === -4 || diff === -5) return 7
  // Tail: ovulation−6 / ovulation+3 (sperm survival edge / very early luteal)
  if (diff === -6 || diff === 3) return 4
  // Baseline outside the window: 1–2% depending on phase
  if (diff < -6) return 2
  return 1
}
```

- [ ] **Step 3: Verify the 70 peak is gone**

Run: `grep -n "return 70" lib/cycleLogic.ts`
Expected: no output (exit 1).

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/cycleLogic.ts
git commit -m "fix(health): rescale conception-probability curve to published ~33% peak"
```

---

## Task 4: Fix fetal-length crown-rump→crown-heel splice in weekStats (High #3)

**Files:**
- Modify: `lib/weekStats.ts:1-9` (header), `:25-32` (weeks 14–21)

**Interfaces:**
- Consumes: nothing.
- Produces: `WeekStat { cm: number; g: number | null }` per week (unchanged shape). Later task 5 reconciles `pregnancyData.ts` text values against these.

**Audit basis:** weeks 14–20 show crown-rump-magnitude lengths (~half true total), then jump ~10cm at wk21. Switch to crown-heel (total length) from week 14, eliminating the jump. Crown-heel reference values (Hadlock-derived, Perinatology.com): wk14≈14.2, wk15≈16.4, wk16≈18.6, wk17≈20.4, wk18≈22.2, wk19≈24.0, wk20≈25.7, wk21≈27.4 cm.

- [ ] **Step 1: Update header to cite source + measurement convention**

Find (lines 1-4):
```ts
/**
 * weekStats — per-week clinical length (cm) and weight (g).
 * Matches the weekStats object in pregnancy-weeks.html.
 */
```
Replace with:
```ts
/**
 * weekStats — per-week clinical length (cm) and weight (g).
 * Length is CROWN-HEEL (total) length from week 14 onward, and crown-rump
 * (CRL) in the embryonic weeks 5–13 where crown-heel is not meaningful.
 * 50th-centile population estimates, not a given baby's measurement.
 * Source: Hadlock-derived charts, https://perinatology.com/Reference/Fetal%20development.htm
 */
```

- [ ] **Step 2: Replace weeks 14–21 lengths (keep weights)**

Find (lines 25-32):
```ts
  14: { cm: 8.7, g: 43 },
  15: { cm: 10.1, g: 70 },
  16: { cm: 11.6, g: 100 },
  17: { cm: 13.0, g: 140 },
  18: { cm: 14.2, g: 190 },
  19: { cm: 15.3, g: 240 },
  20: { cm: 16.4, g: 300 },
  21: { cm: 26.7, g: 360 },
```
Replace with:
```ts
  // CLINICAL-REVIEW: pending sign-off — Hadlock/Perinatology.com crown-heel total length (was crown-rump magnitude through wk20).
  14: { cm: 14.2, g: 43 },
  15: { cm: 16.4, g: 70 },
  16: { cm: 18.6, g: 100 },
  17: { cm: 20.4, g: 140 },
  18: { cm: 22.2, g: 190 },
  19: { cm: 24.0, g: 240 },
  20: { cm: 25.7, g: 300 },
  21: { cm: 27.4, g: 360 },
```

- [ ] **Step 3: Verify no 10cm jump remains (wk21 no longer 26.7)**

Run: `grep -n "26.7" lib/weekStats.ts`
Expected: no output (exit 1).

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/weekStats.ts
git commit -m "fix(health): use crown-heel fetal length from wk14, remove ~10cm splice"
```

---

## Task 5: Reconcile pregnancyData fetal lengths + eyes-open + heartbeat copy (High #4, Low #23, Low #24)

**Files:**
- Modify: `lib/pregnancyData.ts:16` (heartbeat), `:25-32` (lengths wk14–21), `:37` (eyes open wk26 — already correct, leave; ensure weekDetailData aligns in Task 8)

**Interfaces:**
- Consumes: crown-heel values from Task 4.
- Produces: `PregnancyWeekData { week, babySize, babyLength: string, babyWeight: string, ... }` — note `babyLength` is a **string** like `'14.2cm'`.

**Audit basis:** `pregnancyData.babyLength` strings must match the crown-heel values now in `weekStats.ts` (audit flagged the wk20 16.4 vs 25cm disagreement). Also soften "heart begins to beat" at wk5 to "early cardiac activity."

- [ ] **Step 1: Soften the week-5 heartbeat fact (line 16)**

Find:
```ts
  { week: 5, babySize: 'Apple seed', babyLength: '3mm', babyWeight: '<1g', moonPhase: 'The Full Seed Moon', developmentFact: "Baby's heart begins to beat! Tiny arm and leg buds are forming.", momTip: 'Morning sickness may begin. Eat small, frequent meals.' },
```
Replace with:
```ts
  // CLINICAL-REVIEW: pending sign-off — ACOG: "embryonic cardiac activity" ~5–6 wk, not a fully formed heartbeat.
  { week: 5, babySize: 'Apple seed', babyLength: '3mm', babyWeight: '<1g', moonPhase: 'The Full Seed Moon', developmentFact: "Early cardiac activity may begin this week. Tiny arm and leg buds are forming.", momTip: 'Morning sickness may begin. Eat small, frequent meals.' },
```

- [ ] **Step 2: Reconcile wk14–21 `babyLength` strings to crown-heel (lines 25-32)**

Find:
```ts
  { week: 14, babySize: 'Lemon', babyLength: '8.7cm', babyWeight: '43g', moonPhase: 'The Waning Gibbous', developmentFact: "Baby's facial muscles are working — squinting, frowning, grimacing.", momTip: 'Appetite may increase. Choose nutrient-dense foods.' },
  { week: 15, babySize: 'Apple', babyLength: '10cm', babyWeight: '70g', moonPhase: 'The Last Quarter', developmentFact: 'Baby can sense light through closed eyelids.', momTip: 'Consider starting a pregnancy journal.' },
  { week: 16, babySize: 'Avocado', babyLength: '11.6cm', babyWeight: '100g', moonPhase: 'The Waning Crescent', developmentFact: 'Baby can hear sounds! Their eyes can make slow movements.', momTip: 'Talk and sing to your baby — they can hear you.' },
  { week: 17, babySize: 'Pear', babyLength: '13cm', babyWeight: '140g', moonPhase: 'The New Thunder Moon', developmentFact: 'Cartilage is turning to bone. Sweat glands are developing.', momTip: 'Side sleeping becomes more comfortable now.' },
  { week: 18, babySize: 'Bell pepper', babyLength: '14.2cm', babyWeight: '190g', moonPhase: 'The Waxing Crescent', developmentFact: "Baby's ears are in final position. They may startle at loud sounds.", momTip: 'You may feel the first flutters of movement!' },
  { week: 19, babySize: 'Mango', babyLength: '15.3cm', babyWeight: '240g', moonPhase: 'The First Quarter', developmentFact: 'A waxy coating called vernix protects the skin.', momTip: 'Anatomy scan usually happens around now.' },
  { week: 20, babySize: 'Banana', babyLength: '25cm', babyWeight: '300g', moonPhase: 'The Waxing Gibbous', developmentFact: 'Halfway there! Baby can taste what you eat through amniotic fluid.', momTip: 'Celebrate the halfway mark — you\'re doing amazing.' },
  { week: 21, babySize: 'Carrot', babyLength: '27cm', babyWeight: '360g', moonPhase: 'The Full Strawberry Moon', developmentFact: 'Baby has established sleep/wake cycles.', momTip: 'Stay active with prenatal yoga or swimming.' },
```
Replace with (only `babyLength` strings change; all other fields preserved verbatim):
```ts
  // CLINICAL-REVIEW: pending sign-off — crown-heel lengths reconciled with weekStats.ts (Hadlock/Perinatology.com).
  { week: 14, babySize: 'Lemon', babyLength: '14.2cm', babyWeight: '43g', moonPhase: 'The Waning Gibbous', developmentFact: "Baby's facial muscles are working — squinting, frowning, grimacing.", momTip: 'Appetite may increase. Choose nutrient-dense foods.' },
  { week: 15, babySize: 'Apple', babyLength: '16.4cm', babyWeight: '70g', moonPhase: 'The Last Quarter', developmentFact: 'Baby can sense light through closed eyelids.', momTip: 'Consider starting a pregnancy journal.' },
  { week: 16, babySize: 'Avocado', babyLength: '18.6cm', babyWeight: '100g', moonPhase: 'The Waning Crescent', developmentFact: 'Baby can hear sounds! Their eyes can make slow movements.', momTip: 'Talk and sing to your baby — they can hear you.' },
  { week: 17, babySize: 'Pear', babyLength: '20.4cm', babyWeight: '140g', moonPhase: 'The New Thunder Moon', developmentFact: 'Cartilage is turning to bone. Sweat glands are developing.', momTip: 'Side sleeping becomes more comfortable now.' },
  { week: 18, babySize: 'Bell pepper', babyLength: '22.2cm', babyWeight: '190g', moonPhase: 'The Waxing Crescent', developmentFact: "Baby's ears are in final position. They may startle at loud sounds.", momTip: 'You may feel the first flutters of movement!' },
  { week: 19, babySize: 'Mango', babyLength: '24.0cm', babyWeight: '240g', moonPhase: 'The First Quarter', developmentFact: 'A waxy coating called vernix protects the skin.', momTip: 'Anatomy scan usually happens around now.' },
  { week: 20, babySize: 'Banana', babyLength: '25.7cm', babyWeight: '300g', moonPhase: 'The Waxing Gibbous', developmentFact: 'Halfway there! Baby can taste what you eat through amniotic fluid.', momTip: 'Celebrate the halfway mark — you\'re doing amazing.' },
  { week: 21, babySize: 'Carrot', babyLength: '27.4cm', babyWeight: '360g', moonPhase: 'The Full Strawberry Moon', developmentFact: 'Baby has established sleep/wake cycles.', momTip: 'Stay active with prenatal yoga or swimming.' },
```

- [ ] **Step 2b: Confirm wk26 "eyes open" stays correct (line 37 — no change)**

Run: `grep -n "Eyes are opening for the first time" lib/pregnancyData.ts`
Expected: one match at the week-26 entry (confirms canonical eyes-open week = 26; Task 8 fixes weekDetailData wk28 to match).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/pregnancyData.ts
git commit -m "fix(health): reconcile crown-heel lengths + soften wk5 heartbeat copy"
```

---

## Task 6: Soften HepB "first dose at birth" framing + file source note (High #5, Medium #12)

**Files:**
- Modify: `lib/vaccineInfo.ts:1-8` (header), `:22, :172, :177, :187` (HepB `why` strings)

**Interfaces:**
- Consumes: nothing.
- Produces: `VaccineInfo { protects: string; why: string; sideEffects?: string }` (unchanged shape).

**Audit basis:** Dec 2025 ACIP shifted to individual-based decision-making for infants of HepB-negative mothers (birth dose still universal for positive/unknown). Soften the unconditional "first dose at birth" wording and add a country-schedule note in the header.

- [ ] **Step 1: Add source + schedule note to header**

Find (lines 1-8):
```ts
/**
 * Curated info for the most common vaccines across all country schedules.
 * Used by the VaccineInfoModal to explain each vaccine to parents.
 *
 * Lookup is fuzzy: matches the first word of the schedule's vaccine name
 * (lowercased) against keys here. Multi-language entries (Hepatite, Hépatite,
 * Hepatitis) all collapse to the same English key via the alias map.
 */
```
Replace with:
```ts
/**
 * Curated info for the most common vaccines across all country schedules.
 * Used by the VaccineInfoModal to explain each vaccine to parents.
 *
 * Lookup is fuzzy: matches the first word of the schedule's vaccine name
 * (lowercased) against keys here. Multi-language entries (Hepatite, Hépatite,
 * Hepatitis) all collapse to the same English key via the alias map.
 *
 * General information only — vaccine timing varies by country. Always follow
 * your country's official schedule and your pediatrician. HepB birth-dose
 * framing reflects the Dec 2025 CDC/ACIP individual-decision shift for infants
 * of HepB-negative mothers: https://www.cdc.gov/media/releases/2025/2025-hepatitis-b-immunization.html
 */
```

- [ ] **Step 2: Soften the four HepB `why` strings**

Find (line 22):
```ts
    why: 'The first dose at birth protects against infection at the most vulnerable moment. The full series gives near-lifelong protection against liver damage and liver cancer caused by hep B.',
```
Replace with:
```ts
    // CLINICAL-REVIEW: pending sign-off — Dec 2025 CDC/ACIP individual-decision shift for HepB-negative mothers.
    why: 'A first dose is often given at or shortly after birth — timing depends on your country and the mother\'s HepB status. The full series gives near-lifelong protection against liver damage and liver cancer caused by hep B.',
```

Find (line 172):
```ts
    why: 'The first dose at birth protects against infection at the most vulnerable moment. Full series gives lasting protection.',
```
Replace with:
```ts
    why: 'A first dose is often given at or shortly after birth — timing depends on your country and the mother\'s HepB status. Full series gives lasting protection.',
```

Find (line 177):
```ts
    why: 'The first dose at birth protects against infection at the most vulnerable moment. Full series gives lasting protection.',
```
Replace with:
```ts
    why: 'A first dose is often given at or shortly after birth — timing depends on your country and the mother\'s HepB status. Full series gives lasting protection. ',
```
> Note: the trailing space disambiguates this otherwise-identical line from line 172 for the exact-match editor; if your editor matches all occurrences, apply the same replacement to each.

Find (line 187):
```ts
    why: 'The first dose at birth protects against infection at the most vulnerable moment. Full series gives lasting protection.',
```
Replace with:
```ts
    why: 'A first dose is often given at or shortly after birth — timing depends on your country and the mother\'s HepB status. Full series gives lasting protection.  ',
```
> Same disambiguation note. The goal: zero remaining "first dose at birth" strings.

- [ ] **Step 3: Verify all unconditional birth-dose framing is gone**

Run: `grep -n "first dose at birth" lib/vaccineInfo.ts`
Expected: no output (exit 1).

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/vaccineInfo.ts
git commit -m "fix(health): soften HepB birth-dose framing per Dec 2025 ACIP + add schedule note"
```

---

## Task 7: Label Wonder Weeks as disputed framework + milestone copy + non-diagnostic disclaimer (High #6, Medium #9/#10/#11)

**Files:**
- Modify: `lib/growthLeaps.ts:1-7` (header), `:35` & `:65` (brainNotes), `:118` (first words skill), `:163` (2-word sentences skill), `:186-191` (leapStatusForWeek — add disclaimer export)

**Interfaces:**
- Consumes: nothing.
- Produces: `GrowthLeap` shape unchanged; adds `export const GROWTH_LEAPS_DISCLAIMER: string`.

**Audit basis:** Wonder Weeks is a popular but scientifically disputed model (n=15 in 1992, failed 1998 replication). Must not present as established science; some milestone timings run ahead of CDC norms.

- [ ] **Step 1: Reframe the header as opinion + attribution**

Find (lines 1-7):
```ts
/**
 * Growth Leaps (Wonder Weeks) — shared data + age helper.
 *
 * 10 mental leaps from week 5 to week 75 post-birth. Each leap has
 * brain-development context, three phases (stormy / peak / emerging),
 * observable signs, emerging skills, parent-led activities, and a tip.
 */
```
Replace with:
```ts
/**
 * Growth Leaps — based on the "Wonder Weeks" framework (van de Rijt & Plooij).
 *
 * IMPORTANT: This is a POPULAR PARENTING THEORY, not validated developmental
 * science. Its basis is a 1992 study of 15 Dutch infants; a 1998 replication
 * failed to find the predicted fussiness periods. Treat leap weeks and brain
 * mechanisms as a framing aid, not fact. Timing varies widely between babies.
 * Source: https://en.wikipedia.org/wiki/The_Wonder_Weeks
 *
 * 10 mental leaps from week 5 to week 75 post-birth. Each leap has
 * brain-development context, three phases (stormy / peak / emerging),
 * observable signs, emerging skills, parent-led activities, and a tip.
 */
```

- [ ] **Step 2: Soften the two deterministic brainNote mechanisms**

Find (line 35):
```ts
    brainNote: 'The nervous system undergoes a first major reorganization. Your baby\'s brain is suddenly receiving far more detailed signals from the senses — sharper sights, richer sounds, new body feelings. It\'s overwhelming and wonderful at the same time.',
```
Replace with:
```ts
    brainNote: 'The Wonder Weeks framework describes a first big shift in how your baby takes in the senses around now — sharper sights, richer sounds, new body feelings. Every baby develops on their own timeline; this is a framing aid, not a fixed milestone.',
```

Find (line 65):
```ts
    brainNote: 'Motor neurons are rapidly myelinating, enabling smoother, more coordinated movements. Your baby transitions from jerky reflexes to intentional, fluid motion — a massive upgrade in physical self-awareness.',
```
Replace with:
```ts
    brainNote: 'Around this period babies often move from jerky reflexes toward smoother, more intentional motion. Myelination is gradual, not a single switch — timing varies widely from baby to baby.',
```

- [ ] **Step 3: Align first-word + 2-word-combo skills with CDC (lines 118, 163)**

Find (line 118):
```ts
    skills: ['Groups similar objects', 'Points to body parts', 'Says first words', 'Waves bye-bye', 'Distinguishes people from objects', 'Claps hands together'],
```
Replace with:
```ts
    skills: ['Groups similar objects', 'Points to body parts', 'First words may begin (CDC: commonly ~12 mo)', 'Waves bye-bye', 'Distinguishes people from objects', 'Claps hands together'],
```

Find (line 163):
```ts
    skills: ['Understands fairness', 'Shows empathy', 'Sentences of 2–3 words', 'Sorts by color/shape', 'Follows 2-step instructions', 'Helps with simple tasks'],
```
Replace with:
```ts
    skills: ['Understands fairness', 'Shows empathy', 'Two-word combos may begin (CDC: commonly ~24–30 mo)', 'Sorts by color/shape', 'Follows 2-step instructions', 'Helps with simple tasks'],
```

- [ ] **Step 4: Add a non-diagnostic disclaimer export near `leapStatusForWeek` (lines 186-191)**

Find:
```ts
/** A leap is "current" within ±1 week of its peak (window: week-2 to week+1). */
export function leapStatusForWeek(weekAge: number, leapWeek: number): GrowthLeapStatus {
```
Replace with:
```ts
/**
 * Non-diagnostic framing for the deterministic "current leap" logic below.
 * Surface this wherever the UI says a child IS in a leap — the 1998 Wonder
 * Weeks replication found no fixed fussy periods, so this is never diagnostic.
 */
export const GROWTH_LEAPS_DISCLAIMER =
  'Growth leaps are a popular parenting theory, not validated science. Every ' +
  'baby develops differently — use this as a gentle guide, not a diagnosis.'

/** A leap is "current" within ±1 week of its peak (window: week-2 to week+1). */
export function leapStatusForWeek(weekAge: number, leapWeek: number): GrowthLeapStatus {
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/growthLeaps.ts
git commit -m "fix(health): label Wonder Weeks as disputed framework + align milestones to CDC"
```

---

## Task 8: Perineal-massage wording + high-risk folate + eyes-open consistency (Medium #7, Medium #15, Low #23)

**Files:**
- Modify: `lib/weekDetailData.ts:136` (perineal), `:31` (folate high-risk note), `:206` (eyes-open wk28 → align to wk26)

**Interfaces:**
- Consumes: nothing.
- Produces: `WeekDetail` / `PrepItem` shapes unchanged.

**Audit basis:** Cochrane CD005123 — perineal massage reduces episiotomy + trauma needing suturing, but NOT 3rd/4th-degree tears. High-risk folate (4,000 mcg for prior NTD pregnancy) is absent. Eyes-open should be ~wk26 (pregnancyData says 26).

- [ ] **Step 1: Reword perineal-massage benefit (line 136)**

Find:
```ts
    detail: 'Perineal massage from week 34 onward has evidence to support reduced risk of third- and fourth-degree tears and episiotomy. It takes about 5 minutes, done 3–4 times per week. Use a clean finger and olive oil or coconut oil. Gently stretch the perineum downward and to the sides in a U-shape motion. Ask your midwife or OB to demonstrate proper technique. It may feel uncomfortable at first but becomes easier with practice.',
```
Replace with:
```ts
    // CLINICAL-REVIEW: pending sign-off — Cochrane CD005123: reduces episiotomy + trauma needing stitches, NOT 3rd/4th-degree tears.
    detail: 'Perineal massage from week 34 onward has evidence (Cochrane) to reduce the chance of episiotomy and tears needing stitches, especially for first vaginal births. It takes about 5 minutes, done 3–4 times per week. Use a clean finger and olive oil or coconut oil. Gently stretch the perineum downward and to the sides in a U-shape motion. Ask your midwife or OB to demonstrate proper technique. It may feel uncomfortable at first but becomes easier with practice.',
```

- [ ] **Step 2: Add high-risk folate note (line 31)**

Find:
```ts
    detail: 'Prenatal vitamins fill nutritional gaps that diet alone may miss. Look for at least 400mcg of folic acid (ideally 600mcg during pregnancy), 27mg of iron, 200mg of DHA, and calcium. Take with food if they make you nauseous. If your current prenatal causes constipation, ask your doctor about a gentle alternative. Consistency matters more than brand.',
```
Replace with:
```ts
    detail: 'Prenatal vitamins fill nutritional gaps that diet alone may miss. Look for at least 400mcg of folic acid (ideally 600mcg during pregnancy), 27mg of iron, 200mg of DHA, and calcium. If you\'ve had a previous pregnancy affected by a neural tube defect, your provider may prescribe a much higher dose (around 4,000mcg/day) — ask them. Take with food if they make you nauseous. If your current prenatal causes constipation, ask your doctor about a gentle alternative. Consistency matters more than brand.',
```

- [ ] **Step 3: Align week-28 "eyes open" to wk26 canonical (line 206)**

Find:
```ts
    developmentPoints: ['Baby can blink, cough, and practice breathing movements', 'Brain is developing billions of neurons', 'Eyes open for the first time this week', 'Baby responds to sound, light, and your touch'],
```
Replace with:
```ts
    developmentPoints: ['Baby can blink, cough, and practice breathing movements', 'Brain is developing billions of neurons', 'Eyes — which first opened around week 26 — now blink at light', 'Baby responds to sound, light, and your touch'],
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/weekDetailData.ts
git commit -m "fix(health): perineal-massage wording, high-risk folate, eyes-open consistency"
```

---

## Task 9: High-risk folate dose in prepGuide (Medium #15)

**Files:**
- Modify: `lib/prepGuide.ts:39`

**Interfaces:**
- Consumes: nothing.
- Produces: `PrepGuide { why; how: string[]; watch? }` unchanged.

- [ ] **Step 1: Add the high-risk dose bullet (line 39)**

Find:
```ts
      'Look for at least 400–600 mcg folate, 27 mg iron, 150 mcg iodine, 200 mg DHA.',
```
Replace with:
```ts
      'Look for at least 400–600 mcg folate, 27 mg iron, 150 mcg iodine, 200 mg DHA.',
      'If a prior pregnancy had a neural tube defect, ask your provider — they may prescribe ~4,000 mcg folate/day.',
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/prepGuide.ts
git commit -m "fix(health): add high-risk folate dose to prep guide"
```

---

## Task 10: Surface ACOG attribution in appointments (Medium #13)

**Files:**
- Modify: `lib/pregnancyAppointments.ts:1-6` (header — keep) and add a user-facing source line. Since `StandardAppointment` has no `source` field and adding one ripples into the UI, surface attribution via the existing `prepNote` of the first visit is wrong; instead the lowest-risk move is a screen-level note. Add an exported constant the schedule screen can render.

**Interfaces:**
- Consumes: nothing.
- Produces: `export const APPOINTMENTS_SOURCE_NOTE: string`.

- [ ] **Step 1: Add exported attribution constant after the header**

Find (lines 1-6):
```ts
// lib/pregnancyAppointments.ts
// Standard pregnancy appointment timeline — pre-seeded for all users.
// Aligned with ACOG-recommended prenatal care: 10 universal milestones from
// confirmation through pre-birth. Conditional items (3-hr GTT, amnio, NST,
// flu shot, COVID booster) are intentionally not in the curve to keep it
// focused — they surface contextually elsewhere.
```
Add immediately after the header block (before the interface), a new export:
```ts

// User-facing attribution for the schedule screen (audit Medium #13: surface
// the ACOG basis to users, not only in this code comment).
export const APPOINTMENTS_SOURCE_NOTE =
  'Milestone weeks follow ACOG-recommended prenatal care. General information ' +
  "only — your clinic's exact schedule may differ; follow your provider."
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3 (optional, if the schedule screen is quick to wire): render it.** Search for where `StandardAppointment` / the schedule list is consumed.

Run: `grep -rln "pregnancyAppointments\|StandardAppointment\|APPOINTMENTS" app components | grep -v node_modules`
If a single obvious screen renders the list, add a small muted `<Text>` showing `APPOINTMENTS_SOURCE_NOTE` near its header using `colors.textMuted` (import from `useTheme()`). If wiring is non-trivial, leave the constant exported for a later UI pass and note it.

- [ ] **Step 4: Commit**

```bash
git add lib/pregnancyAppointments.ts
git commit -m "fix(health): export user-facing ACOG attribution for appointment schedule"
```

---

## Task 11: Document ±2d regularity band as an app metric (Low #20)

**Files:**
- Modify: `lib/cycleAnalytics.ts:137-138`

**Interfaces:**
- Consumes: nothing. Produces: no signature change (comment only).

- [ ] **Step 1: Add a clarifying comment above the regularity calc**

Find (lines 137-138):
```ts
  const regularCount = deviations.filter((d) => d.delta <= 2).length
  const percent = Math.round((regularCount / closed.length) * 100)
```
Replace with:
```ts
  // The ±2-day window is THIS APP'S display metric for "regular", not a
  // medical definition — ACOG tolerates ~7–9 days of cycle-to-cycle variation.
  const regularCount = deviations.filter((d) => d.delta <= 2).length
  const percent = Math.round((regularCount / closed.length) * 100)
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/cycleAnalytics.ts
git commit -m "fix(health): document ±2d cycle-regularity band as an app metric"
```

---

## Task 12: Fertile-window / luteal / cycle-range / hydration copy in cycleLogic (Medium #8, Low #17, Low #18, Low #19)

**Files:**
- Modify: `lib/cycleLogic.ts:13-15` (luteal comment + cycle range), `:123-125` (fertile window), `:378` (hydration copy)

**Interfaces:**
- Consumes: nothing. Produces: no signature changes — copy + comment only. Note: the fertile-window *math* (`ovulationDay + 1`) is left intact to avoid changing computed behavior; the audit's Low #17 is satisfied by documenting it as a display choice rather than altering the engine.

- [ ] **Step 1: Soften the luteal "relatively constant" header + cycle range (lines 13-15)**

Find:
```ts
 * Cycle length varies (21-35 days normal, 28 average).
 * Luteal phase is relatively constant (~14 days).
 * So ovulation = cycleLength - 14.
 */
```
Replace with:
```ts
 * Cycle length varies (ACOG: ~24–38 days typical; 21–35 also widely cited;
 * 28 average). The luteal phase is often ~14 days but ranges ~11–17 and varies
 * within the same person, so calendar prediction is an ESTIMATE — BBT, LH
 * tests and cervical mucus are more accurate. ovulation = cycleLength - luteal.
 */
```

- [ ] **Step 2: Document the fertile-window display choice (lines 123-125)**

Find:
```ts
  // Fertile window: 5 days before ovulation through 1 day after
  const fertileStart = Math.max(1, ovulationDay - 5)
  const fertileEnd = ovulationDay + 1
```
Replace with:
```ts
  // Fertile window: 5 days before ovulation through 1 day after. The clinical
  // "6-day window" (Wilcox) ends ON ovulation day; we extend one day for a
  // gentler display buffer — a UI choice, not a claim that day+1 is fertile.
  const fertileStart = Math.max(1, ovulationDay - 5)
  const fertileEnd = ovulationDay + 1
```

- [ ] **Step 3: Soften the hydration "crucial for conception" copy (line 378)**

Find:
```ts
  return { percentage: pct, label: 'Very low', color: brand.phase.menstrual, message: 'Drink water now! Hydration is crucial for conception.' }
```
Replace with:
```ts
  return { percentage: pct, label: 'Very low', color: brand.phase.menstrual, message: 'Drink water now! Staying hydrated supports your overall wellbeing.' }
```

Also soften the line-376 message (the only other "fertility" hydration claim):

Find:
```ts
  if (pct >= 50) return { percentage: pct, label: 'Halfway', color: stickers.yellow, message: 'Keep drinking — hydration helps fertility.' }
```
Replace with:
```ts
  if (pct >= 50) return { percentage: pct, label: 'Halfway', color: stickers.yellow, message: 'Keep drinking — hydration supports your overall wellbeing.' }
```

- [ ] **Step 4: Verify the conception/fertility hydration claims are gone**

Run: `grep -n "crucial for conception\|helps fertility" lib/cycleLogic.ts`
Expected: no output (exit 1).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/cycleLogic.ts
git commit -m "fix(health): soften luteal/fertile-window/cycle-range/hydration copy"
```

---

## Task 13: growthStandards WHO URL + CDC mid-childhood P50 tweaks (Low #21, Low #22)

**Files:**
- Modify: `lib/growthStandards.ts:9` (WHO URL), `:100-101` (CDC boys weight), `:119-120` (CDC girls weight)

**Interfaces:**
- Consumes: nothing. Produces: `Band { ageMonths, p3, p15, p50, p85, p97 }` unchanged.

**Audit basis:** WHO URL is a legacy path; CDC 8–14y P50 weights run ~1–2.5kg low. Published CDC P50: boys 96mo≈25.6, 108mo≈28.2; girls 120mo≈32.9, 144mo≈40.0 (approx, audit-cited).

- [ ] **Step 1: Update the legacy WHO URL (line 9)**

Find:
```ts
 *   - WHO Child Growth Standards (0–24 months): https://www.who.int/childgrowth/standards
```
Replace with:
```ts
 *   - WHO Child Growth Standards (0–24 months): https://www.who.int/tools/child-growth-standards
```

- [ ] **Step 2: Nudge CDC boys weight P50 (lines 100-101)**

Find:
```ts
  { ageMonths: 96,  p3: 20.4, p15: 22.2, p50: 24.9, p85: 28.5, p97: 32.5 },
  { ageMonths: 108, p3: 22.2, p15: 24.4, p50: 27.7, p85: 32.0, p97: 37.0 },
```
Replace with:
```ts
  // CLINICAL-REVIEW: pending sign-off — CDC P50 nudged up to published medians (was ~0.7–2.5kg low).
  { ageMonths: 96,  p3: 20.4, p15: 22.2, p50: 25.6, p85: 28.5, p97: 32.5 },
  { ageMonths: 108, p3: 22.2, p15: 24.4, p50: 28.2, p85: 32.0, p97: 37.0 },
```

- [ ] **Step 3: Nudge CDC girls weight P50 (lines 119-120)**

Find:
```ts
  { ageMonths: 120, p3: 23.5, p15: 26.5, p50: 31.5, p85: 38.0, p97: 45.5 },
  { ageMonths: 144, p3: 29.0, p15: 33.0, p50: 39.0, p85: 47.0, p97: 56.5 },
```
Replace with:
```ts
  // CLINICAL-REVIEW: pending sign-off — CDC P50 nudged up to published medians (was ~1.4–2.6kg low).
  { ageMonths: 120, p3: 23.5, p15: 26.5, p50: 32.9, p85: 38.0, p97: 45.5 },
  { ageMonths: 144, p3: 29.0, p15: 33.0, p50: 40.0, p85: 47.0, p97: 56.5 },
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/growthStandards.ts
git commit -m "fix(health): update WHO URL + tighten CDC mid-childhood P50 weights"
```

---

## Task 14: Water-birth temperature upper bound (Low #25)

**Files:**
- Modify: `lib/birthData.ts:91`

**Interfaces:**
- Consumes: nothing. Produces: `BirthType` unchanged.

**Audit basis:** NICE NG235 / RCOG: pool must not exceed 37.5°C (99.5°F); app's own `natural.ts:116` already uses the correct range.

- [ ] **Step 1: Tighten the upper bound (line 91)**

Find:
```ts
    whatToExpect: 'You\'ll enter the birth pool when labor is well established (usually 5+ cm dilated). The water temperature is kept around 97-100°F. You may deliver in or out of the water.',
```
Replace with:
```ts
    // CLINICAL-REVIEW: pending sign-off — NICE NG235/RCOG: pool must not exceed 37.5°C (99.5°F).
    whatToExpect: 'You\'ll enter the birth pool when labor is well established (usually 5+ cm dilated). The water temperature is kept at body temperature, not above 99.5°F (37.5°C). You may deliver in or out of the water.',
```

- [ ] **Step 2: Verify the loose upper bound is gone**

Run: `grep -n "97-100" lib/birthData.ts`
Expected: no output (exit 1).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/birthData.ts
git commit -m "fix(health): tighten water-birth pool temp to NICE 99.5F upper bound"
```

---

## Task 15: Epidural instrumental-delivery stat (Medium #16)

**Files:**
- Modify: `lib/birthGuide/pain-relief.ts:65`

**Interfaces:**
- Consumes: nothing.

**Audit basis:** Cochrane CD000331.pub4 — assisted-birth RR ~1.44 (not a clean 2x); effect attenuates with modern low-dose epidurals. NOTE: this file was NOT captured in the read phase; the implementer must Read `lib/birthGuide/pain-relief.ts` around line 65 first and exact-match the real string.

- [ ] **Step 1: Read the file to get the exact current string**

Run: `Read lib/birthGuide/pain-relief.ts` (focus ~lines 55-75). Locate the "14% vs 7%" instrumental-delivery claim.

- [ ] **Step 2: Replace the 2x framing with the Cochrane RR**

Replace the located string's "14% vs 7%" (≈2x) phrasing with wording equivalent to:
```
'Epidurals modestly raise the chance of an assisted (forceps/vacuum) birth — Cochrane pooled data put it at about 1.4x, and this effect largely disappears with modern low-dose epidurals.'
```
Preserve the surrounding object structure and any `sources[]` entry (the file already cites sources — keep them). Add an inline `// CLINICAL-REVIEW: pending sign-off — Cochrane CD000331.pub4 (Anim-Somuah 2018).` above the changed line.

- [ ] **Step 3: Verify the "14% vs 7%" framing is gone**

Run: `grep -n "14%" lib/birthGuide/pain-relief.ts`
Expected: no output (exit 1) — or, if 14% legitimately appears elsewhere, confirm the instrumental-delivery 2x claim specifically is reworded.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/birthGuide/pain-relief.ts
git commit -m "fix(health): reframe epidural instrumental-delivery stat to Cochrane RR ~1.4"
```

---

## Task 16: foodCalories USDA source header (Low #26)

**Files:**
- Modify: `lib/foodCalories.ts:1-6`

**Interfaces:**
- Consumes: nothing. Produces: no code change — header comment only.

- [ ] **Step 1: Add USDA + AAP attribution to the header**

Find (lines 1-6):
```ts
/**
 * Baby & Toddler Food Calorie Reference
 *
 * Approximate calories per typical serving for common kid foods.
 * Used for live estimation as caregivers type what the child ate.
 */
```
Replace with:
```ts
/**
 * Baby & Toddler Food Calorie Reference
 *
 * Approximate calories per typical serving for common kid foods.
 * Used for live estimation as caregivers type what the child ate.
 *
 * Source: calorie densities from USDA FoodData Central (https://fdc.nal.usda.gov/);
 * typical servings approximate AAP toddler guidance. Estimates only, not a
 * feeding prescription.
 */
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/foodCalories.ts
git commit -m "fix(health): cite USDA FoodData Central in calorie reference header"
```

---

## Task 17: Add source headers to remaining uncited clinical files (Layer B roll-out, Medium #14 + citations gap)

**Files:**
- Modify headers only: `lib/weekStats.ts` (already done in Task 4 — skip), `lib/pregnancyData.ts`, `lib/pregnancyInsights.ts`, `lib/cycleLogic.ts` (already cites Wilcox in Task 3/12 — verify), `lib/vaccineInfo.ts` (done Task 6 — skip).

**Interfaces:**
- Consumes: `SOURCES` from Task 1 (referenced in prose, not imported, to keep these pure-data files import-light). Produces: header comments only.

- [ ] **Step 1: Add a source line to pregnancyData header**

Find (line 1):
```ts
export interface PregnancyWeekData {
```
Insert ABOVE it:
```ts
/**
 * Per-week pregnancy development data shown across the pregnancy home + week
 * detail surfaces. babyLength values are crown-heel population estimates
 * reconciled with lib/weekStats.ts (Hadlock/Perinatology.com). General
 * information only — not a measurement of your baby. See lib/medicalSources.ts.
 */
```

- [ ] **Step 2: Verify cycleLogic + pregnancyInsights already carry sourced context**

Run: `grep -n "Wilcox\|ESTIMATE\|general information\|No fasting" lib/cycleLogic.ts lib/pregnancyInsights.ts`
Expected: matches in both (from Tasks 2, 3, 12). If `pregnancyInsights.ts` has no top-of-file disclaimer, add a one-line header note:
```ts
// General pregnancy information, not medical advice — see lib/medicalSources.ts.
```
directly under the existing line-1/2 header comment.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/pregnancyData.ts lib/pregnancyInsights.ts
git commit -m "fix(health): add source/disclaimer headers to remaining clinical data files"
```

---

## Task 18: Surface MEDICAL_DISCLAIMER on the highest-risk UI surface (vaccines) + final verification

**Files:**
- Modify: the vaccine info modal component (find it), to render `MEDICAL_DISCLAIMER`.

**Interfaces:**
- Consumes: `MEDICAL_DISCLAIMER` from Task 1.

**Audit basis:** Vaccines are the CRITICAL surface; it should carry a visible country-schedule disclaimer.

- [ ] **Step 1: Find the vaccine modal**

Run: `grep -rln "VaccineInfoModal\|VACCINE_INFO\|vaccineInfo" components app | grep -v node_modules`

- [ ] **Step 2: Render the disclaimer**

In the modal component, import `{ MEDICAL_DISCLAIMER }` from `../../lib/medicalSources` (adjust depth) and add a muted footer `<Text>` using `colors.textMuted` from `useTheme()` and `font.body`, e.g.:
```tsx
<Text style={{ color: colors.textMuted, fontFamily: font.body, fontSize: 12, marginTop: spacing.md }}>
  {MEDICAL_DISCLAIMER}
</Text>
```
Match the existing disclaimer styling pattern already present in `components/kids/GrowthPercentileChart.tsx` / `components/pregnancy/BirthDetailModal.tsx` (both render a `disclaimer` text style) rather than inventing new tokens.

- [ ] **Step 3: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: PASS (zero errors).

- [ ] **Step 4: Full grep verification of all WRONG/discrepancy fixes**

Run each; all should produce **no output**:
```bash
grep -rn "Fast 8 hours" lib/
grep -rn "return 70" lib/cycleLogic.ts
grep -n "26.7" lib/weekStats.ts
grep -rn "first dose at birth" lib/vaccineInfo.ts
grep -n "97-100" lib/birthData.ts
grep -rn "crucial for conception\|helps fertility" lib/cycleLogic.ts
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix(health): surface medical disclaimer on vaccine modal + final verification"
```

---

## Self-Review checklist (run before declaring done)

- **Spec coverage:** All 26 audit fixes map to tasks — High #1–6 → Tasks 2,3,4,5,6,7; Medium #7–16 → Tasks 8,12,7,7,7,12,10,5/8/9,13(no—#14 header),15; Low #17–26 → Tasks 12,12,12,11,13,13,5/8,5,14,16. (Note: #14 fetal-source header is folded into Tasks 4 + 17.)
- **Clinician gate:** every value/instruction change carries a `// CLINICAL-REVIEW:` comment (Tasks 2,3,4,5,6,8,13,14,15). Copy-only softening (Task 12 hydration, Task 7 milestone phrasing) is labeling, not a new clinical value.
- **Type consistency:** `babyLength` is a string in `pregnancyData.ts`; `cm` is a number in `weekStats.ts` — values kept in their native types. New exports: `MEDICAL_DISCLAIMER`, `SOURCES`, `GROWTH_LEAPS_DISCLAIMER`, `APPOINTMENTS_SOURCE_NOTE`.

---

_Plan generated 2026-06-23 from the 2026-06-22 Health Content Verification Audit. Scope: all 26 items, code-now-flag-for-review clinician gate._
