# Home-screen widgets and icon shortcuts: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** iOS and Android home-screen widgets (small, medium and large; one journey or child per widget), plus app-icon shortcuts. Their buttons open the app on the right log sheet.

**Architecture:**
- The app builds a JSON snapshot with a pure function (`lib/widgets/snapshot.ts`) and writes it to shared storage:
  - **iOS:** App Group UserDefaults, through `ExtensionStorage` from `@bacons/apple-targets`.
  - **Android:** AsyncStorage, read by the headless task of `react-native-android-widget`.
- Widgets only render the snapshot.
- Taps use `grandma-app://log/<journey>/<type>?child=<id>`. That URL is handled by an expo-router route, which switches journey and child and leaves a pending intent that the journey home consumes to open its sheet.

**Tech stack:** Expo SDK 54 (CNG; there is no committed `ios/` or `android/`), expo-router 6, zustand, Jest (`jest-expo`), SwiftUI WidgetKit with App Intents, `react-native-android-widget`, `expo-quick-actions`, and `react-native-view-shot` (already installed).

**Spec:** `docs/superpowers/specs/2026-11-09-home-widgets-design.md`

## Global constraints
- Bundle IDs and groups:
  - App: `co.sauceroom.grandma`.
  - Widget extension: `co.sauceroom.grandma.widget`.
  - App Group: `group.co.sauceroom.grandma`.
  - Android package: `com.grandmacoder.grandmaapp`.
  - URL scheme: `grandma-app`.
- **Snapshot language:** all text is rendered in the app language before it is written. Widgets never translate.
- **New i18n keys:** add them to `en.ts`, `pt-BR.ts` and `es.ts` with real translations. Run `npx tsx scripts/i18n/sync.ts`, then set the other locales to the English text by hand. `npm run -s i18n:check` must pass.
- **Minors:** they never see `intercourse` or `sex_drive` (`MINOR_HIDDEN_CYCLE_LOGS` in `lib/ageRules.ts`).
- **Publishing failures:** report through `reportError` (`lib/sentry.ts`) and never throw into a save path.
- **Commits:** author is grandma-coder: `git -c user.name=grandma-coder -c user.email=grandma-coder@users.noreply.github.com commit …`.
- **Approval gates:** no push, EAS build, App Store change or TestFlight submission without Igor's OK. Local `npx expo run:ios` and `npx expo run:android` builds are allowed.
- **Gate for every task:** `npm run -s typecheck && npx jest --silent` stays green.

## Decisions vs spec (rulings made while planning)
1. **Date-dependent values.** Instead of storing anchors and redoing the domain math in Swift and Kotlin, the snapshot carries `days[]`: the precomputed lines for today and the next 7 days. Widgets show the entry for today's date, so the person still gets correct values after midnight with no app open, and none of the domain logic is duplicated. "Time since last feed" uses a timestamp that the widget renders live. Daily counts are flagged `daily` and show 0 once the snapshot's `todayFor` is in the past.
2. **Fruit image.** The fruit is a base64 PNG inside the pregnancy entry, not a file path. One fewer shared-file path, and both platforms decode data URIs.
3. **Android shared storage.** Android reads the snapshot from AsyncStorage inside the library's JS task handler. No SharedPreferences bridge.
4. **iOS version.** The iOS widget needs iOS 17, because it uses App Intent configuration. On older iOS versions the app still runs, but no widget is offered.
5. **One picker.** The picker lists every snapshot entry ("Cycle", "Pregnancy", "Menopause", "Leo", "Mia"), instead of a journey picker followed by a child picker.
6. **Next appointment.** It comes from the standard schedule (`getUpcomingAppointment`), the same source the pregnancy home uses.

## Review focus
1. **Stale snapshot after several days without opening the app.** The widget must not show yesterday's "3 hot flashes today" or a frozen cycle day: `days[]` covers 8 days, and daily stats reset. Tested in Task 2 (`pickDay`/`isStale`).
2. **Caregiver loses access to a child.** That child's entry disappears, the widget shows "Pick a child" and its tap opens kids home. Tested in Task 3 (entry missing) and Task 4 (unknown child link).
3. **Logout.** The snapshot is wiped and every widget shows "Sign in to Grandma". Tested in Task 5.
4. **Deep link for a journey the person left.** It opens the app home and never calls `setModeUnsafe`. Tested in Task 4.
5. **Minor using cycle.** The "logged today" line never names intercourse or sex drive. Tested in Task 2.

---

### Task 1: Deep-link codec and button catalogue

**Files:**
- Create: `lib/widgets/deepLinks.ts`
- Test: `lib/__tests__/widgetDeepLinks.test.ts`

**Interfaces:**
- Produces:
  - `type WidgetJourney = 'cycle'|'pregnancy'|'kids'|'menopause'`
  - `WIDGET_BUTTONS: Record<WidgetJourney, {type: string; labelKey: keyof TranslationKeys}[]>`
  - `buildLogUrl(j: WidgetJourney, type: string, childId?: string): string`
  - `buildHomeUrl(j: WidgetJourney, childId?: string): string`
  - `parseWidgetLink(journey: string, type: string, child?: string): ParsedLink | null` where `ParsedLink = {journey: WidgetJourney; mode: JourneyMode; type: string | null; childId: string | null}`
  - `journeyToMode(j): JourneyMode` and `modeToJourney(m): WidgetJourney`

