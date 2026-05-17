# Pregnancy Mode Audit — Gaps (2026-05-12)

> Companion to the design / mode / ux audits. Covers surfaces that were NOT exhaustively walked in the earlier three documents.
> Findings ranked within each sub-surface by severity: 🔴 critical · 🟡 warning · 🟢 polish.

## Summary

- **Additional surfaces audited**: 16
- **Critical (🔴)**: 14
- **Warnings (🟡)**: 33
- **Polish (🟢)**: 14
- **Net-new missing features identified**: 16

### Top 5 newly discovered risks

1. **`MilkTracker.tsx` and `MilkControl.tsx` are completely dead UI** — neither is imported anywhere in `app/` or `components/`. They are reachable through code search only, and both show pregnancy-irrelevant breast/bottle/pump controls. Risk if anyone wires them up: pregnancy users see postnatal feeding UI.
2. **Pregnancy users earn zero badges from their logs.** `useBadgeStore.syncFromData` (`store/useBadgeStore.ts:264-313`) only takes kids-only metrics — no `pregnancy_logs`, no kicks, no weight entries, no appointments. Streaks survive but every category badge is unreachable in pregnancy mode.
3. **Leaderboard ignores pregnancy logs entirely.** `leaderboard_scores` view (`supabase/migrations/20260412020000_leaderboard_and_points.sql:23,64`) joins on `child_logs` only. A pregnant user who logs daily has zero `child_logs` rows and stays at the bottom of the global ranking forever.
4. **Scan history requires a `child_id`** (`app/scan.tsx:117-125`). Pregnancy-only users have no child row, so every scan returns a result but persists nothing — and the free-scan counter (line 56-58) reads only `scan_history` filtered by child IDs, so they get an unlimited "free" scan loop until they create a child.
5. **`app/profile/notifications.tsx` toggles are pure `useState`** (line 60-65) — no AsyncStorage, no DB write, no push registration. Every pregnancy-specific preference (Appointment Reminders, Milestone Alerts) silently resets on screen unmount.

---

## 1. MilkTracker — `components/home/MilkTracker.tsx`

**Findings**:
- 🔴 [MilkTracker.tsx:21] Unreferenced anywhere in `app/` or `components/`. Dead code.
- 🔴 [MilkTracker.tsx:10-15] All four feed types (left/right breast, bottle, pump) are postnatal — placing this under `components/home/` next to pregnancy code is dangerous if anyone wires it up.
- 🟡 [MilkTracker.tsx:33] `onPress` calls optional `onLog?` with no default; tap currently no-ops.
- 🟡 [MilkTracker.tsx:79] Raw `#141313` border violates "no raw hex" rule.
- 🟢 [MilkTracker.tsx:48,87] Hint copy not i18n'd; unused `feedIcon` style.

## 2. MilkControl — `components/pregnancy/MilkControl.tsx`

**Findings**:
- 🔴 [MilkControl.tsx:30] Also fully dead — no importer. Lives under `components/pregnancy/` but tracks postnatal feeds.
- 🔴 [MilkControl.tsx:20-24] Emoji icons (`🤱`, `🍼`, `⏱️`) violate the design-system "no emoji UI" rule; render flat on older Android.
- 🟡 [MilkControl.tsx:57] `sessions.slice(0, 5)` truncates without a "View all" affordance.
- 🟢 [MilkControl.tsx:59] `replace('_', ' ')` replaces only the first underscore — `breast_left_side` → "breast left_side".
- 🟢 [MilkControl.tsx:147-152] Empty-state copy not i18n'd.

## 3. WeekRuler — `components/home/pregnancy/WeekRuler.tsx`

**Findings**:
- 🟡 [WeekRuler.tsx:29,33] `MAX_CM = 51` hard-clamps. Weeks 40-42 with above-51cm babies clip to the right edge with no "beyond range" indicator.
- 🟡 [WeekRuler.tsx:35] Label format thresholds (`< 1` → 2dp, `< 10` → 1dp) crowd the "0" end label at very early weeks.
- 🟡 [WeekRuler.tsx:54] Hardcoded `fontFamily="Fraunces_700Bold"` — app loads `Fraunces_600SemiBold`. On Android this falls back to system serif.
- 🟢 [WeekRuler.tsx:43-47] Ruler doesn't honor RTL locales; grows left-to-right unconditionally.

