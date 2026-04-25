# Mood Graph + Bubble Cluster Redesign

**Date:** 2026-04-24  
**Status:** Approved — ready for implementation  
**Scope:** Kids mode — Mood Trends modal + Mood breakdown bubble cluster card

---

## Overview

Replace the current SVG line chart + plain circle bubbles with two updated components that match the cream-paper sticker-collage design system:

1. **Mood Trends modal** — sticker strip replacing the line chart (mood face bubbles in a horizontal row)
2. **Mood breakdown bubble cluster** — soap-bubble cluster where each bubble contains the actual `MoodFace` SVG sticker, size proportional to count

Both components use the tokens from `constants/theme.ts` (the cream-paper rollout direction) and the `MoodFace` component from `components/stickers/RewardStickers.tsx`.

---

## 1. Mood Trends Modal (`MoodTrendsModal` in `KidsHome.tsx`)

### Current behaviour
- SVG line chart with 5 horizontal grid lines and a smooth bezier curve
- `MoodFace` stickers float at chart coordinates (x = day position, y = mood score 1–5)
- Empty days render nothing
- Count chips + summary bar below

### New behaviour — Sticker Strip

Replace the SVG line chart entirely with a horizontal strip of 7 day columns.

#### Layout
```
[ Sat ]  [ Sun ]  [ Mon ]  [ Tue ]  [ Wed ]  [ Thu ]  [ Fri ]
  😐       😊       ···      😄       🙂       😊       ···
```

Each column:
- **Logged day** → `MoodFace` soap bubble (radial-gradient fill + shine crescent)
  - Bubble diameter = `BASE_SIZE + (intensityRatio * SIZE_RANGE)`
  - `BASE_SIZE = 32`, `SIZE_RANGE = 10` → range 32–42px
  - Intensity ratio: if multiple moods logged that day, use the dominant mood's share (dominant count / total that day)
  - Fill: `MOOD_FACE_COLORS[dominantMood]` from `lib/moodFace.ts`
  - Light mode: `MoodFace` with `stroke="#141313"` on pastel fill
  - Dark mode: `MoodFace` with `stroke=fill` (no harsh ink on dark background)
- **Empty day** → dashed circle, 26px, `borderStyle: 'dashed'`, `borderColor: colors.border`
- Day label below: DM Sans 8px, weight 700, uppercase, `colors.textMuted`

#### Connecting line (optional, kept for context)
- Thin SVG dashed line (strokeDasharray `"4 3"`) connecting only logged days
- Color: `--st-green` / `colors.stGreen` (the design system green sticker color `#BDD48C` light / `#C5DA98` dark)
- strokeWidth 1.5, rendered behind the bubbles as an absolute-positioned SVG overlay

#### Container
- Background: `colors.surfaceRaised` (maps to `--paper-2`)
- borderRadius: `radius.md` (20px)
- Border: `colors.border`
- Padding: 14px horizontal, 10px vertical

#### Count chips (unchanged structure, updated colors)
- `color-mix`-style: `MOOD_FACE_COLORS[mood] + '20'` background, `+ '60'` border
- 14px `MoodFace` icon + mood label + count
- borderRadius: `radius.full` (999px)

#### Summary bar (unchanged structure)
- 22px `MoodFace` + "Mostly **Happy** this period"
- Background: `MOOD_FACE_COLORS[dominantMood] + '14'`
- Border: `MOOD_FACE_COLORS[dominantMood] + '35'`
- borderRadius: `radius.md`

---

## 2. Mood Breakdown Bubble Cluster

### Location
Appears inside the Mood Trends modal (below the strip chart), replacing the `BubbleGrid` component wherever it's used for mood data in `KidsAnalytics.tsx` as well.

### Design — Soap Bubble Cluster

Each logged mood type gets one bubble. Bubbles are absolutely positioned in a fixed 200px-tall container.

#### Bubble sizing
```
minSize = 56
maxSize = 112
size = minSize + ((count / maxCount) * (maxSize - minSize))
```

