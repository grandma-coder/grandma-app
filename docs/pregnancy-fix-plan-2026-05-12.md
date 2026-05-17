# Pregnancy Fix Plan
**Source:** [pregnancy-audit-2026-05-12.md](pregnancy-audit-2026-05-12.md) + 3 detail docs
**Scope:** every finding across design / mode / UX
**Shape:** 8 sequential batches, each = one focused session.

Each batch lists: what changes, files touched, exit criteria (must be true before moving on). Run them in order — earlier batches unblock later ones (e.g. `useTheme()` migration must happen before per-token hex swaps).

---

## Batch 1 — Stop the bleeding (data loss / dead UI) · ~half day

The findings where users lose data or interact with non-functional UI. Highest user impact, smallest blast radius.

**Findings:** UX-#1, UX-#2, UX-#4, UX-#5, UX-#6, UX-#7, UX-#8

- [ ] `components/agenda/ContractionTimer.tsx` — wire session persistence; `onSave` currently never fires.
- [ ] `components/pregnancy/PartnerDashboard.tsx:49–58` — wrap action rows in `Pressable` with real handlers (or remove if not shippable).
- [ ] `app/birth-plan.tsx:91–96` — hospital-bag items become real toggles persisted to `birth_preferences`, or visually demoted to non-tappable.
- [ ] `app/onboarding/pregnancy/index.tsx:125–207` — replace blanket `try/catch` + `console.warn` with: await each insert, surface failures via `PaperAlert`, block onboarding completion if a required insert fails.
- [ ] `components/calendar/SimplePregnancyLogForm.tsx` — show user-visible error (toast or `PaperAlert`) when optimistic update rolls back.
- [ ] `components/home/pregnancy/PregnancyUserReminders.tsx` — server CRUD `.then(() => {})` and `try {}` blocks must surface failures.
- [ ] `app/profile/pregnancy.tsx` — await DB writes before local store updates on due-date and LMP changes; rollback local state on failure.

**Exit criteria:** every interactive element in scope either works or is removed; no `console.warn`-only catch blocks in pregnancy write paths.

---

## Batch 2 — Date-string sweep · ~1 hour

Single mechanical refactor with high impact (evening-log bug west of UTC). Do separately so it can't get tangled in other PRs.

**Findings:** UX-#10, Mode-#9 (cross-cutting #4 in consolidated)

- [ ] Replace `new Date().toISOString().split('T')[0]` with `toDateStr(new Date())` in:
  - `components/home/pregnancy/AffirmationRevealCard.tsx` (×3)
  - `components/home/pregnancy/TodayDashboardModal.tsx` (×2)
  - `components/pregnancy/PregnancyJourneyRing.tsx` (×2)
  - `components/analytics/PregnancyAnalytics.tsx` (×1)
  - `app/onboarding/pregnancy/index.tsx` (×1)
- [ ] `supabase/functions/grandma-chat/index.ts:73` — compute `sinceDate` in caller's local timezone (pass `sinceDate` from client, or use a fixed offset of 7 days × 24h from now).

**Exit criteria:** `grep -rn "toISOString().split('T')\[0\]" components/ app/ | grep -i pregnancy` returns nothing.

---

## Batch 3 — Library tab full port · ~half day

Single largest visual regression. One file, no dependencies on other batches.

**Findings:** Mode-#1, Mode-#3, Design (cross-cutting via Library)

- [ ] `app/(tabs)/library.tsx` — remove `CosmicBackground`, strip `THEME_COLORS.*`, replace all `rgba(255,255,255,...)` / `#FFFFFF` / `colors.neon.*` with `useTheme()` tokens.
- [ ] Replace pillar chip styling with `PaperCard` + `stickers.*Soft` background.
- [ ] Pillar chip active color must use `getModeColor(mode, isDark)`.
- [ ] Header subtitle: drive from `modeConfig.aiContextLabel` instead of inline ternary.

**Exit criteria:** screen passes a visual check in both light + dark, both pregnancy + kids modes; no `THEME_COLORS`, `colors.neon`, `CosmicBackground` import in this file.

---

## Batch 4 — `useTheme()` migration for legacy-import components · ~half day

Three components still pin to dark-mode colors. Must precede Batch 6 (token swaps) since they'd otherwise be swapping hex inside a still-broken theme model.

**Findings:** Design F-29..F-39, F-47, plus GrandmaBall (F-01..F-03)

- [ ] `components/agenda/ContractionTimer.tsx` — replace `colors, THEME_COLORS, borderRadius, shadows, typography` imports with `useTheme()` destructure.
- [ ] `components/agenda/KickCounter.tsx` — same.
- [ ] `components/agenda/AppointmentList.tsx` — same; convert dashed-border outline CTA at line 96–103 to `PillButton variant="ink"`.
- [ ] `components/home/GrandmaBall.tsx` — remove `colors`/`THEME_COLORS` imports; gradient stops from `stickers.*` via `useTheme()`; surface from `colors.surface` / `colors.bg`.

