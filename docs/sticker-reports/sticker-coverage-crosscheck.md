# Sticker Coverage — Cross-check against `design-assets-needed.md`

**Generated:** 2026-05-15
**Sources:**
- Ground truth: [`docs/design-assets-needed.md`](../design-assets-needed.md) (293 assets, status 🟢 / 🟡 / 🔴)
- Machine-readable: [`integration-pkg/docs/asset-coverage.json`](integration-pkg/docs/asset-coverage.json) (same 293 rows + design status + ref mapping)
- Integration plan: [`sticker-integration.md`](sticker-integration.md) (154 placement targets)
- Shipped modules: `components/stickers/MissingStickers.tsx` + `PartialStickers.tsx`

---

## The headline numbers

| Bucket | Count | % of 293 | Meaning |
|---|---:|---:|---|
| 🟢 **Keep as-is** | 106 | 36% | Already designed and rendered in code (lucide icons, existing brand stickers, baby illustrations, fruit set, log stickers, 36 pillar entries from existing system). Manifest says the design is already shipped — no change needed. |
| ✅ **Wired this pass** | 17 | 6% | New stickers I dropped into screens (see below) |
| 🟡 **Designed, not wired** | 137 | 47% | Component exists in `MissingStickers.tsx` / `PartialStickers.tsx`, but no call site yet. These are the §3 "needs design slot" entries from the field report. |
| ⚠️ **No design-system ref (Pillars + a few icons)** | 33 | 11% | Marked 🟡 in MD but the ref points at `Stickers.PillarX` (the existing pillar sticker family) or generic Icons — these were **not** included in the new MissingStickers / PartialStickers package. They need design from the pillar sticker direction, not from the missing-stickers package. |

Module shipped: **96 MissingStickers + 58 PartialStickers = 154 designs** (matches the integration plan exactly).

---

## ✅ 17 wired so far

| Component | Screen file | Notes |
|---|---|---|
| `PartialStickers.PrepregHomeWisdom` | `components/home/cycle/WisdomCard.tsx` | Replaced `Heart` sticker on the yellow Wisdom card |
| `MissingStickers.PrepregFertileWindow` | `components/home/cycle/FertileWindowStrip.tsx` | Added as header accent |
| `MissingStickers.PrepregChecklistEmpty` | `components/calendar/CycleCalendar.tsx` | Replaced lucide Check icon in checklist empty state |
| `MissingStickers.PregnancyBirthPlanHero` | `app/birth-plan.tsx` | Added centered hero above title |
| `MissingStickers.PregnancyHospitalBag` | `app/birth-plan.tsx` | Replaced Star icon in "Hospital Bag" label |
| `PartialStickers.ScanTypeMedicine` | `app/scan.tsx` | Replaced 💊 emoji |
| `PartialStickers.ScanTypeFood` | `app/scan.tsx` | Replaced 🥦 emoji |
| `PartialStickers.ScanTypeNutrition` | `app/scan.tsx` | Replaced 📊 emoji |
| `PartialStickers.ScanTypeGeneral` | `app/scan.tsx` | Replaced 📷 emoji |
| `MissingStickers.AirtagHero` | `app/airtag-setup.tsx` | Replaced bluetooth Ionicons hero |
| `MissingStickers.AirtagStepAttach` | `app/airtag-setup.tsx` | Replaced numbered "1" pill |
| `MissingStickers.AirtagStepPair` | `app/airtag-setup.tsx` | Replaced numbered "2" pill |
| `MissingStickers.AirtagStepDone` | `app/airtag-setup.tsx` | Replaced numbered "3" pill |
| `MissingStickers.LeaderboardRank1` | `app/leaderboard.tsx` | Updated rankSticker() for rank 1 |
| `MissingStickers.LeaderboardRank2` | `app/leaderboard.tsx` | Updated rankSticker() for rank 2 |
| `MissingStickers.LeaderboardRank3` | `app/leaderboard.tsx` | Updated rankSticker() for rank 3 |
| `MissingStickers.NotificationsEmpty` | `app/notifications.tsx` | Replaced Bell lucide icon in EmptyState |

---

## 🟡 137 designed-but-not-wired, by section

Each entry has a designed SVG component sitting in `MissingStickers.tsx` or `PartialStickers.tsx` — just waiting for a placement decision.

### Pre-pregnancy (13)

**Cycle Home (7)** — ring center + hormone chips need new visual slots; current ring shows day number, current hormones card is a chart + dot legend
- `MissingStickers.PrepregRingMenstruation`
- `MissingStickers.PrepregRingFollicular`
- `MissingStickers.PrepregRingOvulation`
- `MissingStickers.PrepregRingLuteal`
- `MissingStickers.PrepregHormoneEstrogen`
- `MissingStickers.PrepregHormoneProgesterone`
- `MissingStickers.PrepregHormoneLH`

**Agenda (2)** — per-day calendar phase markers, no per-day cell to inject into yet
- `PartialStickers.PrepregCalendarPeriodDay`
- `PartialStickers.PrepregCalendarFertileDay`