## 4. AnimatedFruit + babyIllustrations — `components/home/pregnancy/`

**Findings**:
- 🔴 [babyIllustrations.tsx:628-636] Fallback for `week > 40` (and `week < 1`) is a pumpkin shared with week 40 — no "post-due" copy. Weeks 41-42 users see the same fruit as 40-week users.
- 🟡 [AnimatedFruit.tsx:38-44] Loop is keyed on `[motion, anim, anim2]` but on motion change cleanup stops but does not reset `anim` to 0 — re-mount starts mid-phase, visible jump.
- 🟡 [babyIllustrations.tsx:186] `switch (week)` has no case for 0; transient `0` from in-flight due-date edits falls to pumpkin.
- 🟢 [AnimatedFruit.tsx:88-92] `Easing.back(1.5)` on `squish` overshoots container bounds — clips in `overflow: hidden` parents.
- 🟢 [babyIllustrations.tsx:13-23] Full SVG tree reconciles every animation frame (no `React.memo`).

## 5. AffirmationShareModal — `components/home/pregnancy/AffirmationShareModal.tsx`

**Findings**:
- 🔴 [AffirmationShareModal.tsx:316-319] When user denies `MediaLibrary` permission the toast fires once but the modal never offers a Settings path — they're stuck unless they long-press every template to copy.
- 🔴 [AffirmationShareModal.tsx:307-309] `Clipboard.setImageAsync(base64)` is iOS-only in current Expo SDK; Android throws into the generic `Copy failed` toast with no Android guidance.
- 🟡 [AffirmationShareModal.tsx:116-140] `handleHeaderShare` always shares `templates[0]` regardless of which tile the user is viewing — no per-tile share affordance besides long-press copy.
- 🟡 [AffirmationShareModal.tsx:56-72] Two animation loops `Animated.loop` started in `useEffect` with no `visible` gating — burn CPU while the parent screen is still mounted.
- 🟡 [AffirmationShareModal.tsx:73] `useEffect` deps array `[]` despite reading `delay`/`duration`/`floatY` — props can change without re-binding.
- 🟢 [AffirmationShareModal.tsx:343,472] Hardcoded `#1A1713` and `#141313` bypass theme tokens.

## 6. WeeklyInsight — `components/pregnancy/WeeklyInsight.tsx`

**Findings**:
- 🔴 [WeeklyInsight.tsx:11] Unreferenced — dead code.
- 🔴 [WeeklyInsight.tsx:12] `getWeekData` clamps to weeks 1-40 (`pregnancyData.ts:55`). Weeks 41-42 silently get week-40 content.
- 🟡 [WeeklyInsight.tsx:5] Imports static `colors` not `useTheme()` — dark mode broken.
- 🟡 [WeeklyInsight.tsx:23,47] Body text has no `numberOfLines` cap; long content collapses the stats row.
- 🟢 [WeeklyInsight.tsx:54-58] "WEEK X DEEP DIVE" not i18n'd.

## 7. PartnerDashboard — `components/pregnancy/PartnerDashboard.tsx`

**Findings**:
- 🔴 [PartnerDashboard.tsx:34] Unreferenced component.
- 🔴 [PartnerDashboard.tsx:11-22] Only 10 tips across 40 weeks — long stretches (weeks 2-7, 9-11, 13-15, 17-19, 21-23, 25-27, 29-31, 33-35, 37-39) all repeat the previous tip.
- 🟡 [PartnerDashboard.tsx:25-31] `getPartnerTip` returns week-1 tip for `week < 1`.
- 🟡 [PartnerDashboard.tsx:49-58] "Shared appointments" and "Partner's guide" are non-pressable decorative `View`s.
- 🟡 [PartnerDashboard.tsx:5] Static `colors` (not `useTheme()`); dark-mode broken.

## 8. Daily Rewards (pregnancy context) — `app/daily-rewards.tsx`

