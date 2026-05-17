# Pregnancy-Mode Design System Audit — 2026-05-12

48 findings across home, agenda, calendar, analytics, onboarding, profile, birth guide. Check against `constants/theme.ts` + `DESIGN_SYSTEM.md`.

---

## Home — GrandmaBall

- **F-01** `components/home/GrandmaBall.tsx:4` — **high** — Imports `colors, THEME_COLORS, shadows` from legacy `colors` export instead of `useTheme()`. `colors.surfaceLight`, `colors.background`, `colors.textOnAccent` are neon-era stale aliases pinned to dark-mode values.
- **F-02** `components/home/GrandmaBall.tsx:19–22` — **high** — `LinearGradient` with `THEME_COLORS.blue` / `THEME_COLORS.pink`. Should come from `stickers.*` or `brand.*` via `useTheme()`.
- **F-03** `components/home/GrandmaBall.tsx:65–75` — **high** — `backgroundColor: colors.surfaceLight` and `borderColor: colors.background` are legacy dark-pinned aliases. Use `colors.surface` and `colors.bg` from `useTheme()`.

## Home — Pregnancy Sub-components

- **F-04** `components/home/pregnancy/WeekCard.tsx:59–85` — **med** — `PALETTES` array has 40+ raw hex values (`'#2A1F4A'`, `'#FFFEF8'`, `'#F5D652'`). Not an SVG asset file. Overlaps with `stickers.*` / `brand.*` already in tokens.
- **F-05** `components/home/pregnancy/WeekCard.tsx:213–218` — **med** — Hand-rolled shadow `shadowColor: '#141313'`, `shadowOpacity: 0.2`, `shadowRadius: 22`. Not one of the 4 tokenized shadows. Use `shadows.cardPop`.
- **F-06** `components/home/pregnancy/WeekCard.tsx:227–228` — **low** — `fontFamily: 'DMSans_600SemiBold'` raw string. Use `font.bodySemiBold`.
- **F-07** `components/home/pregnancy/WeekCard.tsx:234` — **med** — `fontFamily: 'Fraunces_500Medium'` — non-canonical weight, not in `font.*` tokens.
- **F-08** `components/home/pregnancy/WeekCard.tsx:270–272` — **low** — `textShadowColor: 'rgba(0,0,0,0.12)'` — not a token. Design system has no text shadows.
- **F-09** `components/home/pregnancy/TodaySummaryCard.tsx:45–46` — **med** — `const ink = isDark ? colors.text : '#141313'`. Manual `isDark` branching for values `colors.text` already resolves. DESIGN_SYSTEM.md §6 anti-pattern.
- **F-10** `components/home/pregnancy/TodaySummaryCard.tsx:136` — **low** — `backgroundColor: 'rgba(20,19,19,0.06)'` inline. Should be `colors.borderLight`.
- **F-11** `components/home/pregnancy/TodaySummaryCard.tsx:110` — **med** — `PaperCard` passed `radius={24}` — not a canonical token (md=20, lg=28).
- **F-12** `components/home/pregnancy/AffirmationRevealCard.tsx:163–217` — **high** — `buildVariants()` has 50 palette rows with ~200 raw hex strings. Largest single block of hex violations in the pregnancy surface. Map `paperBg` → `stickers.*Soft`, `accent` → `stickers.*Ink`.
- **F-13** `components/home/pregnancy/AffirmationRevealCard.tsx:347` — **med** — Hand-rolled `shadowColor: accent` with `shadowOpacity: 0.22`. Glow-style shadow keyed to non-token color. Use `shadows.cardPop`.
- **F-14** `components/home/pregnancy/AffirmationRevealCard.tsx:464, 493` — **low** — Button text `color: '#1A1030'` (old neon background). Use `stickers.charcoal` or `colors.text`.
- **F-15** `components/home/pregnancy/AffirmationRevealCard.tsx:579` — **med** — `fontFamily: 'Fraunces_600SemiBold'` raw string. Use `font.display`.
- **F-16** `components/home/pregnancy/AffirmationRevealCard.tsx:596, 618` — **med** — `fontFamily: 'DMSans_700Bold'` — not in `font.*` tokens (tokens cap at 600).
- **F-17** `components/home/pregnancy/WeekDetailModal.tsx:65–82` — **med** — Same palette pattern as WeekCard; five raw-hex palette structs (`'#2A1F4A'`, `'#B983FF'`, `'#7048B8'`).
- **F-18** `components/home/pregnancy/WeekDetailModal.tsx:100–105, 211–218` — **med** — Multiple `isDark` branches recomputing `'#141313'`, `'#3A3533'`, `'#6E6763'`, `'#FFFEF8'`. `colors.*` already resolves these.
- **F-19** `components/home/pregnancy/WeekDetailModal.tsx:358, 388` — **med** — Modal overlay `'rgba(20,19,19,0.55)'`, sheet `'rgba(255,254,248,0.85)'`. DESIGN_SYSTEM.md §2.7 specifies different values.
- **F-20** `components/home/pregnancy/PregnancyUserReminders.tsx:50` — **high** — Module-level `const ACCENT = brand.pregnancy`. Hardcoded light-mode value used at 12+ style sites; ignores dark mode. Use `getModeColor(mode, isDark)` inside component.
- **F-21** `components/home/pregnancy/PregnancyUserReminders.tsx:160–168` — **med** — `backgroundColor: isDark ? colors.surface : '#FFFEF8'` — `isDark` branch for value `colors.surface` already resolves.
- **F-22** `components/home/pregnancy/PregnancyUserReminders.tsx:295` — **high** — `backgroundColor: isDark ? colors.surfaceRaised : '#FFFFFF'`. Pure white breaks the cream-paper aesthetic. Use `colors.surface`.
- **F-23** `components/home/pregnancy/PregnancyUserReminders.tsx:358` — **med** — `color: '#C06030'` for time badge — not a token. Use `stickers.peachInk`.
- **F-24** `components/home/pregnancy/PregnancyUserReminders.tsx:495` — **low** — `color: '#BDD48C'` hardcoded. Use `stickers.green`.
- **F-25** `components/home/pregnancy/PregnancyUserReminders.tsx:563` — **med** — `color: '#FFFFFF'` on the save button. Use `colors.textInverse` or `stickers.charcoal`.

