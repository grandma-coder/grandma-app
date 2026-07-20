# Finish Character-Blob Icon Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert every remaining live Diffuse/always-on *semantic* icon (Lucide or legacy sticker) to a `<Character>` blob, and draw the 11 new blob concepts that recurring surfaces need.

**Architecture:** All new SVG art lands in `components/characters/Characters.tsx` (the single blob asset file). Call sites swap their Lucide/legacy render for `<Character name=... size color bg />`, reusing the size/colour the surrounding Diffuse branch already computes. Only Diffuse-path or unconditional renders change; `!diffuse` legacy twins are left untouched. Chrome icons (arrows, chevrons, X, plus, edit, etc.) stay Lucide.

**Tech Stack:** React Native 0.81, `react-native-svg`, TypeScript strict, Expo Router. Blobs are pure SVG (`Svg`/`Path`/`Circle`/`Ellipse`). No data/store/migration changes.

## Global Constraints

- **Design system is canonical.** Import tokens from `constants/theme.ts`. Raw hex allowed **only** inside `Characters.tsx` SVG path/eye/face strings (it is the asset file). Every call-site edit uses `dt.colors.*` / `diffuseGlyphColor()` / the value the local Diffuse branch already computes — never a new raw hex.
- **Scope = Diffuse + always-on only.** Never edit a `!diffuse` / `CurrentXxx` / legacy branch or dead code. If a Lucide render is inside an `if (diffuse)` block or an unconditional element, it's in scope; if it's the `else`/`!diffuse` twin, leave it.
- **Chrome stays Lucide:** ArrowLeft/Right, Chevron*, X, Plus, Minus, Check/CheckCheck, Pencil/Edit/Edit2, Trash/Trash2, Share, Settings/gear, Search, MoreHorizontal, SlidersHorizontal, Info, Mail/Lock/Eye/KeyRound/LogOut (auth), Globe, Lock (locked-state). Do not convert these.
- **Blob conventions (Characters.tsx):** 48×48 viewBox; add to `CharacterName` union, `HUE`, `D`, `FACE`. Creatures/subjects get eyes (`dots`/`smile`/`sleepy`); objects are `none` or a paper-colour cut-out (`bg`). Verify each new blob reads at ~16–24px before wiring.
- **Verify loop (token budget):** draw blobs one/a-few at a time, render **downscaled** (≤~200px PNG) via qlmanage or Chrome-headless, eyeball, fix, checkpoint into `Characters.tsx`. NO parallel agent fan-out. NO full-res renders.
- **Typecheck:** `npm run typecheck`. A pre-existing `KidsWallet.tsx` failure (grandma-coder WIP referencing non-existent concepts + `stickers.coralSoft`) may exist — if so, do NOT fix their WIP; verify your touched files are green via `npx tsc --noEmit` output filtered to the files you changed, and note the pre-existing failure.
- **Commit per task.** Conventional-commit style, matching repo history (`feat(...)`, `fix(...)`).

---

## File Structure

**Created:** none (all art in the existing `Characters.tsx`).

**Modified — art:**
- `components/characters/Characters.tsx` — +11 concepts (union, HUE, D, FACE, new FaceKind cut-outs, ALIAS entries).

**Modified — cycle root cause:**
- `components/home/cycle/dayStickers.tsx` — add a phase→Character helper (keep legacy `DaySticker` for `!diffuse`).
- `components/home/cycle/CycleJourneyRingFull.tsx` — Diffuse wheel glyph (line ~617) uses the helper.
- `components/calendar/CyclePhaseGlyph.tsx` — Diffuse variant uses the helper.
- `components/calendar/CycleMonthGrid.tsx` — Diffuse day markers + legend pass the Diffuse flag.

**Modified — call sites (quick-swaps):** InsightsScreen, leaderboard, daily-rewards, profile/settings, profile/health-history, profile/care-circle, profile/memories, profile/emergency-insurance, profile/kids, channel/info/[id], connections/ChannelsScreen, garage/profile, KidsHome, KidsLogForms, KidsCalendar, KidsAnalytics, exams/[id], exams/ExamForm, TodayDashboardModal, PregnancyLogForms, PregnancyMealForm, PregnancyCalendar, calendar/AppointmentDetailModal, PregnancyAnalytics, birth-plan, BirthDetailModal.

