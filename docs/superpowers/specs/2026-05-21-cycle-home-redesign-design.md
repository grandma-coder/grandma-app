# Cycle (Pre-Pregnancy) Home Redesign — Design Spec

**Date:** 2026-05-21
**Status:** Approved (brainstorm) — ready for writing-plans
**Author:** Claude + Igor
**Audience:** TTC (trying-to-conceive). Cycle awareness is a side benefit, not the north star.

---

## 1. Background

The pre-pregnancy / cycle behavior on the home tab has accumulated several mismatches with the 2026 cream-paper sticker-collage design system, and several UX gaps for the TTC user.

Audit findings driving this spec:

- The "Day X of Y / Menstruation" hero (`YourCycleCard`) uses a dark plum surface `#3A2438` with cream text — a deliberate legacy break from the cream-paper system.
- The `HormonesCard` shows an illustrative LH/E/P sine curve with **no real data behind it**. The "drag to scrub" interaction in its modal is hidden behind tiny copy.
- The `WisdomCard` is a flat-yellow surface with 4 hard-coded phase-keyed strings.
- The `FertileWindowStrip` is a footer-style 7-day pill row; its modal explains "PEAK / HIGH" in textbook copy.
- The "See all" link above Pillars routes to `/library` (general library) rather than a pre-preg pillar index.
- The pillar detail screen (`app/pillar/[id].tsx`) is wrapped in `CosmicBackground` (legacy neon system) and renders body copy in `colors.textSecondary`, which is unreadable on cream.
- **No real fertility-signal logging exists** for a TTC user — no BBT, no LH, no cervical fluid, no intercourse log. Just period / ovulation / symptom / basal_temp slots in `cycle_logs` that the home doesn't surface.

## 2. North Star

> Make the cycle home **actively useful for a TTC user** — clearly answer "is today a good day to try?", make it 30 seconds to log the signals that improve that answer, and feel like the rest of the cream-paper app.

## 3. Scope

Five locked sections, shipping in three vertical slices. **No** changes to: analytics tab, onboarding flow, the broader 3-mode architecture, RLS. Slice 3 extends the existing `scan-image` edge function with a new `cycle_test` mode; Slices 1 and 2 touch no edge functions.

---

## 4. Section-by-section design

### 4.1 Cycle hero ring (replaces `YourCycleCard`)

A compact two-column card on cream paper. **Left column** holds phase copy; **right column** holds a 170px circular journey ring with 28 day-stickers — a sibling of the existing `PregnancyJourneyRing` component.

**Left column:**
- Phase title in `font.display` (Fraunces) — e.g. `a quiet day` with `quiet day` in rose italic
- Sub-line: `May 16 · Menstruation` and `Period day 1 of ~5`
- Sticker pill (`rose-soft` fill, `radius.full`, ink border, hard shadow) with phase name in caps
- Hint: `↻ tap any day` in muted caps

**Right column (the ring):**
- 170px ring (320 viewBox), 28 day-dots positioned at `(cos((i/28)·2π − π/2)·72, sin((i/28)·2π − π/2)·72)`
- Each non-today day-dot: 13px diameter, 1px ink border, phase-tinted fill:
  - days 1–5: `pink-soft` (🩸)
  - days 6–12: `green-soft` (🌱)
  - days 13–16: `peach-soft` (✨)
  - days 17–28: `lilac-soft` (🌙)
- Today's day: 22px diameter, coral fill, 2px ink border, hard 1.5px shadow, enlarged sticker
- Center: `Day 1 / of 28` in coral `font.display`, sized to match the pregnancy ring's "WEEK 40" center
- Tap any day → jump to detail. Drag → scrub. Same gesture model as `PregnancyJourneyRing`

**Below the hero:**
- Thin one-line strip: `Next fertile window opens in ~8 days · peak day 14`
- 2-column stats row: `Cycle length 28d` · `Period 1 / 5d`

**Implementation notes:**
- New component: `components/home/cycle/CycleJourneyRing.tsx` (sibling of `PregnancyJourneyRing.tsx`). Reuse the SVG ring + drag/spin gesture handler if it can be factored out; otherwise duplicate intentionally — these are visually similar but semantically distinct (cycle days vs gestational weeks).
- `YourCycleCard.tsx` is deleted.
- Phase sticker chooser keyed off `getCycleInfo().phase` (existing helper in `lib/cycleLogic.ts`).

### 4.2 Fertility Signals card (replaces `HormonesCard`)

A `PaperCard` that surfaces the 4 daily TTC signals plus a 7-day BBT sparkline. Lives in the row directly below the Fertile Window card.