## Pregnancy Ring

- **F-26** `components/pregnancy/PregnancyJourneyRing.tsx:35–39` — **med** — `TRI_COLOR` object with raw hex (`'#BDD48C'`, `'#EE7B6D'`, `'#D94A3E'`). Map to `stickers.*`.
- **F-27** `components/pregnancy/PregnancyJourneyRing.tsx:93–110` — **med** — `LOG_DISPLAY` map: all raw hex (`'#EE7B6D'`, `'#F5D652'`, `'#D94A3E'`, `'#F5B896'`, `'#2A1F4A'`, `'#BDD48C'`, `'#C8A8E8'`). `'#2A1F4A'` is the old neon dark background.
- **F-28** `components/pregnancy/PregnancyJourneyRing.tsx:347-348` — **low** — Transitively violates hex rule via `LOG_DISPLAY` piped into SVG dot fill.

## Agenda

- **F-29** `components/agenda/ContractionTimer.tsx:4–5` — **high** — Imports legacy `colors, THEME_COLORS, borderRadius, shadows, typography`. No `useTheme()`. In light mode renders with dark-mode-only surfaces.
- **F-30** `components/agenda/ContractionTimer.tsx:109` — **high** — `backgroundColor: THEME_COLORS.orange` legacy alias. Primary CTA is raw `Pressable`, not `PillButton`.
- **F-31** `components/agenda/ContractionTimer.tsx:221–223` — **med** — `fontFamily: 'Fraunces_600SemiBold'` raw string.
- **F-32** `components/agenda/KickCounter.tsx:4–5` — **high** — Same legacy import pattern. `colors.textTertiary`, `colors.textOnAccent`, `colors.surfaceGlass` are neon-era dark values.
- **F-33** `components/agenda/KickCounter.tsx:213–215` — **med** — `fontFamily: 'Fraunces_600SemiBold'` raw string.
- **F-34** `components/agenda/KickCounter.tsx:286` — **low** — `borderRadius: 14` raw value not in `radius.*` tokens.
- **F-35** `components/agenda/AppointmentList.tsx:4–5` — **high** — Legacy import pattern (`colors, THEME_COLORS, borderRadius, shadows, typography`). No `useTheme()`.
- **F-36** `components/agenda/AppointmentList.tsx:25–31` — **med** — `TYPES` array has `color: '#FF6B6B'` for bloodwork — raw hex with no token equivalent.
- **F-37** `components/agenda/AppointmentList.tsx:96–103` — **high** — Primary CTA `addButton` is outline-only `Pressable` with dashed border. Design system requires filled `PillButton variant="ink"`.
- **F-38** `components/agenda/AppointmentList.tsx:299` — **med** — Modal overlay `'rgba(0,0,0,0.8)'` — heavier than canonical 0.55.
- **F-39** `components/agenda/AppointmentList.tsx:321–325` — **med** — `fontFamily: 'Fraunces_600SemiBold'` raw string.

