# Pregnancy Mode Audit — 2026-05-12

> Exhaustive map of every screen, popup, button, and section in the pregnancy journey.
> Findings ranked within each section by severity: 🔴 critical · 🟡 warning · 🟢 polish.
>
> This is the **master** consolidating four parallel passes (design / mode-consistency / UX-logic / gap-fill). Detail docs preserved:
> - [pregnancy-audit-2026-05-12-design.md](pregnancy-audit-2026-05-12-design.md)
> - [pregnancy-audit-2026-05-12-mode.md](pregnancy-audit-2026-05-12-mode.md)
> - [pregnancy-audit-2026-05-12-ux.md](pregnancy-audit-2026-05-12-ux.md)
> - [pregnancy-audit-2026-05-12-gaps.md](pregnancy-audit-2026-05-12-gaps.md)

## Summary

- **Total surfaces audited**: ~46 (Home + 11 sub-components, agenda × 4, calendar × 5, analytics, library, vault, scan, birth-plan, profile × 2, onboarding × 4, settings × 2, notifications inbox, daily-rewards, leaderboard, exchange × 2, channels, edge functions × 2, plus 4 dead components)
- **Critical (🔴)**: 35
- **Warnings (🟡)**: 92
- **Polish (🟢)**: 31
- **Missing features identified**: 16
- **Dead components**: 4 (MilkTracker, MilkControl, PartnerDashboard, WeeklyInsight)

### Top 10 risks

1. **`grandma-chat` AI never receives the user's pregnancy week or due date** (`lib/grandmaChat.ts:16–25`, `components/chat/GrandmaTalk.tsx:983–989`). The pregnancy system prompt falls back to "user is pregnant" — generic advice when the data needed for personalisation exists in `usePregnancyStore`. Every pregnancy chat interaction is degraded.
2. **`app/(tabs)/library.tsx` is still the neon-dark legacy UI** (lines 165, 228–426). Uses `CosmicBackground`, hardcoded `#FFFFFF`, `THEME_COLORS.*`, `colors.neon.*`. Every pregnancy user opening Library sees a full visual regression on the cream-paper redesign.
3. **`ContractionTimer` never saves sessions.** `onSave` is declared but never invoked from inside the timer. Users record contractions and lose every session.
4. **`app/onboarding/pregnancy/index.tsx:125–207` swallows insert errors** for `behaviors` + `pregnancy_logs` + `profiles`. Users finish onboarding with partial data and no signal anything failed.
5. **Scan paywall is broken in pregnancy mode** (`app/scan.tsx:117–125`). `scan_history` insert and free-scan counter are gated on `child.id`. Pregnancy-only users get unlimited free scans because nothing persists.
6. **9 UTC date-string instances across pregnancy code** — `new Date().toISOString().split('T')[0]` in AffirmationRevealCard (×3), TodayDashboardModal (×2), PregnancyJourneyRing (×2), PregnancyAnalytics (×1), onboarding/pregnancy (×1), plus `grandma-chat` edge function. Evening logs west of UTC shift to "tomorrow."
7. **Pregnancy users earn zero non-streak badges.** `useBadgeStore.syncFromData` (`store/useBadgeStore.ts:264–313`) accepts only kids metrics. Of 36 `BADGE_DEFS`, 0 are pregnancy-only.
8. **Leaderboard ignores `pregnancy_logs` entirely.** `leaderboard_scores` view (`supabase/migrations/20260412020000_leaderboard_and_points.sql:23,64`) only counts `child_logs`. Pregnant users perpetually unranked.
9. **`app/profile/notifications.tsx` toggles are pure `useState`** (line 60–65). Never persisted, never registered with `expo-notifications`. Every preference is decorative.
10. **3 agenda components (ContractionTimer / KickCounter / AppointmentList) never call `useTheme()`.** All import the dark-pinned legacy `colors` export. In cream-paper mode they render with wrong surfaces and text.

---

## 1. Home — `components/home/PregnancyHome.tsx` + 11 sub-components

### 1.1 GrandmaBall (pregnancy header)
**Surfaces**: gradient ball, tap → grandma-talk, optional notification dot
**Findings**:
- 🔴 [GrandmaBall.tsx:4, 56, 75] Imports legacy `colors`/`THEME_COLORS` (dark-pinned). In cream-paper light mode the inner ring + border render as dark charcoal.
- 🔴 [GrandmaBall.tsx:19–22] `LinearGradient` uses `THEME_COLORS.blue` → `THEME_COLORS.pink`. No `useModeStore` read; gradient never mode-driven.

