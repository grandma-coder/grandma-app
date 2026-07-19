# Settings-Subtree Character-Blob Migration — Design

**Date:** 2026-07-18
**Status:** Approved (pending spec review)
**Related memory:** `lucide-to-character-migration`, `blob-migration-plan`

## Goal

Replace every **live, semantic** icon in the Settings tab and every screen it links
to with the app-wide **Character-blob** family (`<Character name=… />` from
`components/characters/Characters.tsx`). This continues the app-wide Lucide/sticker →
Character migration; the Settings subtree was the remaining gap.

The trigger: the Settings screen rows still render decorative **BrandStickers**
(`AnimatedSticker type="Heart|Flower|Star|Leaf|Cross|Drop|Moon|Burst"`) whose meaning
is loose, so the icons don't communicate what each row does.

## Scope

**In:** every live semantic icon that maps to an **existing** Character concept, across
these 11 files:

1. `app/(tabs)/settings.tsx`
2. `app/profile/notifications.tsx`
3. `app/profile/privacy.tsx`
4. `app/profile/emergency-insurance.tsx`
5. `app/profile/health-history.tsx`
6. `app/profile/care-circle.tsx`
7. `app/profile/kids.tsx`
8. `app/profile/memories.tsx`
9. `app/profile/about.tsx`
10. `app/profile/pregnancy.tsx`
11. `app/profile/settings.tsx`

**Out (deferred — no matching blob; follow-up pass):**
- weight scale (`settings.tsx` Scale)
- insurance card / provider building (`emergency-insurance.tsx` CreditCard/Building2)
- vision plan-type (`emergency-insurance.tsx` Drop-as-vision)
- journey **mode avatars** (`MyJourneyPillGrid` ModeTrying/ModePregnant/ModeParent) — a
  distinct recognizable avatar set; remapping to ovulation/kick/baby would look arbitrary
- `AvatarPicker` icon-choice registry (butterfly/bee/mushroom/stroller/cake/…) — a
  decorative *choice* set, not a semantic row icon; different kind of change
- pregnancy **hero décor** shapes (Squishy blob / CircleDashed halo / Squiggle underline /
  Star/Flower/Sparkle floats) — pure decoration, not semantic

**Never touched (chrome — stays Lucide/Ionicons):** ArrowLeft, Chevron*, X, Plus, Minus,
Pencil/Edit2, Trash2, Check, Search, Copy, Download, Mail, Lock, Eye/EyeOff, KeyRound,
ShieldCheck, gear (Settings), LogOut, Globe, header Bell, back chevron, theme-toggle
Moon/Sun, DiffuseArrow. Also `GrandmaLogo` (brand mark, custom SVG).

## Scoping rule (from `lucide-to-character-migration`)

The app defaults to the Diffuse theme. Only the `diffuse`/`useIsDiffuse()===true` branch
and always-on paths are live. Icons rendered **only** in a `!diffuse`/`Current*`/legacy
branch are NOT live and are skipped — EXCEPT in `settings.tsx`, where both the diffuse and
the mirrored `!diffuse` StatRow branch are converted together (cheap, keeps them in sync).

## Concept map

### 1. `app/(tabs)/settings.tsx` — 14 rows (both branches)
| Row | Current | → Character |
|---|---|---|
| Care Circle | Heart | `community` |
| Pregnancy | Heart | `heartbeat` |
| Cycle | Moon | `period` |
| Cycle Settings | Flower | `calendar` |
| Kids Profile | Flower | `baby` |
| Memories | Star | `photo` |
| Health History | Leaf | `health` |
| Emergency & Insurance | Cross | `warning` |
| Notifications | Drop | `bell` |
| Account & Security | Moon | `key` |
| Data & Privacy | Leaf | `note` |
| Subscription | Burst | `gem` |
| Help | Flower | `tip` |
| About | Star | `star` |

### 2. `notifications.tsx` (diffuse toggle icons)
Sun→`sun` · Sparkles→`sparkle` · Weekly Summary→`calendar` · Appointment→`calendar` ·
Cycle Predictions→`period` · Milestone→`growth` · Care Circle Updates→`community`