**Exit criteria:** `grep -rn "from '.*theme'.*THEME_COLORS\|colors\.neon\|colors\.surfaceLight" components/agenda components/home/GrandmaBall.tsx` returns nothing.

---

## Batch 5 — Tab bar + mode-config wiring · ~1 hour

Mode-driven tab labels and colors. Independent of design tokens.

**Findings:** Mode-#1, Mode-#4, Mode-#6, Mode-#11, Mode-#13

- [ ] `app/(tabs)/_layout.tsx:66, 384–389, 444–454` — read `getModeConfig(mode).tabs.<key>.label` for each tab title instead of `t('tab_*')` constants.
- [ ] Active-tab tint reads `getModeColor(mode, isDark)`.
- [ ] `lib/modeConfig.ts:47` — set `PRE_PREGNANCY_CONFIG.vault.visible = false` per CLAUDE.md.

**Exit criteria:** switching mode in `ModeSwitcher` updates every tab label and active color without reload; pre-pregnancy mode hides the vault tab.

---

## Batch 6 — Token-swap sweep (hex → tokens) · ~half day

Mechanical replacement once Batch 4 (`useTheme()`) is in. Sweep every remaining raw hex in pregnancy components.

**Findings:** Design F-04..F-28, F-36, F-44..F-46

- [ ] `components/home/pregnancy/AffirmationRevealCard.tsx:163–217` — `buildVariants()` palette: `paperBg` → `stickers.*Soft`, `accent` → `stickers.*Ink` / `stickers.*`. Replace hand-rolled glow shadow (line 347) with `shadows.cardPop`. Replace `DMSans_700Bold` with `font.bodySemiBold` (or add the weight to tokens if it must stay).
- [ ] `components/home/pregnancy/WeekCard.tsx:59–85, 213–218, 227–234, 270–272` — palette → tokens; hand-rolled shadow → `shadows.cardPop`; font names → `font.*`; drop text-shadow.
- [ ] `components/home/pregnancy/WeekDetailModal.tsx:65–82, 358, 388` — palette → tokens; overlay `rgba(20,19,19,0.55)` → DESIGN_SYSTEM-canonical value.
- [ ] `components/home/pregnancy/PregnancyUserReminders.tsx:50, 295, 358, 495, 563` — module-level `ACCENT` → `getModeColor(mode, isDark)` inside component; `#FFFFFF` date card → `colors.surface`; `#C06030` → `stickers.peachInk`; `#BDD48C` → `stickers.green`; `#FFFFFF` button text → `colors.textInverse`.
- [ ] `components/pregnancy/PregnancyJourneyRing.tsx:35–39, 93–110` — `TRI_COLOR` and `LOG_DISPLAY` to `stickers.*`. Remove `'#2A1F4A'` neon dark background.
- [ ] `components/pregnancy/BirthGuideModal.tsx:22, 45–58` — `INK` constant → `colors.text`; tile bg and sticker fill hex → `stickers.*Soft` / `stickers.*`.
- [ ] `components/agenda/AppointmentList.tsx:25–31` — `TYPES` array `#FF6B6B` → `stickers.coral` (or add a token for bloodwork).
- [ ] `components/home/pregnancy/TodaySummaryCard.tsx:110, 136` — `radius={24}` → `radius.md` or `radius.lg`; inline rgba → `colors.borderLight`.

**Exit criteria:** `grep -rn "'#[0-9a-fA-F]\{6\}'\|rgba(" components/home/pregnancy components/pregnancy components/agenda` returns only SVG path strings.

---

## Batch 7 — `isDark` anti-pattern + remaining mode-color refs · ~1 hour

The duplicative `isDark ? colors.x : '#hex'` pattern across 6 files plus the ~20-site `brand.pregnancy` direct-reference sweep.

**Findings:** Design F-09, F-18, F-21, F-41, F-42, F-44; Mode-#7

- [ ] `components/home/pregnancy/TodaySummaryCard.tsx:45–46` — drop `isDark` branches; use `colors.text`, `colors.surface` directly.
- [ ] `components/home/pregnancy/WeekDetailModal.tsx:100–105, 211–218` — same.
- [ ] `components/home/pregnancy/PregnancyUserReminders.tsx:160–168` — same.
- [ ] `app/onboarding/due-date.tsx:29–33`, `app/onboarding/baby-name.tsx:27–31` — same.
- [ ] `app/profile/pregnancy.tsx:22, 171` — drop `INK` module constant; remove `isDark` branching.
- [ ] Sweep `brand.pregnancy` direct refs in `components/calendar/PregnancyCalendar.tsx` (5 sites), `components/calendar/PregnancyLogForms.tsx` (6 sites), `app/onboarding/transition.tsx:30` — replace with `getModeColor('pregnancy', isDark)`.