**Layout:**
- Top row: `FERTILITY SIGNALS` label + headline (e.g. `Peak today` / `2 of 4 logged` / `Start tracking`) + sticker
- Tile grid (4 columns): BBT 🌡️ · LH 🧪 · CM 💧 · Sex 💞
- 7-day sparkline (BBT bars; today's bar coral with hard shadow)
- Footer: `7-day BBT · +0.3°C shift` (when post-ovulation rise detected) + `Full signals →` link

**Tile states:**
- Logged & on-track: `green-soft` fill
- Peak / positive: `coral` fill, white text
- Needs logging today: `raised` cream fill with dim sticker icon + `+ log` placeholder
- Empty (first run): all four dim, with a first-run prompt overlaid below the tiles ("Logging today takes 30s") + rose CTA pill

**Logging surfaces:**
- Tap BBT tile → spinner sheet, 35.0–38.0°C, 0.05° step. Writes to `cycle_logs` as new type `bbt`.
- Tap LH tile → 4-option pick (Negative / Faint / Positive / Peak). Writes as `lh`.
- Tap CM tile → 5-option sticker pick (Dry / Sticky / Creamy / Watery / Egg-white). Writes as `cm`.
- Tap Sex tile → toggle today on/off + optional `protected` flag. Writes as `intercourse`.
- Tap card body → full Fertility Signals sheet (BBT chart, LH test history, CM strip, intercourse log, "did you ovulate yet?" confidence score)

**Implementation notes:**
- New component: `components/home/cycle/FertilitySignalsCard.tsx`
- New log forms: `components/calendar/CycleLogForms.tsx` (BBT / LH / CM / Intercourse) — sticker-paper styled, same pattern as `PregnancyLogForms`
- DB: schema migration adds new `cycle_logs.log_type` values: `bbt`, `lh`, `cm`, `intercourse`, `opk_scan`. Existing column `basal_temp` is retained for backward compat (BBT can write both during transition).
- `HormonesCard.tsx` is deleted (with its modal body in `CycleHomeDetailSheets.tsx`).

### 4.3 Fertile Window card + modal (replaces `FertileWindowStrip`)

A full-width card directly under the hero. Single most important card for TTC — answers "is today a good day?" at a glance.

**Card:**
- `FERTILE WINDOW` label
- Big coral conception % (e.g. `12%`) + `low today` status pill + `Peak in ~10 days` sub-line
- One-line narrative: `A rising estrogen curve is on its way. Day 14 is your projected peak — start LH testing around day 11.`
- 7-day forecast pills with **conception % per day** (e.g. 12 / 8 / 6 / 9 / 22 / 48 / 71); pill fill graduates:
  - 0–14%: `raised`
  - 15–29%: `pink-soft`
  - 30–59%: `pink`
  - 60–100%: `coral` (white text)
  - Today: 2px ink outline-offset
- Footer: `Best days this cycle: May 26 – 28 → open`

**Modal (bottom sheet, opens on card tap):**
- Header: `Fertile Window · May 22 – May 28 · this cycle` + close button
- **Peak in** block: `~10 days` in big coral serif + `Sun May 26 · projected ovulation`
- **7-day forecast** with color legend (Low / Mid / High / Peak)
- **Log a signal today** row: 3 quick-log buttons (BBT / LH / CM) — same affordances as the card tiles
- **Confidence** badge: `68% · Calendar-based estimate · 2 cycles logged. Add BBT + LH for the next 3 days and confidence jumps to ~90%`
- **Past windows** list (last 3 cycles with peak date)
- CTA at bottom: rose pill `Open full fertility log`

**Confidence math (v1):**
- Calendar-only estimate (no BBT/LH): 60–70% depending on cycle count
- Calendar + 7 days BBT: 80%
- Calendar + 7 days BBT + 3 days LH: 92%
- BBT post-ovulation shift confirmed: 96% (locks past peak; future windows still calendar-based)

**Implementation notes:**
- New component: `components/home/cycle/FertileWindowCard.tsx`
- New modal: `components/home/cycle/FertileWindowModal.tsx`
- Per-day conception probabilities derived from existing `lib/cycleLogic.ts` (extend the helper if needed — current version returns window dates, needs daily curve)
- `FertileWindowStrip.tsx` deleted

### 4.4 Daily Nudge (full-width) + Mood/Symptom compact strip (replaces `WisdomCard`)

**Daily Nudge card — full-width, paper surface:**
- `TODAY'S NUDGE` label + rose-soft sticker (💗) top-right
- Headline in `font.display` Fraunces with one italic phrase (e.g. `Rest is *fertility work* too`)
- Body copy in `colors.textMuted` (still legible; lower-emphasis than headline)
- Footer: pillar tag (`From · Cycle Health`) + rose `Read more →` CTA

**Template bank (v1, no AI):**
- `lib/cycleNudges.ts` — array of templates keyed by predicate
- Predicate inputs: `{ phase, cycleDay, hasBBT, hasLH, hasCM, moodToday, daysLate }`
- Picker returns the first matching template; falls back to a generic per-phase quote
- Each template has: `headline`, `body`, `pillarId` (deep-dive link) or `logShortcut` (opens a specific log sheet)

Six locked example variants (extend later):
1. **Day 1 / period / nothing logged** → `Rest is fertility work too` → Cycle Health
2. **Day 9 / follicular / no LH yet** → `Time to start LH testing` → Open LH log
3. **Day 13 / high fertility / BBT logged** → `Window opens tomorrow` → How to check CM
4. **Day 18 / luteal / BBT shift confirmed** → `Ovulation confirmed` → When to test
5. **Day 24 / luteal / low mood logged** → `PMS is hormonal, not personal` → Nutrition Prep
6. **Day 32+ / late** → `You're a few days late` → Scan a test (deep-link to scan)

**Mood/Symptom compact strip — full-width below the nudge:**
- 32px mood face sticker (today's pick, yellow fill, ink border) + tappable to change
- Chip strip with 3–4 visible symptoms + `+` to open the full picker sheet
- Toggling a chip writes immediately to `cycle_logs.symptom` (multi-value); no save button
- Picker sheet uses the same sticker-paper styling as the pregnancy symptom picker

**Implementation notes:**
- New components: `components/home/cycle/DailyNudgeCard.tsx`, `components/home/cycle/MoodSymptomStrip.tsx`, `components/home/cycle/MoodSymptomPickerSheet.tsx`
- New data file: `lib/cycleNudges.ts`
- Mood/symptom uses existing `cycle_logs` columns; no schema change
- `WisdomCard.tsx` deleted

### 4.5 Pillar detail rebuild + new pre-preg pillars index

**Pillar detail (`app/pillar/[id].tsx`):**
- Remove `CosmicBackground` wrapper. Use `colors.bg` (cream / warm-ink) directly.
- Replace `glass`-style back button with the standard `ScreenHeader` back button.
- Hero: sticker pulled from `pillarStickerMap[id]`, ~120px, in a circular paper bubble (`PaperCard` with `radius.full`).
- Title in big `font.display` Fraunces `colors.text` (not `textSecondary`).
- Italic coral subtitle.
- Tips: each in a `PaperCard` (`radius.lg`), title in `colors.text` (not `textSecondary`), body in `colors.textSecondary` — explicitly upgrade the title.
- "Ask Grandma" suggestion chips become rose `PillButton` instances.

**New screen `app/cycle-pillars.tsx`:**
- Header: `Cycle pillars` in `font.display`, italic subtitle
- 2-column grid of 6 pillar tiles (Nutrition Prep, Cycle Health, Mental Prep, Movement, Lifestyle, Partner)
- Each tile: sticker from `pillarStickerMap`, title, 1-line subtitle, hairline border, sticker-color soft fill
- Tap → `/pillar/[id]`

**Fix the "See all" link in `CyclePillarsGrid.tsx`:**
- Line that routes to `/library` → route to `/cycle-pillars`

**Out of scope:** filling out actual deep content for each of the 6 pre-preg pillars. The skeletons stay; that's a separate content-writing project.

---

## 5. Final home layout

```
HomeGreeting (unchanged)
↓
CycleHeroRing                  — 170px ring, two-column        (was YourCycleCard)
   ↓
   Next-fertile thin strip + cycle-length stats
↓
FertileWindowCard              — full-width                    (was FertileWindowStrip)
↓
FertilitySignalsCard           — full-width                    (was HormonesCard)
↓
DailyNudgeCard                 — full-width                    (was WisdomCard)
↓
MoodSymptomStrip               — full-width, compact           (new)
↓
CyclePillarsGrid               — unchanged grid, fixed link    (See all → /cycle-pillars)
```

The Hormones+Wisdom duo row is gone. The Fertile Window leads (because TTC), Signals supports it, the Nudge contextualizes today.

---

## 6. Data model deltas

Single migration: `supabase/migrations/<ts>_cycle_signal_logs.sql`

- Allowed `cycle_logs.log_type` enum values gain: `bbt`, `lh`, `cm`, `intercourse`, `opk_scan`
- New columns on `cycle_logs`:
  - `numeric_value DECIMAL(4,2) NULL` — for BBT temp (existing `basal_temp` is retained for backward compatibility; new writes target `numeric_value`)
  - `picker_value TEXT NULL` — for LH 4-option / CM 5-option / intercourse `protected` boolean stringified
  - `scan_url TEXT NULL` — for OPK/pregnancy test scan photo (signed URL into existing `scan-images` bucket)
- Indexes: `(user_id, log_date)` already exists; add `(user_id, log_type, log_date)`
- RLS: existing owner policy covers new rows. No new policies.
- `NOTIFY pgrst, 'reload schema';` at the end.

No other tables touched.

---

## 7. Files inventory

### New
- `components/home/cycle/CycleJourneyRing.tsx`
- `components/home/cycle/FertilitySignalsCard.tsx`
- `components/home/cycle/FertileWindowCard.tsx`
- `components/home/cycle/FertileWindowModal.tsx`
- `components/home/cycle/DailyNudgeCard.tsx`
- `components/home/cycle/MoodSymptomStrip.tsx`
- `components/home/cycle/MoodSymptomPickerSheet.tsx`
- `components/calendar/CycleLogForms.tsx` (BBT / LH / CM / Intercourse / OPK scan)
- `lib/cycleNudges.ts`
- `app/cycle-pillars.tsx`
- `supabase/migrations/<ts>_cycle_signal_logs.sql`

### Modified
- `components/home/CycleHome.tsx` — recompose the section list
- `components/home/cycle/CyclePillarsGrid.tsx` — fix "See all" target
- `app/pillar/[id].tsx` — drop CosmicBackground, fix text color, sticker hero, pill CTAs
- `lib/cycleLogic.ts` — add a `dailyFertilityCurve(cycleDay, cycleLength): number[]` helper used by FertileWindowCard
- `lib/i18n/keys.ts` + locales — new cycle keys (mirror the pregnancy i18n wave pattern)

### Deleted
- `components/home/cycle/YourCycleCard.tsx`
- `components/home/cycle/HormonesCard.tsx`
- `components/home/cycle/WisdomCard.tsx`
- `components/home/cycle/FertileWindowStrip.tsx`
- The Hormones + FertileWindow sheets inside `CycleHomeDetailSheets.tsx` (the file may shrink to symptom sheets only or be removed)

---

## 8. Sequencing — 3 vertical slices

### Slice 1 — Home cosmetics + pillar rebuild (no schema)
**Goal:** loudest visual gaps fixed first.

- Delete `YourCycleCard` → ship `CycleJourneyRing` hero
- Delete `WisdomCard` → ship `DailyNudgeCard` (template bank with starter set of 8–10 templates)
- Fix `CyclePillarsGrid` "See all" → ship new `app/cycle-pillars.tsx`
- Rebuild `app/pillar/[id].tsx` — drop CosmicBackground, fix contrast, sticker hero, pill CTAs

Ships independently. No DB migration. No new logging.

### Slice 2 — Fertility Signals (core)
**Goal:** real TTC tracking.

- Migration: new `cycle_logs.log_type` values + columns
- Build `CycleLogForms.tsx` (BBT spinner, LH 4-option, CM 5-option, Intercourse toggle)
- Build `FertilitySignalsCard` (4 tiles + sparkline + 3 states)
- Delete `HormonesCard` + its modal body
- Build `FertileWindowCard` + `FertileWindowModal`
- Delete `FertileWindowStrip` + its modal body
- Build `MoodSymptomStrip` + picker sheet (no schema change)
- Extend `lib/cycleLogic.ts` with `dailyFertilityCurve`

### Slice 3 — Smart layer
**Goal:** the data starts paying off.

- `DailyNudgeCard` becomes log-aware (predicate engine reads Slice 2 data)
- Fertile Window **confidence** score on the modal — math reads BBT + LH log history
- OPK / pregnancy test photo scan — extend `scan-image` edge function with a `cycle_test` mode (Negative / Faint / Positive / Peak / Pregnant) writing back to `cycle_logs` as `opk_scan` with `scan_url`
- Optional v2: `nana-chat` could swap in for the static nudge bank with mode context

---

## 9. Out of scope (explicitly)

- The cycle Analytics tab — gets new charts in a follow-up once we have BBT / LH / CM data
- Pre-preg onboarding flow — separate brainstorm
- Deep content for the 6 pre-preg pillars — content-writing project
- Partner mode / shared cycle view — future
- Apple HealthKit BBT auto-import — future
- Push notifications around the fertile window — future

---

## 10. Definition of done

- Slices 1 and 2 ship to TestFlight; the cycle home feels native to the cream-paper system end-to-end.
- A TTC user with 0 logs sees the new ring hero + empty-state Fertility Signals + log-prompt nudge; can log BBT and LH in <30 seconds.
- A TTC user with 1 cycle of BBT data sees the confidence score climb past 80% and a "+0.3°C shift" callout when the post-ovulation rise lands.
- No regressions in pre-preg analytics, calendar logging, or the chat surface.
- `colors.textSecondary` no longer appears on the pillar detail title; pillar detail reads cleanly on cream.
- `/library` is no longer the destination of any cycle-home link.
