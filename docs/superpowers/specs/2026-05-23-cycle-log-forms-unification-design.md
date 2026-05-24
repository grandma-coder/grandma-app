# Cycle Log Forms — Unification Design

**Status:** Approved (visual mockup signed off 2026-05-23)
**Owner:** grandma-app cycle module
**Surface:** Agenda → Log Activity sheet (cycle mode) + FertilitySignalsCard tiles on Cycle home

---

## Goal

Replace the two parallel cycle log form systems with **one sticker-styled, phase-aware set** that:

- ends the lucide-vs-sticker inconsistency between `LogForms.tsx` and `CycleLogForms.tsx`
- gives every form the same shell (header + body + save), phase pill, and sticker save button
- makes Symptoms scannable via mini-stickers and phase-suggested chips
- supports **true toggle / un-log** for multi-pick forms (Symptoms) by pre-loading existing rows for the date and writing the diff on save

The visual language matches the mockup at `.superpowers/brainstorm/11580-1779590834/content/all-forms.html` (approved).

---

## Non-goals

- Severity slider per symptom (light/medium/heavy intensity within a symptom). On/off matches the home strip; intensity is a future feature.
- Symptom history surfaces inside the form ("you logged this 3× this week"). That's analytics, separate.
- Voice notes / photo attachments on Symptoms, Mood, BBT, LH, CM, Intimacy. Photos stay on the dedicated `Exam result` form only.
- Touching `PregnancyLogForms.tsx` or `KidsLogForms.tsx`. Pregnancy and kids log surfaces are out of scope.

---

## Architecture

### Single file replaces two

`components/calendar/CycleLogForms.tsx` becomes the single source for **all 9 cycle log forms**. `components/calendar/LogForms.tsx` is **deleted** and its callers re-point imports to `CycleLogForms`.

### Shared building blocks (top of `CycleLogForms.tsx`)

Three new internal blocks all forms consume:

1. **`<LogFormShell>`** — wrapper that renders:
   - Header: `{title}` (Fraunces 22) + `{subline}` (e.g. `"Saturday · May 23 · Luteal"`) + close button (consumed via `LogSheet` already, so the shell just renders the title/subline block).
   - Optional phase pill row below the header (`<PhasePill phase={phase} label={hint} />`).
   - Body slot (children).
   - Footer: sticker save button (`<SaveStickerButton accent={accent} label={label} disabled={!valid} loading={saving} onPress={onSave} />`).
   - Hairline border, 18px padding, 24px top corners — already provided by `LogSheet`, the shell just owns inner layout.

2. **`<StickerChip>`** — chip for multi-pick or single-pick selection:
   - Props: `{ stickerType: SymptomId | string; label: string; selected: boolean; accent: string; onPress: () => void; }`
   - Active: `border 1.5px ink`, `bg = accent`, label `#FFFEF8`.
   - Inactive: `border 1px colors.border`, `bg = colors.surface`, label `colors.text`.
   - Left side: 16px sticker (filled accent disc + white glyph). Right side: optional `✓` when selected.

3. **`useDayLogToggle(date, type)`** — React Query hook for multi-pick forms:
   - Returns `{ initial: Set<string>; selected: Set<string>; toggle(value): void; reset(): void; commit(): Promise<void>; saving: boolean }`.
   - On mount: fetches existing rows for `(date, type)` (user_id filtered by RLS).
   - `selected` is local state initialised from the fetch.
   - `commit()` diffs `initial` vs `selected`: DELETE rows for removed values, INSERT rows for added values, in two sequential Supabase calls. Invalidates `['cycleLogs']` query key.
   - Used by `SymptomsForm`. Other multi-pick forms can adopt later.

### Phase data flow

Every form receives `phase: CyclePhase` via a new prop. `LogSheet` (the host bottom-sheet) derives the phase from `useCycleHistory()` + `getCycleInfo()` and passes it down. Forms render their phase pill text via:

```ts
function phaseHint(form: FormId, phase: CyclePhase): string
```

A small map in `lib/cycleLogForms.ts` (new file). E.g. for `symptoms` + `luteal` → `"Common in Luteal"`; for `period_start` + any → `"Menstruation begins"`; for `ovulation` + any → `"Fertile window peak"`.

### Symptom data

New file `lib/cycleSymptoms.ts`:

```ts
export type SymptomId =
  | 'cramps' | 'headache' | 'bloated' | 'fatigue' | 'nausea'
  | 'back-pain' | 'tender-breasts' | 'acne' | 'insomnia' | 'cravings'
  | 'low-mood' | 'spotting' | 'energetic' | 'restless'

export const ALL_SYMPTOMS: { id: SymptomId; label: string }[] = [
  { id: 'cramps', label: 'Cramps' },
  { id: 'headache', label: 'Headache' },
  { id: 'bloated', label: 'Bloated' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'nausea', label: 'Nausea' },
  { id: 'back-pain', label: 'Back pain' },
  { id: 'tender-breasts', label: 'Tender' },
  { id: 'acne', label: 'Acne' },
  { id: 'insomnia', label: 'Insomnia' },
  { id: 'cravings', label: 'Cravings' },
  { id: 'low-mood', label: 'Low mood' },
  { id: 'spotting', label: 'Spotting' },
  { id: 'energetic', label: 'Energetic' },
  { id: 'restless', label: 'Restless' },
]

export const PHASE_SUGGESTED: Record<CyclePhase, SymptomId[]> = {
  menstruation: ['cramps', 'back-pain', 'fatigue', 'headache', 'low-mood', 'bloated'],
  follicular:   ['acne', 'energetic', 'restless', 'headache'],
  ovulation:    ['tender-breasts', 'cramps', 'cravings', 'spotting'],
  luteal:       ['bloated', 'tender-breasts', 'low-mood', 'cravings', 'acne', 'fatigue'],
}
```

`SymptomsForm` shows `PHASE_SUGGESTED[phase]` at top; "Show more" reveals the rest. All symptoms still write to `type='symptom'`, value=`SymptomId` — phase only affects ordering.

### Mini-sticker registry

New file `components/calendar/symptomStickers.tsx` — one tiny SVG per `SymptomId` plus a fallback. 14 stickers, 16px viewBox, drawn in the same filled-accent + ink-stroke style as `RewardStickers.tsx`. Where a brand sticker already fits (`Drop`, `Moon`, `Leaf`, `Heart`, `Sleepy`), reuse it; otherwise add new primitives.

```ts
export function SymptomSticker({ id, size = 16 }: { id: SymptomId; size?: number })
```

Internally a `switch (id)` returns the right glyph.

---

## The 9 forms after redesign

All forms wrap `LogFormShell`. The body column lists the per-form picker.

