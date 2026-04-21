# Affirmation Share — Design Spec

**Date:** 2026-04-21
**Owner:** Igor
**Scope:** Pregnancy home screen — Daily Affirmation card

---

## Goal

Let users share the daily affirmation to Instagram Stories, Messages, or any other destination, with 6 visually distinct "template" cards to pick from. Inspired by Strava's run-share gallery.

## Non-goals

- Server-side image generation
- Editable text or fonts (templates are fixed)
- Analytics or share-tracking in this iteration
- Applying this to other card types (scans, milestones, etc.) — could be a follow-up

---

## User Flow

1. User reveals the daily affirmation on the pregnancy home screen (existing flow).
2. A **"Share"** button appears below the affirmation text.
3. Tapping the button opens a full-height modal sheet with:
   - Header: close button (left), phrase preview (center), `Share…` button (right — opens native share sheet).
   - Instruction line: `Tap to copy · Hold to save`.
   - 2-column scrollable grid of 6 visual template cards, each rendering the same phrase with different background, stickers, and typography.
4. **Tap a template** → image captured as PNG → copied to clipboard → toast "Copied! Paste into your Story".
5. **Long-press a template (600 ms)** → request Photos permission (first time) → save PNG to camera roll → toast "Saved to Photos".
6. **Tap `Share…`** → capture template #1 → native share sheet opens with image attached.
7. **Tap X or swipe down** → modal dismisses.

---

## Architecture

### New files

- `components/home/pregnancy/AffirmationShareModal.tsx` — the modal, its header, grid, and tile renderer.
- `components/home/pregnancy/affirmationTemplates.tsx` — the 6 template components (one exported component per template, plus a `templates` array with metadata).

### Modified files

- `components/home/pregnancy/AffirmationRevealCard.tsx` — add "Share" button in revealed state, wire it to open `AffirmationShareModal`.

### Dependencies added