- [ ] **Step 1: Write the failing test.**
```ts
import { buildLogUrl, buildHomeUrl, parseWidgetLink, WIDGET_BUTTONS } from '../widgets/deepLinks'

describe('widget deep links', () => {
  it('round-trips a kids log link', () => {
    expect(buildLogUrl('kids', 'feeding', 'c1')).toBe('grandma-app://log/kids/feeding?child=c1')
    expect(parseWidgetLink('kids', 'feeding', 'c1')).toEqual({ journey: 'kids', mode: 'kids', type: 'feeding', childId: 'c1' })
  })
  it('maps cycle to the pre-pregnancy mode', () => {
    expect(parseWidgetLink('cycle', 'basal_temp')?.mode).toBe('pre-pregnancy')
  })
  it('home link has type "home" and parses to type null', () => {
    expect(buildHomeUrl('pregnancy')).toBe('grandma-app://log/pregnancy/home')
    expect(parseWidgetLink('pregnancy', 'home')?.type).toBeNull()
  })
  it('rejects unknown journeys and types', () => {
    expect(parseWidgetLink('garage', 'mood')).toBeNull()
    expect(parseWidgetLink('cycle', 'drop table')).toBeNull()
  })
  it('buttons match the spec', () => {
    expect(WIDGET_BUTTONS.cycle.map((b) => b.type)).toEqual(['period_start', 'symptom', 'mood', 'basal_temp'])
    expect(WIDGET_BUTTONS.pregnancy.map((b) => b.type)).toEqual(['mood', 'symptom', 'kick_count', 'water'])
    expect(WIDGET_BUTTONS.kids.map((b) => b.type)).toEqual(['feeding', 'sleep', 'diaper', 'mood'])
    expect(WIDGET_BUTTONS.menopause.map((b) => b.type)).toEqual(['hot_flash', 'night_sweat', 'sleep', 'low_mood'])
  })
})
```
- [ ] **Step 2:** Run `npx jest lib/__tests__/widgetDeepLinks.test.ts`. Expected: FAIL, because the module is not found.
- [ ] **Step 3: Implement.**
  - Allowed types per journey are each journey's full log union: cycle `LogType`, `PregnancyLogType`, `KidsLogType` and `MenopauseLogPick`. Copy them as `const` arrays and check them with `satisfies readonly LogType[]` and the equivalents, so the arrays fail typecheck if a union changes.
  - For labels, reuse the existing keys for each log's label (grep `LOG_ENTRIES` in `LogActivitySheet.tsx`, `PREG_QUICK_LOGS` in `lib/pregnancyQuickLogs.ts`, the kids quick-log definitions, and `MENOPAUSE_SYMPTOMS` in `lib/menopauseSymptoms.ts`). Add new `widget_btn_*` keys only where no short label exists.
```ts
export type WidgetJourney = 'cycle' | 'pregnancy' | 'kids' | 'menopause'
const MODE: Record<WidgetJourney, JourneyMode> = { cycle: 'pre-pregnancy', pregnancy: 'pregnancy', kids: 'kids', menopause: 'menopause' }
export const journeyToMode = (j: WidgetJourney) => MODE[j]
export const modeToJourney = (m: JourneyMode): WidgetJourney => (m === 'pre-pregnancy' ? 'cycle' : m)
export const buildLogUrl = (j: WidgetJourney, type: string, childId?: string) =>
  `grandma-app://log/${j}/${type}${childId ? `?child=${encodeURIComponent(childId)}` : ''}`