**Findings**:
- 🔴 [daily-rewards.tsx:86-92] `MODE_QUEST_COPY` keys include `'pre'` / `'preg'` aliases that don't exist in `JourneyMode` (`'pre-pregnancy' | 'pregnancy' | 'kids'`). Functionally right copy lands via `'pregnancy'` but the file shows store-key drift.
- 🔴 [daily-rewards.tsx:89-90] Pregnancy quest is hard-coded "Drink 8 glasses of water" every day. No week-awareness (kicks at 28w+, contractions near 40w). Home reminders are richer than the rewards page.
- 🟡 [daily-rewards.tsx:74-83] Reward categories `nutrition / sleep / mood / health / growth` all map to existing `pregnancy_logs` types — but `syncFromData` is kids-only, so badges are unreachable in pregnancy.
- 🟡 [daily-rewards.tsx:178] Day-3 badge only awarded on literal 3rd check-in via the rewards screen — a pregnant user who logs daily but doesn't tap "Check in" never earns it.
- 🟡 [daily-rewards.tsx:96-104] Points-breakdown modal shows "+1 Child log entry" — no mention of `pregnancy_logs` or `cycle_logs`.
- 🟢 [daily-rewards.tsx:226] "Grandma is proud of you, dear." not i18n'd.

## 9. Leaderboard (pregnancy) — `app/leaderboard.tsx` + `lib/leaderboard.ts`

**Findings**:
- 🔴 [migration 20260412020000:23,64] `leaderboard_scores` view sums `garage_posts`, `channel_posts`, `channel_reactions`, `channels_joined`, `child_logs`. No `pregnancy_logs`, no `cycle_logs`. Pregnant users score zero from their primary daily activity.
- 🔴 [lib/leaderboard.ts:102] Fallback aggregator also only queries `child_logs` — same problem in fresh schemas.
- 🟡 [app/leaderboard.tsx:421-422] Users not in the view show as "unranked" with no message explaining pregnancy mode doesn't currently earn ranking points.
- 🟡 No filter for "pregnancy peers only" — pregnant users compete against kids power-loggers logging 20+ child_logs/day.

## 10. Notifications Inbox (pregnancy) — `app/notifications.tsx`

**Findings**:
- 🔴 [notifications.tsx:145-160] `vaccine_due`, `health_alert`, `daily_summary`, `weekly_report`, `goal_achieved`, `goal_missed` all route to `/(tabs)/vault`. Pregnancy vault has no vaccine/goal/summary destinations — user lands on documents/birth plan, stranded.
- 🔴 [notifications.tsx:145+] `pregnancy_week` notification type (declared in `lib/notifications.ts:10`) has no case → tap is a no-op.
- 🔴 [notifications.tsx:166-167] `appointment` type has no explicit route; falls through default unless tagged as `reminder`. Cycle predictions / pregnancy_week have no `TYPE_CONFIG` entry either (line 84-115), so they render as a generic lilac bell.
- 🟡 [notifications.tsx:245-253] `inferBehavior` returns `null` unless `data.behavior` is set; server-generated pregnancy notifications without the tag never match the Pregnancy behavior filter.
- 🟢 [notifications.tsx:218] Date headers use `'en-US'` locale unconditionally.

## 11. Badges (pregnancy) — `store/useBadgeStore.ts`

**Findings**:
- 🔴 [useBadgeStore.ts:37-92] Of 36 `BADGE_DEFS`, **0** are pregnancy-only. Every non-streak / non-community badge is gated on kids metrics (vaccines, diapers, feedings, growth).
- 🔴 [useBadgeStore.ts:264-313] `syncFromData` accepts only kids metrics — no `kicks_days`, `weight_entries`, `appointments_attended`, `weeks_logged`. Pregnant users earn streak + check-in badges only.
- 🟡 [useBadgeStore.ts:64-66] `health_vaccine` is displayed in the strip but unreachable in pregnancy mode (vaccines tab hidden).
- 🟡 [useBadgeStore.ts:103-111] `DAILY_REWARDS` caps at day 7 universally — no pregnancy milestone payouts (e.g. +100 pts at "30 weeks reached").

## 12. Scan flow (pregnancy) — `app/scan.tsx` + edge function

**Findings**:
- 🔴 [scan.tsx:26-31] `SCAN_TYPES` are `medicine / food / nutrition / general` — no ultrasound, no lab-result, no prenatal-vitamin label. The edge function supports `exam` (scan-image/index.ts:112-145) but the UI never exposes it.
- 🔴 [scan.tsx:117-125] `scan_history` insert is gated on `child.id`; pregnancy users without a child save no history. The free-scan counter (line 56-58) `.in('child_id', childIds)` then stays at 0 forever = effectively unlimited free scans in pregnancy mode = broken paywall.
- 🔴 [scan-image/index.ts:145+] Base Guru Grandma prompt is hard-coded around child / feeding / allergies. Pregnancy-relevant context (week, due date, GDM) is never passed.
- 🟡 [scan.tsx:108-113] `scanImage()` passes `child` even when pregnancy mode is active and `child` is undefined; edge function falls back to generic persona.