### 1.2 PregnancyWeekDisplay + WeekCard + WeekDetailModal
**Surfaces**: week hero, "tap to inspect" → modal
**Findings**:
- 🟡 [WeekCard.tsx:59–85] `PALETTES` array has 40+ raw hex values overlapping with `stickers.*` / `brand.*` tokens.
- 🟡 [WeekCard.tsx:213–218] Hand-rolled shadow (`shadowColor: '#141313', shadowOpacity: 0.2, shadowRadius: 22`) bypasses the 4 allowed shadow tokens.
- 🟡 [WeekCard.tsx:227–234] Raw font strings (`DMSans_600SemiBold`, `Fraunces_500Medium`). The 500 weight isn't even a canonical token.
- 🟡 [WeekDetailModal.tsx:65–82] Same palette pattern; five raw hex structs including `#2A1F4A` (neon-era dark bg).
- 🟡 [WeekDetailModal.tsx:100–105, 211–218] `isDark` branching recomputes values `colors.*` already resolves.
- 🟡 [WeekDetailModal.tsx:358, 388] Modal overlay/sheet use raw rgba not matching DESIGN_SYSTEM §2.7.
- 🟢 [WeekCard.tsx:208], [WeekDetailModal.tsx] Neither calls `useTheme()`. Static across light/dark.

### 1.3 WeekRuler
**Surfaces**: cm/in measure strip under week hero
**Findings**:
- 🟡 [WeekRuler.tsx:29,33] `MAX_CM = 51` clips weeks 40–42 with no "beyond range" indicator.
- 🟡 [WeekRuler.tsx:54] `fontFamily="Fraunces_700Bold"` — app doesn't load this weight; Android falls back to system serif.
- 🟢 [WeekRuler.tsx:43–47] Grows left-to-right unconditionally; no RTL support.

### 1.4 AnimatedFruit + babyIllustrations
**Surfaces**: animated baby-size visual
**Findings**:
- 🔴 [babyIllustrations.tsx:628–636] Weeks >40 and <1 fall to the week-40 pumpkin. Weeks 41–42 users see identical content as week 40.
- 🟡 [AnimatedFruit.tsx:38–44] Loop cleanup doesn't reset `anim` to 0 → visible jump on re-mount.
- 🟡 [babyIllustrations.tsx:186] `switch (week)` has no case for 0; transient `0` during due-date edits shows pumpkin.
- 🟢 [AnimatedFruit.tsx:88–92] `Easing.back(1.5)` overshoots; clips in `overflow: hidden` parents.
- 🟢 [babyIllustrations.tsx:13–23] No `React.memo`; full SVG reconciles every animation frame.

### 1.5 TodaySummaryCard + TodayDashboardModal
**Surfaces**: aggregate of sleep/water/weight/etc; tap → full dashboard
**Findings**:
- 🟡 [TodaySummaryCard.tsx:45–46] `isDark ? colors.text : '#141313'` — `colors.text` already resolves this.
- 🟡 [TodaySummaryCard.tsx:110] `PaperCard radius={24}` not a canonical token (md=20, lg=28).
- 🟡 [TodaySummaryCard.tsx:136] Progress-track inline rgba; should be `colors.borderLight`.
- 🔴 TodayDashboardModal — uses `toISOString().split('T')[0]` ×2 (UTC date bug).

### 1.6 AffirmationRevealCard + AffirmationShareModal
**Surfaces**: daily affirmation tile, share/copy sheet
**Findings**:
- 🔴 [AffirmationRevealCard.tsx:163–217] `buildVariants()` is the largest hex block in the surface (~200 raw values). Map `paperBg` → `stickers.*Soft`, `accent` → `stickers.*Ink`.
- 🔴 [AffirmationRevealCard.tsx:347] Hand-rolled glow `shadowColor: accent, shadowOpacity: 0.22`. Replace with `shadows.cardPop`.
- 🔴 [AffirmationShareModal.tsx:316–319] When user denies `MediaLibrary` permission no Settings path is offered.
- 🔴 [AffirmationShareModal.tsx:307–309] `Clipboard.setImageAsync(base64)` is iOS-only; Android throws into generic "Copy failed" toast.
- 🟡 [AffirmationShareModal.tsx:116–140] `handleHeaderShare` always shares `templates[0]`, ignoring which tile is active.
- 🟡 [AffirmationShareModal.tsx:56–72, 73] Two `Animated.loop` running without `visible` gating; deps `[]` despite reading props.
- 🟡 [AffirmationRevealCard.tsx:464, 493, 596, 618] Raw `#1A1030` text + `DMSans_700Bold` (non-canonical weight).
- 🔴 AffirmationRevealCard — `toISOString().split('T')[0]` ×3.