export const buildHomeUrl = (j: WidgetJourney, childId?: string) => buildLogUrl(j, 'home', childId)
export function parseWidgetLink(journey: string, type: string, child?: string): ParsedLink | null {
  if (!(journey in MODE)) return null
  const j = journey as WidgetJourney
  if (type !== 'home' && !ALLOWED[j].includes(type)) return null
  return { journey: j, mode: MODE[j], type: type === 'home' ? null : type, childId: child || null }
}
```
- [ ] **Step 4:** Re-run the test. Expected: PASS. Then run `npm run -s i18n:check`.
- [ ] **Step 5: Commit** with `feat(widgets): deep-link codec and per-journey widget buttons`.

---

### Task 2: Snapshot types, day picking, cycle and pregnancy entries

**Files:**
- Create: `lib/widgets/types.ts`, `lib/widgets/day.ts`, `lib/widgets/snapshot.ts` (cycle and pregnancy builders)
- Modify: `lib/i18n/{en,pt-BR,es,…}.ts` and `lib/i18n/keys.ts` (`widget_*` keys)
- Test: `lib/__tests__/widgetSnapshot.test.ts`, `lib/__tests__/widgetDay.test.ts`

**Interfaces:**
- Consumes (Task 1): `WIDGET_BUTTONS`, `buildLogUrl`, `buildHomeUrl`, `WidgetJourney`.
- Produces, in `types.ts` (Swift and Android decode exactly these field names):
```ts
export const WIDGET_SNAPSHOT_VERSION = 1
export interface WidgetDay { date: string; title: string; subtitle: string; progress?: number; strip?: { today: number; length: number; phases: ('m'|'f'|'o'|'l')[] } }
export interface WidgetStat { label: string; value: string; daily: boolean }
export interface WidgetSeries { label: string; kind: 'bars' | 'moods'; values: number[] } // 7 values, oldest first; moods: 0..5 (0 = none)
export interface WidgetButton { label: string; url: string }
export interface WidgetEntry {
  key: string; journey: WidgetJourney; name: string; state: 'ok' | 'empty'; emptyText?: string
  days: WidgetDay[]; todayFor: string; sinceLast?: { label: string; at: string }
  stats: WidgetStat[]; series?: WidgetSeries; buttons: WidgetButton[]; openUrl: string; image?: string
}
export interface WidgetSnapshot {
  version: number; signedIn: boolean; generatedAt: string; activeKey: string | null; entries: WidgetEntry[]
  strings: { signIn: string; pickChild: string; refresh: string; start: Record<WidgetJourney, string> }
}
```
- Produces, in `day.ts`:
  - `pickDay(entry, todayISO): WidgetDay | null`: the matching date, or the last day if today is past the range.
  - `isStale(entry, todayISO): boolean`.
  - `shiftSeries(values, daysLate): number[]`.
- Produces, in `snapshot.ts`:
  - `buildCycleEntry(input: CycleInput, ctx: Ctx): WidgetEntry`
  - `buildPregnancyEntry(input: PregnancyInput, ctx: Ctx): WidgetEntry`
  - Input types:
    - `Ctx = {now: Date; isMinor: boolean}`
    - `CycleInput = {config: CycleConfig | null; logs: {date: string; type: string; value: string | null}[]}`
    - `PregnancyInput = {dueDate: string | null; todayLogs: Record<string, {value: string | null}>; fruitPng?: string}`

- [ ] **Step 1: Write failing tests.** Set `useLanguageStore.setState({ language: 'en' })` in `beforeEach`.
```ts
const now = new Date('2026-11-09T10:00:00')
it('cycle: day line for today and 7 more days', () => {
  const e = buildCycleEntry({ config: { lastPeriodStart: '2026-10-31', cycleLength: 28, periodLength: 5, lutealPhase: 14 }, logs: [] }, { now, isMinor: false })
  expect(e.days).toHaveLength(8)
  expect(e.days[0]).toMatchObject({ date: '2026-11-09', title: 'Day 10 of 28' })
  expect(e.days[0].subtitle).toMatch(/19 days/)
  expect(e.days[1].title).toBe('Day 11 of 28')
  expect(e.buttons[0].url).toBe('grandma-app://log/cycle/period_start')
})
it('cycle: no period logged is the empty state, buttons kept', () => {
  const e = buildCycleEntry({ config: null, logs: [] }, { now, isMinor: false })
  expect(e.state).toBe('empty'); expect(e.emptyText).toBeTruthy(); expect(e.buttons).toHaveLength(4)
})
it('cycle: minors never see intercourse in "logged today"', () => {
  const logs = [{ date: '2026-11-09', type: 'intercourse', value: null }, { date: '2026-11-09', type: 'mood', value: 'good' }]
  const cfg = { lastPeriodStart: '2026-10-31', cycleLength: 28, periodLength: 5, lutealPhase: 14 }
  const minor = buildCycleEntry({ config: cfg, logs }, { now, isMinor: true })
  expect(JSON.stringify(minor).toLowerCase()).not.toMatch(/intercourse|sex/)
  const adult = buildCycleEntry({ config: cfg, logs }, { now, isMinor: false })
  expect(adult.stats.find((s) => s.daily)!.value).toMatch(/2/)
})
it('cycle: 7-day mood series, oldest first', () => {
  const cfg = { lastPeriodStart: '2026-10-31', cycleLength: 28, periodLength: 5, lutealPhase: 14 }
  const e = buildCycleEntry({ config: cfg, logs: [{ date: '2026-11-09', type: 'mood', value: 'great' }] }, { now, isMinor: false })
  expect(e.series).toMatchObject({ kind: 'moods' }); expect(e.series!.values).toHaveLength(7); expect(e.series!.values[6]).toBeGreaterThan(0)
})
it('pregnancy: weeks, fruit and days to go', () => {
  const e = buildPregnancyEntry({ dueDate: '2027-03-02', todayLogs: { kick_count: { value: '12' } }, fruitPng: 'AAA' }, { now, isMinor: false })
  expect(e.days[0].title).toMatch(/^23 wks · /)
  expect(e.days[0].subtitle).toMatch(/113 days to go/)
  expect(e.image).toBe('AAA')
  expect(e.stats.find((s) => s.label.match(/kick/i))?.value).toBe('12')
})
it('pregnancy: no due date is empty', () => {
  expect(buildPregnancyEntry({ dueDate: null, todayLogs: {} }, { now, isMinor: false }).state).toBe('empty')
})
```
  - In `widgetDay.test.ts`, test `pickDay` (exact date, 3 days later, past the range returns the last day), `isStale` (`todayFor` yesterday gives true) and `shiftSeries([1,2,3,4,5,6,7], 2)` returning `[3,4,5,6,7,0,0]`.
- [ ] **Step 2:** Run both tests. Expected: FAIL, because the modules are not found.
- [ ] **Step 3: Implement.**
  - Dates: compute each date with `getCycleInfo(config, dateStr)` and `toDateStr` from `lib/cycleLogic.ts`. For pregnancy use `getCurrentWeekFromDueDate`, `getDaysToGo` and `localizedBabySize` (`lib/pregnancyData.ts`), passing each day's `Date`.
  - Large cycle widget:
    - The strip uses the phases from `getCycleInfo` for days 1..cycleLength.
    - Stats:
      - "Next period": `nextPeriodDate`, formatted with `toLocaleDateString(language)`.
      - "Fertile": `fertileStart`–`fertileEnd` as dates.
      - "Logged today": a count of today's logs without `MINOR_HIDDEN_CYCLE_LOGS` when `isMinor` (`daily: true`).
    - Mood scale: `great`=5, `energetic`=5, `good`=4, `okay`=3, `down`=2, `low`=1.
  - Pregnancy stats:
    - Kicks today and water today use `todayLogs`.
    - The water target is `DAILY_WATER_GOAL` from `cycleLogic.ts`, the same value 8 as `WaterLogForm`.
    - The next appointment uses `getUpcomingAppointment(week)?.name`.
  - `progress` = `week / 40`.
  - Add the `widget_*` keys with `{{n}}` params. These include `widget_cycleDay` ("Day {{day}} of {{len}}"), `widget_periodIn` ("Period in {{n}} days"), `widget_pregWeeks` ("{{n}} wks · {{fruit}}"), `widget_daysToGo`, `widget_signIn` ("Sign in to Grandma"), `widget_pickChild`, `widget_refresh` ("Open Grandma to refresh"), `widget_start_<journey>` and the stat labels. Write the pt-BR and es versions as well.
- [ ] **Step 4:** Run the tests, then `npm run -s typecheck` and `npm run -s i18n:check`. Expected: all PASS.
- [ ] **Step 5: Commit** with `feat(widgets): snapshot builder for cycle and pregnancy`.

---

### Task 3: Kids and menopause entries, and the full snapshot

**Files:**
- Modify: `lib/widgets/snapshot.ts`, i18n files
- Test: `lib/__tests__/widgetSnapshot.test.ts` (extend)

**Interfaces:**
- Consumes: Task 2 types and helpers.
- Produces:
  - `buildKidsEntry(child: {id; name; birthDate; countryCode?}, logs: KidLog[], given: HealthRecord[], ctx): WidgetEntry`, where `KidLog = {date; type; value: string | null; created_at: string}` and `key = 'kids:' + id`.
  - `buildMenopauseEntry(input: {stage: 'peri'|'meno'|'post'|null; lastPeriodDate: string | null; logs: {date; type; value: string | null; severity: number | null}[]}, ctx): WidgetEntry`.
  - `buildSnapshot(input: SnapshotInput): WidgetSnapshot`, where:
```ts
export interface SnapshotInput {
  now: Date; isMinor: boolean; enrolled: JourneyMode[]; activeMode: JourneyMode; activeChildId: string | null
  cycle?: CycleInput; pregnancy?: PregnancyInput
  kids?: { children: { id: string; name: string; birthDate: string; countryCode?: string }[]; logs: Record<string, KidLog[]>; given: Record<string, HealthRecord[]> }
  menopause?: { stage: 'peri'|'meno'|'post'|null; lastPeriodDate: string | null; logs: { date: string; type: string; value: string | null; severity: number | null }[] }
}
```
  - `emptySnapshot(now: Date): WidgetSnapshot`, which returns `signedIn: false` and no entries.

- [ ] **Step 1: Write failing tests.**
```ts
it('kids: name and age in the title, last feed as a live timestamp, child in the button urls', () => {
  const logs = [{ date: '2026-11-09', type: 'feeding', value: null, created_at: '2026-11-09T08:00:00' }]
  const e = buildKidsEntry({ id: 'c1', name: 'Leo', birthDate: '2026-03-01' }, logs, [], { now, isMinor: false })
  expect(e.key).toBe('kids:c1'); expect(e.days[0].title).toMatch(/^Leo · 8 months/)
  expect(e.sinceLast).toEqual({ label: expect.any(String), at: '2026-11-09T08:00:00' })
  expect(e.buttons[0].url).toBe('grandma-app://log/kids/feeding?child=c1')
  expect(e.series).toMatchObject({ kind: 'bars' }); expect(e.series!.values[6]).toBe(1)
})
it('menopause: months since last period plus stage, hot flashes today', () => {
  const logs = [1, 2, 3].map(() => ({ date: '2026-11-09', type: 'hot_flash', value: null, severity: 2 }))
  const e = buildMenopauseEntry({ stage: 'peri', lastPeriodDate: '2026-09-05', logs }, { now, isMinor: false })
  expect(e.days[0].title).toMatch(/2 months/); expect(e.days[0].title).toMatch(/perimenopause/i)
  expect(e.days[0].subtitle).toMatch(/3 hot flashes today/)
})
it('snapshot: one entry per enrolled journey and per child, activeKey follows the app', () => {
  const s = buildSnapshot({ now, isMinor: false, enrolled: ['kids', 'pregnancy'], activeMode: 'kids', activeChildId: 'c2',
    pregnancy: { dueDate: '2027-03-02', todayLogs: {} },
    kids: { children: [{ id: 'c1', name: 'Leo', birthDate: '2026-03-01' }, { id: 'c2', name: 'Mia', birthDate: '2024-01-01' }], logs: {}, given: {} } })
  expect(s.entries.map((e) => e.key)).toEqual(['pregnancy', 'kids:c1', 'kids:c2'])
  expect(s.activeKey).toBe('kids:c2'); expect(s.version).toBe(1); expect(s.signedIn).toBe(true)
})
it('snapshot: journeys without data input are skipped, not crashed', () => {
  const s = buildSnapshot({ now, isMinor: false, enrolled: ['menopause'], activeMode: 'menopause', activeChildId: null })
  expect(s.entries).toHaveLength(0)
})
it('emptySnapshot is signed out', () => { expect(emptySnapshot(now)).toMatchObject({ signedIn: false, entries: [] }) })
```
- [ ] **Step 2:** Run the test. Expected: FAIL, because the functions are not exported.
- [ ] **Step 3: Implement.**
  - **Kids:**
    - Age uses `formatChildAge` from `components/ui/ChildPills.tsx`. Move it to `lib/childAge.ts`, re-export it from `ChildPills`, and keep the existing callers working.
    - Subtitle: "slept 7h30", from the last `sleep` log value in minutes (check the format in `KidsLogForms.tsx`).
    - Series: feed counts per day.
    - Stats: feeds today and diapers today (`daily`), and the next vaccine from `getNextDueVaccines(birthDate, given, countryCode)[0]` formatted as `name · dueAge`.
  - **Menopause:**
    - Months use `monthsSinceDate(latestPeriodDate(logs, lastPeriodDate), day)` from `lib/menopauseStage.ts`. The stage label reuses the existing stage keys.
    - Series: hot flashes per day.
    - Stats: last night's sleep (latest `sleep` log value) and the most frequent symptom over the last 30 days, using its existing label key.
  - **`buildSnapshot`:** skip a journey that is not enrolled or has no input. `activeKey` is `kids:<activeChildId>` for kids, otherwise the active journey.
- [ ] **Step 4:** Run the tests and the typecheck. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(widgets): kids and menopause entries; full snapshot`.

