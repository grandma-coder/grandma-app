# Sticker Integration — Field Report (v3 pass complete)

**Last updated:** 2026-05-16
**Coverage:** 51 of 293 assets wired (~17%)
**TS:** clean

---

## Foundation

- `components/stickers/MissingStickers.tsx` — 95 components (orphan `PrepregWisdom` removed in v3 patch), react-native-svg, typed
- `components/stickers/PartialStickers.tsx` — 58 components, react-native-svg, typed
- `components/stickers/Stickers.tsx` — 24 pillar components from v3, RN-svg + typed (delivered correct by design Claude)
- `lib/pillarStickerMap.ts` — rewired to point at new `PillarStickers` instead of legacy `RewardStickers.Pillar*`

The v1 conversions (web SVG → `react-native-svg`, typed helpers, fixed self-referential exports) are upstream in v3. No more conversion pass needed for new modules from design.

---

## Wired stickers (51 total)

### Pass 1 (17)
| Component | Screen | Note |
|---|---|---|
| `PartialStickers.PrepregHomeWisdom` | `home/cycle/WisdomCard.tsx` | size 56 |
| `MissingStickers.PrepregFertileWindow` | `home/cycle/FertileWindowStrip.tsx` | size 32 header accent |
| `MissingStickers.PrepregChecklistEmpty` | `calendar/CycleCalendar.tsx` | size 88, checklist tab empty |
| `MissingStickers.PregnancyBirthPlanHero` | `app/birth-plan.tsx` | size 120 hero |
| `MissingStickers.PregnancyHospitalBag` | `app/birth-plan.tsx` | size 24 section label |
| `PartialStickers.ScanType{Medicine,Food,Nutrition,General}` | `app/scan.tsx` | size 36, replaces 4 emoji |
| `MissingStickers.AirtagHero` + `AirtagStep{Attach,Pair,Done}` | `app/airtag-setup.tsx` | 120 hero + 3×48 steps |
| `MissingStickers.LeaderboardRank{1,2,3}` | `app/leaderboard.tsx` | rankSticker() top-3 |
| `MissingStickers.NotificationsEmpty` | `app/notifications.tsx` | size 88, empty state |

### Pass 2 §1 — Pillar pack (24)
All 24 pillar stickers across the 3 modes, wired through a single edit to `lib/pillarStickerMap.ts`. The map now points at `PillarStickers.PillarFertility`, `PillarNutritionPrep`, etc. (from new `Stickers.tsx`) instead of the legacy `RewardStickers.Pillar*` (geometric placeholders). Pillar configs (`prePregPillars.ts`, `pregnancyPillars.ts`, `pillars.ts`) and `PillarCard.tsx` were not modified — the existing `getPillarSticker(id)` indirection absorbed the change cleanly.

