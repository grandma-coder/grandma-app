# Vaccine Branch Tree — Design Spec
Date: 2026-04-24

## Summary

Replace the `BlockTower` chart + flat vaccine lists in `HealthDetailModal` with a vertical branch tree that displays the full vaccine schedule (Birth → 18 years) grouped by age milestone. Done milestones collapse; upcoming milestones expand with action buttons; future milestones show a count preview.

This also fixes the overlapping sticker visual glitch caused by `BlockTower`'s animated block rendering.

---

## Scope

**In scope:**
- Remove `BlockTower` from the "Recent Vaccines" section in `HealthDetailModal`
- Remove the separate "Upcoming Vaccines" flat list
- Replace both with a single "Vaccine Schedule" section rendering a vertical branch tree
- Add tap-to-expand/collapse per age milestone

**Out of scope:**
- Changes to data sources (`getNextDueVaccines`, `getScheduleForCountry`, `healthHistory.vaccines`)
- Changes to the "Set date" / "Mark given" / date picker logic — reuse as-is
- Any changes outside `HealthDetailModal` in `KidsHome.tsx`

---

## Data Model

### Age milestones

Build a static ordered list of age milestone groups from the existing schedule data returned by `getScheduleForCountry(countryCode)`. Each milestone:

```ts
interface AgeMilestone {
  key: string          // e.g. "birth", "2mo", "4mo"
  label: string        // e.g. "Birth", "2 Months", "4–6 Years"
  monthMin: number     // earliest month in range (Birth = 0)
  monthMax: number     // latest month in range
  vaccines: MilestoneVaccine[]
}

interface MilestoneVaccine {
  name: string         // e.g. "DTaP"
  doseLabel: string    // e.g. "dose 2" or ""
  dueAge: string       // human label e.g. "4 months"
  status: 'done' | 'upcoming' | 'overdue' | 'future'
  givenDate?: string   // ISO date string if done
  scheduleKey: string  // key used for scheduledVaccines map
}
```

### Deriving milestone status

- **done**: all vaccines in this milestone have `status === 'done'`
- **partial / upcoming**: at least one vaccine is `upcoming` or `overdue`
- **future**: child's age is more than 2 months before `monthMin`

A vaccine's status:
- `done` — a `healthHistory.vaccines` entry contains the vaccine name
- `overdue` — `ageMonths > monthMax + 1`
- `upcoming` — `ageMonths >= monthMin - 2` (within window)
- `future` — everything else

### Milestone status roll-up

| Condition | Milestone state |
|-----------|----------------|
| All vaccines done | `done` |
| At least one overdue | `overdue` (treated as `partial`) |
| At least one upcoming, none overdue | `partial` |
| All future | `future` |

---

## Component Design

### Location
All changes are inside `HealthDetailModal` in `components/home/KidsHome.tsx`.

### New component: `VaccineScheduleTree`

Inline function component inside the same file (not exported). Props:

```ts
interface VaccineScheduleTreeProps {
  child: ChildWithRole
  healthHistory: HealthHistoryData
  scheduledVaccines: Record<string, string>
  onSetVaccineDate: (key: string, date: string | null) => void
  onMarkVaccineGiven: (name: string, date: string, key: string) => Promise<void>
  isDark: boolean
  colors: ThemeColors
}
```

### Expand/collapse state

- `expandedMilestones: Set<string>` — local `useState`
- Default: all `done` milestones collapsed, all `partial`/`overdue` milestones expanded, `future` milestones collapsed
- Tap on any age row toggles expanded state

### Visual anatomy per milestone

**Age node circle** (40×40, border-radius 50%):
- `done` — green fill `#DFF5D6`, green border `#7EC86A`, green text
- `partial`/`overdue` — yellow fill `#FEF9DC`, yellow border `#F5D652`, amber text
- `future` — muted fill, muted border, muted text

**Collapsed state** (done or future):
- Age row + single-line summary text (e.g. "Hepatitis B · Jan 15" or "4 vaccines")
- Dashed left-border stub (`height: 6`) connecting to next node

**Expanded state**:
- Full `branch` container with dashed left border
- One `vax-row` per vaccine:
  - Check circle (done=green filled, upcoming=yellow outline, overdue=red/orange outline, future=muted outline)
  - Vaccine name + dose label
  - Date (if done) or due-age label
  - "Set date" button (if upcoming/overdue and no appointment set)
  - "Mark given" button (if appointment date is set)
  - Inline `DateTimePicker` expands below the row (reuse existing logic)

### Section header

Replace both "Recent Vaccines" and "Upcoming Vaccines" `modalSectionTitle` with a single:
```
Vaccine Schedule
```

Remove the `BlockTower` render block entirely.

---

## Behavior

### Tap to expand/collapse
- Tapping the age row calls `toggleMilestone(key)`
- `done` and `future` milestones: tap to expand (show all vaccines with dates/labels)
- `partial`/`overdue`: tap to collapse

### Set date / Mark given
Reuse the existing `expandedKey` / `pickerDate` / `DateTimePicker` pattern already in `HealthDetailModal`. The date picker expands inline below the specific vaccine row.

### Overdue highlighting
Overdue vaccine rows get an amber/red background tint (matching the existing `uv.overdue` style already in the flat list).

---

## Styling

Follow the app's cream-paper design system (light mode = `#FFFEF8` paper, `#141313` ink; dark mode uses existing `colors.*` tokens).

- Dashed connector: `borderLeft: '2px dashed'`, color `colors.border`
- Age node: `StyleSheet` with dynamic background per state
- No raw hex values — use `brand.success`, `brand.error`, `colors.border`, etc. where tokens exist; cream-paper values (`#DFF5D6`, `#FEF9DC`, `#F0EDE8`) are acceptable as local constants since they belong to the sticker-collage design system

---

## What Gets Removed

| Removed | Reason |
|---------|--------|
| `BlockTower` import from `GalleryCharts` (if unused elsewhere) | Replaced by tree |
| "Recent Vaccines" section with `BlockTower` + flat list (lines ~3265–3289) | Merged into tree |
| "Upcoming Vaccines" section flat list (lines ~3291–3385) | Merged into tree |

`BlockTower` itself in `GalleryCharts.tsx` is left in place — check if it's used anywhere else before removing.

---

## Out-of-Scope Follow-ups

- i18n for milestone labels and badge text
- Animated expand/collapse (can add later with `LayoutAnimation`)
- Country-specific schedule differences beyond US/BR already handled by `getScheduleForCountry`