## 13. Settings + profile/notifications — `app/(tabs)/settings.tsx`, `app/profile/notifications.tsx`

**Findings**:
- 🔴 [profile/notifications.tsx:60-65] All 7 toggles are `useState` only — not persisted, not synced, not registered with `expo-notifications`. Every toggle resets on unmount.
- 🔴 [profile/notifications.tsx:27-35] Mixed-mode list: `cycle_predictions` irrelevant in pregnancy; `milestones` ambiguous; no `kick_counts`, `weekly_pregnancy_update`, or `birth_prep_countdown`.
- 🟡 [settings.tsx:253-261] `pregnancySummary` reads from `usePregnancyStore.dueDate` but the source of truth in other places is `useJourneyStore.dueDate` — edits in one store leave the settings row stale.
- 🟡 [settings.tsx:319-325] "Subscription" row value is always literal `Upgrade` regardless of `isPremium` — premium users still see "Upgrade".
- 🟢 [profile/notifications.tsx:116] Switch trackColor is `brand.pregnancy` regardless of active mode.

## 14. Insights screen (pregnancy) — `components/insights/InsightsScreen.tsx`

**Findings**:
- 🟡 [InsightsScreen.tsx:864-870] `activeChild ?? children[0]` defaults `ageMonths = 12`. Pregnancy users without a child get kids-aged articles, not pregnancy content.
- 🟡 [InsightsScreen.tsx:934-944] `STARTER_TITLES` is English-only; translated starter nudges never auto-replace.
- 🟡 [InsightsScreen.tsx:880-895] Three queries keyed on `mode` with no `userId` partition — same-device account switch reuses prior account's insights until staleTime.
- 🟡 [InsightsScreen.tsx:899-914] Failed `generateInsights(mode)` sets an error string but surfaces no retry button — user must pull-to-refresh again.

## 15. Birth-plan — `app/birth-plan.tsx`

**Findings**:
- 🔴 [birth-plan.tsx:91-96] Hospital-bag "checklist" is static `View` circles — no Pressable, no toggle, no persistence. Pure decoration.
- 🔴 [birth-plan.tsx:21] No state at all. A birth plan can be browsed but never selected, saved, exported, or shared. The screen is purely educational.
- 🟡 [birth-plan.tsx:14-19] `BIRTH_TYPE_TO_TOPIC` only covers 4 ids; extra `birthTypes` entries render as cards with no `onPress` → silently unclickable.
- 🟡 [birth-plan.tsx:106-109] "Ask Grandma" exits to `/grandma-talk` without pre-populating the selected topic — user retypes.
- 🟢 [birth-plan.tsx:43] Italic subtitle not i18n'd; back button is a small circle instead of `PillButton`.

## 16. Exchange / Channels (pregnancy) — `app/(tabs)/exchange.tsx`, `app/exchange/create.tsx`, `ChannelsScreen.tsx`

**Findings**:
- 🔴 [exchange/create.tsx:21-28] `CATEGORIES` enum is `clothing / toys / gear / furniture / books / other`. No `maternity_wear`, `nursery_setup`, `prenatal_supplies`. Yet pregnancy-mode filter pills (`modeConfig.ts:58,83`) include "Maternity Wear" / "Nursery Setup" — pills can never match listings users create.
- 🔴 [ChannelsScreen.tsx:91-96] Pregnancy suggestions match by substring on `name|description` against `pregnancy | expecting | birth | prenatal`. A channel called "Pre-Pregnancy Trying" matches `pregnancy` and pollutes the wrong segment.
- 🟡 [ChannelsScreen.tsx:40-44] `BEHAVIOR_TAGS` keys are `'pre-pregnancy' | 'pregnancy' | 'kids'` — lookup works but conflicts with the `pre / preg / kids` shorthand used elsewhere.
- 🟡 [exchange/create.tsx:49-66] Listings carry no `behavior`/`mode` tag — global feed mixes maternity items with kid items without server-side filtering.
- 🟢 [exchange/create.tsx:15-19] No "Looking for" / wanted listing type for expectant parents seeking hand-me-downs.
- 🟢 [ChannelsScreen.tsx:90] `trending` is the first 5 channels in load order, not real trending math.