### Pass 2 §3, §5, §6, §7 (10)
| Component | Screen | Note |
|---|---|---|
| `MissingStickers.CaregiverNanny`, `CaregiverFamily` | `app/invite-caregiver.tsx` | size 36, role chips |
| Pillar detail hero (renders pillar's own sticker) | `app/pillar/[id].tsx` | size 64 in icon circle via `getPillarSticker(pillar.id)` |
| `MissingStickers.PregnancyBirthType{Vaginal,Csection,Water}` | `lib/birthData.ts` + `BirthTypeCard.tsx` | size 56, extended `BirthStickerKind` |
| `MissingStickers.GarageListing{Sell,Trade,Donate}` | `components/exchange/ListingCard.tsx` | size 44, replaced text pill badge |

---

## Skipped — needs design decision

### §2 Vault sections (6 stickers) — no live screen renders these
`app/(tabs)/vault.tsx` is a 70-line router that delegates to `CycleAnalytics` / `PregnancyAnalytics` / `KidsAnalytics`. The `components/vault/*` components (DocumentSection, EmergencyCard, VaccineRecord, DocumentUpload) exist but aren't imported by any active route. **Blocker:** these vault section stickers have no rendering surface today.

**Fix path:** either build a real vault screen that uses the components, or move these stickers' placement targets to wherever the equivalent content actually renders (likely inside the analytics components or `app/exams/`).

### §3 Care Circle partner + doctor + invite (3 stickers)
- `MissingStickers.PartnerOnboarding` (partner role) and `MissingStickers.CaregiverDoctor` — these roles don't exist in the `ROLES` array in `app/invite-caregiver.tsx` (only nanny + family). Add them if/when the app supports more caregiver types.
- `MissingStickers.CareCircleInvite` — belongs on `app/manage-caregivers.tsx` empty state. Not audited this pass.

### §4 Notifications row icons (3 stickers) — consistency risk
`TYPE_CONFIG` has 22 entries, mostly lucide icons. Swapping only `vaccine`, `appointment`, and `insight`/`grandma` creates mixed-icon-style inconsistency in the same notification list. Also, the render does `<cfg.Icon size={18} color={...}>` and our stickers don't accept `color` (would lose theming).

**Fix path:** either commit to migrating all 22 to stickers, or keep notifications on lucide. Mixed is a design downgrade.

### §5 Pillar detail extras (3 stickers)
`PartialStickers.PillarTipCardAccent` / `MissingStickers.PillarSuggestionChip` / `PartialStickers.IconPillarAskGrandma` — these need structural additions (corner positioning on TipCard, bullet glyph on suggestion chip, CTA icon on Ask-Grandma button). `TipCard.tsx` is bare; pillar detail has no Ask-Grandma CTA today. Layout decisions deferred.

### Per-mode home screen heroes & section accents (~12 stickers)
All the `Pregnancy{TodaySummary,Affirmation,WeekRuler,WeightTrend,DashboardHero,JourneyRing,ReminderPill}` and Kids tile/hero stickers need placement decisions — the screens have no corner-sticker slots in the current designs. Pre-preg ring center (4) and hormone chips (3) need new visual sections.

### Onboarding heroes (~10 stickers across modes)
`OnboardingStep` wrapper has no hero illustration slot. Each step renders only an input control. Adding hero stickers per step needs a layout addition to the wrapper.

### Per-day calendar markers (2)
`PartialStickers.PrepregCalendarPeriodDay` / `PrepregCalendarFertileDay` — `CycleCalendar` week strip shows day numbers; no per-day phase indicator slot.

### Onboarding · Activities tiles (15)
`app/onboarding/activities.tsx` not found. Likely renamed or absorbed into mode-specific onboarding. Grep for activity labels (`'symptoms'`, `'fitness'`, `'learning'`) to find current home.

### Pregnancy partner / Kids location (2)
- `components/pregnancy/PartnerDashboard.tsx` doesn't exist — defer
- `components/kids/LocationCard.tsx` doesn't exist — KidsHome renders location inline; wire when Kids home tile pass happens

### Brand-stickers downgrades (~6)
Replacing existing brand stickers (`Heart`/`Star`/`Sparkle` on AffirmationRevealCard, paywall hero stack, AffirmationShareModal decorations) with the new variants would lose intentional animated theming. Design decision required.

---

## Modified files (this pass)

```
# Foundation
components/stickers/Stickers.tsx                    (NEW from v3, 309 lines, 24 pillars)
components/stickers/MissingStickers.tsx             (orphan removed)

# Pass 2 wiring
lib/pillarStickerMap.ts                             (24 pillar swaps via map rewrite)
app/pillar/[id].tsx                                 (hero uses getPillarSticker)
app/invite-caregiver.tsx                            (2 care-circle role chips)
lib/birthData.ts                                    (BirthStickerKind extended; 3 birth types switched)
components/pregnancy/BirthTypeCard.tsx              (StickerIcon: 3 new kinds)
components/exchange/ListingCard.tsx                 (TYPE_STICKER badge swap)

# Pass 1 wiring (reminder)
components/home/cycle/WisdomCard.tsx
components/home/cycle/FertileWindowStrip.tsx
components/calendar/CycleCalendar.tsx
app/birth-plan.tsx
app/scan.tsx
app/airtag-setup.tsx
app/leaderboard.tsx
app/notifications.tsx
```

`npx tsc --noEmit` → 0 errors across the project.

---

## Recommended next pass

Highest-impact remaining swaps that need design input first:

1. **Kids Home tiles (12)** — biggest single screen, blocked on slot-by-slot design pass
2. **Pre-preg ring center + hormone chips (7)** — needs visual placement decision
3. **Activities picker tiles (15)** — blocked on finding the current file location
4. **Vault revival (6)** — depends on whether vault sections will exist as a real screen
5. **Cross-mode home accents (~12)** — needs new corner-sticker slots designed

Without those design decisions, ~17% coverage is the natural ceiling for drop-in swaps.