**Convention for every quick-swap step below:** the plan gives the **Lucide symbol** and the **enclosing Diffuse context** (line numbers drift — grep the symbol in the file, confirm it's in the Diffuse/unconditional path, then swap). Replacement is always:
```tsx
<Character name="<concept>" size={<same size as the icon it replaces>} color={<the colour the branch already computes, e.g. dt.colors.ink3>} bg={<paper colour if the blob has a cut-out, else omit>} />
```
Import: `import { Character } from '<relative>/components/characters/Characters'` (many files already import it — check first).

---

## Task 1: Draw the 11 new blob concepts

**Files:**
- Modify: `components/characters/Characters.tsx`

**Interfaces:**
- Produces: 11 new `CharacterName` values — `'chat' | 'book' | 'chart' | 'scan' | 'person' | 'trending' | 'marketplace' | 'channel' | 'skip' | 'poll' | 'empty'` — each renderable via `<Character name=... size color bg />`. New `ALIAS` entries: `MessageCircle`/`MessageSquare`→`chat`, `BookOpen`→`book`, `BarChart3`/`ChartBar`→`chart`, `ScanLine`→`scan`, `User`→`person`, `ShoppingBag`→`marketplace`, `Hash`→`channel`, `SkipForward`→`skip`.

- [ ] **Step 1: Add the 11 names to the `CharacterName` union**

In `Characters.tsx`, extend the union (add a new comment group):
```tsx
  // insights & content
  | 'calendar' | 'selfcare'
  // communication · commerce · misc (migration finish)
  | 'chat' | 'book' | 'chart' | 'scan' | 'person'
  | 'trending' | 'marketplace' | 'channel' | 'skip' | 'poll' | 'empty'
```

- [ ] **Step 2: Add default hues to `HUE`**

Append to the `HUE` record (pick from the existing deepened palette; these read on paper):
```tsx
  chat: '#7A9D4A', book: '#5F8FC1', chart: '#8E72C9', scan: '#5F8FC1', person: '#D98CA6',
  trending: '#D86A4F', marketplace: '#E08A5A', channel: '#7A9D4A', skip: '#8E72C9', poll: '#C9A02C', empty: '#8E72C9',
```

- [ ] **Step 3: Add silhouette paths to `D` (first draft)**

Append to the `D` record. First-draft 48×48 paths (refined in Step 5):
```tsx
  chat: 'M10 10h28a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H22l-9 7 2-7h-1a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4Z',
  book: 'M8 10c5-3 11-3 16 0 5-3 11-3 16 0v26c-5-3-11-3-16 0-5-3-11-3-16 0V10Z',
  chart: 'M8 10a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V10Z',
  scan: 'M10 6a4 4 0 0 0-4 4v6h4v-6h6V6h-6ZM32 6v4h6v6h4v-6a4 4 0 0 0-4-4h-6ZM6 32v6a4 4 0 0 0 4 4h6v-4h-6v-6H6ZM38 32v6h-6v4h6a4 4 0 0 0 4-4v-6h-4Z',
  person: 'M24 8a8 8 0 1 1 0 16 8 8 0 0 1 0-16ZM10 42c0-8 6-14 14-14s14 6 14 14Z',
  trending: 'M8 34a4 4 0 0 0 4 4h24a4 4 0 0 0 4-4V14a4 4 0 0 0-4-4H12a4 4 0 0 0-4 4v20Z',
  marketplace: 'M12 16h24l2 22a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2ZM17 16a7 7 0 0 1 14 0',
  channel: 'M24 6a18 18 0 1 1 0 36 18 18 0 0 1 0-36Z',
  skip: 'M10 12l14 10-14 10V12ZM28 12l12 10-12 10V12Z',
  poll: 'M10 8a4 4 0 0 0-4 4v24a4 4 0 0 0 4 4h28a4 4 0 0 0 4-4V12a4 4 0 0 0-4-4H10Z',
  empty: 'M24 6a18 18 0 1 1 0 36 18 18 0 0 1 0-36Z',
```

- [ ] **Step 4: Add `FACE` entries + any new FaceKind cut-outs**

Add to the `FaceKind` type new kinds: `'chatDots' | 'bookSpine' | 'bars' | 'scanLine' | 'trendArrow' | 'tagHole' | 'hash' | 'skipBars' | 'pollBars' | 'emptyDash'`. Add to `FACE`:
```tsx
  chat: { kind: 'chatDots', e: [0,0,0,0] },
  book: { kind: 'bookSpine', e: [0,0,0,0] },
  chart: { kind: 'bars', e: [0,0,0,0] },
  scan: { kind: 'scanLine', e: [0,0,0,0] },
  person: { kind: 'none', e: [0,0,0,0] },
  trending: { kind: 'trendArrow', e: [0,0,0,0] },
  marketplace: { kind: 'tagHole', e: [0,0,0,0] },
  channel: { kind: 'hash', e: [0,0,0,0] },
  skip: { kind: 'none', e: [0,0,0,0] },
  poll: { kind: 'pollBars', e: [0,0,0,0] },
  empty: { kind: 'emptyDash', e: [0,0,0,0] },
```
Then add render clauses in the `Character` component body (paper-colour `bg` cut-outs, matching the existing `pulse`/`bars` style):
```tsx
      {f.kind === 'chatDots' && (
        <><Circle cx={18} cy={22} r={2.2} fill={bg} /><Circle cx={24} cy={22} r={2.2} fill={bg} /><Circle cx={30} cy={22} r={2.2} fill={bg} /></>
      )}
      {f.kind === 'bookSpine' && (
        <Path d="M24 9v29" stroke={bg} strokeWidth={2} fill="none" strokeLinecap="round" />
      )}
      {f.kind === 'bars' && (
        <><Path d="M15 32V22M24 32V15M33 32v-6" stroke={bg} strokeWidth={3} fill="none" strokeLinecap="round" /></>
      )}
      {f.kind === 'scanLine' && (
        <Path d="M12 24h24" stroke={bg} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      )}
      {f.kind === 'trendArrow' && (
        <Path d="M14 30l7-7 5 5 8-9M32 17h4v4" stroke={bg} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {f.kind === 'tagHole' && (
        <Circle cx={24} cy={12} r={2.4} fill="none" stroke={bg} strokeWidth={2} />
      )}
      {f.kind === 'hash' && (
        <Path d="M19 15l-2 18M31 15l-2 18M15 22h18M14 30h18" stroke={bg} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      )}
      {f.kind === 'pollBars' && (
        <Path d="M15 32h6M15 24h14M15 16h10" stroke={bg} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      )}
      {f.kind === 'emptyDash' && (
        <Path d="M17 24h14" stroke={bg} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeDasharray="3 3" />
      )}
```
`skip` and `person` use silhouette-only (skip = two triangles in D; person = head+body in D), so `none`.

- [ ] **Step 5: Verify each blob at badge size (downscaled render loop)**

Render the 11 new blobs small and eyeball them. Cheapest path — a tiny standalone HTML harness rendered headless:

Run (adjust chrome path if needed):
```bash
cat > /tmp/blobcheck.html <<'HTML'
<!doctype html><meta charset=utf8><body style="background:#F4F1E8;display:flex;gap:8px;flex-wrap:wrap;padding:12px">
<!-- paste each D path into a 24px and 16px <svg viewBox="0 0 48 48"> with fill + the cut-out -->
HTML
# then, ONE small screenshot:
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --screenshot=/tmp/blobcheck.png --window-size=420,200 --force-device-scale-factor=1 file:///tmp/blobcheck.html 2>/dev/null
sips -Z 200 /tmp/blobcheck.png >/dev/null   # downscale before viewing
```
Expected: read `/tmp/blobcheck.png` (downscaled). Each glyph should be distinguishable at 16px. If `poll` looks like `chart`, fold `poll`→`chart` (remove `poll` from union/HUE/D/FACE, add `poll`/`BarChart3`(poll ctx) alias→`chart`) and note the deviation. Iterate paths in Step 3/4 until they read; keep renders small and few.

- [ ] **Step 6: Add ALIAS entries**

Append to `ALIAS`:
```tsx
  // communication · commerce · misc
  MessageCircle: 'chat', MessageSquare: 'chat', Chat: 'chat',
  BookOpen: 'book', Book: 'book',
  BarChart3: 'chart', ChartBar: 'chart', BarChart: 'chart',
  ScanLine: 'scan', Scan: 'scan',
  User: 'person', UserIcon: 'person',
  ShoppingBag: 'marketplace',
  Hash: 'channel',
  SkipForward: 'skip',
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -i "Characters.tsx" || echo "Characters.tsx clean"`
Expected: `Characters.tsx clean`.

- [ ] **Step 8: Commit**

```bash
git add components/characters/Characters.tsx
git commit -m "feat(characters): add chat/book/chart/scan/person/trending/marketplace/channel/skip/poll/empty blobs"
```

---

## Task 2: Inconsistency fixes (cheapest, highest-confidence)

**Files:**
- Modify: `components/insights/InsightsScreen.tsx` (ArticleCard + InsightCard list items)
- Modify: `app/leaderboard.tsx` (reactions row)
- Modify: `components/home/KidsHome.tsx` (reminder Bell sites)
- Modify: `app/profile/settings.tsx` (weight-unit row)

**Interfaces:**
- Consumes: `Character` + concepts from Task 1 and existing concepts.

- [ ] **Step 1: InsightsScreen ArticleCard list item**

Grep `meta.icon` in `InsightsScreen.tsx`. The ArticleCard list item (~line 1513) renders `<Icon>` where the detail modal (~1572) already does `diffuse ? <Character name={meta.char}> : <Icon>`. Make the list item match: render `<Character name={meta.char} size={...} color={...} />` on the Diffuse path (mirror the modal's exact branch).

- [ ] **Step 2: InsightsScreen InsightCard list item**

Grep `config.icon`. The InsightCard list item (~1628) renders `<Icon>` where HistoryCard (~1687) + detail modal (~1752) branch to `<Character name={config.char}>`. Wire the list item to `config.char` the same way.

- [ ] **Step 3: Leaderboard reactions row**

Grep `reactions` near the LeaderRow stat chips (~line 866). It renders `<Heart>` (Lucide) while the profile-sheet reactions tile (~1283) uses `<Character name="heart">`. Swap the row's `<Heart>` to `<Character name="heart" size={...} color={...} />` (match the tile).

- [ ] **Step 4: KidsHome reminder bells**

Grep `Bell` in `KidsHome.tsx`. Line ~2577 uses `<Character name="bell">`; the other Diffuse-branch bells (~2266, ~2520, ~8302, and the reminder-time chip ~2370) still use `<Bell>`. Swap each Diffuse-path `<Bell>` to `<Character name="bell" size={...} color={dt.colors.ink3} />` matching line 2577.

- [ ] **Step 5: profile/settings weight-unit row**

Grep `Scale` in `app/profile/settings.tsx` (~line 266). The temperature-unit row above (~251) uses `<Character name="temperature">`. Swap the weight row's `<Scale>` to `<Character name="growth" size={...} color={...} />` matching it.

- [ ] **Step 6: Typecheck + commit**

```bash
npx tsc --noEmit 2>&1 | grep -iE "InsightsScreen|leaderboard|KidsHome|profile/settings" || echo "touched files clean"
git add components/insights/InsightsScreen.tsx app/leaderboard.tsx components/home/KidsHome.tsx app/profile/settings.tsx
git commit -m "fix(icons): blob-swap same-file inconsistency stragglers (insights/leaderboard/kids/settings)"
```

---

## Task 3: Cycle phase ring + month grid → blobs

**Files:**
- Modify: `components/home/cycle/dayStickers.tsx`
- Modify: `components/home/cycle/CycleJourneyRingFull.tsx:~617`
- Modify: `components/calendar/CyclePhaseGlyph.tsx`
- Modify: `components/calendar/CycleMonthGrid.tsx:~189,~203`

**Interfaces:**
- Produces: `export function DayCharacter({ phase, size, color, bg }: { phase: CyclePhase; size: number; color: string; bg?: string })` in `dayStickers.tsx` — renders `<Character>` for the phase using the analytics mapping (menstruation→`period`, follicular→`sparkle`, ovulation→`ovulation`, luteal→`night`). Legacy `DaySticker` stays for `!diffuse`.

- [ ] **Step 1: Add `DayCharacter` + phase map to `dayStickers.tsx`**

Add (keep `DaySticker` unchanged):
```tsx
import { Character, type CharacterName } from '../../characters/Characters'

const PHASE_CHARACTER: Record<CyclePhase, CharacterName> = {
  menstruation: 'period',
  follicular: 'sparkle',
  ovulation: 'ovulation',
  luteal: 'night',
}

/** Diffuse per-day phase glyph — Character blob (matches CycleAnalytics). */
export function DayCharacter({ phase, size, color, bg }: { phase: CyclePhase; size: number; color: string; bg?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Character name={PHASE_CHARACTER[phase]} size={size} color={color} bg={bg} />
    </View>
  )
}
```

- [ ] **Step 2: Ring wheel Diffuse glyph uses `DayCharacter`**

In `CycleJourneyRingFull.tsx`, the Diffuse branch (`if (diffuse)` ~line 587) renders `<DaySticker phase={d.phase} size={glyphSize} bg={diffuseGlyphColor(d.phase, dt.isDark)} />` at ~617. Replace **only that Diffuse-branch render** with:
```tsx
<DayCharacter phase={d.phase} size={glyphSize} color={diffuseGlyphColor(d.phase, dt.isDark)} bg={dt.colors.surface} />
```
Update the import: `import { DaySticker, DayCharacter } from './dayStickers'`. Leave the `!diffuse` `<DaySticker>` at ~641 untouched.

- [ ] **Step 3: `CyclePhaseGlyph` gains a diffuse variant**

Edit `CyclePhaseGlyph.tsx` to route by an explicit flag (default legacy so no unexpected change):
```tsx
import { DaySticker } from '../home/cycle/dayStickers'
import { DayCharacter } from '../home/cycle/dayStickers'
// ...
export function CyclePhaseGlyph({ phase, color, size = 11, diffuse = false, bg }: Props & { diffuse?: boolean; bg?: string }) {
  if (diffuse) return <DayCharacter phase={phase} size={size} color={color} bg={bg} />
  return <DaySticker phase={phase} size={size} bg={color} />
}
```
Add `diffuse?: boolean; bg?: string` to `Props`.

- [ ] **Step 4: `CycleMonthGrid` passes the diffuse flag**

Grep `CyclePhaseGlyph` in `CycleMonthGrid.tsx` (~189 day markers, ~203 legend, both inside `if (diffuse)`). Add `diffuse bg={<the surface/paper colour used in the grid, e.g. dt.colors.surface>}` to those two Diffuse-path call sites. Leave the `!diffuse` `DaySticker` (~277) untouched.

- [ ] **Step 5: Verify + typecheck + commit**

Run: `npx tsc --noEmit 2>&1 | grep -iE "dayStickers|CycleJourneyRingFull|CyclePhaseGlyph|CycleMonthGrid" || echo "cycle files clean"`
Expected: clean.
```bash
git add components/home/cycle/dayStickers.tsx components/home/cycle/CycleJourneyRingFull.tsx components/calendar/CyclePhaseGlyph.tsx components/calendar/CycleMonthGrid.tsx
git commit -m "feat(cycle): blob phase glyphs on Diffuse ring + month grid (period/sparkle/ovulation/night)"
```

---

## Task 4: Pregnancy stragglers

**Files:**
- Modify: `components/home/pregnancy/TodayDashboardModal.tsx`
- Modify: `components/calendar/PregnancyLogForms.tsx`
- Modify: `components/calendar/PregnancyMealForm.tsx`
- Modify: `components/calendar/PregnancyCalendar.tsx`
- Modify: `components/calendar/AppointmentDetailModal.tsx`
- Modify: `components/analytics/PregnancyAnalytics.tsx`
- Modify: `app/birth-plan.tsx`
- Modify: `components/pregnancy/BirthDetailModal.tsx`

**Interfaces:**
- Consumes: `Character`, concepts `water/sleep/nutrition/activity/kick/growth/photo/checkup/exam/calendar/heart/baby/sparkle/note`, and new `scan/chat/book`.

- [ ] **Step 1: TodayDashboardModal metric tiles**

Grep the `diffuse ?` metric tiles (~lines 170–296). Swap each Diffuse-branch legacy line to the blob (mood tile already `<Character name="mood">`):
- `DropletLine` (water, ~170, ~296) → `water`
- `MoonLine` (sleep, ~188) → `sleep`
- `UtensilsLine` (nutrition, ~211) → `nutrition`
- `ActivityLine` (exercise, ~231) → `activity`
- `FootprintsLine` (kicks, ~245) → `kick`
- `ScaleLine` (weight, ~258, ~277) → `growth`

Each: `<Character name="<concept>" size={...} color={...} />` reusing the tile's existing size/colour.

- [ ] **Step 2: PregnancyLogForms kick tap target**

Grep `Hand` in `PregnancyLogForms.tsx` (~799, unconditional `diffuse ? dInk : ink`). Swap `<Hand>` → `<Character name="kick" size={...} color={diffuse ? dInk : ink} />` (or gate to keep `!diffuse` legacy if the surrounding element is un-branched — match the local pattern; if unconditional, blob is fine both ways since kick is a shared concept).

- [ ] **Step 3: PregnancyMealForm camera/scan**

Grep in `PregnancyMealForm.tsx`: `Camera` (~248) → `photo`; `ImagePlus` (~257) → `photo`; `ScanLine` (~274, ~294) → `scan`. Each on its diffuse-aware button, reuse existing size/colour (`dAccent` etc.).

- [ ] **Step 4: PregnancyCalendar three sites**

In `PregnancyCalendar.tsx`:
- Routine-list row icon (~897, inside `if (diffuse)`): it renders `LOG_META[type].icon`. Resolve via the existing `DIFFUSE_LOG_CHARACTER[type]` like the detail modal does — `<Character name={DIFFUSE_LOG_CHARACTER[type] ?? 'note'} size={...} color={...} />`. For routine-only types `nesting`/`birth_prep` with no map entry, add them to `DIFFUSE_LOG_CHARACTER` (`nesting`→`soothe`, `birth_prep`→`note`) or fall back to `note`.
- Sheet-header hero `Calendar` (~764, `diffuse ?` bloom) → `calendar`.
- Upload-exam `Camera` (~2808, unconditional) → `photo`.

- [ ] **Step 5: AppointmentDetailModal (cream, no Diffuse branch)**

`components/calendar/AppointmentDetailModal.tsx` ~143 renders `<Stethoscope>` unconditionally (shown to Diffuse users). Per spec decision, swap unconditionally to `<Character name="checkup" size={...} color={...} />` (no new Diffuse branch needed).

- [ ] **Step 6: PregnancyAnalytics exams button**

Grep `FlaskConical` in `PregnancyAnalytics.tsx` (~387, inside the `diffuse` header branch). Swap → `<Character name="exam" size={...} color={...} />`. Leave the cream twin (~413) untouched.

- [ ] **Step 7: birth-plan hero + categories**

In `app/birth-plan.tsx` (all inside `diffuse ?` blooms):
- hero `ClipboardList` (~117) → `note` (reuse; not a new blob).
- category `HeartIcon` (~190) → `heart`; `Baby` (~192) → `baby`; `Sparkles` (~194) → `sparkle`.

- [ ] **Step 8: BirthDetailModal Diffuse CTAs**

In `components/pregnancy/BirthDetailModal.tsx`: Diffuse `MessageCircle` (~175) → `chat`; Diffuse `BookOpen` (~669) → `book`. Leave cream twins (~328, ~712) untouched.

- [ ] **Step 9: Typecheck + commit**

```bash
npx tsc --noEmit 2>&1 | grep -iE "TodayDashboardModal|PregnancyLogForms|PregnancyMealForm|PregnancyCalendar|AppointmentDetailModal|PregnancyAnalytics|birth-plan|BirthDetailModal" || echo "pregnancy files clean"
git add components/home/pregnancy/TodayDashboardModal.tsx components/calendar/PregnancyLogForms.tsx components/calendar/PregnancyMealForm.tsx components/calendar/PregnancyCalendar.tsx components/calendar/AppointmentDetailModal.tsx components/analytics/PregnancyAnalytics.tsx app/birth-plan.tsx components/pregnancy/BirthDetailModal.tsx
git commit -m "feat(pregnancy): blob-swap Diffuse stragglers (today dashboard, meal scan, birth plan, appointment)"
```

---

## Task 5: Kids quick-swaps

**Files:**
- Modify: `components/calendar/KidsLogForms.tsx`
- Modify: `components/calendar/KidsCalendar.tsx`
- Modify: `components/home/KidsHome.tsx`
- Modify: `components/analytics/KidsAnalytics.tsx`
- Modify: `app/exams/[id].tsx`
- Modify: `components/exams/ExamForm.tsx`
- Modify: `app/profile/kids.tsx`

**Interfaces:**
- Consumes: `Character`, concepts `sleep/activity/nutrition/baby/sparkle/calendar/celebrate/warning/tip/growth/checkup/exam/person`, and new `skip/empty`.

- [ ] **Step 1: KidsLogForms banners (Diffuse branches)**

Grep in `KidsLogForms.tsx` (all inside `if (diffuse)` blocks): `Moon` (~2640 sleep, ~3878/~3908 nap) → `sleep`; `Dumbbell` (~3355) → `activity`; `Utensils` (~1637) → `nutrition`; `Baby` (~1719) → `baby`; `Sparkles` (~1580) → `sparkle`. Reuse each site's size/colour.

- [ ] **Step 2: KidsCalendar kid-picker + empties**

Grep in `KidsCalendar.tsx` (Diffuse blocks): `Baby` (~2954, ~2964 kid picker) → `baby`; `Calendar` (~2370 empty day) → `calendar`; `Sparkles` (~4639 day-complete) → `celebrate`.

- [ ] **Step 3: KidsHome allergy + leap + insight accents**

Grep in `KidsHome.tsx` (Diffuse-coloured, `dCol.ink3`): `AlertCircle` (~5605 allergy) → `warning`; `Calendar` (~9224 leap tile) → `calendar`; `Sparkles` (~6116, ~6372, ~6746, ~7631, ~7692 insight/suggestion accents) → `sparkle`.

- [ ] **Step 4: KidsAnalytics tip + skip + empty + growth**

Grep in `KidsAnalytics.tsx` (Diffuse blocks): `Lightbulb` (~2077) → `tip`; `Sparkles` (~2307 confirm) → `sparkle`; `SkipForward` (~2485 routine skip) → `skip`; `FileQuestion` (~934 no-data) → `empty`; `TrendingUp` (~4162 growth prompt) → `growth`.

- [ ] **Step 5: exams/[id] + ExamForm + profile/kids**

- `app/exams/[id].tsx`: `Sparkles` (~228, Diffuse bloom) → `sparkle`; `CalendarIcon` (~173 meta chip) → `calendar`; `User` (~175 provider) → `person`.
- `components/exams/ExamForm.tsx`: `Sparkles` (~309, Diffuse bloom) → `sparkle`. Leave cream twin (~316).
- `app/profile/kids.tsx`: `Stethoscope` (~396 pediatrician) → `checkup`.

- [ ] **Step 6: Typecheck + commit**

```bash
npx tsc --noEmit 2>&1 | grep -iE "KidsLogForms|KidsCalendar|KidsHome|KidsAnalytics|exams/\[id\]|ExamForm|profile/kids" || echo "kids files clean"
git add components/calendar/KidsLogForms.tsx components/calendar/KidsCalendar.tsx components/home/KidsHome.tsx components/analytics/KidsAnalytics.tsx app/exams/\[id\].tsx components/exams/ExamForm.tsx app/profile/kids.tsx
git commit -m "feat(kids): blob-swap Diffuse stragglers (log forms, calendar, home accents, analytics, exams)"
```

---

## Task 6: Shared quick-swaps

**Files:**
- Modify: `app/leaderboard.tsx`
- Modify: `app/daily-rewards.tsx`
- Modify: `components/insights/InsightsScreen.tsx`
- Modify: `app/channel/info/[id].tsx`
- Modify: `components/connections/ChannelsScreen.tsx`
- Modify: `app/garage/profile.tsx`
- Modify: `app/profile/health-history.tsx`
- Modify: `app/profile/care-circle.tsx`
- Modify: `app/profile/memories.tsx`
- Modify: `app/profile/emergency-insurance.tsx`

**Interfaces:**
- Consumes: `Character`, concepts `crown/medal/badge/trophy/calendar/heart/star/sun/sparkle/streak/clock/photo/activity/medicine/baby/health`, and new `chat/channel/chart/trending/marketplace`.

- [ ] **Step 1: Leaderboard rank glyphs + stat chips**

Grep in `app/leaderboard.tsx` (all inside `if (diffuse)`): rank glyphs `Crown`→`crown`, `Medal`→`medal`, `Award`→`badge`, `Trophy`→`trophy` (rankBloomIcon ~726, header ~493, profile sheet ~1204/~1258); stats `Calendar` (~864, ~1271)→`calendar`, `MessageCircle` (~865, ~1277)→`chat`, `Hash` (~867, ~1289)→`channel`. (Reactions `Heart` already done in Task 2.)

- [ ] **Step 2: daily-rewards points star**

Grep `StarLine`/`Star` in `app/daily-rewards.tsx` (~270, Diffuse header points-pill). Swap → `<Character name="star" size={...} color={...} />`.

- [ ] **Step 3: InsightsScreen tabs/sections/empties**

Grep in `InsightsScreen.tsx` (unconditional body renders): tab icon triple `Sun`→`sun`/`BookOpen`→`book`/`Clock`→`clock` (~1152); `Sun` (~1181)→`sun`; `Sparkles` (~1186,~1292,~1303,~1285)→`sparkle`; `BarChart3` (~1205)→`chart`; `Flame` (~1210)→`streak`; `MessageSquare` (~1340)→`chat`; `MessageCircle` (~1352,~1588,~1786)→`chat`; `BookOpen` (~1413)→`book`; `Clock` (~1440)→`clock`. (ArticleCard/InsightCard list items already done in Task 2.)

- [ ] **Step 4: channel/info metrics + owner badges**

Grep in `app/channel/info/[id].tsx` (unconditional): `Crown` (~572,~614)→`crown`; `ChartBar` (~651)→`chart`; `MessageSquare` (~661)→`chat`; `ImageIcon` (~517,~666)→`photo`; `Zap` (~671)→`activity`.

- [ ] **Step 5: ChannelsScreen + garage/profile**

- `components/connections/ChannelsScreen.tsx`: `TrendingUp` (~242 trending header) → `trending`.
- `app/garage/profile.tsx`: `ShoppingBag` (~244, Diffuse empty) → `marketplace`.

- [ ] **Step 6: profile screens**

- `app/profile/health-history.tsx`: `Pill` (~437 med-tag chip) → `medicine`.
- `app/profile/care-circle.tsx`: `Clock` (~1176, Diffuse activity-feed empty) → `clock`.
- `app/profile/memories.tsx`: `Baby` (~573 viewer child badge) → `baby`.
- `app/profile/emergency-insurance.tsx` (Diffuse branches): `Heart` (~287,~316)→`heart`; `Shield` (~362,~393)→`health`.

- [ ] **Step 7: Typecheck + commit**

```bash
npx tsc --noEmit 2>&1 | grep -iE "leaderboard|daily-rewards|InsightsScreen|channel/info|ChannelsScreen|garage/profile|health-history|care-circle|memories|emergency-insurance" || echo "shared files clean"
git add app/leaderboard.tsx app/daily-rewards.tsx components/insights/InsightsScreen.tsx app/channel/info/\[id\].tsx components/connections/ChannelsScreen.tsx app/garage/profile.tsx app/profile/health-history.tsx app/profile/care-circle.tsx app/profile/memories.tsx app/profile/emergency-insurance.tsx
git commit -m "feat(shared): blob-swap Diffuse stragglers (leaderboard, insights, channels, garage, profile)"
```

---

## Task 7: Full typecheck + in-app spot check

**Files:** none (verification).

- [ ] **Step 1: Full typecheck**

Run: `npm run typecheck 2>&1 | tail -30`
Expected: green, EXCEPT the pre-existing `KidsWallet.tsx` failure if still present (do not fix it; confirm it's the only failure and it's not in a file this plan touched).

- [ ] **Step 2: In-app spot check (Diffuse default)**

Launch the app (`npm start`, simulator). Confirm blobs render correctly (not empty/black boxes) on: cycle home ring + agenda month grid; pregnancy Today dashboard; leaderboard podium + stats; insights list + tabs; a kids log form; birth plan. Fix any blob that renders wrong (usually a bad `D` path or missing `bg`).

- [ ] **Step 3: (Optional) blob gallery**

If a blob gallery Artifact/dev screen exists, render it to confirm the 11 new blobs read as one family with the rest.

- [ ] **Step 4: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix(icons): blob render corrections from in-app spot check"
```

---

## Self-Review Notes

**Spec coverage:** Part A (11 blobs) → Task 1. Part B1 (inconsistencies) → Task 2. B2 (cycle) → Task 3. B3 (pregnancy) → Task 4. B4 kids → Task 5, B4 shared → Task 6. Verification/rollout → Task 7. All spec sections mapped.

**New-concept count reconciled:** union adds exactly 11 (`chat, book, chart, scan, person, trending, marketplace, channel, skip, poll, empty`). `checklist` is NOT a new blob (birth-plan hero reuses `note`) — consistent with spec. `poll` may fold into `chart` (Step 5 deviation path documented).

**Type consistency:** `DayCharacter` signature identical in Task 3 Steps 1–4. `DIFFUSE_LOG_CHARACTER` referenced in Task 4 Step 4 is the existing pregnancy map (extend for `nesting`/`birth_prep`). `meta.char`/`config.char` in Task 2 are existing fields per the audit.

**Known risk:** pre-existing `KidsWallet.tsx` typecheck failure — handled by filtering `tsc` output to touched files per task and a final full check in Task 7 that explicitly tolerates only that failure.
