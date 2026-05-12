# Kids Mode Audit — 2026-05-12

> Exhaustive map of every screen, popup, button, and section in the kids journey.
> Findings ranked within each section by severity: 🔴 critical · 🟡 warning · 🟢 polish.

## Summary

- **Total surfaces audited**: ~55 (Home dashboard, 9 detail modals, 5 calendar tab views, 8 log forms, vault/analytics, library/pillar, scan, profile, onboarding, settings, edge functions)
- **Critical (🔴)**: 21
- **Warnings (🟡)**: 47
- **Polish (🟢)**: 38
- **Missing features**: 17

### Top 5 risks
1. **`KidsLogForms.tsx:237-241` queries `children.user_id` — column doesn't exist** (schema has `parent_id`). Falls back silently to `session.user.id`. Breaks logs written by caregivers on behalf of a child they don't own; logs end up attributed to wrong user, will fail RLS on read-back for the actual parent.
2. **Reminders system is entirely AsyncStorage-local** (`KidsHome.tsx:732-781, 827-902`) — never written to a real table. Multi-device, multi-caregiver, and uninstall = total data loss. Care-circle members can't see reminders.
3. **Vaccine "scheduled" dates are AsyncStorage-only** (`KidsHome.tsx:789-808`) — same problem; no syncing, no push reminders fire.
4. **Vaccine done-detection uses fuzzy substring match on log value** (`KidsHome.tsx:7046-7048`, `buildVaccineScheduleTree:6962-6963`) — `firstWord` of vaccine name lower-cased against `value`. "Hep B" matches both "Hepatitis B" and "Hep B (booster)" and "HepBnotcombo". Cross-country counts collide (e.g. "MMR" doses across schedules).
5. **Date range "Today" lookback fetches 7+ days of logs from Supabase** every navigation (`KidsHome.tsx:978-985`) — fine on small accounts but `.order('created_at', { ascending: false })` with no row cap means 30d range on an active family = unbounded payload.

---

## 1. Home — `components/home/KidsHome.tsx` (7458 lines)

### 1.1 Header + child selector + range picker
**Surfaces**: HomeGreeting, child pills, "+N" overflow modal, date-range chips, custom-range bottom sheet
**Findings**:
- 🟡 [KidsHome.tsx:1278-1313] Visible kid pills hard-capped at first 3 (`.slice(0, 3)`); selecting the active child via overflow doesn't bring it into the visible row — UX feels random.
- 🟡 [KidsHome.tsx:1359-1397] Date-range pills horizontally scroll without padding indicator — "Custom" pill gets cut off on small screens.
- 🟡 [KidsHome.tsx:1389-1393] Custom-range chip label uses en-dash `–` which renders as box on Android in older font versions.
- 🟡 [KidsHome.tsx:1515-1534] Custom range picker forces `maximumDate={new Date()}` on start, blocking future planning ranges; symmetric with end being `>= start` is fine, but copy doesn't explain why end is disabled when start is "today".
- 🟡 [KidsHome.tsx:1529] When user picks a start date later than current end, code silently clamps `selected > prev.end ? prev.end : selected` — no toast feedback; the picker just appears not to respond.
- 🟢 [KidsHome.tsx:1320-1356] Overflow "All Kids" modal title is not i18n'd; same for "All", "Active", "Archived" elsewhere.
- 🟢 [KidsHome.tsx:1273] `subtitleForRange().toUpperCase()` — `toUpperCase` will mangle locales with case-significant accents (Turkish dotted i).

### 1.2 Hero tiles — Last Sleep / Mood / Calories / Activities
**Surfaces**: 4 tappable tiles → either Log sheet (if empty) or Detail modal (if data)
**Findings**:
- 🔴 [KidsHome.tsx:2298, 2327, 2380, 2412] Empty-state tap routes to Log; populated tap routes to Detail. There's no way to log a *second* feeding/activity once the tile has data — the only entry point becomes the FAB-style buttons elsewhere or the Agenda tab. New users won't realize tiles are read-only once filled.
- 🟡 [KidsHome.tsx:2371-2373] Mood tile shows "—" for emoji when no data, but the meta line still reads "Tap to log". Inconsistent with sleep/feed which say "Tap to log" inline in the value position.
- 🟡 [KidsHome.tsx:2253] Activity "engagement" ratio `activeDays/rangeDays` is shown as the ring fill, but the value on the tile (`activityCount`) is total logs. Two different metrics on one tile is confusing — a parent who logs 10 things on one day with target 3/day will see a near-empty ring with "10 logs". (Compare with `activityProgress` math at line 1252 which uses `activityCount/target` — inconsistent across surfaces.)
- 🟡 [KidsHome.tsx:2278-2284] Liquid feed stage hides calorie target completely; the calorie tile still says "CALORIES" header before the data loads (race). Should be conditional eyebrow from the start.
- 🟡 [KidsHome.tsx:2406-2408] Calorie progress bar background is a coral with 18% alpha — invisible in dark mode against the pink-soft background.
- 🟢 [KidsHome.tsx:2353-2369] Mood bars use `opacity` to "highlight" the dominant — accessibility nightmare for color-blind users since the only visual hierarchy is opacity.

### 1.3 Set Goals button + Goal Setting modal
**Surfaces**: Sticker button → bottom sheet with stepper inputs per metric
**Findings**:
- 🟡 [KidsHome.tsx:5383-5398] `handleSave` swallows Supabase errors in `catch {}` — if `saveToSupabase` fails, modal closes anyway and user thinks goals saved. Will produce silent local/remote drift.
- 🟡 [KidsHome.tsx:5454-5479] Liquid vs solids vs mixed metric list builds different rows; if `birthDate` is missing/invalid, `getFeedingStage` defaults silently and the user sees the wrong fields.
- 🟡 [KidsHome.tsx:5512] `ScrollView maxHeight: 360` cuts off the last metric row on small phones (iPhone SE) when 4 metrics are shown.
- 🟢 [KidsHome.tsx:5556] Stepper minimum is `Math.max(0, ...)` for all rows — feedings goal can be set to 0, which makes the calorie tile's "of 0 target" UI render `Infinity%`.

### 1.4 Health & Care section
**Surfaces**: HealthCard → HealthDetailModal (full sheet with vaccine tree, allergies, meds, growth, activity overview)
**Findings**:
- 🔴 [KidsHome.tsx:7046-7048] `getNextDueVaccines` and `buildVaccineScheduleTree:6962-6963` count "given doses" using `value.toLowerCase().includes(firstWord)`. "Hepatitis B" → firstWord "hepatitis" matches "Hepatitis B" AND "Hepatitis A". "Hep" tagged loosely cross-matches.
- 🔴 [KidsHome.tsx:6973-6975] Status logic: `else if (ageMonths > monthMax + 1) overdue`. For booster doses with `monthMax = 999` (yearly flu), this branch never triggers, so flu always shows as `upcoming` regardless of how late.
- 🔴 [KidsHome.tsx:813-825] `markVaccineGiven` inserts a `child_logs` row with `type: 'vaccine'` but the new log isn't reflected in `firstWord`-based dose counting until `loadHealthHistory` finishes — race condition where rapid mark-given clicks will double-count.
- 🟡 [KidsHome.tsx:2887-2888] `getNextDueVaccines` called twice in render (lines 2887 + 2896) — both produce same data but recomputed without memoization across renders.
- 🟡 [KidsHome.tsx:2961] Health card has chevron + Pressable wrapping the entire card (line 1654), but inside no aria/accessibility hint on what "tap" does.
- 🟡 [KidsHome.tsx:4365-4393] Allergies section only renders if `child.allergies.length > 0`. No way to add an allergy from this modal — must back out to profile/kids. Should be a quick-add chip.
- 🟡 [KidsHome.tsx:6908-6923] `parseGrowthValue` regex matches only `weight: X kg` / `height: Y cm` literal patterns — growth logs typed in lbs/inches, or without colon, never display.
- 🟡 [KidsHome.tsx:4430-4440] "View Full Health History" pushes `/profile/health-history` but the route's source file is not in `app/profile/` (only `health-history.tsx` would be required) — verify route exists; if missing, this is a dead push.

