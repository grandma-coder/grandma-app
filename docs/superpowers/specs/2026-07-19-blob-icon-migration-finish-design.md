# Finish the Character-Blob Icon Migration — Design

**Date:** 2026-07-19
**Status:** Approved design → ready for implementation plan
**Owner:** Igor

## Problem

The app is migrating every *semantic* icon (log types, metrics, categories, mood/health/reward/insight concepts) from `lucide-react-native` to the app-wide **Character-blob** family in `components/characters/Characters.tsx`. A full read-only audit (2026-07-19, 4 sequential text-only agents scoped to the **Diffuse + always-on render paths only**) found the migration is ~80% done but has a tail of **~95 live render sites** across 4 behavior domains still showing a Lucide icon or a legacy sticker on the default Diffuse path.

Two classes of gap:
1. **Quick-swaps (~80%)** — map cleanly onto blobs that already exist in the `CharacterName` union. Pure mechanical edits, no new art.
2. **New concepts (~20%)** — recur across screens but have no blob yet. Require drawing new SVG blobs and verifying them at badge size.

Scope boundary (decided): **only** surfaces that render in the default Diffuse variant or unconditionally. Dead code and `!diffuse`-only branches are out of scope. Chrome icons (arrows, chevrons, X, plus, minus, check, edit, trash, share, settings, search, more) **stay Lucide**.

## Goals

- Every live Diffuse/always-on semantic icon renders a `<Character>` blob.
- 11 new blob concepts drawn, verified at badge size, and added to `Characters.tsx`.
- Cross-surface consistency: no screen shows a blob in its detail view but a Lucide/legacy glyph in the matching list/summary view.
- `npm run typecheck` stays green (modulo the pre-existing known KidsWallet issue noted in project memory, if still present).

## Non-goals

- Converting `!diffuse` / legacy-theme branches or dead components.
- Removing Lucide entirely (chrome stays).
- Redrawing existing blobs or changing the `Character` component API.
- Deleting dead code found during the audit (tracked separately; not part of this pass).

---

## Part A — New blob concepts (11)