| Form | Type written | Picker | Notes |
|---|---|---|---|
| 1. **Period Start** | `period_start` | 3 sticker tiles: Light / Medium / Heavy | Replaces empty-body PeriodStart. Stores flow level as the row value: `light` / `medium` / `heavy`. |
| 2. **Period End** | `period_end` | Confirm-only with dashed-drop hero | Same as today but in the new shell. |
| 3. **Symptoms** | `symptom` (multi) | Phase-suggested `StickerChip` row (4–6) + "Show more" reveals rest | Uses `useDayLogToggle`. Save label: `"Save N symptoms"` (or `"Update symptoms"` when count unchanged but selection changed). |
| 4. **Mood** | `mood` (one per day) | Row of 5 mood stickers: Low / Down / Okay / Good / Great | Replace-on-save (delete prior `mood` row, insert new). Stickers: `Sad` (blue) / `Sad` (lilac tint) / `Sleepy` / `Smiley` / `Smiley` (green tint). Two distinct fills needed for items 1+2 and 4+5. Acceptable trade-off given existing sticker set — see §"Mood sticker variants" below. |
| 5. **BBT** | `basal_temp` | Existing slider — drop into the new shell | Already sticker-styled; just re-skin header + button. |
| 6. **LH** | `lh` | Vertical pill stack: Negative / Faint / Positive / Peak | Existing logic; new shell. |
| 7. **Cervical mucus** | `cervical_mucus` | 5 sticker tiles: Dry / Sticky / Creamy / Watery / Eggwhite | Existing logic; new shell. |
| 8. **Intimacy** | `intercourse` | 2 sticker tiles: Unprotected / Protected | Renamed surface ("Intimacy") but writes to existing `intercourse` type. Replaces both `IntimacyForm` and `IntercourseForm` — see §"Intimacy + Intercourse merge". |
| 9. **Ovulation** | `ovulation` | Confirm-only with hero ovum sticker | **New form.** Lets the user manually confirm ovulation (today's date by default). Useful when LH/BBT data is ambiguous. |

**Note on Exam Result:** The visual mockup includes a 10th tile for "Exam result". That form already exists outside the cycle-log file set (`components/exams/ExamForm.tsx`) and writes to a different table (`exams`, not `cycle_logs`). It is **out of scope** for this spec. The Log Activity sheet may continue to surface it as a top-level tile that opens the existing `ExamForm` — no change to that flow.

### Mood sticker variants

The existing brand set has `Smiley` (yellow), `Sad` (blue), `Sleepy` (lilac). To reach 5 distinct moods we re-tint:

- **Low** → `Sad` with `fill = stickers.coral` + `slot bg = coral-soft`
- **Down** → `Sad` with `fill = stickers.blue` + `slot bg = blue-soft`
- **Okay** → `Sleepy` with `fill = stickers.lilac`
- **Good** → `Smiley` with `fill = stickers.yellow`
- **Great** → `Smiley` with `fill = stickers.green` + a small added sparkle dot

This avoids adding new sticker SVGs and keeps a clear left-to-right gradient (sad/blue → neutral/lilac → happy/green). Acceptable for this spec; a future tweak can ship a dedicated `Happy` and `Excited` sticker.

### Intimacy + Intercourse merge

Today there are two functionally identical forms:
- `LogForms.tsx::IntimacyForm` writes `type='intercourse'`, `value='yes'`.
- `CycleLogForms.tsx::IntercourseForm` writes `type='intercourse'`, `value='unprotected' | 'protected'`.

Post-redesign: **one form** named **Intimacy** in the unified file. Writes `type='intercourse'`, `value='unprotected' | 'protected'`. The old `IntimacyForm` (which wrote `'yes'`) is deleted. Any read sites that compare against `'yes'` must accept any non-null value as "logged" — see §"Backwards compat" below.

### Backwards compat

- Old rows with `value='yes'` for `intercourse` stay in the DB. Read sites (`FertilitySignalsCard.tsx`, analytics) already check `r.value` truthy, not equality with `'yes'`, so they remain correct.
- Old rows with `period_start` and `value=null` stay valid; new rows additionally set `value='light'|'medium'|'heavy'`. Read sites that check `type='period_start'` ignore value and continue to work.
- No DB migration needed.

---

## Phase pill copy table

Defined in `lib/cycleLogForms.ts`:

```ts
type FormId =
  | 'period_start' | 'period_end' | 'symptoms' | 'mood'
  | 'bbt' | 'lh' | 'cm' | 'intimacy' | 'ovulation'

const PHASE_PILL: Record<FormId, Record<CyclePhase, string>> = {
  period_start: {
    menstruation: 'Menstruation begins',
    follicular:   'Marking period start',
    ovulation:    'Unusual — period start mid-cycle',
    luteal:       'Period started early',
  },
  period_end:   { menstruation: 'Last day of period', follicular: 'Marking period end', ovulation: 'Marking period end', luteal: 'Marking period end' },
  symptoms:     { menstruation: 'Common in Menstruation', follicular: 'Common in Follicular', ovulation: 'Common in Ovulation', luteal: 'Common in Luteal' },
  mood:         { menstruation: 'Menstruation · be gentle', follicular: 'Follicular · energy rising', ovulation: 'Ovulation · peak energy', luteal: 'Luteal · mood often softer' },
  bbt:          { menstruation: 'Track every morning', follicular: 'Track every morning', ovulation: 'Track every morning', luteal: 'Track every morning' },
  lh:           { menstruation: 'Predicts ovulation 24–36h ahead', follicular: 'Predicts ovulation 24–36h ahead', ovulation: 'Surge today?', luteal: 'Outside fertile window' },
  cm:           { menstruation: 'Fertility signal', follicular: 'Fertility signal', ovulation: 'Egg-white = peak fertile', luteal: 'Fertility signal' },
  intimacy:     { menstruation: 'Logged for cycle insights', follicular: 'Logged for cycle insights', ovulation: 'Peak fertile window', luteal: 'Logged for cycle insights' },
  ovulation:    { menstruation: 'Unusual — confirm carefully', follicular: 'Early but possible', ovulation: 'Fertile window peak', luteal: 'Late confirmation' },
}
```

---

## Save button label table

Defined alongside `PHASE_PILL`:

| Form | Idle label | Saving label |
|---|---|---|
| Period Start | `"Start period"` | `"Saving…"` |
| Period End | `"Mark as ended"` | `"Saving…"` |
| Symptoms | `"Save N symptoms"` (N = selected count; falls back to `"Update symptoms"` when N=0 and initial>0) | `"Saving…"` |
| Mood | `"Save mood"` | `"Saving…"` |
| BBT | `"Save temperature"` | `"Saving…"` |
| LH | `"Save result"` | `"Saving…"` |
| CM | `"Save mucus"` | `"Saving…"` |
| Intimacy | `"Save"` | `"Saving…"` |
| Ovulation | `"Confirm ovulation"` | `"Saving…"` |

---

## Data flow

### Multi-pick (Symptoms)

```
mount
  → useDayLogToggle('symptom', date)
    → useQuery(['cycleLogs', 'day', userId, date, 'symptom'])
      → SELECT value FROM cycle_logs WHERE user_id=? AND date=? AND type='symptom'
    → initial = Set(rows.map(r => r.value))
    → selected = Set(initial)

user taps chip
  → selected.toggle(id) (local only)

user taps Save
  → commit()
    → added   = selected − initial
    → removed = initial − selected
    → if removed.size: DELETE FROM cycle_logs WHERE user_id=? AND date=? AND type='symptom' AND value IN (...)
    → if added.size:   INSERT [{user_id, date, type:'symptom', value}, ...]
    → invalidate ['cycleLogs']
    → onSaved()
```

### Single-pick (Mood, LH, CM, PeriodStart with flow, Intimacy)

```
mount
  → useQuery(['cycleLogs', 'day', userId, date, type])
  → existing = first row's value, or null

user picks tile
  → setLocal(value)

user taps Save
  → DELETE FROM cycle_logs WHERE user_id=? AND date=? AND type=?
  → INSERT {user_id, date, type, value, notes?}
  → invalidate ['cycleLogs']
  → onSaved()
```

### Continuous (BBT)

```
mount → existing temp loaded if present, populates slider
user adjusts → setLocal
Save → DELETE + INSERT (same as single-pick) with value=temp string
```

### Confirm-only (PeriodEnd, Ovulation)

```
mount → query existing row; if exists, show "Already logged" message + dismiss CTA
Save → INSERT {user_id, date, type, value:null, notes:null}
```

---

## Files touched

| File | Change |
|---|---|
| `components/calendar/CycleLogForms.tsx` | **Major rewrite.** Absorbs all 10 forms. Exports `LogFormShell`, `StickerChip`, `useDayLogToggle` internally + 10 form components externally. |
| `components/calendar/LogForms.tsx` | **Delete.** |
| `components/calendar/symptomStickers.tsx` | **New.** 14 mini SVG glyphs + `<SymptomSticker id size />` switch. |
| `lib/cycleSymptoms.ts` | **New.** `SymptomId`, `ALL_SYMPTOMS`, `PHASE_SUGGESTED`. |
| `lib/cycleLogForms.ts` | **New.** `PHASE_PILL`, `SAVE_LABEL`, `phaseHint(form, phase)`, `saveLabel(form, count?, initialCount?)`. |
| `components/calendar/LogSheet.tsx` | Pass `phase` prop down to form children. Compute phase from `getCycleInfo` and current date selection. |
| All call sites of `LogForms.tsx` exports | Update imports to `CycleLogForms`. Likely: `app/(tabs)/agenda.tsx`, `components/agenda/CycleTracker.tsx`, `components/calendar/CycleCalendar.tsx`. Verify with grep. |
| `components/home/cycle/FertilitySignalsCard.tsx` | Imports `BbtForm`, `LhForm`, `CmForm`, `IntercourseForm` from `CycleLogForms` — should still resolve after the rewrite. Verify imports + that `IntercourseForm` → `IntimacyForm` rename is handled (re-export alias if needed). |

### Re-export alias

To avoid touching every call site in this PR, `CycleLogForms.tsx` exports both names temporarily:

```ts
export { IntimacyForm }
export { IntimacyForm as IntercourseForm } // deprecated alias; remove next pass
```

A follow-up PR removes the alias and renames call sites. Out of scope here.

---

## Toggle semantics — edge cases

- **User opens Symptoms with 3 existing symptoms, removes 2, adds 1, taps Save** → 2 DELETEs + 1 INSERT.
- **User opens Symptoms with 0 existing, picks 4, taps Save** → 4 INSERTs. Save label: `"Save 4 symptoms"`.
- **User opens Symptoms with 2 existing, removes both, taps Save** → 2 DELETEs. Save label: `"Update symptoms"` (since `selected.size === 0` and `initial.size > 0`).
- **User opens Symptoms with 2 existing, makes no change, taps Save** → 0 writes. Save button disabled (`selected.equals(initial)`).
- **Save fails mid-diff** (DELETE succeeds, INSERT fails) → react-query catches, shows Alert, keeps local state. User can retry. No partial-rollback logic — Supabase doesn't support multi-statement transactions over PostgREST without an RPC; we accept this trade-off (worst case: a removed symptom is gone and the new ones aren't added; user re-saves to recover).

---

## Testing checklist (manual)

1. Open Symptoms on a date with no logs → all chips inactive → tap 3 → Save label updates → Save → reopen, those 3 are pre-checked.
2. Open Symptoms, un-toggle 1 of 3 → Save → reopen, 2 remain.
3. Open Mood twice in a row picking different moods → only the latest row exists in DB.
4. Open Period Start, pick "Heavy" → reopen Period Start → "Heavy" is pre-selected.
5. Open Intimacy → tap Unprotected → Save → DB has `type='intercourse' value='unprotected'`.
6. Open the same form in pre-pregnancy mode with cycle phase = Luteal → header subline reads `"... · Luteal"` → symptoms chips lead with `bloated, tender-breasts, low-mood, ...`.
7. FertilitySignalsCard tiles on Cycle home still open the correct (new) sheets — BBT, LH, CM, Intimacy.

---

## Out of scope (filed for future)

- Symptom severity (light/medium/heavy per symptom).
- Per-form animations (sticker bounce on tap).
- Logging multiple values across the day with timestamps (current model: one row per save, no time component).
- Removing the `IntercourseForm` re-export alias.
- Replacing tinted `Smiley`/`Sad` with dedicated `Happy` / `Excited` mood stickers.