## Analytics

- **F-40** `components/analytics/PregnancyAnalytics.tsx` — **low** — Largely compliant. `pillarPalette()` uses `stickers.*` correctly; `useTheme()` imported. Verify chart colors inside deeper modal rendering also use `chartSeries[i]`.

## Onboarding

- **F-41** `app/onboarding/due-date.tsx:29–33` — **med** — `const bg = isDark ? colors.bg : '#F3ECD9'`. Manual `isDark` branching anti-pattern.
- **F-42** `app/onboarding/baby-name.tsx:27–31` — **med** — Same `isDark` branching with hardcoded `'#F3ECD9'`, `'#FFFEF8'`, `'#6E6763'`, `'#A69E93'`.
- **F-43** `app/onboarding/due-date.tsx:9` — **low** — Uses `Alert.alert` for validation. Use `PaperAlert` or `FieldError`.

## Profile

- **F-44** `app/profile/pregnancy.tsx:171` — **med** — `EditFieldModal` has `const paper = isDark ? colors.surface : '#FFFEF8'` — isDark branching anti-pattern.
- **F-45** `app/profile/pregnancy.tsx:22` — **low** — `const INK = '#141313'` module-level constant. Use `colors.text` inside component.

## Birth Guide

- **F-46** `components/pregnancy/BirthGuideModal.tsx:45–58` — **low** — `BIRTH_TYPES` and `EXTRA_TOPICS` use raw hex for tile backgrounds and sticker fills (`'#DDE7BB'`, `'#E0D5F0'`, `'#CFE0F0'`, `'#F9D8E2'`, `'#FAEFB5'`, `'#F2B2C7'`, etc.). One-line-per-entry swap to `stickers.*Soft` / `stickers.*`.

## Cross-cutting

- **F-47** Agenda components (ContractionTimer, KickCounter, AppointmentList) — **high** — None calls `useTheme()`. All read the bare `colors` export. None adapts to light/dark theme switch — rendered with dark-mode-only colors in cream-paper mode.
- **F-48** `WeekCard.tsx:208`, `WeekDetailModal.tsx` — **low** — Neither calls `useTheme()`. Completely static (no light/dark adaptation).

---

## Top 10 to Fix First

1. **F-47 / F-29 / F-32 / F-35** — All three agenda components import legacy `colors` with no `useTheme()`. Light-mode renders with wrong surfaces and text.
2. **F-12** — `AffirmationRevealCard.buildVariants()` — largest single hex block (~200 values). Map to `stickers.*Soft` / `stickers.*Ink`.
3. **F-20** — `PregnancyUserReminders` module-level `ACCENT = brand.pregnancy`. Replace with `getModeColor(mode, isDark)`.
4. **F-37** — `AppointmentList` primary CTA is outline-only dashed-border. Replace with `PillButton variant="ink"`.
5. **F-02 / F-03** — `GrandmaBall` neon-era gradient stops + dark-pinned surface colors. Replace `THEME_COLORS.*`.
6. **F-26 / F-27** — `PregnancyJourneyRing` `TRI_COLOR` and `LOG_DISPLAY` hex blocks. Map to `stickers.*`; remove `'#2A1F4A'` neon background.
7. **F-09 / F-18 / F-41 / F-42** — `isDark` branching pattern in 4 files. Sweep in one pass.
8. **F-22** — `PregnancyUserReminders` `'#FFFFFF'` date-picker card. Change to `colors.surface`.
9. **F-13** — `AffirmationRevealCard` hand-rolled glow shadow. Use `shadows.cardPop`.
10. **F-46** — `BirthGuideModal` tile bg + sticker fill hex → `stickers.*Soft` / `stickers.*`.