**Exit criteria:** `grep -rn "isDark ? '#" components/ app/` returns no pregnancy hits. `grep -rn "brand\.pregnancy" components/ app/` only inside `getModeColor` definition.

---

## Batch 8 — AI context + edge function · ~1 hour

Make grandma-chat actually personalised for pregnancy users.

**Findings:** Mode-#2, Mode-#8

- [ ] `lib/grandmaChat.ts:16–25` — extend `ChatContext` with `weekNumber?: number`, `dueDate?: string | null`.
- [ ] `components/chat/GrandmaTalk.tsx:983–989` — read `weekNumber` and `dueDate` from `usePregnancyStore` and pass them when `behavior === 'pregnancy'`.
- [ ] `lib/grandmaChat.ts:70` (nana-chat fallback) — read same store values; remove hardcoded `null`.
- [ ] `supabase/functions/grandma-chat/index.ts` — accept `weekNumber` + `dueDate`, build personalised system prompt branch when present.
- [ ] Deploy: `supabase functions deploy grandma-chat --no-verify-jwt`.

**Exit criteria:** open chat at week 24, ask "what should I expect this week?" — Grandma answers with week-24-specific content, not generic.

---

## Batch 9 — Modal + a11y + onboarding edge cases · ~half day

The polish batch — accessibility labels, modal dismissibility, edge case clamps.

**Findings:** UX-#9, UX-#19, plus accessibility long tail

- [ ] Audit every pregnancy modal for `onRequestClose` + backdrop tap dismiss. Starting list: `AppointmentList Modal:299`, `WeekDetailModal`, `BirthGuideModal`, `BirthDetailModal`, `AffirmationShareModal`, `TodayDashboardModal`, `EditFieldModal` (in profile/pregnancy).
- [ ] Add `accessibilityLabel` + `accessibilityRole` to: routine chips, reminder cards, birth-guide tiles, kick/contraction buttons, all modal close buttons. Target: every `Pressable` / `TouchableOpacity` in `components/home/pregnancy/`, `components/pregnancy/`, `components/agenda/{Kick,Contraction,AppointmentList}.tsx`.
- [ ] `app/onboarding/due-date.tsx:35–44` — clamp LMP / due date to a sane upper bound (no LMP > 42 weeks ago, no due date > 42 weeks future).
- [ ] `components/home/pregnancy/WeightTrendCard.tsx:88, 92` — type the `birth_preferences` and `pregnancy_logs.value` reads instead of `as any`.
- [ ] `app/onboarding/pregnancy/index.tsx:194` — same for `mood` cast.

**Exit criteria:** every modal dismissible via gesture + back button; every interactive sticker/chip exposes a label; no `as any` casts in pregnancy code paths.

---

## Batch 10 — i18n wave for pregnancy surface · ~1–2 days

Separate because it touches ~100 strings and has its own workflow (`/i18n-extract` skill + 12-language fan-out). Save for after all logic/design fixes land.

- [ ] Run `/i18n-extract` against every pregnancy file scanned in the audit.
- [ ] Add keys to `lib/i18n/en.ts`.
- [ ] Trigger downstream language fan-out per existing 7-wave plan.

**Exit criteria:** `i18n-auditor` reports 0 hardcoded strings in pregnancy components.

---

## Estimated total: 3–4 focused days

| Batch | Effort | Blocks |
|---|---|---|
| 1 — Data loss / dead UI | ~½ day | nothing |
| 2 — Date-string sweep | ~1h | nothing |
| 3 — Library tab port | ~½ day | nothing |
| 4 — `useTheme()` migration | ~½ day | **Batch 6** |
| 5 — Tab bar wiring | ~1h | nothing |
| 6 — Token swap sweep | ~½ day | needs Batch 4 |
| 7 — `isDark` + mode-color sweep | ~1h | needs Batch 4 |
| 8 — AI context | ~1h | nothing |
| 9 — Modals + a11y | ~½ day | nothing |
| 10 — i18n | ~1–2 days | should be last |

### Parallelism opportunities
Batches **1, 2, 3, 5, 8** have no dependencies → can run in parallel windows.
**Batch 4 must precede 6 + 7.**
**Batch 9, 10** run last (polish + i18n).

A realistic 2-window split:
- Window A: 1 → 4 → 6 → 7 → 9
- Window B: 2 → 3 → 5 → 8 → 10