---

### Task 4: Deep-link route and pending log intent

**Files:**
- Create: `store/useWidgetIntentStore.ts`, `lib/widgets/applyLink.ts`, `app/log/[journey]/[type].tsx`
- Modify: `components/home/CycleHome.tsx`, `PregnancyHome.tsx`, `KidsHome.tsx`, `MenopauseHome.tsx`
- Test: `lib/__tests__/widgetApplyLink.test.ts`

**Interfaces:**
- Consumes (Task 1): `parseWidgetLink`, `ParsedLink`.
- Produces:
  - `useWidgetIntentStore` with `{pending: {journey: WidgetJourney; type: string} | null; set(p); take(journey): string | null}`. `take` returns the type and clears it, but only when the journey matches.
  - `applyWidgetLink(p: ParsedLink): 'home' | 'journey'`.
  - `useConsumeWidgetIntent(journey: WidgetJourney, open: (type: string) => void)`, a hook exported from the store file.

- [ ] **Step 1: Write the failing test.** Drive the real zustand stores and reset them in `beforeEach`.
```ts
it('switches mode, behavior and child, and leaves the intent', () => {
  useBehaviorStore.setState({ enrolledBehaviors: ['kids', 'pregnancy'], currentBehavior: 'pregnancy' })
  useModeStore.setState({ mode: 'pregnancy' })
  useChildStore.setState({ children: [{ id: 'c1' } as any, { id: 'c2' } as any], activeChild: { id: 'c1' } as any })
  expect(applyWidgetLink({ journey: 'kids', mode: 'kids', type: 'feeding', childId: 'c2' })).toBe('journey')
  expect(useModeStore.getState().mode).toBe('kids'); expect(useBehaviorStore.getState().currentBehavior).toBe('kids')
  expect(useChildStore.getState().activeChild?.id).toBe('c2')
  expect(useWidgetIntentStore.getState().take('kids')).toBe('feeding')
  expect(useWidgetIntentStore.getState().take('kids')).toBeNull()
})
it('journey not enrolled → home, nothing changed', () => {
  useBehaviorStore.setState({ enrolledBehaviors: ['kids'], currentBehavior: 'kids' }); useModeStore.setState({ mode: 'kids' })
  expect(applyWidgetLink({ journey: 'menopause', mode: 'menopause', type: 'hot_flash', childId: null })).toBe('home')
  expect(useModeStore.getState().mode).toBe('kids'); expect(useWidgetIntentStore.getState().pending).toBeNull()
})
it('unknown child keeps the current child but still opens kids', () => {
  useBehaviorStore.setState({ enrolledBehaviors: ['kids'], currentBehavior: 'kids' })
  useChildStore.setState({ children: [{ id: 'c1' } as any], activeChild: { id: 'c1' } as any })
  expect(applyWidgetLink({ journey: 'kids', mode: 'kids', type: 'feeding', childId: 'gone' })).toBe('journey')
  expect(useChildStore.getState().activeChild?.id).toBe('c1')
})
it('home link sets no intent', () => {
  useBehaviorStore.setState({ enrolledBehaviors: ['pregnancy'], currentBehavior: 'pregnancy' })
  applyWidgetLink({ journey: 'pregnancy', mode: 'pregnancy', type: null, childId: null })
  expect(useWidgetIntentStore.getState().pending).toBeNull()
})
```
- [ ] **Step 2:** Run the test. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **`applyWidgetLink`:** if `!enrolledBehaviors.includes(mode)`, return `'home'`. Otherwise call `useModeStore.getState().setMode(mode)` and `useBehaviorStore.getState().switchTo(mode)`. Then call `setActiveChild` when the child is in `children`, and `set({journey, type})` when `type` is set.
  - **Route** `app/log/[journey]/[type].tsx`:
```tsx
export default function WidgetLinkRoute() {
  const { journey, type, child } = useLocalSearchParams<{ journey: string; type: string; child?: string }>()
  useEffect(() => {
    const p = parseWidgetLink(String(journey), String(type), child ? String(child) : undefined)
    if (p) applyWidgetLink(p)
    router.replace('/(tabs)')
  }, [journey, type, child])
  return null
}
```
  - **Signed out:** check how `app/_layout.tsx` gates `(tabs)`. If the route renders before auth, `router.replace('/(tabs)')` falls through to the existing auth redirect; confirm this on the simulator.
  - **Homes:** add one line each, using the existing open functions.
    - `CycleHome`: `useConsumeWidgetIntent('cycle', (t) => setLogSheetType(t as LogType))`.
    - `PregnancyHome`: `useConsumeWidgetIntent('pregnancy', (t) => setActiveLog(t as PregnancyLogType))`.
    - `KidsHome`: `useConsumeWidgetIntent('kids', (t) => setLogSheetType(t as KidsLogType))`.
    - `MenopauseHome`: `useConsumeWidgetIntent('menopause', (t) => (t === 'period' ? setActiveSheet('period') : openSymptom(t as MenopauseSymptomId)))`.
    - The hook runs `take` in an effect that subscribes to `pending`, so a link arriving while the home is already mounted still opens.
- [ ] **Step 4:** Run the tests and the typecheck. Expected: PASS.
- [ ] **Step 5: Simulator check** (restart Metro first: `npx expo start --dev-client --port 8081 > /tmp/gm-metro.log 2>&1`, in the background):
  - Run `xcrun simctl openurl booted "grandma-app://log/pregnancy/kick_count"` on the demo account. Expected: the pregnancy home with the kick sheet open.
  - Repeat with the kids `feeding` link using a real child id.
- [ ] **Step 6: Commit** with `feat(widgets): grandma-app://log links open the right journey and log sheet`.

---

### Task 5: Collect, publish, triggers and logout wipe