---

## Missing features

| # | Feature | Why | Effort | Slots in |
|---|---------|-----|--------|----------|
| 1 | Contraction history view + pattern detection | `ContractionTimer` logs exist; no UI visualises frequency/duration — labor onset is *the* pregnancy event. | M | `PregnancyCalendar` "Logged this week" + `app/insights.tsx` |
| 2 | Kick-count daily target + missed reminder | Reduced fetal movement is a clinical warning sign; no target, no alert today. | S | `RemindersSection.tsx` + `lib/notificationEngine.ts` |
| 3 | Weight-gain IOM/WHO band overlay | Weight logs aren't plotted against medical bands; over/under gain unnoticed. | M | `WeightTrendCard.tsx` enhancement |
| 4 | Glucose log type (GDM) | GDM affects 6-10% of pregnancies; daily glucose unloggable. | M | `PregnancyLogForms.tsx` + `log_type` enum |
| 5 | Blood-pressure log type (preeclampsia) | Preeclampsia is a leading cause of maternal mortality; BP unloggable. | M | New `pregnancy_logs` type + form + analytics card |
| 6 | Birth-plan share / PDF export | Birth plan is meant to be shared with the care team. | M | `app/birth-plan.tsx` + `react-native-print` or edge function |
| 7 | Persistent hospital-bag checklist | Items are decorative `View`s today. | S | `app/birth-plan.tsx` + `usePregnancyStore` |
| 8 | Appointment prep questions list | Users forget questions between visits. | S | `AppointmentDetailModal.tsx` |
| 9 | Real-time partner/care-circle presence | Wire `PartnerDashboard` to `care_circle` for live week/log view. | L | `components/pregnancy/PartnerDashboard.tsx` |
| 10 | Scheduled push for week milestones + appointments | `pregnancy_week`/`appointment` notification types declared but no scheduler. | L | `lib/notificationEngine.ts` + `expo-notifications` + persistence in `profile/notifications.tsx` |
| 11 | Multi-language pregnancy pillar content | `lib/pregnancyPillars.ts` is English-only. | L | `lib/pregnancyPillars.ts` + locale JSON |
| 12 | Postpartum mode-handoff at week 40+ | No prompt to switch pregnancy → kids with data carryover. | M | New `app/onboarding/postpartum-handoff.tsx` |
| 13 | Symptom severity timeline | `pregnancy_logs.severity` column exists; nothing plots it. | M | `components/analytics/PregnancyAnalytics.tsx` |
| 14 | Provider directory / callable contact card | OB/GYN/midwife/doula contacts have no home. | S | `app/profile/pregnancy.tsx` + `provider_contacts` table |
| 15 | Pregnancy-aware badge category | `syncFromData` accepts no pregnancy metrics. | M | `store/useBadgeStore.ts` + `lib/badgeSync.ts` |
| 16 | Pregnancy logs in leaderboard | View ignores `pregnancy_logs`/`cycle_logs`. | M | New migration extending `leaderboard_scores` |

## Audit limitations

Static source review only — `grep`/`Read` on individual files. This audit did NOT:

- Run the app on a device or simulator — animation timing, scroll feel, haptics, and actual share-sheet behavior were not validated end-to-end.
- Execute DB queries against real RLS policies — `leaderboard_scores` claims are from migration SQL, not `EXPLAIN`.
- Run `nana-chat` / `grandma-chat` / `generate-insights` / `scan-image` against a pregnancy account — prompt-context drift is inferred from prompt strings, not measured outputs.
- Audit `lib/insights.ts` and the `generate-insights` edge function internals — only the consumer (`InsightsScreen.tsx`) was reviewed.
- Validate Android-specific permission / `MediaLibrary` / clipboard paths on a physical device — `AffirmationShareModal` Android findings are based on the Expo SDK contract.
- Inspect every modal animation / transition — animation review was limited to `AnimatedFruit` and `AffirmationShareModal`.
- Cover `food-ai`, `revenuecat-webhook`, `invite-caregiver`, `accept-invite` edge functions — minimal pregnancy-specific surface.
- Re-audit any surface already covered by the design/mode/ux audits.
- Verify full i18n key coverage — translation gaps noted only when blatant.

Treat each per-line citation as a starting point for verification, not as proof of runtime behavior.