### 3. `privacy.tsx` (diffuse rows)
care-circle→`community` · marketing→`heart` · health data→`health` · photos→`photo` ·
terms→`note` · AI usage + inventory→`observe` · analytics→`observe` · policy→`star` ·
transparency + export→`observe` · clear-data danger→`warning`

### 4. `emergency-insurance.tsx` (live)
contacts Heart→`community` · primary Star→`star` · Health plan→`health` · Dental→`exam`
_(Vision, Shield, Building2, CreditCard → deferred/chrome)_

### 5. `health-history.tsx` (DetailPopup header + AddSheet type grid + med chip)
Syringe→`vaccine` · Pill→`medicine` · Thermometer→`temperature` · TrendingUp→`growth` ·
Star→`star` · FileText→`note`
_(SectionHeaders/StatCards already Character — untouched.)_

### 6. `care-circle.tsx`
"no caregivers" Users→`community`
_(Activity feed already Character via ACTIVITY_CHARACTER — untouched.)_

### 7. `kids.tsx`
empty-state FlowerSticker→`baby` · child-card FlowerSticker→`baby` · Stethoscope→`checkup`

### 8. `memories.tsx`
empty-state HeartSticker→`photo`

### 9. `about.tsx`
Mission Heart→`heart` · Expertise Cross→`checkup` · Privacy Leaf→`key`

### 10. `pregnancy.tsx` (always-on; modal blobs already Character)
hero Heart→`heart`; section badges: Info Clock→`clock` · Birth Planning→`calendar` ·
Preferences→`heart` · Team→`community` · Health Flags→`health` · Baby Info Bear→`baby` ·
Emergency Key→`key` · Postpartum→`selfcare` · Breastfeeding→`milk` · Nesting Moon→`night`
_(Hero décor floats left as-is.)_

### 11. `profile/settings.tsx`
Temperature units Thermometer→`temperature`
_(Scale → deferred; theme-toggle Moon/Sun stays chrome.)_

## Implementation notes

- `<Character name size color? />` — API confirmed:
  `Character({ name, size=24, color, eye='#1A1916', bg='#F4F1E8', face })`.
- Match the size each call site currently passes (rows use `size={18}`; sheets/badges
  larger). Preserve existing wrapper/bloom containers (`DiffuseBloomIcon`,
  `DiffuseListRow icon=…`, `StatRow icon=…`) — only the inner glyph element changes.
- Default hue per concept is built in; only pass `color` where the call site currently
  forces a specific fill and the default would clash. Prefer the concept default.
- Remove now-unused BrandSticker / Lucide imports per file; keep chrome imports.
- Do NOT alter `AnimatedSticker`'s animation wrapper usage elsewhere — where a row used
  `AnimatedSticker`, the blob replaces the sticker child; if the animation wrapper only
  supports BrandSticker types, render `<Character>` directly (static) — the row icons are
  not animated in the reference.

## Verification

1. `npm run typecheck` green after each file group (and no new unused-import errors).
2. Launch the app (iOS simulator), navigate to Settings, and screenshot: confirm all 14
   row blobs render distinctly at row size and read as the intended concept.
3. Spot-check one sub-screen per group (notifications, privacy, health-history add sheet,
   emergency, pregnancy) that the converted icons render and are not clipped.

## Risks / notes

- **`pregnancy.tsx` is the largest surface** (17 always-on stickers) and is NOT
  diffuse-branched for glyphs — every sticker there is live. Highest chance of a visual
  regression; verify its screenshot specifically.
- Known pre-existing: `grandma-coder`'s uncommitted `KidsWallet.tsx` references
  non-existent Character concepts + a `stickers.coralSoft` typo, which can break a *full*
  typecheck independent of this work. If `npm run typecheck` shows only those errors, this
  migration is still green; note it rather than "fixing" their WIP.
- Deferred no-concept icons are intentionally left; they need new blobs drawn (render→
  look→fix loop) in a follow-up, tracked against `blob-migration-plan`.