**Files:**
- Run: `npx expo install @bacons/apple-targets react-native-android-widget expo-quick-actions`
- Create: `lib/widgets/storage.ts` (platform adapter), `lib/widgets/collect.ts` (Supabase and store reads, producing a `SnapshotInput`), `lib/widgets/publish.ts`, `hooks/useWidgetPublisher.ts`
- Modify: `app/_layout.tsx` (mount the hook), `lib/signOut.ts` (wipe)
- Test: `lib/__tests__/widgetPublish.test.ts`

**Interfaces:**
- Consumes: `buildSnapshot`, `emptySnapshot` (Task 3).
- Produces:
  - `WIDGET_APP_GROUP = 'group.co.sauceroom.grandma'`
  - `WIDGET_SNAPSHOT_KEY = 'widgetSnapshot'`, which is also the AsyncStorage key `grandma-widget-snapshot` on Android
  - `writeSnapshot(json: string): Promise<void>` and `readSnapshot(): Promise<string | null>` (in `storage.ts`)
  - `publishWidgets(reason: string): void` (debounced 1.5 s) and `publishNow(): Promise<void>`
  - `clearWidgets(): Promise<void>`
  - `setQuickActionsFor(snapshot)`, a no-op placeholder that Task 7 fills; declare it in `publish.ts` now

- [ ] **Step 1: Write the failing test.** Mock `../widgets/storage` and `../widgets/collect` with `jest.mock`.
```ts
jest.useFakeTimers()
it('debounces bursts into one write', async () => {
  publishWidgets('a'); publishWidgets('b'); publishWidgets('c')
  await jest.advanceTimersByTimeAsync(1600)
  expect(writeSnapshot).toHaveBeenCalledTimes(1)
})
it('clearWidgets writes a signed-out snapshot and cancels a pending publish', async () => {
  publishWidgets('x'); await clearWidgets(); await jest.advanceTimersByTimeAsync(1600)
  expect(writeSnapshot).toHaveBeenCalledTimes(1)
  expect(JSON.parse((writeSnapshot as jest.Mock).mock.calls[0][0])).toMatchObject({ signedIn: false, entries: [] })
})
it('a collect failure is reported, never thrown', async () => {
  (collectSnapshotInput as jest.Mock).mockRejectedValueOnce(new Error('offline'))
  await expect(publishNow()).resolves.toBeUndefined()
  expect(reportError).toHaveBeenCalled()
})
```
- [ ] **Step 2:** Run the test. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **`storage.ts`:**
    - iOS: `new ExtensionStorage(WIDGET_APP_GROUP).set(WIDGET_SNAPSHOT_KEY, json)`, then `ExtensionStorage.reloadWidget()`.
    - Android: `AsyncStorage.setItem('grandma-widget-snapshot', json)`, then `requestWidgetUpdate({ widgetName: 'Grandma', renderWidget: (info) => renderGrandmaWidget(json, info) })`. `renderGrandmaWidget` comes from Task 9; until then, guard the call with `Platform.OS` and a lazy `require`.
    - Wrap both in try/catch, because the native modules don't exist in Jest or in the old dev client.
  - **`collect.ts`:**
    - Read the stores: `useBehaviorStore`, `useModeStore`, `useChildStore`, `useCycleSettingsStore`, `usePregnancyStore`, `useMenopauseStore`, and `useLanguageStore` for the minor check through `isMinor(profile dob)`. Use the same source as `hooks/useIsMinor.ts`; expose a non-hook getter there if needed.
    - Then query Supabase with the session user, only for enrolled journeys:
      - `cycle_logs` from the last 120 days, then `computeCycleHistory` and `buildReminderCycleConfig`.
      - `pregnancy_logs` for today, as a map by `log_type`.
      - `child_logs` from the last 8 days for each visible child, plus `type='vaccine'` rows for `given`.
      - `menopause_logs` from the last 60 days.
    - Copy the query shapes from `lib/analyticsData.ts`, `lib/menopauseAnalytics.ts` and `lib/cycleAnalytics.ts`.
    - Fruit: read `useWidgetAssetStore` (Task 6). Until Task 6 lands, `fruitPng` is undefined.
  - **`publish.ts`:** `publishNow` runs `collect`, then `buildSnapshot`, then `writeSnapshot(JSON.stringify(s))`, then `setQuickActionsFor(s)`. All of it sits in try/catch, with `reportError(e, { area: 'widgets' })` in the catch.
  - **`useWidgetPublisher`**, mounted once in `app/_layout.tsx` after journeys are restored:
    - Publish on mount.
    - Publish on `AppState` → `background`.
    - Publish when `useModeStore.mode`, `useChildStore.activeChild?.id`, `useLanguageStore.language`, `usePregnancyStore.dueDate` or `useCycleSettingsStore.cycleLength` change (zustand `subscribe`).
    - Publish on `queryClient.getQueryCache().subscribe(ev)` when `ev.type === 'updated' && ev.action.type === 'success'` and the first segment of the key is one of `cycleLogs`, `pregnancy-today-logs`, `kids-today-logs`, `menopause-logs`, or starts with `pregnancy`. Every save path invalidates one of these, so this covers save, edit and delete.
  - **`signOut.ts`:** call `await clearWidgets()` before `router.replace`.