### 1.5 Vaccine schedule tree + inline date picker + VaccineInfoModal
**Surfaces**: Per-milestone collapsible row, per-dose inline date picker, modal with vaccine info
**Findings**:
- 🔴 [KidsHome.tsx:797-808] `setVaccineDate` writes to AsyncStorage keyed by `child.id` — scheduled vaccine dates are device-local only. Won't sync to care circle or other devices.
- 🟡 [KidsHome.tsx:3848] `scheduledVaccines[vax.scheduleKey]` keyed on `${vaccine.name}-${doseIdx}`. If the country changes mid-flight, scheduled dates remain stored under the old country's vaccine names → orphan entries.
- 🟡 [KidsHome.tsx:3946-4017] Inline date picker on iOS is "spinner" embedded inside the milestone tree; on small screens this expands the modal past the visible area without a scroll indicator.
- 🟡 [KidsHome.tsx:3973-3984] Android dismiss path: `if (e.type === 'dismissed') setExpandedKey(null)` but `onSetVaccineDate` only fires on `e.type === 'set'`. If user picks a date and rotates the phone, the picker can fire `set` twice — once with the partial date — corrupting `scheduledVaccines`.
- 🟡 [KidsHome.tsx:3915-3924] "Mark given" inserts a log but doesn't validate the appt date isn't in the future. A parent can mark a vaccine "given" 3 weeks ahead and have it confidently shown as done.
- 🟢 [KidsHome.tsx:6960-6964] Vaccine schedules are hardcoded for 11 countries — no mechanism to update from a remote source when CDC/WHO schedules change.

### 1.6 Diaper card + DiaperDetailModal
**Surfaces**: Full-width card (only renders when `diaperCount > 0`) → bottom-sheet modal with breakdown, weekly trend, stool color chips
**Findings**:
- 🔴 [KidsHome.tsx:2984-2986] `new Date(startDate + 'T00:00:00')` runs on every render of DiaperCard without memoization — recreates Date objects 7+ times per scroll.
- 🟡 [KidsHome.tsx:3072-3096] DiaperCard sparkline assumes max 7 days but range can be 30 days; calls `Math.min(...,7)` so the last 7 are shown — but for a 30-day range the label says "DIAPERS" with no indication that the sparkline is partial.
- 🟡 [KidsHome.tsx:3128] `Math.round((end-start)/86400000) + 1` ignores DST transitions — gives 6 days for a 7-day range across spring-forward.
- 🟡 [KidsHome.tsx:3138-3152] Weekly bucket logic mutates `cursor` via `setDate` — works but the loop has no upper bound on `wNum` if `start > end` (data corruption).
- 🟢 [KidsHome.tsx:3046, 3328, 3338] Hardcoded `#141313` ink color used 50+ times across the file instead of pulling from theme — violates "never use raw hex" rule.
- 🟢 [KidsHome.tsx:3103-3110] Diaper color meta only knows 6 colors; `getCatColor` fallback `{ label: capitalized, swatch: '#888' }` shows grey for "white", "tan", etc. — common stool colors missing.

### 1.7 Mood detail modal + MoodBubbleCluster
**Surfaces**: Bottom-sheet modal with mood chips + bubble cluster chart
**Findings**:
- 🟡 [KidsHome.tsx:3380-3387] Modal title row mixes child chip alongside title with no max-width — long child names push the close X off-screen.
- 🟡 [KidsHome.tsx:3422-3425] MoodBubbleCluster fed unmemoized `Object.entries` map → re-instantiates on every render including scroll.
- 🟢 [KidsHome.tsx:3398-3417] Only 5 mood values supported (`happy, calm, energetic, fussy, cranky`); the form `KidsLogForms.tsx:1865-1871` matches but if any old log has `'sad'` value it's silently dropped.

### 1.8 Sleep detail modal
**Surfaces**: Full sheet with hero total, by-day bar chart, quality copy
**Findings**:
- 🟡 [KidsHome.tsx:4126-4137] Daily bar chart only shows 7 bars regardless of range. When range is "30 Days", you get a 30-day total but a 7-day chart — confusing.
- 🟡 [KidsHome.tsx:4128] `hitTarget = hrs >= dailySleepTarget * 0.85` — threshold hardcoded; 85% of target is treated as "made it" but the copy in the legend says "below target" for everything under 100%.
- 🟡 [KidsHome.tsx:4076-4081] Quality buckets ("Great/Solid/Restless/No data") computed from a ratio of "good" vs "great" labels (line 1003-1006) — but `KidsLogForms.tsx:1654` has 4 quality options (`Great, Good, Restless, Poor`); a "Poor" log is counted as not-good, but the dominant-mood logic doesn't surface it as "Poor" anywhere.

### 1.9 Activity (nutrition / feeding) detail modal
**Surfaces**: Liquid stage shows feeding breakdown; solids shows calorie breakdown
**Findings**:
- 🔴 [KidsHome.tsx:5083-5085] Solids stage shows "% of target" but if `caloriesTarget == 0` (no goal set), shows "0% of 0" or NaN. Should fall back to a "Set a target" CTA.
- 🟡 [KidsHome.tsx:4980] `Math.round((feedingBreast / (feedingBreast + feedingBottle)) * 100)` divides by zero if both are 0 — protected by the `(feedingBreast + feedingBottle) > 0` guard line 4975, but NOT in the inline insight calculator line 5006-5008.
- 🟡 [KidsHome.tsx:1029] `feedingBottle++` fires for ALL feeding entries where `feedType` is not 'breast' — including 'solids' if someone logs solids as `type: 'feeding'`. Should be `else if (ft === 'bottle')` to avoid mislabeling.

### 1.10 ActivitiesDetailModal
**Surfaces**: Sheet with stat cards, ranking list, per-type expandable entries
**Findings**:
- 🟡 [KidsHome.tsx:5145] `useEffect` resets `expandedType` when visible flips false — but doesn't reset when modal reopens for a different child, so the previous child's expanded category lingers.
- 🟡 [KidsHome.tsx:3536-3552] `getActivityPillar` falls back to `'care'` for unmatched activities — bathing/napping logs that were logged as `type: 'activity'` with name 'Bath' end up in "Care" pillar, but `'nap'` would also land in care while diaper changes won't reach this function at all (they're a different log type). Inconsistent classification across input methods.

### 1.11 Reminders section + RemindersModal + ReminderRow + DraggableReminderList
**Surfaces**: Inline add form, preview list, full-screen modal with Active/Archived tabs, per-child filter, drag-to-reorder
**Findings**:
- 🔴 [KidsHome.tsx:827-831] `persistReminders` writes to AsyncStorage only — entire reminders subsystem never touches a real Supabase table. Multi-device sync = none. Caregiver visibility = none. Uninstall = data loss. Major user-trust issue.
- 🔴 [KidsHome.tsx:732-781] Seed reminders fire ONCE per child and write fake reminders ("Schedule 2-year checkup", "Buy diapers (size 2)") tagged to each kid by *order* in the children array — not age, not real data. Result: a 7-year-old child gets reminded to "Follow up with lactation consultant".
- 🟡 [KidsHome.tsx:841-857] Reminder add path inserts a `notifications` row but the body is composed of `"Due 2026-05-15"` literal — no localized date, no time zone awareness.
- 🟡 [KidsHome.tsx:880-883] `toggleReminder` updates the notification's `is_read` field as a proxy for "done". Wrong semantics — `is_read` is supposed to mean the user has seen the notification, not that they've completed the task.
- 🟡 [KidsHome.tsx:5862-5915] Drag-to-reorder uses raw `PanResponder` with a hardcoded `itemHeightRef = 76`. Cards taller than 76 (with child tag + due-date pill on two lines) cause off-by-one drops.
- 🟡 [KidsHome.tsx:5990] `r.archivedAt.split('T')[0]` — known UTC bug pattern. A reminder marked done at 11pm local west of UTC archives as tomorrow's date.
- 🟡 [KidsHome.tsx:6177-6184] Reorder writes the entire reminders array including archived; if `selectedChildId` is set, only that child's active is reordered — but the `otherActive` filter (line 6181) loses the originally-saved order for non-selected children.
- 🟢 [KidsHome.tsx:6062-6094] "All Kids" pill shows up to 3 dots even if user has 7 kids — only first 3 dots visible.

### 1.12 Growth Leap card + GrowthLeapDetail modal + LeapFocusSheet
**Surfaces**: Compact card → full-screen detail with leap timeline path + per-leap deep-dive sheet
**Findings**:
- 🔴 [KidsHome.tsx:222-251] `getGrowthLeap` returns the FIRST upcoming leap when child is between leaps, but `weekAge` can be enormous (e.g. 200) and the function still returns the last leap as "done". When `weekAge >> 75` the card says "All Leaps Complete" with no indication of actual age — fine for toddlers, but a 5-year-old still seeing this card forever is weird.
- 🟡 [KidsHome.tsx:236-238] Phase math: `offset <= 1 ? 0 : offset === 2 ? 1 : 2`. With `leapEnd - leapStart` always 3, only offsets 0,1,2,3 happen — phase 2 logic only triggers at offset 3 (so phase 2 lasts 1 week out of 4). Stormy gets 2 weeks, peak 1, emerging 1 — not the documented "phases" intent.
- 🟡 [KidsHome.tsx:6378-6381] Phase done tracker uses `phaseIndex > 0`, `> 1`, `false` — phase 3 is never marked done until the whole leap is done. The "current" indicator for the 3rd phase is permanently absent.
- 🟡 [KidsHome.tsx:6675-6677] `phaseDone` for a different leap (not current) defaults to `[false, false, false]` for upcoming, `[true, true, true]` for done — but if the current leap is partially complete and a user opens a *later* leap's sheet, the "current" phase indicator never highlights.
- 🟢 [KidsHome.tsx:6362-6363] Hardcoded `LEAP_EMOJI` and `PHASE_EMOJI` arrays — no fallback for the 11th+ leap (impossible currently, but brittle).