### 1.7 RemindersSection + PregnancyUserReminders
**Surfaces**: routines list, add-reminder flow with date picker
**Findings**:
- 🔴 [PregnancyUserReminders.tsx:50] Module-level `ACCENT = brand.pregnancy`. Ignores dark mode (returns `#B7A6E8` always; should be `#C4B5EF` in dark). Used at 12+ sites.
- 🔴 [PregnancyUserReminders.tsx:295] `backgroundColor: isDark ? colors.surfaceRaised : '#FFFFFF'`. Pure white breaks cream-paper.
- 🔴 PregnancyUserReminders server CRUD fired as `.then(() => {})` and `try {}` — AsyncStorage diverges from server.
- 🟡 [PregnancyUserReminders.tsx:358, 495] Raw `#C06030` (should be `stickers.peachInk`) and `#BDD48C` (should be `stickers.green`).
- 🟡 [PregnancyUserReminders.tsx:563] Save button text `#FFFFFF`; should be `colors.textInverse`.

### 1.8 AppointmentDetailModal (home variant)
**Findings**:
- 🟡 No appointment-prep questions list affordance (gap → missing feature #8).

### 1.9 WeightTrendCard
**Findings**:
- 🟡 [WeightTrendCard.tsx:88, 92] `as any` casts on `birth_preferences` and `pregnancy_logs.value` — masks column-name bugs.
- 🟡 No IOM/WHO recommended-gain band overlay (gap → missing feature #3).

### 1.10 MilkTracker + MilkControl (DEAD)
**Findings**:
- 🔴 [MilkTracker.tsx:21], [MilkControl.tsx:30] Both unreferenced in `app/` or `components/`. Lives under home/pregnancy paths but tracks postnatal feeding. Decide: delete or repurpose.
- 🔴 [MilkControl.tsx:20–24] Emoji icons (`🤱`, `🍼`, `⏱️`) violate "no emoji UI" rule.

### 1.11 WeeklyInsight (DEAD)
**Findings**:
- 🔴 [WeeklyInsight.tsx:11] Unreferenced.
- 🔴 [WeeklyInsight.tsx:12] `getWeekData` clamps to 1–40 (`pregnancyData.ts:55`). Weeks 41–42 silently get week-40 content.
- 🟡 [WeeklyInsight.tsx:5] Static `colors` (not `useTheme()`).

### 1.12 PartnerDashboard (DEAD)
**Findings**:
- 🔴 [PartnerDashboard.tsx:34] Unreferenced.
- 🔴 [PartnerDashboard.tsx:11–22] Only 10 tips across 40 weeks. Long stretches (2–7, 9–11, 13–15…) reuse the same tip.
- 🟡 [PartnerDashboard.tsx:49–58] "Shared appointments" / "Partner's guide" are decorative `View`s — non-pressable.

---

## 2. PregnancyJourneyRing — `components/pregnancy/PregnancyJourneyRing.tsx`

**Surfaces**: progress ring + "logged this week" panel
**Findings**:
- 🟡 [PregnancyJourneyRing.tsx:35–39] `TRI_COLOR` raw hex (`#BDD48C`, `#EE7B6D`, `#D94A3E`). Map to `stickers.*`.
- 🟡 [PregnancyJourneyRing.tsx:93–110] `LOG_DISPLAY` map: all raw hex, including `#2A1F4A` (neon dark) on sleep entry.
- 🔴 PregnancyJourneyRing — `toISOString().split('T')[0]` ×2.

---

## 3. Birth Guide — `components/pregnancy/BirthGuideModal.tsx` + `BirthDetailModal` + `BirthTypeCard`

**Findings**:
- 🟡 [BirthGuideModal.tsx:45–58] `BIRTH_TYPES` and `EXTRA_TOPICS` use raw hex (`#DDE7BB`, `#E0D5F0`, `#CFE0F0`, …). All map to `stickers.*Soft` / `stickers.*`.
- 🟢 [BirthGuideModal.tsx:22] `const INK = '#141313'` module constant; should be `colors.text` in-component.

---

## 4. Agenda — `components/agenda/*`

### 4.1 AppointmentList
**Findings**:
- 🔴 [AppointmentList.tsx:4–5] No `useTheme()`. Legacy import `colors, THEME_COLORS, borderRadius, shadows, typography`. Wrong colors in light mode.
- 🔴 [AppointmentList.tsx:96–103] Primary CTA is outline-only dashed-border `Pressable`. Design system requires filled `PillButton variant="ink"`.
- 🟡 [AppointmentList.tsx:25–31] `TYPES` array contains `#FF6B6B` (no token equivalent).
- 🟡 [AppointmentList.tsx:299] Modal overlay `rgba(0,0,0,0.8)` heavier than canonical 0.55.
- 🟡 [AppointmentList.tsx:321–325] Raw `fontFamily: 'Fraunces_600SemiBold'`.
- 🟡 AppointmentList Modal missing `onRequestClose` and backdrop tap dismiss.

### 4.2 ContractionTimer
**Findings**:
- 🔴 Sessions never persist — `onSave` never invoked internally. Dead button.
- 🔴 [ContractionTimer.tsx:4–5] No `useTheme()`. Same legacy import pattern.
- 🔴 [ContractionTimer.tsx:109] Primary toggle is raw `Pressable` with `THEME_COLORS.orange`, not `PillButton`.
- 🟡 [ContractionTimer.tsx:221–223] Raw `fontFamily: 'Fraunces_600SemiBold'`.

### 4.3 KickCounter
**Findings**:
- 🔴 [KickCounter.tsx:4–5] No `useTheme()`. Legacy imports.
- 🟡 [KickCounter.tsx:213–215] Raw font string.
- 🟢 [KickCounter.tsx:286] `borderRadius: 14` not a token value.

### 4.4 SymptomLogger
**Findings**:
- Covered in calendar log forms section. No standalone critical issues.

---

## 5. Calendar — `components/calendar/PregnancyCalendar.tsx` + log forms

### 5.1 PregnancyCalendar
**Findings**:
- 🟡 [PregnancyCalendar.tsx:381, 472, 1097, 1223, 2231] Uses `brand.pregnancy` directly — should be `getModeColor('pregnancy', isDark)`.

### 5.2 PregnancyLogForms (the shared log form library)
**Findings**:
- 🟡 [PregnancyLogForms.tsx:151, 164, 261, 267, 272, 359] Same `brand.pregnancy` direct-reference issue.

### 5.3 SimplePregnancyLogForm
**Findings**:
- 🔴 Silent rollback on insert failure — optimistic update reverts without user-visible error. Users think saves succeeded.

### 5.4 PregnancyMealForm
**Findings**:
- Covered in UX audit. No standalone critical issues here.

### 5.5 ContractionTimerLogForm
**Findings**:
- Wraps ContractionTimer's broken save path.

---

## 6. Analytics — `components/analytics/PregnancyAnalytics.tsx`

**Findings**:
- 🟢 Largely design-system-compliant — `useTheme()` imported, `pillarPalette()` uses `stickers.*`.
- 🔴 PregnancyAnalytics — `toISOString().split('T')[0]` ×1 (UTC date bug).
- 🟡 No symptom-severity timeline despite the column existing (gap → missing feature #13).

---

## 7. Library tab — `app/(tabs)/library.tsx`

**Findings**:
- 🔴 [library.tsx:165, 228–426] **Entire screen is the legacy neon-dark UI.** Wraps in `CosmicBackground`, hardcodes `#FFFFFF`, `THEME_COLORS.yellow`, `rgba(200,180,255,0.6)`, `rgba(255,255,255,0.05)`, `colors.neon.blue`. Imports `colors, THEME_COLORS, typography, spacing, borderRadius` from legacy exports.
- 🔴 [library.tsx:131–148] Pillar chips read `modeConfig.pillars` correctly, but chip styling is `rgba(255,255,255,0.05)` background — not mode-aware.
- 🟡 [library.tsx:125] `GrandmaBall` rendered with default gradient; no mode prop.
- 🟢 [library.tsx:176] Subtitle copy hardcoded as inline 3-way ternary; should be `modeConfig.aiContextLabel`.

### 7.1 Pillar detail — `app/pillar/[id].tsx`
**Findings**:
- Covered by mode-consistency audit. Pillar data correctly sourced from `lib/pregnancyPillars.ts`.

---

## 8. Vault tab — `app/(tabs)/vault.tsx`

**Findings**:
- 🟡 [vault.tsx:31] `showFloatingExams = mode !== 'pregnancy'` functionally correct but tab label says "Analytics" instead of spec "Documents" (see Tab bar §10).
- 🟡 [modeConfig.ts:47] `PRE_PREGNANCY_CONFIG.vault.visible = true`. CLAUDE.md says vault is hidden in pre-pregnancy. Affects pregnancy users when switching back.

---

## 9. Scan — `app/scan.tsx` + `supabase/functions/scan-image`

**Findings**:
- 🔴 [scan.tsx:26–31] `SCAN_TYPES` = `medicine / food / nutrition / general`. No ultrasound, no lab-result, no prenatal-vitamin. Edge function supports `exam` (`scan-image/index.ts:112–145`) but UI never exposes it.
- 🔴 [scan.tsx:117–125] `scan_history` insert gated on `child.id`. Pregnancy users save no history → free-scan counter at line 56–58 stays at 0 forever → **unlimited free scans = paywall broken**.
- 🔴 [scan-image/index.ts:145+] Base Guru Grandma prompt hardcoded around child/feeding/allergies. Pregnancy context (week, due date, GDM) never passed.
- 🟡 [scan.tsx:108–113] Passes `child` even when undefined; edge falls back to generic persona.

---

## 10. Birth-plan — `app/birth-plan.tsx`

**Findings**:
- 🔴 [birth-plan.tsx:91–96] Hospital-bag "checklist" is static `View` circles. No `Pressable`, no toggle, no persistence.
- 🔴 [birth-plan.tsx:21] **No state at all.** Birth plan can be browsed but never selected, saved, exported, shared.
- 🟡 [birth-plan.tsx:14–19] `BIRTH_TYPE_TO_TOPIC` covers only 4 ids; extra `birthTypes` entries render as cards with no `onPress`.
- 🟡 [birth-plan.tsx:106–109] "Ask Grandma" button exits without pre-populating selected topic.
- 🟢 [birth-plan.tsx:43] Italic subtitle not i18n'd; back button is small circle not `PillButton`.

---

## 11. Profile

### 11.1 `app/profile/pregnancy.tsx`
**Findings**:
- 🟡 Local stores written before awaiting DB persistence on due-date/LMP. No rollback on failure.
- 🟡 [profile/pregnancy.tsx:171] `EditFieldModal` `isDark` branching anti-pattern.
- 🟢 [profile/pregnancy.tsx:22] `INK = '#141313'` module constant.
- 🟡 Postpartum/nesting checklists only persist to React state (not DB).

### 11.2 `app/profile/notifications.tsx`
**Findings**:
- 🔴 [profile/notifications.tsx:60–65] All 7 toggles are pure `useState`. Never persisted, never registered with `expo-notifications`. Decorative.
- 🔴 [profile/notifications.tsx:27–35] Mixed-mode list — `cycle_predictions` irrelevant in pregnancy; no `kick_counts`, `weekly_pregnancy_update`, `birth_prep_countdown`.
- 🟢 [profile/notifications.tsx:116] Switch trackColor is `brand.pregnancy` regardless of active mode.

---

## 12. Onboarding

### 12.1 `app/onboarding/pregnancy/index.tsx`
**Findings**:
- 🔴 Lines 125–207: multi-table inserts (behaviors / pregnancy_logs / profiles) swallowed in outer `console.warn`. User finishes potentially partial.
- 🔴 [onboarding/pregnancy/index.tsx] UTC date bug ×1 (already fixed in CI commit f149aaf, verify on disk).
- 🟡 [onboarding/pregnancy/index.tsx:194] `as any` cast on mood.

### 12.2 `app/onboarding/due-date.tsx`
**Findings**:
- 🟡 [due-date.tsx:29–33] `isDark ? colors.bg : '#F3ECD9'` branching.
- 🟡 [due-date.tsx:35–44] No upper clamp; past LMP creates absurd week numbers.
- 🟢 [due-date.tsx:9] Uses `Alert.alert` for validation; should use `PaperAlert`/`FieldError`.

### 12.3 `app/onboarding/baby-name.tsx`
**Findings**:
- 🟡 [baby-name.tsx:27–31] Same `isDark` branching with hardcoded hex.

### 12.4 `app/onboarding/transition.tsx`
**Findings**:
- 🟢 [transition.tsx:30] `BEHAVIOR_CONTENT.pregnancy.color = brand.pregnancy` — should be `getModeColor`.

---

## 13. Settings — `app/(tabs)/settings.tsx`

**Findings**:
- 🟡 [settings.tsx:253–261] `pregnancySummary` reads `usePregnancyStore.dueDate` but other places use `useJourneyStore.dueDate` — edits leave summary stale.
- 🟡 [settings.tsx:319–325] "Subscription" row always shows "Upgrade", even for premium users.

---

## 14. Daily Rewards — `app/daily-rewards.tsx`

**Findings**:
- 🔴 [daily-rewards.tsx:86–92] `MODE_QUEST_COPY` has `'pre'`/`'preg'` aliases that don't exist in `JourneyMode`. Store-key drift.
- 🔴 [daily-rewards.tsx:89–90] Pregnancy quest hard-coded to "Drink 8 glasses of water" every day. No week-awareness.
- 🟡 [daily-rewards.tsx:74–83] Reward categories map to `pregnancy_logs` types but `syncFromData` is kids-only, so badges unreachable.
- 🟡 [daily-rewards.tsx:178] Day-3 badge only awarded on literal 3rd check-in via rewards screen.
- 🟡 [daily-rewards.tsx:96–104] Points-breakdown modal mentions "Child log entry" only.

---

## 15. Leaderboard — `app/leaderboard.tsx` + `lib/leaderboard.ts`

**Findings**:
- 🔴 [migration 20260412020000:23,64] `leaderboard_scores` view counts only `child_logs`. No `pregnancy_logs` or `cycle_logs`. Pregnant users score zero from primary activity.
- 🔴 [lib/leaderboard.ts:102] Fallback aggregator also only queries `child_logs`.
- 🟡 [app/leaderboard.tsx:421–422] Users not in view show "unranked" with no explanation.
- 🟡 No "pregnancy peers only" filter — pregnant users compete with kids power-loggers.

---

## 16. Notifications Inbox — `app/notifications.tsx`

**Findings**:
- 🔴 [notifications.tsx:145–160] `vaccine_due`, `health_alert`, `daily_summary`, `weekly_report`, `goal_*` all route to `/(tabs)/vault`. In pregnancy mode that's documents/birth-plan — user stranded.
- 🔴 [notifications.tsx:145+] `pregnancy_week` type (declared in `lib/notifications.ts:10`) has **no case** — tap is no-op.
- 🔴 [notifications.tsx:166–167] `appointment` type has no explicit route. `pregnancy_week`/cycle predictions have no `TYPE_CONFIG` entry (line 84–115) — render as generic lilac bell.
- 🟡 [notifications.tsx:245–253] `inferBehavior` returns null unless `data.behavior` set; pregnancy notifications without tag never match the Pregnancy filter.
- 🟢 [notifications.tsx:218] Date headers use `'en-US'` unconditionally.

---

## 17. Insights — `app/insights.tsx` + `components/insights/InsightsScreen.tsx`

**Findings**:
- 🟡 [InsightsScreen.tsx:864–870] `activeChild ?? children[0]` defaults `ageMonths = 12`. Pregnancy users without a child get kids-aged articles.
- 🟡 [InsightsScreen.tsx:934–944] `STARTER_TITLES` English-only.
- 🟡 [InsightsScreen.tsx:880–895] Queries keyed on `mode` without `userId` partition — same-device account switch reuses prior account's insights until staleTime.
- 🟡 [InsightsScreen.tsx:899–914] Failed `generateInsights(mode)` shows error string but no retry button.

---

## 18. Exchange / Garage / Channels (pregnancy context)

### 18.1 Exchange
**Findings**:
- 🔴 [exchange/create.tsx:21–28] Categories enum `clothing/toys/gear/furniture/books/other`. No `maternity_wear`, `nursery_setup`. Yet pregnancy filter pills (`modeConfig.ts:58,83`) include "Maternity Wear", "Nursery Setup" — pills can never match listings.
- 🟡 [exchange/create.tsx:49–66] Listings carry no `behavior`/`mode` tag — global feed mixes maternity items with kid items.
- 🟢 No "Looking for" / wanted listing type for expectant parents.

### 18.2 Channels
**Findings**:
- 🔴 [ChannelsScreen.tsx:91–96] Substring match on "pregnancy | expecting | birth | prenatal" — "Pre-Pregnancy Trying" matches `pregnancy` and pollutes wrong segment.
- 🟡 [ChannelsScreen.tsx:40–44] `BEHAVIOR_TAGS` keys `'pre-pregnancy' | 'pregnancy' | 'kids'` conflict with `'pre' | 'preg' | 'kids'` shorthand used elsewhere.
- 🟢 [ChannelsScreen.tsx:90] "Trending" is first 5 channels in load order, not real trending math.

---

## 19. Tab Bar — `app/(tabs)/_layout.tsx`

**Findings**:
- 🔴 [_layout.tsx:66] Agenda tab label hardcoded `t('tab_calendar')` — never reads `getModeConfig(mode).tabs.agenda.label`. Pregnancy spec: "Agenda".
- 🔴 [_layout.tsx:384–389] Tab icon sticker colors fixed (yellow, blue, green, lilac). Active tint should drive from `getModeColor(mode, isDark)`. Identical across all 3 modes.
- 🔴 [_layout.tsx:444–454] Active state visual never mode-driven.
- 🟡 Vault tab label hardcoded `t('tab_analytics')`; pregnancy spec says "Documents".

---

## 20. AI Chat — `lib/grandmaChat.ts` + `supabase/functions/grandma-chat`

**Findings**:
- 🔴 [lib/grandmaChat.ts:16–25] `ChatContext` has no `weekNumber`/`dueDate`. Grandma's pregnancy prompt always falls back to generic "user is pregnant".
- 🔴 [components/chat/GrandmaTalk.tsx:983–989] Never reads `usePregnancyStore`.
- 🟡 [lib/grandmaChat.ts:70] `nana-chat` fallback hardcodes `weekNumber: null`.
- 🟡 [grandma-chat/index.ts:73] `sinceDate` for log retrieval uses UTC date. Evening logs west of UTC excluded from 7-day window.

---

## 21. Badges — `store/useBadgeStore.ts`

**Findings**:
- 🔴 [useBadgeStore.ts:37–92] Of 36 `BADGE_DEFS`, **0** are pregnancy-only.
- 🔴 [useBadgeStore.ts:264–313] `syncFromData` accepts only kids metrics — no `kicks_days`, `weight_entries`, `appointments_attended`, `weeks_logged`.
- 🟡 [useBadgeStore.ts:64–66] `health_vaccine` displayed in strip but unreachable in pregnancy mode.
- 🟡 [useBadgeStore.ts:103–111] `DAILY_REWARDS` caps at day 7 universally — no pregnancy milestone payouts (e.g. "30 weeks reached").

---

## 22. Cross-cutting

- 🔴 9 instances of `new Date().toISOString().split('T')[0]` across pregnancy code (UTC bug). Cluster: AffirmationRevealCard ×3, TodayDashboardModal ×2, PregnancyJourneyRing ×2, PregnancyAnalytics ×1, onboarding/pregnancy ×1, plus grandma-chat edge function.
- 🔴 ~20 sites use `brand.pregnancy` directly instead of `getModeColor(mode, isDark)`. Dark mode shows wrong brightness.
- 🟡 6 files have the `isDark ? colors.x : '#hex'` anti-pattern that duplicates what `colors.*` already resolves.
- 🟡 i18n: ~100+ hardcoded English strings across pregnancy components. None go through `lib/i18n`.
- 🟡 Accessibility: only 2 `accessibilityLabel` instances across entire pregnancy scope. Routine chips, reminder cards, birth-guide tiles, kick/contraction buttons, all modal close buttons lack labels and roles.
- 🟡 Modal `onRequestClose` audit needed across pregnancy modals — at minimum `AppointmentList Modal:299`.

---

## Missing features

| # | Feature | Why parents expect it | Effort | Where it would slot in |
|---|---------|-----------------------|--------|------------------------|
| 1 | Contraction history view + pattern detection | `ContractionTimer` logs exist; no UI visualises frequency/duration — labor onset is the pregnancy event. | M | `PregnancyCalendar` "Logged this week" + `app/insights.tsx` |
| 2 | Kick-count daily target + missed reminder | Reduced fetal movement is a clinical warning sign. | S | `RemindersSection.tsx` + `lib/notificationEngine.ts` |
| 3 | Weight-gain IOM/WHO band overlay | Over/under gain unnoticed today. | M | `WeightTrendCard.tsx` enhancement |
| 4 | Glucose log type (GDM) | GDM affects 6–10% of pregnancies; daily glucose unloggable. | M | `PregnancyLogForms.tsx` + `log_type` enum |
| 5 | Blood-pressure log type (preeclampsia) | Preeclampsia is a leading maternal mortality cause. | M | New `pregnancy_logs` type + form + analytics card |
| 6 | Birth-plan share / PDF export | Birth plan is meant to be shared with care team. | M | `app/birth-plan.tsx` + `react-native-print` or edge function |
| 7 | Persistent hospital-bag checklist | Items are decorative `View`s today. | S | `app/birth-plan.tsx` + `usePregnancyStore` |
| 8 | Appointment prep questions list | Users forget questions between visits. | S | `AppointmentDetailModal.tsx` |
| 9 | Real-time partner/care-circle presence | Wire `PartnerDashboard` (or replace) to `care_circle`. | L | `components/pregnancy/PartnerDashboard.tsx` |
| 10 | Scheduled push for week milestones + appointments | Notification types declared but no scheduler. | L | `lib/notificationEngine.ts` + `expo-notifications` + persistence in `profile/notifications.tsx` |
| 11 | Multi-language pregnancy pillar content | `lib/pregnancyPillars.ts` English-only. | L | `lib/pregnancyPillars.ts` + locale JSON |
| 12 | Postpartum mode-handoff at week 40+ | No prompt to switch pregnancy → kids with carryover. | M | New `app/onboarding/postpartum-handoff.tsx` |
| 13 | Symptom severity timeline | `pregnancy_logs.severity` column exists; nothing plots it. | M | `components/analytics/PregnancyAnalytics.tsx` |
| 14 | Provider directory / callable contact card | OB/GYN/midwife/doula contacts have no home. | S | `app/profile/pregnancy.tsx` + new table |
| 15 | Pregnancy-aware badge category | `syncFromData` accepts no pregnancy metrics. | M | `store/useBadgeStore.ts` + `lib/badgeSync.ts` |
| 16 | Pregnancy logs in leaderboard | View ignores `pregnancy_logs`/`cycle_logs`. | M | New migration extending `leaderboard_scores` |

---

## Top 10 fixes ranked by ROI

1. 🔴 **Pass `weekNumber` + `dueDate` to grandma-chat** (`lib/grandmaChat.ts:16–25`, `GrandmaTalk.tsx:983–989`, `grandma-chat/index.ts`). Effect: every pregnancy chat answer becomes personalised. Effort: S.
2. 🔴 **Port `app/(tabs)/library.tsx` off neon-dark to cream-paper tokens.** Single highest visual-regression fix. Effort: M.
3. 🔴 **Wire `ContractionTimer.onSave` to actually persist sessions.** Currently dead. Effort: S.
4. 🔴 **Replace 9 UTC date-string sites with `toDateStr(new Date())`.** Effort: S (mechanical sweep).
5. 🔴 **Surface insert errors in `app/onboarding/pregnancy/index.tsx:125–207`.** Block onboarding completion on required-table failure. Effort: S.
6. 🔴 **Fix scan paywall in pregnancy mode** (`app/scan.tsx:117–125`). Make `scan_history` insert mode-aware; count scans per-user not per-child. Effort: S.
7. 🔴 **Migrate 3 agenda components (ContractionTimer / KickCounter / AppointmentList) to `useTheme()`.** Effect: light-mode renders correctly. Effort: M.
8. 🔴 **Add pregnancy metrics to `useBadgeStore.syncFromData`.** Effect: pregnancy users earn badges. Effort: S–M.
9. 🔴 **Add `pregnancy_logs` (and `cycle_logs`) sum to `leaderboard_scores` migration.** Effort: M (migration + cache regen).
10. 🔴 **Persist `profile/notifications.tsx` toggles** + register with `expo-notifications`. Effort: M.

---

## Audit limitations

Static source review across four parallel passes (design / mode / ux / gap-fill). This audit did NOT:

- Run the app on a device or simulator — animation timing, scroll feel, haptics, real share-sheet behavior not validated.
- Execute DB queries against real RLS — `leaderboard_scores` claims are from migration SQL.
- Run `grandma-chat` / `nana-chat` / `generate-insights` / `scan-image` against a pregnancy account — prompt-context drift inferred from prompt strings.
- Audit `lib/insights.ts` / `generate-insights` internals — only the consumer (`InsightsScreen.tsx`) was reviewed.
- Validate Android-specific permission / clipboard paths on a physical device — Android findings based on Expo SDK contract.
- Inspect every modal animation / transition — limited to `AnimatedFruit` + `AffirmationShareModal`.
- Cover `food-ai`, `revenuecat-webhook`, `invite-caregiver`, `accept-invite` edge functions.
- Verify full i18n key coverage — translation gaps noted only when blatant.
- Test mode-switch transitions end to end (kids → pregnancy → cycle).
- Verify `pillarPalette()` chart colors inside `PregnancyAnalytics` deeper modal layers.

Treat each per-line citation as a starting point for verification, not as proof of runtime behavior.