- [ ] **Step 4:** Run the tests and the typecheck. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(widgets): publish the snapshot after logs, switches and backgrounding; wipe on sign-out`. Include `package.json` and `package-lock.json`.

---

### Task 6: Fruit image capture

**Files:**
- Create: `store/useWidgetAssetStore.ts` (persisted `{fruitWeek: number | null; fruitPng: string | null}`), `components/home/pregnancy/WidgetFruitCapture.tsx`
- Modify: `components/home/PregnancyHome.tsx` (mount it), `lib/widgets/collect.ts` (pass `fruitPng`)
- Test: `lib/__tests__/widgetAssetStore.test.ts`

**Interfaces:**
- Consumes: `BabyIllustration` from `components/home/pregnancy/babyIllustrations.tsx`, `captureRef` from `react-native-view-shot`, `publishWidgets` (Task 5).
- Produces: `needsFruitCapture(week: number, state): boolean`.

- [ ] **Step 1: Write the failing test.** `needsFruitCapture(23, {fruitWeek: 22, fruitPng: 'x'})` is true; `(23, {fruitWeek: 23, fruitPng: 'x'})` is false; `(23, {fruitWeek: 23, fruitPng: null})` is true.
- [ ] **Step 2:** Run the test. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - When `needsFruitCapture` is true, `WidgetFruitCapture` renders `BabyIllustration` at 160×160 inside an off-screen `View`: `position: 'absolute', left: -1000, collapsable: false`.
  - After layout it calls `captureRef(ref, { format: 'png', result: 'base64', width: 160, height: 160 })`, saves the result to the store, then calls `publishWidgets('fruit')`.
  - Errors go to `reportError`.
- [ ] **Step 4:** Run the tests and the typecheck. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(widgets): capture the week's fruit for the pregnancy widget`.

---

### Task 7: App-icon shortcuts

**Files:**
- Create: `lib/widgets/quickActions.ts`
- Modify: `lib/widgets/publish.ts` (`setQuickActionsFor`), `app/_layout.tsx` (`useQuickActionRouting` from `expo-quick-actions/router`), `app.json` (add the `expo-quick-actions` plugin)
- Test: `lib/__tests__/widgetQuickActions.test.ts`

**Interfaces:**
- Consumes: `WidgetSnapshot`.
- Produces: `buildQuickActions(s: WidgetSnapshot, calendarLabel: string): {id: string; title: string; params: {href: string}}[]`.

- [ ] **Step 1: Write the failing test.**
  - The entry for `activeKey` gives 4 log actions plus a last action whose `href` is `'/(tabs)/calendar'`. Check the real calendar route under `app/(tabs)/`.
  - The hrefs are the path part of the button URL; for example `/log/kids/feeding?child=c1`.
  - A signed-out snapshot or a missing `activeKey` gives `[]`.
- [ ] **Step 2:** Run the test. Expected: FAIL.
- [ ] **Step 3: Implement.** Strip `grandma-app:/` from each button URL. `setQuickActionsFor` calls `QuickActions.setItems(buildQuickActions(...))` inside a try/catch.
- [ ] **Step 4:** Run the tests and the typecheck. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(widgets): app-icon shortcuts for the active journey's logs`.

---

### Task 8: iOS WidgetKit extension

**Files:**
- Modify: `app.json`
  - Add the plugin `"@bacons/apple-targets"`.
  - Add `ios.entitlements: {"com.apple.security.application-groups": ["group.co.sauceroom.grandma"]}`.
  - Add `ios.appleTeamId: "C7H9AXWR6A"`.
- Create:
  - `targets/widget/expo-target.config.js`
  - `targets/widget/Snapshot.swift` (Codable mirror of `types.ts`)
  - `targets/widget/Provider.swift` (App Intent, entity query, timeline)
  - `targets/widget/Views.swift` (S, M and L views)
  - `targets/widget/index.swift` (`@main` bundle)
  - `targets/widget/Assets.xcassets/` (accent colour only)

**Interfaces:**
- Consumes: the snapshot JSON (Task 2 field names) under App Group key `widgetSnapshot`, and the URLs from Task 1.

- [ ] **Step 1: Target config.**
```js
module.exports = (config) => ({
  type: 'widget', name: 'GrandmaWidget', deploymentTarget: '17.0',
  entitlements: { 'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'] },
})
```
- [ ] **Step 2: `Snapshot.swift`.** Decodable structs whose field names match `types.ts` exactly.
  - Helpers:
    - `static func load() -> Snapshot?` reads `UserDefaults(suiteName: "group.co.sauceroom.grandma")?.string(forKey: "widgetSnapshot")` and decodes it. It returns nil on failure, or when `version != 1`; mark that case `.outdated`.
    - `func day(for: Date) -> WidgetDay?` mirrors `pickDay`.
    - `isStale` and `shifted(series)` mirror `day.ts`.
- [ ] **Step 3: `Provider.swift`.**
  - `EntryEntity: AppEntity`, with id = the entry `key` and display = the entry `name`. `EntryQuery` lists `Snapshot.load()?.entries`.
  - `SelectEntryIntent: WidgetConfigurationIntent` has `@Parameter var entry: EntryEntity?`.
  - `AppIntentTimelineProvider`:
    - Timeline: an entry now plus one at each of the next 7 midnights, with `.atEnd`.
    - The resolved entry is the chosen key, or `snapshot.activeKey` if none was chosen.
    - States:
      - `.signedOut`: the snapshot is nil or `signedIn == false`.
      - `.outdated`: the version is wrong.
      - `.pickChild`: a kids key that is no longer in `entries`.
      - `.start(journey)`: a non-kids key that is missing.
      - `.ok(entry)`.
- [ ] **Step 4: `Views.swift`.** `@Environment(\.widgetFamily)`.
  - **Small:** title and subtitle from `day(for: now)`. Pregnancy shows the image as `Image(uiImage: UIImage(data: Data(base64Encoded:)))`. `sinceLast` renders as `Text(date, style: .relative)` plus its label. `.widgetURL(openUrl)`.
  - **Medium:** small content plus a 4-button row of `Link(destination: URL(string: button.url)!)`.
  - **Large:** medium content plus:
    - the strip: 28 dots with today ringed;
    - the progress bar;
    - the stats list, where a `daily` value shows "0" when stale;
    - the series as 7 bars, or mood faces for `moods`.
  - Text: `.minimumScaleFactor(0.7)` and `.lineLimit(2)` everywhere, for long PT and ES strings.
  - Use the app's palette: copy the cream/ink hex values from `constants/` (grep for the site-look tokens).
  - Non-ok states render a single centred line from `strings`, with `.widgetURL` set to the app home.