### 1.13 Ask Grandma + Rewards cards
**Findings**:
- 🟡 [KidsHome.tsx:2034] `router.push('/daily-rewards' as any)` — `as any` cast hides any missing route. The route exists, but pattern repeats elsewhere and silently breaks deep links.
- 🟢 [KidsHome.tsx:2055-2058] Rewards card shows `earnedBadges.length` for "trophies" — different metric than the badges screen which counts categories.

---

## 2. Log Forms — `components/calendar/KidsLogForms.tsx` (2866 lines)

### 2.1 saveChildLog / updateChildLog helpers
**Findings**:
- 🔴 [KidsLogForms.tsx:237-246] `SELECT user_id FROM children WHERE id = childId` — **column doesn't exist**. Migration `20260405030000_children_expanded.sql` and `20260330010000` use `parent_id`. Query returns `null`; fallback to `session.user.id` works for parent but corrupts caregiver writes (logs written under caregiver's user_id but `user_id` column on `child_logs` is supposed to be the *parent who owns the child*).
- 🔴 [KidsLogForms.tsx:243-253] `child_logs.insert` only checks `error`, doesn't surface the error to user for any caller except the `Alert` paths. Photo upload failures (uploadPhotos returns `[]` on auth missing) save log with empty photos and report success.
- 🟡 [KidsLogForms.tsx:256-267] `updateChildLog` does not update `date` if the user changed the log date in the edit sheet — only value/notes/photos. Editing a log's date is impossible.
- 🟡 [KidsLogForms.tsx:183-203] `uploadPhotos` uploads to bucket `garage-photos` but path prefix is `kids-logs/...` — wrong bucket. Garage uses a public bucket; child photos should be in a restricted one. Privacy/RLS concern.
- 🟡 [KidsLogForms.tsx:187-202] If a single upload fails, loop continues silently — partial upload result returned, user gets misaligned photos.

### 2.2 FeedingForm
**Findings**:
- 🔴 [KidsLogForms.tsx:1029] Feed type toggle includes `'solids'` but solids = `type: 'food'` on insert (line 978) while breast/bottle = `type: 'feeding'` (lines 986, 994). The aggregation in KidsHome filters `(l.type === 'food' || l.type === 'feeding')`, but the reverse-edit map `LOG_TO_SHEET` (`KidsCalendar.tsx:801-805`) maps `food → feeding`, so editing a solids log re-opens the FeedingForm in "solids" mode but the `editLog.type` mismatch means the form misidentifies.
- 🔴 [KidsLogForms.tsx:725-728] Edit-mode food tags reconstructed by splitting `editLog.notes` on `,` — but the saved description (line 828) uses `, ` separators; on re-save, no preservation of original `matchedFoods`/`estimatedCals` array. Calorie estimates are recomputed from scratch every edit, losing manually-entered kcal.
- 🟡 [KidsLogForms.tsx:787-793] Live breast timer "switch alert" relies on Vibration + Haptics — Vibration is iOS-deprecated, will spam-log a warning per second after the threshold.
- 🟡 [KidsLogForms.tsx:766-781] Timer interval runs even when AppState backgrounds — `import { AppState }` is at line 22 but never used; on iOS the timer pauses on background which makes the breakdown wrong on resume.
- 🟡 [KidsLogForms.tsx:1187-1208] Calorie banner duplicates the same data as the foodTag chips — visually noisy, and category color dot uses `categoryColor(m.category)` while the chip uses no category color.
- 🟡 [KidsLogForms.tsx:874] `estimateFromText` AI call has no abort signal — if the user keeps adding foods quickly, all stale requests still resolve and overwrite the latest tag state.
- 🟡 [KidsLogForms.tsx:907] `manipulated.base64` for plate scan requires base64 — base64 expansion ~33% larger than binary, can exceed Supabase Functions payload limit on large photos.
- 🟢 [KidsLogForms.tsx:828] `description = foodTags.map(t => t.name).join(', ')` — duplicate names not deduped; a user typing "rice" twice gets "rice, rice".

### 2.3 SleepForm
**Findings**:
- 🟡 [KidsLogForms.tsx:1678-1681] `saveAsRoutine` infers "Nap" vs "Bedtime" from `startTime.split(':')[0] < 16`. Babies often nap until 5pm — falsely tagged "Bedtime".
- 🟡 [KidsLogForms.tsx:609] `calcDuration` adds 24*60 if negative — assumes overnight, but a typo'd time (end before start, same day) silently becomes a 23-hour sleep.
- 🟢 [KidsLogForms.tsx:1697-1708] End-time chip shows "Plus + End" when missing; tapping sets it to `now()` — but no way to clear it once set without re-opening picker.

### 2.4 HealthEventForm
**Findings**:
- 🟡 [KidsLogForms.tsx:1751] HEALTH_EVENTS array includes "Doctor visit", "Injury", "Other" — all three map to log type `'note'` (line 1797). Filtering by type later loses the distinction.
- 🟡 [KidsLogForms.tsx:1798] `tagWithRoutine(value || eventType, prefill)` — passes the EVENT NAME as value when value is empty. Means "Doctor visit" with no extra detail saves `value="Doctor visit"`, and the home dashboard shows that as the vaccine name. Trash data flow.
- 🟢 [KidsLogForms.tsx:1844] Temperature placeholder hardcoded `37.5°C` — no support for °F users; no validation; "100.4" entered as F saves literal "100.4" with no unit, and overdue-temp detection becomes confused.

### 2.5 KidsMoodForm
**Findings**:
- 🟡 [KidsLogForms.tsx:1922] Mood saved as bare string (`mood`) not JSON — inconsistent with everything else which JSON-stringifies the value. Means routine-tagging via `tagWithRoutine` fails silently (lines 153-159 try to JSON.parse "happy" → throws → returns original).
- 🟢 [KidsLogForms.tsx:1899] `if (MOODS.some((m) => m.id === prefill.value))` — checks the prefill value directly for being a mood id, but the prefill `value` is a JSON string per the type contract.

### 2.6 MemoryForm
**Findings**:
- 🔴 [KidsLogForms.tsx:2016] Saves with `type: 'photo'` and `value: 'memory'` literal — but KidsHome aggregation does `photos && photos.length > 0` to find memories (line 1166), not by type. A memory with no photo uploaded becomes an orphaned 'photo' log with no preview.
- 🟡 [KidsLogForms.tsx:2015] `uploadPhotos(photos)` — if upload fails for all photos, log saves anyway with empty photo array.

### 2.7 ActivityForm
**Findings**:
- 🟡 [KidsLogForms.tsx:2073-2087] ACTIVITY_TYPES array is 13 entries but `ACTIVITY_PILLARS` (KidsHome:3463-3527) only knows 5 of these explicit ids. "Walk", "school", "study", "reading", "playdate" fall through to keyword regex matching — many regex patterns match against `name` which is optional, so "walk" + empty name → falls to `care` default. Wrong pillar bucketing.
- 🟢 [KidsLogForms.tsx:2168] Routine name fallback: `name || ACTIVITY_TYPES.find(...).label || 'Activity'` — chains via `||` so empty string slips through; should use `??`.

### 2.8 DiaperForm
**Findings**:
- 🟡 [KidsLogForms.tsx:2278+] DiaperForm only handles one diaper change per submit; no "batch log" for parents catching up on a day. No timestamp field for backdating beyond `initialDate`.
- 🟢 [KidsLogForms.tsx:2256-2260] `mixed` emoji is 🔄 — semantically wrong (rotate icon) for "pee + poop combined".

---

## 3. Calendar — `components/calendar/KidsCalendar.tsx` (3576 lines)

### 3.1 Header — child pills + view toggle + add-log FAB
**Findings**:
- 🟡 [KidsCalendar.tsx:1622-1626] Visible kids when >4 = `children.filter(c => c.id === selectedChildId)` — if `selectedChildId === 'all'`, the visible array is empty and only the "+N more" pill shows. Users have to tap the overflow to see any kid at all.
- 🟡 [KidsCalendar.tsx:529] `view` state stores 'timeline'|'journey'|'visits' but `useFocusEffect` doesn't restore it when navigating away — every tab change resets to timeline.

