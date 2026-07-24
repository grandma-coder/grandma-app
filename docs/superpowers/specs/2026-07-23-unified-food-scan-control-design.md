# Unified Food-Scan Control — Design

**Date:** 2026-07-23
**Status:** Approved (pre-implementation)

## Problem

The food-logging sheets expose photo/scan capture through multiple, inconsistent
entry points, which confuses users:

- **Kids → Log Feeding → Solids** (`FeedingForm`) shows a photo-attach row
  (camera tile + dashed gallery tile) **and** a separate "SCAN PLATE" row that
  itself pops a native alert asking Take Photo / From Library. The plate photo
  can therefore be captured from two different places, and the "attach" tiles
  are largely redundant because scanning already keeps the captured photo as
  evidence.
- **Pregnancy → Log Meal** (`PregnancyMealForm`) uses two side-by-side buttons
  (Take Photo + Gallery), which is the cleaner pattern — but it does not match
  the Kids form.

Goal: **one clear scan control**, identical across both forms.

## Decision

Keep two visible source buttons (Take Photo + Gallery) — the user explicitly
chose the two-button-but-unified option over a single-button action sheet — and
extract them into **one shared component** used by both forms. Remove the
redundant photo-attach tile row and the intermediate alert from the Kids form.

## Scope

**In scope** — the only two forms that perform food scanning:

- `components/calendar/KidsLogForms.tsx` → `FeedingForm` (Kids → Solids), both
  the Diffuse render (~L1568-1594) and the current-variant render (~L2020-2058).
- `components/calendar/PregnancyMealForm.tsx` → meal photo pick row (L242-262).

**Out of scope** — pure keepsake-photo attach (no scan): `MemoryForm` and
`DiaperForm` in `KidsLogForms.tsx` keep their existing `DiffusePhotoRow`.

## Component: `ScanSourceButtons`

New component in `components/calendar/` (co-located with the forms).

**Purpose:** render the two source pills for a food scan and delegate the source
choice to the parent.

**Props (interface above the component):**

```ts
interface ScanSourceButtonsProps {
  onPick: (source: 'camera' | 'library') => void
  scanning?: boolean          // disables buttons + can show spinner state
  variant: 'current' | 'diffuse'
}
```

**Rendering:**

- An eyebrow/label above the buttons: *"Scan plate — auto-detects foods &
  calories"* (i18n key; reuse existing `kids_logForm_scanPlate` copy family
  where possible, add a new key only if none fits).
- Two pills: **Take Photo** (`Character name="photo"` / camera affordance,
  filled/accent) + **Gallery** (outlined). Same layout as the current
  `PregnancyMealForm` `pickRow`.
- Styling is **token-only** per the design system. The `variant` prop selects
  between `useTheme()` (current) and `useDiffuseTheme()` (diffuse) token sets;
  no hardcoded hex, radius, font, or shadow. Buttons are pills (`radius.full`).

**Dependencies:** `useTheme` / `useDiffuseTheme`, `Character`, i18n `t`. It does
**not** own image-picker logic — the parent's existing scan handler
(`scanPlate` / `pick`) is passed via `onPick`.

## Form changes

### `FeedingForm` (Kids → Solids)

Diffuse render:

- Delete the `DiffusePhotoRow` usage (L1568-1573) **as the add-photo control**.
- Delete the "SCAN PLATE" alert `Pressable` (L1576-1594).
- Insert `<ScanSourceButtons variant="diffuse" scanning={scanningPlate}
  onPick={scanPlate} />` in its place.
- Keep a **read-only thumbnail strip** for captured evidence photos (the
  `photos` array) with per-thumbnail remove — reuse the thumbnail portion of
  `DiffusePhotoRow` (i.e. render `DiffusePhotoRow` without its camera/gallery
  tiles, or a small dedicated strip). The *add* action now lives only in the two
  scan buttons.

Current-variant render (~L2020-2058): apply the same replacement with
`variant="current"`.

`scanPlate('camera' | 'library')` is unchanged — it already requests camera
permission, launches the right picker, compresses, calls `estimateFromImage`,
appends the photo to `photos` as evidence, and merges detected foods into
`foodTags`.

The manual "Add a food" text input, calorie estimate readout, and scanning
spinner all remain untouched.

### `PregnancyMealForm`

Replace the inline `pickRow` (L242-262) with
`<ScanSourceButtons variant={diffuse ? 'diffuse' : 'current'}
scanning={scanning} onPick={pick} />`. The existing `photoUri` preview (with the
scanning overlay and clear button) and `Scan again` affordance stay as they are.

## Behavior preserved

- AI scan via `estimateFromImage` runs on capture from either button.
- Captured photo retained as visual evidence.
- Detected foods auto-fill; manual text entry still available.
- Scanning spinner / disabled state during the request.
- Camera permission prompt on the camera path.

## Non-goals

- No change to the scan backend (`food-ai` edge function, `foodAi.ts`).
- No change to keepsake-photo attach in non-food forms.
- No new single-button action-sheet pattern (explicitly rejected).

## Testing / verification

- Manual: open Kids → Log Feeding → Solids; confirm a single two-button scan
  control, no duplicate tile row, no alert; Take Photo and Gallery each scan and
  populate foods + evidence thumbnail; thumbnails removable.
- Manual: open Pregnancy → Log Meal; confirm identical two-button control and
  that preview/scan-again still work.
- Both light/dark and both `current`/`diffuse` variants render with tokens only.
- `npm run typecheck` passes.