Drawn in `components/characters/Characters.tsx`, following the existing conventions: 48×48 viewBox, entry in `HUE` (default hue), `D` (silhouette path — raw hex allowed here, it's the asset file), and `FACE` (eyes for creatures/subjects, a paper-colour "cut-out" detail for objects, or `none`). Add each to the `CharacterName` union. Wire aliases into `ALIAS`/`resolveCharacter` where a legacy name maps to it.

| Concept | Consumers | Visual direction | Face kind |
|---|---|---|---|
| `chat` | Insights "Ask Grandma" CTA (×3), BirthDetailModal, leaderboard posts, channel-info messages | speech bubble blob | cut-out (tail + optional dots) or `none` |
| `book` | Insights Reads tab + empty, BirthDetailModal sources | open book / bookmark blob | `none` (object) |
| `chart` | Insights week-at-a-glance, channel-info metrics dashboard | bar-cluster blob | cut-out bars in paper colour |
| `scan` | Pregnancy meal-form scan-plate / kcal (×2) | frame + scan-line blob | cut-out scan line |
| `person` | exams provider chip, (leaderboard optional) | single-figure blob (distinct from group `community`) | dots (creature) |
| `trending` | ChannelsScreen trending header | upward arrow/spark blob | cut-out arrow |
| `marketplace` | garage/profile posts empty | bag/tag blob | `none` |
| `channel` | leaderboard channels-joined stats (×2), channel-info | hash/tag blob | cut-out hash |
| `skip` | KidsAnalytics routine-skip row | step-over / skip-forward blob | cut-out chevrons |
| `poll` | channel compose poll button | bar-poll blob (variant of chart, or distinct) | cut-out bars |
| `empty` | KidsAnalytics no-data state | neutral placeholder blob | `none` / sleepy |

**Verification loop (per token-budget rule):** draw one or a few blobs → render **downscaled** (small PNG, ≤~200px) via qlmanage / Chrome-headless → eyeball at badge size → fix path → **checkpoint into `Characters.tsx` as each passes**. No parallel fan-out. No full-resolution renders.

Where a new concept has an acceptable existing fallback, the blob is still drawn (decision: distinct blobs each), but the `ALIAS` map should also route the obvious legacy names (e.g. `MessageCircle`/`MessageSquare` → `chat`, `BookOpen` → `book`, `BarChart3`/`ChartBar` → `chart`, `ScanLine` → `scan`, `Hash` → `channel`, `TrendingUp`(when it means trend, not growth) → `trending`, `ShoppingBag` → `marketplace`, `SkipForward` → `skip`, `User` → `person`).

---

## Part B — Quick-swaps (existing blobs)

Grouped by domain. Every row is: replace the Lucide/legacy render with `<Character name=... size color bg />`, matching the size/colour the surrounding code already computes for its Diffuse branch. Exact file:line list lives in the implementation plan; the mapping intent is fixed here.

### B1. Inconsistency fixes (cheapest, do first)
- **InsightsScreen** ArticleCard list item (`meta.icon`→`meta.char`) and InsightCard list item (`config.icon`→`config.char`) — the `char` fields already exist; wire them into the two list render sites like the detail modals already do.
- **Leaderboard** reactions row `Heart` → `Character name="heart"` (profile-sheet tile already does this).
- **KidsHome** reminder `Bell` sites → `Character name="bell"` (line 2577 already does this).
- **profile/settings** weight-unit row `Scale` → `Character name="growth"` (temperature row above already uses `Character name="temperature"`).

### B2. Cycle phase ring + month grid (one root cause)
- `components/home/cycle/dayStickers.tsx` (`DaySticker`) and `components/calendar/CyclePhaseGlyph.tsx` currently emit legacy `ui/Stickers` art (`Drop`/`Leaf`/`LogOvulation`/`Moon`) on the Diffuse path.
- Repoint the **Diffuse branch** to `<Character>` using the mapping `CycleAnalytics` already uses: menstruation→`period`, follicular→`sparkle`, ovulation→`ovulation`, luteal→`night`. (No new phase blobs — decision was reuse the analytics precedent.)
- Consumers fixed transitively: `CycleJourneyRingFull` wheel glyphs (home hero) + `CycleMonthGrid` day markers & legend (agenda).
- Keep the `!diffuse` path untouched.

### B3. Pregnancy stragglers
- `TodayDashboardModal` metric tiles: water→`water`, sleep→`sleep`, nutrition→`nutrition`, exercise→`activity`, kicks→`kick`, weight→`growth` (8 sites; mood tile already blob).
- `PregnancyLogForms` KickCountForm tap target `Hand` → `kick`.
- `PregnancyMealForm` `Camera`/`ImagePlus` → `photo`; `ScanLine` ×2 → `scan` (new).
- `PregnancyCalendar`: routine-list row icon (897) → resolve via existing `DIFFUSE_LOG_CHARACTER` (like the detail modal); sheet-header hero `Calendar` (764) → `calendar`; upload-exam `Camera` (2808) → `photo`.
- `components/calendar/AppointmentDetailModal.tsx` `Stethoscope` (143) → `checkup` — note this whole cream-paper modal is un-migrated and shows to Diffuse users; add a Diffuse branch or swap unconditionally to the blob per the pattern in `home/pregnancy/AppointmentDetailModal.tsx`.
- `PregnancyAnalytics` exams button `FlaskConical` (Diffuse branch, 387) → `exam`.
- `app/birth-plan.tsx` hero `ClipboardList` (117) → `note` (decision: reuse note for checklist); categories `Heart`→`heart`, `Baby`→`baby`, `Sparkles`→`sparkle`.
- `BirthDetailModal` Diffuse `MessageCircle` (175) → `chat` (new); `BookOpen` (669) → `book` (new).

### B4. Kids + shared quick-swaps
- **Kids** — KidsLogForms banners: sleep/nap `Moon`→`sleep`, activity `Dumbbell`→`activity`, feeding `Utensils`→`nutrition`, `Baby`→`baby`, `Sparkles`→`sparkle`; KidsCalendar kid-picker `Baby`→`baby`, empty-day `Calendar`→`calendar`, day-complete `Sparkles`→`celebrate`; KidsHome allergy `AlertCircle`→`warning`, leap `Calendar`→`calendar`, insight `Sparkles`→`sparkle` (several); KidsAnalytics `Lightbulb`→`tip`, share-confirm `Sparkles`→`sparkle`/`celebrate`, growth prompt `TrendingUp`→`growth`, routine-skip `SkipForward`→`skip` (new), no-data `FileQuestion`→`empty` (new); exams/[id] `CalendarIcon`→`calendar`, `User`→`person` (new); ExamForm AI `Sparkles`→`sparkle`; profile/kids pediatrician `Stethoscope`→`checkup`.
- **Shared** — leaderboard rank glyphs `Crown`/`Medal`/`Award`/`Trophy`→`crown`/`medal`/`badge`/`trophy`, stat chips `Calendar`→`calendar`, `MessageCircle`→`chat` (new), `Heart`→`heart`, `Hash`→`channel` (new); daily-rewards points `Star`→`star`; InsightsScreen tab/section `Sun`→`sun`, `Sparkles`→`sparkle`, `Flame`→`streak`, `Clock`→`clock`, `BookOpen`→`book` (new), `BarChart3`→`chart` (new), `MessageCircle`→`chat` (new); channel-info `Crown`→`crown`, `ChartBar`→`chart` (new), `MessageSquare`→`chat` (new), `ImageIcon`→`photo`, `Zap`→`activity`; ChannelsScreen `TrendingUp`→`trending` (new); garage/profile `ShoppingBag`→`marketplace` (new); health-history `Pill`→`medicine`; care-circle empty `Clock`→`clock`; memories `Baby`→`baby`; emergency-insurance `Heart`→`heart`, `Shield`→`health`.

**Borderline / low-confidence (time affordances, decorative empties):** the `Clock` time-input chips, error-state `AlertTriangle`/`Star`, and thread empty-state decorations. Treat as chrome-adjacent — convert **only** where it removes a same-file inconsistency; otherwise leave. Flagged in the plan, not mandatory.

---

## Architecture / approach

- **Single source of new art:** all 11 blobs land in `Characters.tsx`. No per-screen SVG.
- **Resolver-first:** prefer wiring legacy names through `ALIAS`/`resolveCharacter` so future call sites migrate by name. Where a screen already computes a concept key (e.g. `meta.char`, `DIFFUSE_LOG_CHARACTER[type]`), use it rather than hand-picking.
- **Match the local Diffuse branch:** each swap reuses the size/colour the code already computed for that Diffuse branch (`dt.colors.ink3`, `diffuseGlyphColor`, etc.). Pass `bg` where the blob has a paper-colour cut-out.
- **Don't touch `!diffuse`:** every edit is inside the Diffuse branch or an unconditional element; the legacy twin stays as-is.

## Data flow

No data model, store, or migration changes. Purely presentational. No Supabase, no edge functions, no i18n keys.

## Testing / verification

1. New blobs: sequential downscaled render → visual check at ~16–24px → checkpoint.
2. `npm run typecheck` after each batch (CharacterName union additions + call-site edits are the only type surface).
3. Spot-check in-app via the existing Diffuse default: cycle home ring, agenda month grid, pregnancy Today dashboard, leaderboard, insights list, kids log forms.
4. Optional: render the blob gallery Artifact (all families) to confirm the 11 additions read as one family.

## Rollout / batching (delivery: spec → plan → implement, then batch commits)

Recommended commit batches, each independently green:
1. **New blobs** — draw + verify all 11, add to `Characters.tsx` + `ALIAS`. (Enables every new-concept swap.)
2. **Inconsistency fixes** (B1) — smallest, highest-confidence.
3. **Cycle** (B2) — one shared component, two surfaces.
4. **Pregnancy** (B3).
5. **Kids** (B4 kids half).
6. **Shared** (B4 shared half).

## Risks / open questions

- **KidsWallet pre-existing typecheck failure** (per project memory, grandma-coder's uncommitted WIP referencing non-existent concepts) may block a clean full typecheck. Verify current state at implementation start; if present, typecheck the touched files rather than the whole project, and don't "fix" someone else's WIP.
- **Un-migrated `calendar/AppointmentDetailModal.tsx`** has no Diffuse branch at all — decide during implementation whether to add one or swap the `Stethoscope` unconditionally (leaning unconditional blob, since the modal is cream-paper for everyone right now).
- **`poll` vs `chart`** — poll may end up a near-duplicate of chart; if the shapes don't read distinctly at badge size during verify, fold `poll`→`chart` (allowed deviation, note it).
- Some borderline `Clock`/decorative sites are judgment calls; plan lists them but they're optional.