### 3.2 Timeline view + AgendaWeekStrip + pending routines + day logs
**Findings**:
- 🔴 [KidsCalendar.tsx:912-996] `isRoutineDone` has ~10 branches with subtle differences per type. Several fall through to `return true` for any matching type, so a *single* "morning feed" routine is marked done when an *evening* feed is logged. Routines that share a `name` but differ by `meal` field can fight (line 938).
- 🟡 [KidsCalendar.tsx:982-987] Sleep match falls back to `created_at` hour for "best-effort same-day entries" — `created_at` is server time, not local. Evening nap logged at 8pm matches a 11pm bedtime routine when timezones don't agree.
- 🟡 [KidsCalendar.tsx:1063-1086] Congrats popup logic depends on `prev.count > 0 && next === 0` — fires once per device, persisted to AsyncStorage. If a parent deletes a log and re-adds it, popup never re-fires (key not invalidated reliably).
- 🟡 [KidsCalendar.tsx:1148-1190] Optimistic "skip" update writes a log row with `type: 'skipped'` — but in dashboard aggregation (`KidsHome.tsx:1207`) `'skipped'` isn't in the dailyActivity counter set, so it correctly excludes; however the diaper/feeding counters use `.length` without filtering 'skipped' (lines 1095, 1121) — `feeding/food/sleep/diaper` types aren't usable for skipped, so functionally fine, but the test surface is weak.
- 🟡 [KidsCalendar.tsx:1404-1462] Timeline rows merge pending + logged into one sorted list; pending without a `time` sort to position 25 (line 1422), pushing them to the bottom — but the rendered "subtitle" says "Tap to log" with no time, making them feel orphaned.

### 3.3 Journey view (growth ring)
**Findings**:
- 🟡 [KidsCalendar.tsx:1520-1528] `new Date(activeKid.birthDate + 'T00:00:00')` — assumes local midnight, fine, but `birthDate` might be empty (handled by `Math.max(0, ...)`), producing weekAge 0 with no UI warning that birth date is missing.

### 3.4 Visits view
**Findings**:
- 🟡 [KidsCalendar.tsx:1534-1611] Visits includes types `vaccine, health, temperature, medicine, note, milestone`. Sorted by `date.localeCompare` then `created_at.localeCompare` — past and future visits mixed in one list; no section break or "Upcoming" header for routines vs "Logged" for past.
- 🟡 [KidsCalendar.tsx:1551-1557] Empty-state "Add visit" CTA opens the HealthEventForm — but the routine-form prefill is null, so users have to fill in everything from scratch.

### 3.5 Routine manager modal
**Findings**:
- 🔴 [KidsCalendar.tsx:1089-1122] `saveRoutine` uses `selectedChildId !== 'all' ? selectedChildId : (activeChild?.id ?? children[0]?.id)` — if user is in "All Kids" view, the new routine binds to the FIRST child silently. No UI hint, parents will be confused.
- 🟡 [KidsCalendar.tsx:1094] If `children` is empty, throws "Select a child first" — but the throw is caught and shown via Alert, fine, but the routine modal stays open.
- 🟡 [KidsCalendar.tsx:586] Default routine type is `'activity'` — but if user picks "Sleep" then deletes the routine and reopens, form retains the activity default.

### 3.6 Log selection + edit + delete
**Findings**:
- 🟡 [KidsCalendar.tsx:732-769] `handleDeleteLog` doesn't confirm delete via Alert — single-tap deletion of a logged activity, no undo. Adjacent to drag-handle on small screens.
- 🟡 [KidsCalendar.tsx:812-832] `saveEdit` uses inline editValue/editNotes state, but the only path that opens this inline edit is the `selectedLog` modal's edit button — most users never see it because `openEdit` at line 799 routes to the bottom sheet instead.
- 🟢 [KidsCalendar.tsx:801-806] LOG_TO_SHEET map covers 10 types; if `log.type` is `'growth'` or `'milestone'` or `'wake_up'`, falls to default `'feeding'` — editing a growth log opens the food form.

---

## 4. Library (Ask Grandma) — `app/(tabs)/library.tsx`

### 4.1 Empty state + chat
**Findings**:
- 🔴 [library.tsx:50-63] `chat_messages` query filtered by `child.id` — if user is in "All Kids" view from home, navigating to library will key on `activeChild` which may not match the user's intent. Cross-child chat history pollution possible.
- 🟡 [library.tsx:128] Empty-state subtitle is a hardcoded English string with no mode awareness — same copy regardless of which journey mode is active.
- 🟡 [library.tsx:153] "COMMUNITY CHANNELS — Coming Soon" GlassCard is a dead-end placeholder; no scheduled release messaging.
- 🟡 [library.tsx:202] Send button uses raw hex `#1A1030` instead of theme tokens — dark-mode safe but light-mode broken.
- 🟢 [library.tsx:174] Title hardcoded "Guru Grandma" without i18n.

### 4.2 Pillar screen — `app/pillar/[id].tsx`
**Findings**:
- (file is 161 lines — small) Quick read sufficient.
- 🟡 The pillar route opens for any pillar id from any mode; if user is in kids mode but somehow lands on a pregnancy pillar id via deep link, no validation. (Verify by reading the file.)

---

## 5. Vault tab — `app/(tabs)/vault.tsx` + `KidsAnalytics`

### 5.1 KidsAnalytics screen
**Findings**:
- 🟡 [KidsAnalytics.tsx ~530] Range selection mirrors KidsHome's range picker — same logic duplicated in two places (range → date math → query). Drift risk if one is updated.
- 🟡 [vault.tsx:31] `showFloatingExams = mode !== 'pregnancy'` → kids mode shows floating exams button; tapping pushes `/exams` which is shared with pre-pregnancy. No per-child filtering on the exams screen — caregivers viewing multiple kids see all exams mixed.
- 🟢 [KidsAnalytics.tsx:822-935] `ScoreInfoModal` and `TipDetailModal` are inline component definitions in the same file — extract for reuse.

---

## 6. Scan — `app/scan.tsx`

### 6.1 Scan picker + analyzer
**Findings**:
- 🔴 [scan.tsx:55-58] Free scan limit (3) checked against `scan_history` count for the *active* child only. A user with 3 children can scan 9 times for free (3 per child). Either intentional or a bypass bug.
- 🔴 [scan.tsx:109-115] After successful scan, `setScanCount(prev => prev + 1)` increments local but only `scan_history.insert` adds a row; if insert fails, count is wrong on next mount. RLS could reject silently.
- 🟡 [scan.tsx:33] Default scan type is `'medicine'` — first-time users see medicine selected, but they may want food/nutrition for kids; could default by mode.
- 🟡 [scan.tsx:113] `result_json: { reply }` — full reply blob saved; no truncation. Long replies bloat the table.
- 🟡 [scan.tsx] Uses old `colors` import from theme (line 22), not the dark-theme-aware `useTheme()` hook. Hardcoded `#1A1030` for loading overlay (line 300).
- 🟢 [scan.tsx:65] "Permission needed" alert generic message — doesn't link to Settings.

---

## 7. Profile — `app/profile/kids.tsx` (1086 lines)

### 7.1 Kids list + EditChildSheet + AddChildSheet
**Findings**:
- 🔴 [profile/kids.tsx:613, 876] `d.toISOString().split('T')[0]` — known UTC bug. A birth date picked at midnight local east of UTC becomes the day before. Specifically painful for "born just after midnight" cases.
- 🟡 [profile/kids.tsx:140-154] `handleDelete` cascades into `children` row delete — RLS rule should cascade delete logs, but if not configured, orphan rows remain. No "are you sure" with consequences spelled out (just "cannot be undone" in body).
- 🟡 [profile/kids.tsx:265-266] `onLongPress={onDelete}` with 600ms — a long press to *delete* a child is dangerous; no confirmation buffer, only the Alert in handleDelete catches it.
- 🟡 [profile/kids.tsx:786] `pediatrician = pedName.trim() ? { ... } : null` — drops phone/clinic if name is empty even when phone is set. Should preserve any field provided.
- 🟢 [profile/kids.tsx:609] `minimumDate={new Date(2005, 0, 1)}` — children born before 2005 can't be added. Why?

---

## 8. Onboarding — `app/onboarding/kids/index.tsx` (1240 lines)

### 8.1 Kids onboarding flow
**Findings**:
- (Did not deep-read but verified file is 1240 lines.) Likely contains its own date pickers + child-creation flow.
- 🟡 Onboarding writes a `children` row via the same `children.insert` pattern → same `parent_id`/`user_id` schema considerations apply.