- `react-native-view-shot` — captures a React Native `View` as a PNG. Used inside each tile wrapper.
- `expo-media-library` — saves PNGs to the camera roll (long-press).
- `expo-sharing` — cross-platform native share sheet that supports file URIs (React Native's built-in `Share` API does not share files on Android).

Already installed and reused:
- `expo-clipboard` — image and text clipboard.
- `expo-file-system` — writes PNG to cache directory before sharing.

### Data flow

```
AffirmationRevealCard (revealed state)
   └─ <Share> button → setShareOpen(true)
         └─ <AffirmationShareModal phrase={text} />
               ├─ templates.map(t => <TemplateTile phrase={phrase} Template={t.Component} />)
               │     ├─ onPress        → captureRef(viewRef) → Clipboard.setImageAsync(base64) → toast
               │     └─ onLongPress    → MediaLibrary.saveToLibraryAsync(uri) → toast
               └─ "Share…" header btn → captureRef(first tile) → Share.share({ url }) → native sheet
```

No new Zustand store, no Supabase changes, no migrations. All presentation + local side-effects.

---

## Templates (6)

Each template is a React component that accepts `{ phrase: string }` and renders a ~1080×1350 (4:5) virtual canvas. At capture time it's rendered at device scale × 2 for crispness. All include a subtle `grandma.app` watermark at bottom (12 px, 40% opacity).

| # | Name | Background | Stickers | Typography |
|---|------|------------|----------|------------|
| 1 | Cream Paper | `#FFFEF8` cream | `Heart` pinkSoft, bottom-right, size 220 | Fraunces italic, charcoal, centered, ~48 px |
| 2 | Lilac Dream | `#E3D8F2` lilacSoft | `Burst` yellow top-left (140) + `Moon` lilac bottom-right (180) | Fraunces regular, lowercase, charcoal, centered, ~46 px |
| 3 | Peach Sunset | `#F5B896` peach | Large `Burst` yellow (520) behind text, 25% opacity | Cabinet Grotesk Black, UPPERCASE, cream `#FFFEF8`, centered, ~56 px |
| 4 | Lime Punch | `#BDD48C` green | `Flower` pink (160) top-right + `Star` yellow (90) scattered | DM Sans Bold, mixed case, charcoal, left-aligned, ~48 px |
| 5 | Midnight Poem | `#2A2624` charcoal | `Star` yellow (80) top + `Moon` lilac (160) bottom-right | Fraunces italic, cream, poem line-breaks (split on ` and `, commas), centered, ~44 px |
| 6 | Pink Blush | `#F2B2C7` pink | 3× `Heart` cluster: (lilac 140, top-left), (yellowSoft 90, top-right), (pinkSoft 180, bottom-center) | Fraunces regular, charcoal, centered, ~46 px. Appends `— xo, Grandma` below |

Poem line-break heuristic (template #5 only): split phrase on ` and `, ` but `, or the first comma. If none match, split on the space closest to the midpoint. Fallback: keep as one line.

### Templates source of truth

```ts
// components/home/pregnancy/affirmationTemplates.tsx
export interface TemplateProps { phrase: string }
export interface TemplateMeta {
  id: string
  name: string
  Component: React.FC<TemplateProps>
}

export const affirmationTemplates: TemplateMeta[] = [
  { id: 'cream',    name: 'Cream Paper',     Component: CreamPaperTemplate },
  { id: 'lilac',    name: 'Lilac Dream',     Component: LilacDreamTemplate },
  { id: 'peach',    name: 'Peach Sunset',    Component: PeachSunsetTemplate },
  { id: 'lime',     name: 'Lime Punch',      Component: LimePunchTemplate },
  { id: 'midnight', name: 'Midnight Poem',   Component: MidnightPoemTemplate },
  { id: 'blush',    name: 'Pink Blush',      Component: PinkBlushTemplate },
]
```

---

## AffirmationShareModal

### Props

```ts
interface Props {
  visible: boolean
  phrase: string
  onClose: () => void
}
```

### Behavior

- Renders `<Modal presentationStyle="pageSheet" animationType="slide">`.
- Background: `#0E0B1A` (dark, matches app's pregnancy-mode dark surface).
- Each tile is wrapped in a `ViewShot` ref wrapper so it can be captured independently.
- Grid: `FlatList` with `numColumns={2}`, column gap 12 px. Tile width is `(screenWidth - 16 - 16 - 12) / 2` (outer padding 16 each side, 12 between columns). Tile height is tile width × 5/4 (4:5 aspect).
- Canvas sizing: each template renders at a fixed internal canvas of **1080 × 1350 px** (logical pixels) regardless of tile size. The tile wrapper applies `transform: [{ scale: tileWidth / 1080 }]` with `overflow: 'hidden'` so the preview exactly matches the captured image. `captureRef` is called on the un-scaled 1080×1350 canvas ref, producing a full-resolution PNG — the `scale` prop for view-shot stays at device default.
- Toast: reuses the `SavedToast` pattern from `components/ui/SavedToast.tsx` (blurred pill, center-screen).

### Capture + copy

```ts
const uri = await captureRef(ref, { format: 'png', quality: 0.95, result: 'base64' })
await Clipboard.setImageAsync(uri)
showToast('Copied! Paste into your Story')
```

### Capture + save

```ts
const { status } = await MediaLibrary.requestPermissionsAsync()
if (status !== 'granted') { showToast('Enable Photos access in Settings'); return }
const uri = await captureRef(ref, { format: 'png', quality: 0.95 })
await MediaLibrary.saveToLibraryAsync(uri)
showToast('Saved to Photos')
```

### Native share sheet

```ts
const uri = await captureRef(firstTileRef, { format: 'png', quality: 0.95 })
const isAvailable = await Sharing.isAvailableAsync()
if (!isAvailable) { showToast('Sharing unavailable'); return }
await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share affirmation' })
```

---

## Entry point — AffirmationRevealCard changes

Add a "Share" button inside the `revealedState` Animated.View, below the `Come back tomorrow…` line. Button style:

- `Pressable`, `alignSelf: 'flex-start'`
- Background: `stickers.lilacSoft`
- Padding: 9 vertical, 18 horizontal
- Border radius: 999
- Text: DM Sans SemiBold, 13 px, charcoal: `Share ↗`

On press, opens a local `useState` that controls `<AffirmationShareModal visible phrase={text ?? ''} onClose={() => setOpen(false)} />`.

---

## Error handling

| Scenario | Behavior |
|----------|----------|
| view-shot fails | Toast "Couldn't create image. Try again." |
| Clipboard fails | Toast "Copy failed" |
| Photos permission denied | Toast "Enable Photos access in Settings" |
| Phrase is empty/null | Share button does not render |

No remote calls, no retries.

---

## Performance

- Tiles render once when the modal opens; view-shot is lazy per interaction (not on mount).
- Scale-down preview uses CSS transforms, not reflow — no re-layout cost.
- PNG capture at 2× device scale, quality 0.95. Typical output: ~150–300 KB.
- Modal uses `FlatList` for the grid, though 6 items do not require virtualization.

---

## Testing plan

Manual (on a real iOS device, since clipboard image + IG Story paste cannot be tested in simulator):

1. Reveal affirmation on pregnancy home. Tap "Share ↗" → modal opens.
2. Tap each of the 6 tiles → toast appears → open Instagram → new Story → paste → image renders correctly, watermark visible, no clipping.
3. Long-press a tile → permission prompt (first time) → grant → open Photos → image present.
4. Deny permission once → long-press again → toast explains Settings path.
5. Tap "Share…" header → native sheet opens → share to Messages → image delivered.
6. Tap X → modal closes. Swipe down → modal closes.
7. Repeat on Android (tap-copy works; long-press save works; IG Story paste behavior is platform-dependent — confirm flow).

No unit tests. If the poem line-break heuristic (template #5) becomes non-trivial, add a pure-function test then.

---

## YAGNI / explicitly deferred

- Custom text input / editing inside the modal.
- Saving favorite template.
- Sharing from other cards (vitals, milestones, scans).
- Analytics tracking which template is most shared.
- Animated / video export.
- Per-tile Share button (users use the header Share… button instead).