**Onboarding (4)** — no hero slot in `OnboardingStep`; "partner" and "doctor" steps don't exist in `app/onboarding/cycle/index.tsx`
- `PartialStickers.PrepregOnboardingHero`
- `MissingStickers.PrepregOnboardingCycleTracking`
- `MissingStickers.PrepregOnboardingPartner`
- `MissingStickers.PrepregOnboardingDoctor`

### Pregnancy (21)

**Home (8)** — `TodaySummaryCard`, `WeekRuler`, `WeightTrendCard`, `TodayDashboardModal`, `RemindersSection`, `JourneyRing` all lack corner-accent slots
- `MissingStickers.PregnancyTodaySummary`
- `MissingStickers.PregnancyAffirmation` *(would replace animated variant-themed Heart in `AffirmationRevealCard` — see §3b in field report)*
- `MissingStickers.PregnancyAffirmationShare`
- `PartialStickers.PregnancyReminderPill`
- `MissingStickers.PregnancyWeekRuler`
- `PartialStickers.PregnancyWeightTrend`
- `MissingStickers.PregnancyDashboardHero`
- `PartialStickers.PregnancyJourneyRing`

**Birth (8)** — birth-type stickers need wiring through `birthData.ts` `BirthStickerKind` type. Birth-phase stickers belong inside `BirthDetailModal` for the `natural` topic (sub-progression that doesn't exist as UI today).
- `MissingStickers.PregnancyBirthTypeVaginal`
- `MissingStickers.PregnancyBirthTypeCsection`
- `MissingStickers.PregnancyBirthTypeWater`
- `MissingStickers.PregnancyBirthPhaseEarly`
- `MissingStickers.PregnancyBirthPhaseActive`
- `MissingStickers.PregnancyBirthPhaseTransition`
- `MissingStickers.PregnancyBirthPhaseGoldenHour`
- `MissingStickers.PregnancyBirthPhasePostpartum`

**Onboarding (3)** — same problem as pre-preg: no hero slot per step
- `PartialStickers.PregnancyOnboardingHero`
- `MissingStickers.PregnancyOnboardingDueDate`
- `MissingStickers.PregnancyOnboardingPartner`

**Agenda (1)** — `SymptomLogger` always renders grid, no empty state
- `MissingStickers.PregnancySymptomEmpty`

**Partner (1)** — **target file `components/pregnancy/PartnerDashboard.tsx` does not exist in codebase**
- `MissingStickers.PregnancyPartnerHero`

### Kids (25)

**Home (12)** — `KidsHome.tsx` uses inline tiles; current emoji/sticker stack needs to be remapped
- `PartialStickers.KidsHomeSleepCircle`
- `PartialStickers.KidsHomeMoodAnalysis`
- `MissingStickers.KidsHomeCalories`
- `PartialStickers.KidsHomeGrowthLeaps`
- `MissingStickers.KidsDiaperPee` / `KidsDiaperPoop` / `KidsDiaperMixed`
- `PartialStickers.KidsHomeMilkTracker`
- `MissingStickers.KidsHomeNannyUpdates`
- `PartialStickers.KidsHomeJourneyRing`
- `MissingStickers.KidsHomeLocation` (target `components/kids/LocationCard.tsx` missing)
- `MissingStickers.KidsHomeEmptyTile`

**Vault (6)** — Vault section icons need wiring through `app/(tabs)/vault.tsx` section config
- `PartialStickers.KidsVaultVaccinesSection`
- `MissingStickers.KidsVaultExams`
- `MissingStickers.KidsVaultHospital`
- `PartialStickers.KidsVaultEmergencyCard`
- `MissingStickers.KidsVaultDocumentEmpty`
- `MissingStickers.KidsVaultDocumentUpload`

**Agenda (4)** — Kids food/nanny screens lack empty states + hero accents today
- `MissingStickers.KidsCalendarEmpty`
- `PartialStickers.KidsFoodDashboardHero`
- `PartialStickers.KidsFoodPhotoEntry`
- `MissingStickers.KidsNannyNotesEmpty`

**Onboarding (3)** — same hero-slot issue
- `MissingStickers.KidsOnboardingHero`
- `MissingStickers.KidsOnboardingBabyName`
- `MissingStickers.KidsOnboardingChildProfile`

### Cross-mode (78)

**Onboarding · Activities picker (15)** — **target file `app/onboarding/activities.tsx` does not exist** (renamed or absorbed elsewhere). All 15 activity tile stickers blocked.

**Paywall (5)** — would change current 3-sticker hero float stack + require remapping `TIER_COPY.features` from abstract `'heart' | 'cross' | ...` symbols to feature-specific stickers
- `MissingStickers.PaywallHero` / `PaywallFeatureUnlimited` / `PaywallFeatureReminders`
- `PartialStickers.PaywallFeatureInsights` / `PaywallFeatureGrandma`

**Profile (6)** — `ProfileHero` component already designed; replacement needs visual diff review
- All 6 (`ProfileHero`, `ProfileAvatarPlaceholder`, `ProfileJourneyPill`, 3× Icon*)

**Vault shared (5)**, **Garage/Exchange (7)**, **Channels (4)**, **Care Circle (5)**, **Grandma chat (5)**, **Insights (3)**, **Scan (3)**, **Notifications (3)**, **Pillar detail (3)**, **Badges (2)**, **Leaderboard (2)**, **Auth (2)**, **Shared decorative (4)**, **Daily Rewards (1)**, **Onboarding transition (1)**, **Settings (1)**, **Tab Bar (1)** — all need placement decisions per-section. See `sticker-coverage-by-section.txt` (machine-generated) for the per-component list.

---

## ⚠️ 33 entries with NO `MissingStickers`/`PartialStickers` ref

These are 🟡 in the MD but the manifest points them at:
- **Pillar sticker family** (24 entries — 6 pre-preg + 9 pregnancy + 9 kids) → ref `Stickers.PillarFertility`, `Stickers.PillarNutritionPrep`, … These pillar stickers are **not** part of the missing/partial package. They live in (or should live in) `components/stickers/BrandStickers.tsx` or `components/ui/Stickers.tsx`. **The 24 pillar stickers were never authored by the design pass that produced the 154-sticker package.**
- **Generic lucide icons** (4 entries) — `icon_tab_library` (Book), `icon_chat_voice` (Mic), `icon_notification_reminder` (Bell). These are already lucide-rendered; manifest marks them 🟡 likely because design wants paper-style versions instead.
- **`sticker_pillar_detail_hero`** — manifest says "any pillar sticker @ large" (reuse, no new asset needed)
- **`sticker_insights_metric_highlight`** — manifest says "Charts.Big" (chart component, not a sticker)
- **3 "icon_chat_*" entries** — ref says `Icons.X` (lucide, no new sticker)

> **Important finding:** The 24 pillar stickers across pre-preg/pregnancy/kids are the **single biggest hole** in the design system. They're marked 🟡 in the MD ("placeholder, currently emoji"), but they weren't built in this design pass. A pillar-sticker pass for Claude Design would unlock 24 swaps at once.

---

## 🧹 Orphans in our modules (3)

Components in the shipped `.tsx` files that aren't referenced by the asset manifest:

| Module | Component | Notes |
|---|---|---|
| `MissingStickers` | `PrepregWisdom` | Manifest's `sticker_prepreg_home_wisdom` points at `PartialStickers.PrepregHomeWisdom` (which we wired). The Missing version is a duplicate. Safe to delete or use as alt. |
| `MissingStickers` | `S` | Internal SVG wrapper helper — not a public sticker. Doesn't need an asset ID. |
| `PartialStickers` | `S` | Same — internal helper. |

Action: probably remove `PrepregWisdom` from `MissingStickers.tsx` since it's not in the manifest and we've already wired the Partial version.

---

## 🚦 Recommended priority order

Based on what's most impactful + cleanest to wire:

### High-value, clean drop-in (~25-30 stickers, do next)
1. **Vault sections** (6) — file exists, just need to map section headers to stickers
2. **Onboarding · Activities tiles** (15) — *if* we can confirm where the activities picker lives now (search for the 15-tile activity selector). Once located, swap emoji per tile.
3. **Care Circle role badges** (5) — currently text-only; adding sticker per role is a small layout change
4. **Notifications per-row icons** (3) — `TYPE_CONFIG` already maps types → icons; remap to stickers
5. **Pillar tip card accent + suggestion chip** (3)

### Medium-effort but high-payoff
6. **Birth-type stickers** (3) — extend `BirthStickerKind` type in `birthData.ts`, add 3 cases to `BirthTypeCard`
7. **Paywall feature swap** (5) — re-author TIER_COPY mapping to feature stickers (~30 min)
8. **Kids Home tiles** (12) — biggest single screen impact, well-scoped per-tile
9. **Profile rows** (6) — already structured; swap row icons

### Needs design decision before code
- Cycle ring center stickers (4 phases) — placement TBD
- Hormone chip stickers (3) — chart layout decision
- Birth phase stickers (5) — new sub-section inside BirthDetailModal
- All onboarding hero stickers (10 across modes) — needs slot added to `OnboardingStep`

### Blocked (file missing / file renamed)
- `components/pregnancy/PartnerDashboard.tsx` — find or build
- `components/kids/LocationCard.tsx` — find or build
- `app/onboarding/activities.tsx` — find current activity picker file

### Outside the new package
- **24 pillar stickers** — design pass needed in `BrandStickers.tsx` / `Stickers.tsx` family
- **Paper-style lucide replacements** (~4) — Bell, Mic, Book — design pass needed

---

## Comparison to the field report

The earlier [`sticker-integration-report.md`](sticker-integration-report.md) covered the same data from the *code* side (what I touched, what I skipped). This document covers it from the **manifest** side (every one of 293 designed assets, where each one stands).

The two together give Claude Design a complete picture:
- **Field report** = "here's what I tried and where I got stuck per screen"
- **Cross-check (this doc)** = "here's every asset in your manifest, bucketed by integration status"