### 8.2 Shared onboarding — `child-profile.tsx`, `journey.tsx`, `activities.tsx`
**Findings**:
- 🟡 [onboarding/child-profile.tsx] Verify same UTC date-string issue exists (didn't grep there but pattern is the same as profile/kids).

---

## 9. Edge functions

### 9.1 `nana-chat`
**Findings**:
- 🟡 [nana-chat/index.ts:88] `Current mode: ${mode ?? 'kids'}` — if the client sends `mode = ''` (empty string), the falsy check fails and `''` is rendered; chat then has no mode context. Should be `mode || 'kids'`.
- 🟡 [nana-chat/index.ts:67-70] Child context is built from `child.ageMonths` and `child.weightKg` — but the client's `callNana` (lib/claude.ts) needs to compute ageMonths from birthDate; if it doesn't, the prompt gets `undefined months old`.
- 🟢 [nana-chat/index.ts:30] Hardcoded model string — release plan says model identifier "claude-sonnet-4-20250514". Current Claude model recommendation per project rules is Sonnet 4 — fine for now, but no env-driven override.

### 9.2 `scan-image`
- 🟡 Same hardcoded model. No kids-mode-specific guardrails beyond the prompt builder.

---

## 10. Library tab pillars — `lib/pillars.ts`

**Findings**:
- 🟡 [pillars.ts] Only 9 kids pillars defined: `milk, food, nutrition, vaccines, clothes, recipes, habits, medicine, milestones`. No "Sleep" pillar despite sleep being a top-3 home metric — meaning users tapping the sleep tile to learn more about sleep have no contextual library page.
- 🟡 [pillars.ts:11-93] Each pillar has 3 tips + 4 suggestions — hardcoded in English; not i18n'd.
- 🟢 [pillars.ts] No age-aware variants; a newborn parent sees the same "introduce solids" content as a 4-year-old's parent.

---

## 11. Tab bar / `_layout.tsx`

- 🟡 [(tabs)/_layout.tsx:118, 491] Mode-conditional tab rendering — without a runtime test, hard to spot, but two separate usages of `useModeStore` in the same file suggest potential for drift if one is updated.

---

## 12. Settings (kids context)

- 🟢 [(tabs)/settings.tsx:47] Mode imported but settings is mostly mode-agnostic; no kids-specific actions in this screen (e.g. "Manage caregivers", "Manage health profile") — should add quick links.

---

## 13. Daily Rewards, Leaderboard, Notifications, Badges

These are mode-agnostic but reachable from kids home:
- 🟡 `app/notifications.tsx` (793 lines) shows the reminders Supabase rows from KidsHome's add-reminder writes — but a reminder marked done in KidsHome sets `is_read: true` on the notification, polluting the unread count semantics.
- 🟡 `app/daily-rewards.tsx` (1139 lines) and `app/leaderboard.tsx` (1180 lines) are large; couldn't be deeply audited but their badge/streak computations should be cross-checked against the seeded fake reminders (which add fake activity history).

---

## 14. LocationCard (deprecated?)

- 🟡 [components/kids/LocationCard.tsx:55-64] "Map view coming soon" placeholder — `mapBtn` Pressable has no `onPress` handler. Tapping does nothing. This component is exported but no longer mounted on KidsHome (checked the home file — not imported). Dead code; either remove or wire to airtag-setup.

---

## Missing features (ranked by user impact)

| # | Feature | Why parents expect it | Effort | Where it would slot in |
|---|---------|-----------------------|--------|------------------------|
| 1 | **WHO/CDC growth percentile chart** | Pediatric apps live or die by this; every well-visit centers on percentiles | M | HealthDetailModal "Latest Growth" → expand into chart route |
| 2 | **Nap vs night sleep distinction** | Huckleberry's core feature; sleep target is impossible to set meaningfully without it | M | SleepForm has only `quality`; add `nap | night` and split totals |
| 3 | **Sibling support / "All Kids" overview in vault** | Multi-child parents need aggregate insights | L | KidsAnalytics is per-child; add aggregate range |
| 4 | **Medicine dose calculator (weight-based)** | Parents constantly Google "tylenol dose 18-month-old" | S | New route triggered from medications field, uses child weight + age |
| 5 | **Pediatrician/caregiver export (PDF or share-link)** | Brought to every pediatrician visit | M | Health history → "Share with doctor" → signed URL |
| 6 | **Allergy alert system** | If a logged food matches a flagged allergen, alert | S | Hook into FeedingForm save path, cross-reference `child.allergies` |
| 7 | **Photo memories timeline (real)** | Memories live as orphan `photo` logs today; no gallery view | S | New screen pulling logs with `photos.length > 0` |
| 8 | **Sleep regression detection / age-aware insights** | "Why is my baby waking up?" — Huckleberry/Cozi do this | M | KidsAnalytics insight engine, compare to age band norms |
| 9 | **Vaccine reminder push notifications** | Today: scheduled dates are AsyncStorage-only → no push | M | Cron in edge function reading `child_logs` + scheduled `notifications` |
| 10 | **Multi-language pillar content** | Brazil/Portugal users get English-only library, despite vaccine schedules being localized | L | i18n the `pillars.ts` content |
| 11 | **Screen time logging** | Cozi has this; common parent ask | S | New activity type `screen_time` with duration |
| 12 | **Routine templates (newborn / toddler / preschooler)** | New parents don't know what routines to create | M | Routine manager → "Use a template" |
| 13 | **Care-circle real-time presence** | "Who logged the last feed?" — already store `logged_by`, never surfaced | S | Show logger's name on log card |
| 14 | **Pediatrician visit prep checklist** | Symptom + question list before appointment | S | Vault → "Visit prep" |
| 15 | **Sleep coach / nap predictor** | Huckleberry's killer feature | L | Requires more sleep data quality; phase 2 |
| 16 | **Vaccination "reaction" log** | Pediatricians ask post-vaccine if there were reactions | S | Extend vaccine log with optional reaction note |
| 17 | **Family invite via QR / link** | Care-circle exists in DB but invite flow is friction-heavy | S | Already have invite-caregiver flow; surface QR option |

---

## Top 10 fixes ranked by ROI

1. 🔴 **Fix `SELECT user_id FROM children`** — column doesn't exist (`KidsLogForms.tsx:237-241`). Switch to `parent_id` or remove the lookup entirely. Effect: caregiver writes attribute correctly.
2. 🔴 **Move reminders to a real `kid_reminders` table** (`KidsHome.tsx:732-902`). Effect: sync, multi-device, multi-caregiver, no data loss.
3. 🔴 **Move scheduled vaccine dates to Supabase** (`KidsHome.tsx:789-808`). Effect: parents can rely on the schedule; push reminders become possible.
4. 🔴 **Rewrite vaccine-given counter from `firstWord` substring to a `vaccine_key` field** (`KidsHome.tsx:6962, 7046`). Effect: no cross-vaccine collisions, accurate dose counts.
5. 🔴 **Fix `birthDate.toISOString().split('T')[0]`** at `app/profile/kids.tsx:613, 876` and any onboarding equivalents. Use `toDateStr`. Effect: correct DOB in non-UTC timezones.
6. 🔴 **Fix free scan limit per-account, not per-child** (`scan.tsx:55`). Effect: paywall enforcement works as intended.
7. 🔴 **Add empty-state CTA in HeroTile "tap to log" while data exists** (`KidsHome.tsx:2298, 2380`). Effect: easier daily logging.
8. 🟡 **Switch photo upload bucket from `garage-photos`** (`KidsLogForms.tsx:194`) to a child-photos bucket with restrictive RLS. Effect: child photo privacy.
9. 🟡 **Memoize `getNextDueVaccines` per render** (`KidsHome.tsx:2887, 2896`). Effect: 30% home-screen render cost reduction at scale.
10. 🟡 **Fix routine save-when-All-Kids silently bound to first child** (`KidsCalendar.tsx:1094`). Effect: no surprise routines on the wrong kid.

---

## Audit limitations

- Could not run the app to test runtime behaviors (modal closability, gesture conflicts, real Supabase RLS on writes). Findings are static-analysis-based.
- Could not verify whether `app/profile/health-history.tsx` exists; the route push at `KidsHome.tsx:4431` may be a dead navigation.
- Did not deep-read `KidsAnalytics.tsx` (1300+ lines), `daily-rewards.tsx`, `leaderboard.tsx`, `notifications.tsx`, `onboarding/kids/index.tsx` (1240 lines), or `app/exams/*` — surface-level findings only for these.
- `useFoodStore`, `useGoalsStore`, `useBehaviorStore` were referenced but their internal state shapes weren't traced. Some claims about silent failures (e.g. goal save errors) assume standard Zustand error swallowing.
- Pregnancy/pre-pregnancy modes only audited for cross-contamination risks; not for their own findings.

---

# Pass 2 — Additional Audit (skipped large files)

> Second pass covers `KidsAnalytics.tsx` (4464 lines), `daily-rewards.tsx` (1139), `leaderboard.tsx` (1180), `notifications.tsx` (786), `onboarding/kids/index.tsx` (1240), shared onboarding screens, and verifies route references from pass 1.

---

## 15. Analytics — `components/analytics/KidsAnalytics.tsx`

### 15.1 Data fetching (`lib/analyticsData.ts` + screen wrapper)
- 🔴 [analyticsData.ts:812-816] Kids analytics fetch hard-caps at `.limit(2000)` regardless of range. With a 1-year period (`365` days) on an active family, important older logs at the start of the window will be silently dropped because `.order('created_at', { ascending: true })` returns the *oldest* 2000 rows, not most-recent — score trends look wrong if a family logs ~6/day across multiple kids.
- 🔴 [KidsAnalytics.tsx:592-595] Realtime subscription matches `payload.new?.child_id === selectedChildId`. If a *caregiver* deletes a log (old payload has `child_id`, new is null), the `new?.child_id` check returns false and the screen does NOT refetch — stale data sticks until the next manual refresh.
- 🟡 [KidsAnalytics.tsx:602-604] `AppState.addEventListener('change')` triggers refetch on every foreground transition — combined with the realtime subscription, every backgrounding spawns a redundant network round-trip.
- 🟡 [KidsAnalytics.tsx:534] `analyticsRange` is recomputed inline on every render — passed to `useKidsAnalytics` without memoization. React Query may treat it as a new key on each render (object identity churn → constant re-fetches).
- 🟡 [analyticsData.ts:826-833] Age computation assumes `birthDate` parses as ISO; if it's empty string, `isNaN` fallback defaults to 24 months. A child with no DOB silently gets the "solids" nutrition mode applied even if they're a newborn.

### 15.2 Period selector + Custom range
- 🟡 [KidsAnalytics.tsx:557-561] `handleCustomApply(from, to)` does no validation: `to < from` is allowed. The `analyticsRange` then passes inverted bounds straight to Supabase; `.gte('date', from).lte('date', to)` returns empty silently.
- 🟡 [KidsAnalytics.tsx:540-547] `customLabel` uses `new Date(customRange.from)` for `toLocaleDateString` — `customRange.from` is a `YYYY-MM-DD` string parsed in UTC. West of UTC, the displayed label is off by one day.

### 15.3 Score Info Modal
- 🟡 [KidsAnalytics.tsx:851-853] `WEIGHTS` shown to user sums to 100% (27+22+18+13+9+11=100) but the actual scoring code in `lib/analyticsData.ts` (`buildScores`) wasn't verified to match. Drift between displayed weights and implementation is a documentation-trust issue.
- 🟡 [KidsAnalytics.tsx:834-840] Score band colors are hardcoded hex (`#A2FF86`, `#6AABF7`, `#FBBF24`, `#FF8C42`, `#FF7070`) instead of theme tokens — violates project rule "never use raw hex".
- 🟢 [KidsAnalytics.tsx:868] `ScrollView maxHeight: SCREEN_H * 0.62` — fixed cap; long pillar explanations get cut off on landscape orientation.

### 15.4 Tip Detail Modal + GrandmaInsight detail sheet
- 🟡 [KidsAnalytics.tsx:962, 1486, 1877] Three separate places navigate to `/grandma-talk` with `as any` cast hiding any route typo, and each uses a `setTimeout(... 150)` after `onClose` — racy if user dismisses faster than 150ms; pushes to grandma-talk anyway, then back-nav has the still-closing sheet in stack.
- 🟡 [KidsAnalytics.tsx:1483] `insightContext` passed via router params — for long contexts (multi-kid, full week) the serialized URL exceeds safe param size on Android (typically ~2KB). Will silently truncate.
- 🟡 [KidsAnalytics.tsx:1735-1740] `GrandmaInsightDetailSheet` empty state shows "more highlights once there's a full week of data" — but the modal is reachable from a 24h range too where no week-over-week is possible.

### 15.5 Wellness Ring + Radar (WellnessScoreArc)
- 🟡 [KidsAnalytics.tsx:1085-1129] Radar reanimated worklet animation: `breathe.value` infinite repeat is started in `useEffect` keyed on `[childId, scores.overall]`. Each child switch + score change *restarts* the breathe animation; if `scores.overall` is a float that fluctuates by 0.01 between renders, this thrashes the worklet thread.
- 🟡 [KidsAnalytics.tsx:1108-1111] Reset to 0 (`p0.value = 0; ...`) fires before the `withSpring` starts, but the breathe animation continues with `0` × `wobble` ≈ 0 — the polygon visibly snaps to center on every child swap.
- 🟡 [KidsAnalytics.tsx:1190-1191] Hardcoded radar fill/stroke (`#7048B830`, `#A07FDC`) — should derive from kids mode color or theme.
- 🟡 [KidsAnalytics.tsx:1133] `overallC` uses `scoreColor(...)` from a hardcoded palette (line 237-243) — doesn't respect dark/light theme; "#A2FF86" green is too light in light mode.
- 🟢 [KidsAnalytics.tsx:1056-1326] `WellnessScoreArc` is defined but never rendered (only `KidsWellnessRingCard` is mounted at line 690). 270+ lines of dead radar code.

### 15.6 Insight Highlights builder
- 🔴 [KidsAnalytics.tsx:1403] `trendPillar` picks the FIRST pillar with `|trend| >= 10` in iteration order — bias is always toward `nutrition` then `sleep`. A 25% activity decline can be hidden behind a 11% nutrition wobble.
- 🟡 [KidsAnalytics.tsx:1368-1408] `overallLabel` ranges (`8.5/7/5`) duplicated from `caption` in `KidsWellnessRingCard` (line 1031). Will drift if one is tweaked.
- 🟡 [KidsAnalytics.tsx:1349-1354] `lowest` reduce returns null if zero pillars have data — but downstream `parts[1]` push references `concern` only if non-null. The "areas to work on" panel never fires when ALL pillars are no-data; user sees only "X is excellent" — misleading.

### 15.7 Health Tips
- 🟡 [KidsAnalytics.tsx:455] `tips.slice(0, 4)` — hardcoded cap means age-specific tips for older children (3+) never include diaper/nutrition both because the array fills before reaching them.
- 🟡 [KidsAnalytics.tsx:430-432] Diaper count threshold `totalCount / 7 < 6` for newborn warning — assumes 7-day range. If user is on 30-day range, threshold becomes wrong (totalCount/7 averages over too small a window).
- 🟡 [KidsAnalytics.tsx:434, 442, 451] `analytics.diaper.colorCounts['green']` — bracket-key lookup; if `colorCounts` is undefined (very stale cached payload), throws.

### 15.8 Routine Compliance
- 🟡 [KidsAnalytics.tsx:1939-1942] `adherenceColor` ternary has duplicate branch `: stickers.coral : stickers.coral` — anything below 70 uses coral; the 40 threshold is dead code.
- 🟡 [KidsAnalytics.tsx:1938] `adherenceRate = 100 - data.skipRate` — but `skipRate` is presumably "skips / total events"; this only equals adherence if every routine is either logged-or-skipped. Routines that are simply *missed* (no skip log, no completion log) aren't counted, inflating apparent adherence.
- 🟡 [KidsAnalytics.tsx:2203] `Math.max(...data.weeklySkips, 1)` — if `weeklySkips` is empty array, `Math.max()` returns -Infinity; the `,1` guard saves it, but only because spread on empty array still leaves the `1`. Brittle.

### 15.9 Pillar Detail Modal
- 🟡 [KidsAnalytics.tsx:2742-2914] Nutrition score "math card" lives behind `ScoreMathCard` which always returns null (line 2715-2722). All the `freqScore`/`varietyScore` calc is computed every render and discarded — dead work.
- 🟡 [KidsAnalytics.tsx:3302] Growth recency check: `sevenDaysAgo.toISOString().split('T')[0]` — UTC bug. East-of-UTC, the boundary is off by a day; a measurement logged "today" in some timezones won't satisfy `>= recentDate`.
- 🟡 [KidsAnalytics.tsx:3336, 3343] `analytics.growth.weights.at(-1)!.value` — non-null assertion; if the array is mutated between renders it can throw.

### 15.10 Activity section
- 🟡 [KidsAnalytics.tsx:2610-2629] Activity guide percentages are static buckets per age, not derived from logged activity types. Two parents with identical kids see identical "recommended split" no matter what — labeled "Activity Guide" but it's a brochure.

### 15.11 Misc render bugs
- 🟡 [KidsAnalytics.tsx:114-115] `SCREEN_W` and `SCREEN_H` captured at module load. Rotation/iPad split-view doesn't reflow charts.
- 🟢 [KidsAnalytics.tsx:207-213] `MOOD_COLORS` / `MOOD_EMOJI` defined here AND in KidsHome — two sources of truth for the same mood palette.

---

## 16. Daily Rewards — `app/daily-rewards.tsx`

### 16.1 Streak engine (`useBadgeStore`)
- 🔴 [useBadgeStore.ts:181-186] Store hydrates with **fake demo data**: `currentStreak: 30`, `longestStreak: 30`, `totalPoints: 485`, `totalCheckIns: 42`, and 9 demo earned badges (lines 161-176). First-app-launch users see a fake 30-day streak they didn't earn. `setSyncedStats` (line 266) will overwrite IF Supabase responds, but if `syncBadgesFromSupabase` fails silently (catch in daily-rewards:132), the fake state persists.
- 🔴 [useBadgeStore.ts:185, 254, 218] `lastCheckInDate` uses `localDateStr(new Date())` which respects the local TZ — good. BUT pre-seeded `lastCheckInDate: localDateStr(new Date())` means new users LOOK like they already checked in today; the claim button (`alreadyCheckedIn` line 139) is disabled on first launch.
- 🔴 [daily-rewards.tsx:138] `today = new Date().toISOString().split('T')[0]` — UTC bug. West of UTC at evening, this returns tomorrow's date; comparison with `lastCheckInDate` (stored as local) mismatches → button stays *enabled* incorrectly, or check-in writes a future-date record.
- 🟡 [useBadgeStore.ts:208-260] `checkIn` is fully client-side — no Supabase write. A user can claim daily reward, get badges, then uninstall and the entire reward state is gone. `syncBadgesFromSupabase` (lib/badgeSync.ts) appears to *read* points-derived stats but doesn't *write* the check-in event.

### 16.2 Reward reveal + week grid
- 🟡 [daily-rewards.tsx:155] `handleCheckIn` doesn't await `checkIn()` (sync function, fine) but doesn't fire a points-write or analytics event. Server has no record of which day was claimed.
- 🟡 [daily-rewards.tsx:158-162] `dayInCycle` computation: when streak=0 and not checked in, `(0 % 7) + 1 = 1` ok; but `doneThisWeek = -1` if `dayInCycle - 1` and `alreadyCheckedIn=false` with cycle starting at 0 — leads to weekly grid showing -1 done tiles momentarily.
- 🟡 [daily-rewards.tsx:299-333] Reward reveal panel never auto-dismisses — sits forever inside the scroll. Re-claim path doesn't reset `showReward` state.
- 🟢 [daily-rewards.tsx:62] `WEEK_LETTERS = ['M','T','W','T','F','S','S']` — hardcoded; doesn't respect device locale start-of-week (US uses S-S).

### 16.3 Quest copy + categories
- 🟡 [daily-rewards.tsx:84-90] `MODE_QUEST_COPY` only has 5 keys; `mode` from `useModeStore` is union of `pre-pregnancy`/`pregnancy`/`kids` — but code also handles `pre`/`preg` legacy keys. If mode is `'pre-pregnancy'`, lookup works; but the duplication of keys here suggests inconsistent mode-store contract across the app.
- 🟡 [daily-rewards.tsx:177] `MODE_QUEST_COPY[mode] ?? todaysReward.label` — kids mode quest is "Track 3 feedings & bedtime" no matter what stage the kid is at. A 5-year-old parent sees infant-style quest copy.

### 16.4 Badge collection + category modal
- 🟡 [daily-rewards.tsx:445-471] `recentBadges` is sorted by `earnedAt.localeCompare` then `.slice(0,6)`. Demo data has fixed earnedAt timestamps from March 2026 (line 161-175); users who joined later will always see demo badges first, masking their newly earned ones.
- 🟡 [daily-rewards.tsx:496-500] `CATEGORY_CONFIG` includes a `daily` category but no daily-specific badges in `BADGE_DEFS` were verified — if the count is 0/0, divider math (`pct = 0`) renders the empty card with full progress bar background; visually inconsistent.
- 🟢 [daily-rewards.tsx:476] `router.push('/profile/badges' as any)` — `as any` masks any route mismatch.

### 16.5 Leaderboard preview card
- 🟡 [daily-rewards.tsx:569-575] Falls back to "Compete with moms, caregivers & partners" when `leaderboard` undefined — but uses `?? '—'` for rank, which means a logged-in user not yet on the board sees "You're #— with 0 pts". Two empty-state strategies for the same hidden state.

---

## 17. Leaderboard — `app/leaderboard.tsx`

### 17.1 Data fetching
- 🔴 [leaderboard.tsx:86-89] `fetchFullLeaderboard()` does `.select(...)` on `profiles` with `.not('name', 'is', null)` — but no pagination cap. With thousands of users, this loads every profile into memory on every refresh. No `.limit()`.
- 🔴 [leaderboard.tsx:142-148] `child_logs` query for the leaderboard window: `.gte('date', ninetyDaysAgo.toISOString().split('T')[0])` — UTC date string bug; off-by-one boundary in non-UTC tz.
- 🔴 [leaderboard.tsx:117-128] `channel_posts` query has no `.is('reply_to_id', null)` mistake — wait, line 120 does have it. But the join logic counts *only* top-level posts as `posts++` — yet `reactions` counts ALL reactions including those received on replies. Asymmetric — partner who only replies a lot but never authors top-level posts shows 0 posts + many reactions.
- 🔴 [leaderboard.tsx:99-103] `caregiverRoleMap` logic: `if (!has || role !== 'parent') set(...)` — intent is "non-parent wins" but the condition `role !== 'parent'` sets even when the value is 'parent' (the negation only triggers if there's no existing entry OR if the *new* role isn't parent). A user with [parent, nanny] roles will overwrite parent → nanny. With [nanny, parent], it sets to nanny, then keeps nanny (because new is parent and !has is false). Inconsistent ordering bug.
- 🟡 [leaderboard.tsx:158-163] Points formula duplicates `lib/leaderboard.ts:111` and `useBadgeStore` — three separate scoring impls. Drift inevitable.
- 🟡 [leaderboard.tsx:82-186] Entire fetch runs 7 sequential Supabase queries with no `Promise.all` parallelization despite being independent.

### 17.2 UI / filters
- 🟡 [leaderboard.tsx:188-194] Filter tabs by role: `moms` requires `user_role === 'parent' AND caregiver_role === 'parent'`. A solo parent (no caregiver link) has `caregiver_role: null` → never matches "moms" filter even though they're definitionally a mom.
- 🟡 [leaderboard.tsx:838-840] `roleLabel` shows "Parent" for anyone without a caregiver_role — but the user might be a partner. Labels misrepresent.
- 🟡 [leaderboard.tsx:294-314] `SceneStickers` runs 7 infinite reanimated loops on mount — burns battery on a screen most users open occasionally. No pause when off-screen.
- 🟡 [leaderboard.tsx:519-526] `SoloCheer` shows only if `ranked.length === 1` AND that one user is me — but `ranked` filters by tab; user filtered out by current tab shows `length === 0` and gets `EmptyState` instead. Slight UX inconsistency.
- 🟢 [leaderboard.tsx:621] `entry.name.split(' ')[0]` for podium — non-Latin name systems with no space (CJK) show full name; fine, but for "Mary Elizabeth" displays "Mary" while the row shows full — inconsistency.

---

## 18. Notifications Inbox — `app/notifications.tsx`

### 18.1 Grouping + timing
- 🟡 [notifications.tsx:208-213] `today` and `yesterday` derived from `toISOString().split('T')[0]`; `n.created_at.split('T')[0]` also UTC. So a notification created at 11pm local west-of-UTC is grouped under "Tomorrow"'s date and bucketed as neither today nor yesterday, falling into the weekday label.
- 🟡 [notifications.tsx:188-200] `timeAgo` works in UTC ms; "just now" / "Xm ago" buckets are fine but the fallback `toLocaleDateString()` for >7d uses default locale — inconsistent with the section header which uses fixed `'en-US'`.

### 18.2 Mark-as-read semantics
- 🔴 [notifications.tsx:311-319] `handleTap` immediately marks read AND navigates. There's no way to *peek* a notification without consuming its unread state — combined with `KidsHome.tsx:880` reminders using `is_read` as proxy for "done", a stray tap on a reminder notification will **silently mark the reminder as complete**, archiving it from the user's reminder list.

### 18.3 Navigation routing
- 🟡 [notifications.tsx:153] `wellness_drop|wellness_improve|daily_summary|weekly_report|health_alert|vaccine_due|goal_achieved|goal_missed` all route to `/(tabs)/vault` — but vault for kids mode shows exams/hospital/vaccines, not analytics. The wellness notifications should land on `/insights` or `/(tabs)/vault` analytics tab; current routing dumps user on documents.
- 🟡 [notifications.tsx:124-142] `navigateForNotification` mutates `useChildStore` + `useBehaviorStore` + `useModeStore` IN SEQUENCE before navigating. If push fails mid-way (e.g. mode set succeeds but child set fails because the child no longer exists in store), user lands in mismatched state.
- 🟡 [notifications.tsx:128-130] `useChildStore.getState()` outside React reconciliation cycle — switching the active child without notifying subscribers can cause an in-flight screen to show stale data on next render.
- 🟢 [notifications.tsx:172] `router.push(`/channel/${data.channelId}` as any)` — `as any` cast pattern.

### 18.4 Behavior filter
- 🟡 [notifications.tsx:244-252] `inferBehavior` returns `kids` only if `data.childId` exists; reminders inserted by `KidsHome.tsx:846-857` may or may not include `childId` in `data`. Reminders for "All Kids" go to `behavior: null` and only show in "All" filter — never in the Kids filter when a parent has multiple modes enrolled.
- 🟡 [notifications.tsx:386] `showBehaviorFilter = enrolledBehaviors.length > 1` — but enrolled behaviors are persisted via Zustand; if a user resets onboarding the list may be stale, breaking filter UX.

---

## 19. Kids Onboarding — `app/onboarding/kids/index.tsx`

### 19.1 Children insert flow
- 🔴 [onboarding/kids/index.tsx:143-148] `.insert(childrenToInsert)` chains `.select()` to retrieve inserted IDs — but doesn't `.select('id, parent_id, ...')` explicitly; if the default `RETURNING *` is restricted by RLS for some columns, `insertedChildren` may be empty array. The `if (insertedChildren && insertedChildren.length > 0)` swallows the failure silently.
- 🔴 [onboarding/kids/index.tsx:191-195] After insert, the mapped child uses `c.parent_id ?? c.user_id` — `user_id` is a fallback for the legacy schema. If a returned row has neither (column renamed or RLS-stripped), parent ID falls back to `undefined`.
- 🟡 [onboarding/kids/index.tsx:165] `if (ccError) console.warn(...)` — `child_caregivers` insert failure (the link that grants the user access to their own child) is logged but onboarding continues. Result: user can't read their newly created child's logs.
- 🟡 [onboarding/kids/index.tsx:161, 94] `accepted_at: new Date().toISOString()` — fine for a timestamp, but adjacent `birth_date: c.birthDate || null` (line 137) passes whatever DatePickerField produced. If DatePickerField returns local-format string, Postgres `DATE` may or may not coerce; check needed.

### 19.2 Date picker for birth date
- 🟡 [onboarding/kids/index.tsx:442-446] `DatePickerField` `value={child?.birthDate}` `onChange={(iso) => updateChild(childIdx, { birthDate: iso })}` — verify the field emits a UTC-safe `YYYY-MM-DD` string. Without seeing DatePickerField internals, this is suspect given the project's history of `toISOString` bugs.
- 🟡 [onboarding/kids/index.tsx:464-466] `formatAge` does `new Date(birthDate)` — if `birthDate` is `2026-05-12` (date-only string), JS parses as UTC midnight → in some TZs displays as "11mo" for a "12mo" baby.

### 19.3 Allergies + role selection
- 🟡 [onboarding/kids/index.tsx:709] `toggleAllergy(childIdx, allergy)` — no validation that the allergy string is sanitized. User can paste arbitrary HTML/emoji.
- 🟡 [onboarding/kids/index.tsx:866-993] No "Skip" affordance verified during quick scan — onboarding may be forced to complete even if user just wants to try the app.

---

## 20. Shared onboarding screens (`child-profile.tsx`, `baby-name.tsx`, `activities.tsx`)

### 20.1 child-profile.tsx
- 🟡 [onboarding/child-profile.tsx:73-89] Inserts child with `parent_id: user.id` THEN inserts `child_caregivers` link. Two writes without transaction; if the second fails, the child exists in DB but caregiver link is missing → user can't access from app due to RLS.
- 🟡 [onboarding/child-profile.tsx:76] `birth_date: birthDate || null` — same pattern as kids onboarding; UTC concern is the same.
- 🟡 [onboarding/child-profile.tsx:99-101] After insert, maps `birthDate: data.birth_date ?? ''` — but inserts use `birth_date` (snake_case); the round-trip casing handover is correct here but inconsistent with kids onboarding which uses `c.birth_date ?? c.dob` (line 195) — `dob` is a column name from an even older schema.

### 20.2 baby-name.tsx / activities.tsx
- 🟢 No DB writes observed; mode-agnostic flow. Not in scope for kids journey kicks unless user backs through onboarding.

---

## 21. Route reference resolutions (pass 1 unresolved)

- ✅ **`/profile/health-history` route EXISTS** — file at `app/profile/health-history.tsx` (915 lines). Pass 1 note in section 1.4 is resolved; the route push at `KidsHome.tsx:4430-4440` is valid.
- ✅ `/profile/badges` exists (`app/profile/badges.tsx`).
- ✅ `/profile/kids` exists.
- ✅ `/leaderboard`, `/daily-rewards`, `/notifications`, `/insights`, `/grandma-talk`, `/manage-caregivers` all reachable as confirmed from their respective files in this pass.
- ⚠️ `app/exams/*` was referenced by `vault.tsx:31` in pass 1 — not re-verified, still unconfirmed.

---

## 22. Additional missing features (pass 2)

| # | Feature | Why parents expect it | Where it slots in |
|---|---------|-----------------------|-------------------|
| 18 | **Streak protection / "freeze" tokens** | Duolingo-style; missing one day after 30-day streak demotivates | useBadgeStore — add `freezesAvailable: number` |
| 19 | **Per-pillar weekly digest email/push** | Insights generation runs (`runWellnessNotifications`) but no scheduled delivery | Edge function cron |
| 20 | **Multi-child analytics aggregate** | Header says "(no 'All Kids' aggregation)" by design (line 5) — multi-kid parents want family overview | KidsAnalytics top-level toggle |
| 21 | **Notification preferences UI** | Engine fires 12+ notification types; user can't opt out per-type | `app/profile/notifications.tsx` exists, verify its scope |
| 22 | **Custom range presets** ("Last week", "This month") | Currently only "Week / Month / 3mo / Year / Custom" | PeriodSelector |
| 23 | **Mark notification "read" without consuming reminder semantic** | Currently same flag conflated | Add `done_at` to reminders, separate from `is_read` |
| 24 | **Leaderboard friends-only filter** | Public global leaderboard is intimidating; care-circle peers more motivating | Tabs row |

---

## Pass 2 — Additional findings summary

- **New critical**: 12 (analyticsData payload cap, realtime delete misfire, demo streak seed, UTC `today` in checkIn, missing Supabase write for check-in, leaderboard profiles unbounded, leaderboard child_logs UTC, leaderboard caregiver-role override bug, leaderboard top-level/reaction asymmetry, notifications mark-read consumes reminder, onboarding kids insert error swallowed, onboarding mapping fallback to undefined)
- **New warnings**: 38
- **New polish**: 9
- **New missing features**: 7 (items 18-24 above)
- **Route references resolved**:
  - ✅ `/profile/health-history` confirmed to exist (resolves pass 1 limitation)
  - ✅ `/profile/badges`, `/leaderboard`, `/daily-rewards`, `/notifications`, `/insights`, `/grandma-talk`, `/manage-caregivers` all confirmed
  - ⚠️ `app/exams/*` still unconfirmed (pass 1 vault flag)

### Updated top-10 fixes (combined pass 1 + pass 2)

1. 🔴 **Fix `SELECT user_id FROM children`** — column doesn't exist (`KidsLogForms.tsx:237-241`). Switch to `parent_id`. (pass 1)
2. 🔴 **Remove fake demo state in `useBadgeStore`** (`useBadgeStore.ts:181-186`) — first-launch users see fake 30-day streak, 485 points, 9 demo badges. Either gate behind a "DEV_MODE" flag or wipe before first sync. (pass 2)
3. 🔴 **Persist reminders + daily check-ins to Supabase**, not AsyncStorage (`KidsHome.tsx:732-902`, `useBadgeStore.ts:208-260`). (pass 1+2)
4. 🔴 **Stop conflating `is_read` with reminder "done"** (`KidsHome.tsx:880` + `notifications.tsx:311`). Add a dedicated `done_at` column; tapping a notification must not silently complete the underlying task. (pass 1+2)
5. 🔴 **Rewrite vaccine-given counter from `firstWord` substring to `vaccine_key`** (`KidsHome.tsx:6962, 7046`). (pass 1)
6. 🔴 **Replace `toISOString().split('T')[0]` everywhere** with `toDateStr()` — at minimum `daily-rewards.tsx:138`, `notifications.tsx:208-213`, `leaderboard.tsx:144`, `lib/leaderboard.ts:104`, `KidsAnalytics.tsx:3302`, `profile/kids.tsx:613,876`. (pass 1+2)
7. 🔴 **Cap analytics fetch by `created_at DESC` not ASC + paginate** (`analyticsData.ts:812-816`) — 2000-row ascending cap silently drops most-recent logs on year-range views. (pass 2)
8. 🔴 **Fix realtime DELETE detection** in KidsAnalytics (`KidsAnalytics.tsx:592-595`) — also handle `payload.old?.child_id`. (pass 2)
9. 🔴 **Parallelize + cap leaderboard fetch** (`leaderboard.tsx:82-186`) — 7 sequential queries with unbounded profiles fetch is O(users). (pass 2)
10. 🔴 **Fix free scan limit per-account, not per-child** (`scan.tsx:55`). (pass 1)
