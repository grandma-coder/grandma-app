# Pregnancy Behavior — Full Audit
**Date:** 2026-05-12 · Three parallel passes (design / mode-consistency / UX-logic)

This is the consolidated index. Detailed findings live in:

- [pregnancy-audit-2026-05-12-design.md](pregnancy-audit-2026-05-12-design.md) — 48 design system compliance findings
- [pregnancy-audit-2026-05-12-mode.md](pregnancy-audit-2026-05-12-mode.md) — Mode-consistency gaps (tab bar, library tab, AI chat context)
- [pregnancy-audit-2026-05-12-ux.md](pregnancy-audit-2026-05-12-ux.md) — UX / logic gaps (dead buttons, silent failures, date bugs, a11y, i18n)

---

## Cross-cutting themes

Patterns that appear in multiple audits — fix once, hit many findings:

### 1. Library tab is still the neon-dark legacy UI
**Mode + Design.** The entire `app/(tabs)/library.tsx` (lines 165–426) uses `CosmicBackground`, hardcoded `#FFFFFF`, `THEME_COLORS.*`, `rgba(255,255,255,…)` neon-era values. Visual regression on cream-paper for every pregnancy user opening Library. Single highest-impact fix.

### 2. Three agenda components never call `useTheme()`
`ContractionTimer`, `KickCounter`, `AppointmentList` — all import the legacy `colors` export which is dark-pinned. In cream-paper mode they render with dark surfaces and wrong text colors. One-pass migration.

### 3. `grandma-chat` AI never receives the user's pregnancy week
`lib/grandmaChat.ts:ChatContext` lacks `weekNumber` / `dueDate`. The pregnancy system prompt always falls back to generic "user is pregnant" instead of "user is at week 24." Personalisation is broken for the entire pregnancy chat surface.

### 4. UTC date string used across the pregnancy surface
9 instances of `new Date().toISOString().split('T')[0]` in pregnancy code: AffirmationRevealCard (×3), TodayDashboardModal (×2), PregnancyJourneyRing (×2), PregnancyAnalytics (×1), onboarding/pregnancy/index (×1), plus `grandma-chat/index.ts:73` for the AI log window. Evening logs west of UTC shift to "tomorrow." Use `toDateStr(new Date())`.

### 5. `brand.pregnancy` used directly instead of `getModeColor(mode, isDark)`
~20 sites across `PregnancyCalendar`, `PregnancyLogForms`, `PregnancyUserReminders`, `transition.tsx`. Always returns the light-mode lavender (`#B7A6E8`), wrong brightness in dark mode (`#C4B5EF`).

### 6. `isDark` branching that duplicates what `colors.*` already resolves
Anti-pattern in `TodaySummaryCard`, `WeekDetailModal`, `PregnancyUserReminders`, `onboarding/due-date`, `onboarding/baby-name`, `profile/pregnancy`. Sweep-fix.

### 7. Silent error swallowing in pregnancy data writes
- `app/onboarding/pregnancy/index.tsx:125–207` — multi-table inserts (behaviors / pregnancy_logs / profiles) swallowed in an outer `console.warn`. User finishes onboarding with potentially missing data.
- `SimplePregnancyLogForm` — optimistic update rolls back silently on insert failure. User thinks save succeeded.
- `PregnancyUserReminders` — server CRUD fired as `.then(() => {})` and `try {} catch {}`. AsyncStorage diverges from server.
- `profile/pregnancy.tsx` — writes local stores before awaiting DB persistence on due-date / LMP updates.

### 8. Dead UI surfaces
- `ContractionTimer` — sessions never persisted (`onSave` never invoked internally).
- `PartnerDashboard:49–58` — action rows have no `Pressable`.
- `birth-plan.tsx:91–96` — hospital bag items look tappable but aren't.

### 9. Accessibility broadly absent
Only 2 `accessibilityLabel` instances across the entire pregnancy scope. Routine chips, reminder cards, birth-guide tiles, kick/contraction buttons, modal close buttons all lack labels and roles.

### 10. i18n: zero coverage across pregnancy surface
~100+ hardcoded English strings in pregnancy components. None going through `lib/i18n`.

---

## Top 20 priorities — fix sprint order

Ranked by user-visible impact × number of sites touched.

| # | Finding | Severity | Effort | Audit |
|---|---|---|---|---|
| 1 | Library tab full port off neon-dark legacy (entire screen) | HIGH | L | Mode + Design |
| 2 | `grandma-chat` receive `weekNumber` / `dueDate` from `usePregnancyStore` | HIGH | M | Mode |
| 3 | Agenda components (ContractionTimer / KickCounter / AppointmentList) → `useTheme()` | HIGH | M | Design |
| 4 | `ContractionTimer` sessions never persist (`onSave` never fires) | HIGH | S | UX |
| 5 | Onboarding pregnancy completion swallows insert errors | HIGH | S | UX |
| 6 | `SimplePregnancyLogForm` silent rollback on insert failure | HIGH | S | UX |
| 7 | `AffirmationRevealCard.buildVariants()` 200-hex block → tokens | HIGH | M | Design |
| 8 | `GrandmaBall` legacy `colors` export → `useTheme()` | HIGH | S | Design + Mode |
| 9 | `AppointmentList` outline-dashed CTA → `PillButton variant="ink"` | HIGH | S | Design |
| 10 | 9 UTC date-string instances → `toDateStr(new Date())` | HIGH | S | UX |
| 11 | Tab bar labels read from `getModeConfig(mode).tabs.*.label` | HIGH | S | Mode |
| 12 | Tab active color uses `getModeColor(mode, isDark)` | HIGH | S | Mode |
| 13 | `PregnancyUserReminders` `ACCENT = brand.pregnancy` → `getModeColor` | HIGH | S | Design + Mode |
| 14 | `PregnancyJourneyRing` `LOG_DISPLAY` / `TRI_COLOR` raw hex → `stickers.*` (incl. removing `#2A1F4A` neon dark) | MED | S | Design |
| 15 | `PartnerDashboard` action rows wrap in `Pressable` | MED | S | UX |
| 16 | `birth-plan.tsx` hospital bag items become real toggles or visually un-tappable | MED | S | UX |
| 17 | `PregnancyUserReminders` server CRUD failures surface to user | MED | S | UX |
| 18 | `profile/pregnancy.tsx` await DB before local store writes; rollback on failure | MED | M | UX |
| 19 | `AppointmentList` Modal `onRequestClose` + backdrop dismiss | MED | S | UX |
| 20 | `brand.pregnancy` direct references → `getModeColor(mode, isDark)` sweep across calendar / log forms | MED | M | Design + Mode |

### Longer tail (worth a follow-up sprint)
- `isDark` anti-pattern sweep (6 files)
- `WeekCard` / `WeekDetailModal` palette structs → tokens
- `BirthGuideModal` tile hex → `stickers.*Soft`
- `WeightTrendCard` / onboarding `as any` casts → typed payloads
- Modal `onRequestClose` audit across all pregnancy modals
- Accessibility labels on every interactive sticker / chip / card
- i18n extraction wave for pregnancy surface (~100 strings)
- `app/onboarding/due-date.tsx` upper clamp for past LMP dates
- Vault tab visibility for pre-pregnancy mode (`modeConfig.ts:47`)
- `grandma-chat` edge function UTC date for log window
- `nana-chat` fallback `weekNumber: null` hardcode

---

## How to use this
1. Skim this index, then jump into the three detail docs for line-by-line refs.
2. The "Top 20" is the recommended fix order for an opinionated sprint.
3. Each finding cites `file:line` so you can route work to the right window/agent.