- [ ] **Step 5: `index.swift`.**
```swift
@main struct GrandmaWidgetBundle: WidgetBundle { var body: some Widget { GrandmaWidget() } }
struct GrandmaWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: "GrandmaWidget", intent: SelectEntryIntent.self, provider: Provider()) { WidgetView(entry: $0) }
      .configurationDisplayName("Grandma").description("Your journey at a glance, one tap to log.")
      .supportedFamilies([.systemSmall, .systemMedium, .systemLarge]).contentMarginsDisabled()
  }
}
```
- [ ] **Step 6: Local build.** Run `npx expo prebuild -p ios --clean && npx expo run:ios --device "<6.9-inch sim name>"`. Expected: the build succeeds. `ios/` is gitignored, so never stage it.
  - Sign in with the demo account.
  - Add a widget in small, medium and large for each journey.
  - Tap every button. Expected: the right sheet opens.
  - Switch the language to PT and to ES, and check the small widget on the SE simulator.
  - Sign out. Expected: "Sign in to Grandma".
  - Run `xcrun simctl status_bar`, or set the clock past midnight, and confirm the day line advances.
- [ ] **Step 7: Commit** with `feat(widgets): iOS home-screen widget (small/medium/large, per journey and child)`.

---

### Task 9: Android widget

**Files:**
- Modify:
  - `app.json`: plugin `["react-native-android-widget", {"widgets": [{"name": "Grandma", "label": "Grandma", "description": "Your journey at a glance", "minWidth": "110dp", "minHeight": "110dp", "targetCellWidth": 2, "targetCellHeight": 2, "resizeMode": "horizontal|vertical", "updatePeriodMillis": 1800000, "widgetFeatures": "reconfigurable", "previewImage": "./assets/widget-preview.png"}]}]`
  - `package.json`: set `"main": "index.ts"`
- Create:
  - `index.ts`: `import 'expo-router/entry'` and `registerWidgetTaskHandler(widgetTaskHandler)` / `registerWidgetConfigurationScreen(WidgetConfigScreen)` on Android only
  - `widgets/android/GrandmaWidget.tsx` (S, M and L layouts from `FlexWidget`, `TextWidget` and `ImageWidget`)
  - `widgets/android/taskHandler.tsx`
  - `widgets/android/ConfigScreen.tsx`
  - `widgets/android/render.ts`, which exports `renderGrandmaWidget(json, info)` and `resolveEntry(snapshot, chosenKey, todayISO)`
  - `assets/widget-preview.png`, cropped from the mockup
- Test: `lib/__tests__/widgetAndroidResolve.test.ts`

**Interfaces:**
- Consumes: the Task 2 types, `pickDay`, `isStale` and `shiftSeries`, and the storage key `grandma-widget-snapshot`.
- Produces: `resolveEntry(...) => {kind: 'ok', entry, day} | {kind: 'signedOut' | 'outdated' | 'pickChild'} | {kind: 'start', journey}`. This is the same state logic as Swift, written in TS so it is tested.

- [ ] **Step 1: Write the failing test** for `resolveEntry`:
  - null JSON → `signedOut`;
  - `version` 2 → `outdated`;
  - chosen `kids:gone` → `pickChild`;
  - chosen `menopause` missing → `start`;
  - no choice → `activeKey`;
  - a stale `todayFor` → daily stats show "0".
- [ ] **Step 2:** Run the test. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Layout size:** the task handler picks the layout from `widgetInfo.height`: below 180 dp is S; below 300 is M, unless the width is under 250, which is S; anything larger is L.
  - **Chosen entry:** stored in AsyncStorage `grandma-widget-config:<widgetId>`.
  - **Taps:** buttons use `clickAction="OPEN_URI" clickActionData={{ uri: button.url }}`, and the body uses `entry.openUrl`.
  - **Fruit image:** `ImageWidget image={'data:image/png;base64,' + entry.image}`.
  - **"Time since last feed":** computed at render time from `sinceLast.at`. The handler re-renders on `WIDGET_UPDATE` every 30 minutes.
  - **Config screen:** lists `entries` by `name`, saves the choice, then calls `renderWidget` and `setResult('ok')`.
- [ ] **Step 4:** Run the tests and the typecheck. Expected: PASS. Confirm that iOS still boots, since the entry point changed: `npx expo start --dev-client`, then reload the simulator.
- [ ] **Step 5: First Android build, local.** Run `npx expo prebuild -p android --clean && npx expo run:android` on an emulator (`emulator -list-avds`).
  - If no Android SDK or emulator is installed, stop and tell Igor; do not start an EAS Android build without his OK.
  - Check every journey at every size: buttons open the sheets, the config screen works, and sign-out shows "Sign in to Grandma".
- [ ] **Step 6: Commit** with `feat(widgets): Android home-screen widget with journey/child picker`.

---

### Task 10: Wrap-up
- [ ] Add a "Widgets" section to `docs/beta/known-issues.md` listing what can only be tested on a device: refresh cadence, battery, icon shortcuts on a real phone, and signing for the extension and App Group in EAS (the new bundle id and group must be registered on the Apple account before build 19).
- [ ] Run `npm run -s typecheck && npx jest --silent && npm run -s i18n:check`. Expected: all green.
- [ ] **Commit** with `docs(beta): widget notes and device-only checks`.
- [ ] **Stop.** Report to Igor and ask before EAS build 19, before pushing, and before registering identifiers on the Apple account.
