# Friendly Quick-Log Kit — Design

**Date:** 2026-07-21
**Status:** Approved (pending spec review)
**Author:** Igor + Claude

## Problem

Logging in the Kids behavior is high-friction. Each Kids log sheet (Sleep, Diaper,
Feeding, Mood, …) is a bespoke multi-field form that shows a **wall of fields at
once** — child picker + date + time + option chips + photo + notes + save-as-routine
— before the user can save. `components/calendar/KidsLogForms.tsx` is ~4,236 lines,
nearly double the Pregnancy forms, because of this per-form bespoke complexity.

The **Pregnancy** log sheets are the opposite and are the agreed gold standard:
one thing per screen, a big concept blob, a slider (or two) for the value, and Save.
They feel friendly because of three properties (confirmed with the user):

1. **One thing per screen** — each screen asks for a single value.
2. **Sliders over typing/picking** — dragging beats typing numbers or hunting chips.
3. **Minimal required fields** — sensible defaults (date = today), save immediately;
   no mandatory pickers gating the save.

(The animated blob is a nice-to-have, not the core reason.)

Pregnancy gets away with this partly because it has **no child** (it's the mother)
and defaults the date to today. Kids logs must know **which child**, which is the
one extra dimension the redesign has to absorb without becoming the new friction.

## Goal

Standardize Kids logging on the friendly Pregnancy pattern via a **shared kit**,
and pilot it on the four highest-traffic Kids logs. Prove the pattern on real use,
then roll out to the rest of Kids + Cycle in a later pass.

## Non-goals (this pass)

- Redesigning **all** Kids logs. Only the pilot 4 (Sleep, Diaper, Mood, Feeding).
- Touching **Cycle** log forms. (They align to the kit in a later pass.)
- Redesigning **Pregnancy** logs. They are the gold standard; they only optionally
  share the kit's primitives — no UX change.
- Removing any field. Every field that is loggable today stays loggable.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| What makes pregnancy feel right | One thing per screen · sliders over typing · minimal required fields |
| Child selection | **Default to the active child** (home/calendar header selection); tappable chip to switch; **never blocks** the flow |
| Categorical logs (diaper/mood/feeding-type) | **Big tappable choice-blobs**, one thing per screen |
| Commit model | **Tap selects, then Save** (NOT instant-save). Slider logs and choice logs both end in an explicit Save — one consistent commit step, easy to change your mind |
| Existing fields (time/notes/photo/save-as-routine) | **Keep all, collapsed** behind a single "more" toggle. Nothing becomes un-loggable |
| Scope | **Shared kit + pilot 4** (Sleep, Diaper, Mood, Feeding), then roll out |

## Architecture

### New module: `components/calendar/QuickLogKit.tsx`

Reusable, behavior-agnostic primitives. Reuses existing building blocks rather than
reinventing them: `StepSlider` (`components/ui/StepSlider`), the concept-blob header
pattern, and the `LogSheet` shell (`components/calendar/LogSheet`).

Three building blocks, all "one thing per screen":

1. **`SliderStep`** — wraps `StepSlider` + a centered concept-blob header. For numeric
   values (hours, quality, amount, count). This is exactly the current pregnancy
   slider pattern, extracted so all behaviors share it.
   - Props (approx): `blob: CharacterName` · `label` · `min` · `max` · `step` ·
     `value` · `onChange` · `unit?`.

2. **`ChoiceStep`** — a grid of large tappable **choice-blobs** for categorical data.
   - Single-select: tapping highlights the choice (does NOT auto-save); the frame's
     Save commits.
   - Multi-select: tapping toggles; Save commits.
   - Props (approx): `blob?`/per-choice `blob` · `choices: {id,label,blob,color}[]` ·
     `value` · `onChange` · `multi?: boolean`.

3. **`QuickLogFrame`** — the shared shell that enforces the friendliness rule:
   *primary value visible and immediately savable; everything else optional and
   collapsed.* Contains:
   - `LogSheet` chrome (title, close, paper/diffuse variants).
   - An optional **active-child chip** (Kids only): defaults to the active child,
     tappable to switch, never blocks. Hidden when `childId` is not applicable
     (pregnancy/cycle).
   - The step content (one or more `SliderStep`/`ChoiceStep`).
   - A single collapsed **"more"** row holding the non-essential fields (time, notes,
     photo, save-as-routine). Collapsed by default; one tap reveals them. A user who
     wants a custom time or a note taps "more" *before* Save.
   - A single **Save** button (with the existing confirm animation on success).

### Data / save path

- No schema changes. The kit calls the **existing** per-behavior save helpers
  (`child_logs` for Kids via the current KidsLogForms save logic; `pregnancy_logs`
  for pregnancy) and invalidates the same React Query keys already used. The kit is a
  presentation layer over the current persistence — the redesign is UI-only.
- Defaults: `child_id = active child`, `date = today` (`toDateStr(new Date())`),
  `time = now` unless changed in "more".

## The pilot 4 (Kids)

Each defaults to the active child (tappable chip), date = today, time = now; time /
notes / photo / save-as-routine collapse behind "more". All end in Save.

| Log | Today (wall of fields) | Redesigned (kit) |
|---|---|---|
| **Sleep** | child + date + time + GREAT/GOOD/RESTLESS/POOR + notes + routine | `SliderStep` hours → `SliderStep` quality (1–10). Save. (Matches pregnancy sleep.) |
| **Diaper** | child + date + time + PEE/POOP/BOTH + photo + add + notes | `ChoiceStep` pee/poop/both (single-select) → Save. |
| **Mood** | child + date + time + mood chips + notes | `ChoiceStep` mood blobs (happy/okay/fussy…) (single-select) → Save. |
| **Feeding** | child + date + time + type + amount + side + notes | `ChoiceStep` type (breast/bottle/solid) → `SliderStep` amount (skippable) → Save. |

Blobs + hues come from the shared canonical map (`DIFFUSE_LOG_CHARACTER` /
`diffuseLogHue` in `DiffuseLogTimeline`) so icons match every other log surface.

## Consumers

The pilot forms are consumed by the same places that mount KidsLogForms today
(KidsCalendar "Log Activity" sheet, KidsHome quick-log, agenda). No call-site API
change: each converted form keeps its existing exported signature
(`{ onSaved, initialDate, prefill, onSkip, editLog }`) so mounting code is untouched.

## Testing / verification

- Typecheck clean (`tsc --noEmit`).
- Manual: for each pilot log — open sheet, confirm active child pre-selected, confirm
  primary value is immediately editable, confirm "more" reveals time/notes/photo/
  routine, confirm Save writes the same row shape as before and the timeline/analytics
  reflect it, confirm edit-existing (`editLog`) still prefills.
- Regression: the untouched Kids logs (Health, Activity, Wake-up, Memory) still render
  via the old forms; Pregnancy + Cycle unchanged.

## Rollout (later passes, not this spec)

1. Remaining Kids logs (Health, Activity, Wake-up, Memory) onto the kit.
2. Cycle logs onto the kit.
3. Optionally refactor Pregnancy forms to consume the kit's `SliderStep`/frame
   (behavior-preserving; reduces duplication).

Each later pass reuses the kit; the risk is front-loaded into this pilot.