#### Bubble appearance (per bubble)
- **Shape:** `borderRadius: size / 2` (perfect circle)
- **Fill:** `radial-gradient` from sticker color at 38% 30% to transparent — approximated in RN with a `LinearGradient` diagonal + opacity trick, or a solid fill at `MOOD_FACE_COLORS[mood]` at reduced opacity (`+ '40'`)
- **Border:** 1.5px solid `MOOD_FACE_COLORS[mood] + '70'`
- **Shine crescent:** absolute `View`, width=30% of bubble, height=20%, `borderRadius: 999`, `backgroundColor: rgba(255,255,255,0.5)`, `transform: rotate(-22deg)`, positioned at top 14%, left 18%
- **Shadow / glow:** `shadowColor = MOOD_FACE_COLORS[mood]`, shadowOffset `{0, 3}`, shadowOpacity 0.25, shadowRadius 8 (iOS); elevation 4 (Android)

#### Content inside bubble
- `MoodFace` SVG at `size * 0.5` (half the bubble diameter)
  - Light: `fill=MOOD_FACE_COLORS[mood]`, `stroke="#141313"`
  - Dark: `fill="transparent"` with only the face features visible, `stroke=MOOD_FACE_COLORS[mood]`
- Mood label: DM Sans 9px, weight 700, `color` = sticker color darkened (light) or sticker color directly (dark)
- Count: Fraunces 12px, weight 700, same color

#### Positioning (fixed layout — not physics-based)
Bubbles placed by index in a predetermined scatter layout (no animation engine needed):

| Index | Position |
|-------|----------|
| 0 (largest) | center-top: `left: 50%, top: 0, transform: translateX(-50%)` |
| 1 | left-mid: `left: 8, top: containerH * 0.4` |
| 2 | right-mid: `right: 8, top: containerH * 0.35` |
| 3 | bottom-center-left: `left: containerW * 0.4, bottom: 8` |
| 4 | bottom-left: `left: 4, bottom: 4` |

Sorted by count descending before layout assignment.

#### Container height
`200` — fixed, does not scroll.

---

## 3. Files Affected

| File | Change |
|------|--------|
| `components/home/KidsHome.tsx` | Replace line chart SVG in `MoodTrendsModal` with sticker strip; add bubble cluster below strip |
| `components/charts/SvgCharts.tsx` | Update `BubbleGrid` — add soap-bubble radial fill, shine crescent, `MoodFace` inside bubbles |
| `components/analytics/KidsAnalytics.tsx` | Pass mood data to updated `BubbleGrid` |

---

## 4. Data flow (unchanged)

The modal already receives `moodByDay`, `moodCounts`, `dominantMood`, `totalMoods` via props. No data layer changes needed.

For the bubble cluster: `moodCounts` (Record<string, number>) is sufficient — sort by count descending, assign layout positions by index.

---

## 5. Token mapping

| Design token | `constants/theme.ts` key | Value (light) |
|---|---|---|
| `--paper-2` | `colors.surfaceRaised` | `#231B42` → needs update to `#F7F0DF` in cream rollout; use as-is for now |
| `--line` | `colors.border` | `rgba(255,255,255,0.12)` |
| `--ink` | `colors.text` | `#FFFFFF` (dark) / `#141313` (light) |
| `--st-green` | not yet in theme — use hardcoded `#BDD48C` / `#C5DA98` for the connecting line |
| `MOOD_FACE_COLORS` | `lib/moodFace.ts` | already correct |

**Note:** `constants/theme.ts` still reflects the old neon-purple palette. This implementation uses `MOOD_FACE_COLORS` (which are already cream-paper compliant) and falls back to the existing `colors.*` keys for backgrounds and borders. A full token migration is a separate task.

---

## 6. Out of scope

- Physics-based bubble animation (Reanimated layout engine) — bubbles use fixed positions
- Light/dark theme toggle for the modal itself — existing `useThemeStore` already handles this
- Token migration of `constants/theme.ts` — separate initiative
- Mood trends for pregnancy/pre-pregnancy modes — only Kids mode for now
