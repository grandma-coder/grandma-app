# Vaccine Branch Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken `BlockTower` + flat vaccine lists in `HealthDetailModal` with a vertical branch tree showing the full vaccine schedule (Birth → 18 years), grouped by age milestone with tap-to-expand/collapse and done/upcoming/future status markers.

**Architecture:** All changes are confined to `components/home/KidsHome.tsx`. A `buildVaccineScheduleTree` helper pivots the existing `VACCINE_SCHEDULES` data into age-milestone groups with per-vaccine status. A `VaccineScheduleTree` inline component renders the tree using React Native `View`/`Pressable`/`Text` — no new dependencies. The existing date-picker and "Mark given" / "Set date" callbacks are reused verbatim.

**Tech Stack:** React Native (StyleSheet, View, Pressable, Text), existing hooks (`useTheme`, `useState`, `useMemo`), existing helpers (`getScheduleForCountry`, `getAgeMonths`, `formatHealthDate`, `brand`).

---

## Files

| Action | File | What changes |
|--------|------|-------------|
| Modify | `components/home/KidsHome.tsx` | Add `AgeMilestone`/`MilestoneVaccineItem` types + `buildVaccineScheduleTree` + `formatMilestoneLabel` helpers near line 5101; add `VaccineScheduleTree` component just before `HealthDetailModal`; remove `BlockTower` import + its render block + old flat lists; remove stale `upcomingVaccines` + `expandedKey` + `pickerDate` state from `HealthDetailModal` (they move into `VaccineScheduleTree`) |

---

## Task 1: Add `buildVaccineScheduleTree` helper

**Files:**
- Modify: `components/home/KidsHome.tsx` — insert after line 5099 (after `formatHealthDate`)

- [ ] **Step 1: Add types and helper function**

Find this line in `KidsHome.tsx` (around line 5094):
```ts
function formatHealthDate(dateStr: string): string {
```

Insert the following **immediately before** that function:

```ts
// ─── Vaccine Schedule Tree ────────────────────────────────────────────────────

interface MilestoneVaccineItem {
  name: string
  doseLabel: string   // "dose 2" or ""
  dueAge: string      // human label from schedule e.g. "4 months"
  status: 'done' | 'upcoming' | 'overdue' | 'future'
  givenDate?: string  // ISO date if done
  scheduleKey: string // unique key: "<name>-<doseIndex>"
}

interface AgeMilestone {
  key: string                 // stringified monthMin e.g. "0", "2", "4"
  label: string               // display label e.g. "Birth", "2 Months"
  monthMin: number
  vaccines: MilestoneVaccineItem[]
  milestoneStatus: 'done' | 'partial' | 'future'
}

function formatMilestoneLabel(monthMin: number, ageLabel: string): string {
  if (monthMin === 0) return 'Birth'
  return ageLabel.charAt(0).toUpperCase() + ageLabel.slice(1)
}

function buildVaccineScheduleTree(
  birthDate: string,
  givenVaccines: HealthRecord[],
  countryCode: string = 'US',
): AgeMilestone[] {
  if (!birthDate) return []
  const ageMonths = getAgeMonths(birthDate)
  const schedule = getScheduleForCountry(countryCode)
  const milestoneMap = new Map<number, AgeMilestone>()

  for (const v of schedule) {
    const firstWord = v.name.toLowerCase().split(' ')[0]
    const doseCount = givenVaccines.filter((g) =>
      g.value.toLowerCase().includes(firstWord)
    ).length

    for (let i = 0; i < v.monthRanges.length; i++) {
      const [monthMin, monthMax] = v.monthRanges[i]
      const ageLabel = v.ages[i]

      let status: MilestoneVaccineItem['status']
      if (i < doseCount) {
        status = 'done'
      } else if (ageMonths > monthMax + 1) {
        status = 'overdue'
      } else if (ageMonths >= monthMin - 2) {
        status = 'upcoming'
      } else {
        status = 'future'
      }

      let givenDate: string | undefined
      if (status === 'done') {
        const match = givenVaccines.filter((g) =>
          g.value.toLowerCase().includes(firstWord)
        )[i]
        givenDate = match?.date
      }

      if (!milestoneMap.has(monthMin)) {
        milestoneMap.set(monthMin, {
          key: String(monthMin),
          label: formatMilestoneLabel(monthMin, ageLabel),
          monthMin,
          vaccines: [],
          milestoneStatus: 'done',
        })
      }

      milestoneMap.get(monthMin)!.vaccines.push({
        name: v.name,
        doseLabel: v.monthRanges.length > 1 ? `dose ${i + 1}` : '',
        dueAge: ageLabel,
        status,
        givenDate,
        scheduleKey: `${v.name}-${i}`,
      })
    }
  }

  for (const milestone of milestoneMap.values()) {
    const hasOverdueOrUpcoming = milestone.vaccines.some(
      (v) => v.status === 'overdue' || v.status === 'upcoming',
    )
    const allDone = milestone.vaccines.every((v) => v.status === 'done')
    if (allDone) milestone.milestoneStatus = 'done'
    else if (hasOverdueOrUpcoming) milestone.milestoneStatus = 'partial'
    else milestone.milestoneStatus = 'future'
  }

  return Array.from(milestoneMap.values()).sort((a, b) => a.monthMin - b.monthMin)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors. If you see errors about `HealthRecord` or `getAgeMonths` not being in scope — check they are defined earlier in the same file (they are, at lines ~620 and imported from `useGoalsStore`).

- [ ] **Step 3: Commit**

```bash
git add components/home/KidsHome.tsx
git commit -m "feat(health): add buildVaccineScheduleTree helper"
```

---

## Task 2: Add `VaccineScheduleTree` component

**Files:**
- Modify: `components/home/KidsHome.tsx` — insert new function component just before `function HealthDetailModal` (around line 3347)

- [ ] **Step 1: Insert the component**

Find this exact line in `KidsHome.tsx`:
```ts
function HealthDetailModal({ visible, onClose, sleepQuality, sleepTotal, sleepTarget, child, childColor, healthHistory, scheduledVaccines, onSetVaccineDate, onMarkVaccineGiven, activityCount, activityBreakdown, feedingCount, caloriesTotal, feedingMl, stage }: {
```

Insert the following **immediately before** it:

```tsx
function VaccineScheduleTree({ child, healthHistory, scheduledVaccines, onSetVaccineDate, onMarkVaccineGiven }: {
  child: ChildWithRole
  healthHistory: HealthHistoryData
  scheduledVaccines: Record<string, string>
  onSetVaccineDate: (key: string, date: string | null) => void
  onMarkVaccineGiven: (name: string, date: string, key: string) => Promise<void>
}) {
  const { colors, isDark } = useTheme()
  const milestones = useMemo(
    () => buildVaccineScheduleTree(child.birthDate ?? '', healthHistory.vaccines, child.countryCode ?? 'US'),
    [child.birthDate, healthHistory.vaccines, child.countryCode],
  )

  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(() => {
    const set = new Set<string>()
    for (const m of milestones) {
      if (m.milestoneStatus === 'partial') set.add(m.key)
    }
    return set
  })
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [pickerDate, setPickerDate] = useState(new Date())

  const ink = colors.text
  const ink3 = colors.textMuted

  // Status palette — cream-paper design system
  const DONE_BG = isDark ? '#1A3020' : '#DFF5D6'
  const DONE_BORDER = '#7EC86A'
  const DONE_TEXT = isDark ? '#A0D890' : '#3A7A28'
  const PARTIAL_BG = isDark ? '#2E2800' : '#FEF9DC'
  const PARTIAL_BORDER = '#F5D652'
  const PARTIAL_TEXT = isDark ? '#F5D652' : '#7A6100'
  const OVERDUE_BG = isDark ? '#2E1000' : '#FEE8DC'
  const OVERDUE_BORDER = '#F5B896'
  const FUTURE_BG = isDark ? colors.surface : '#F0EDE8'
  const FUTURE_BORDER = colors.border

  function toggleMilestone(key: string) {
    setExpandedMilestones((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (milestones.length === 0) {
    return (
      <Text style={{ color: ink3, fontSize: 13, marginBottom: 8 }}>
        No vaccine schedule available
      </Text>
    )
  }

  return (
    <View>
      {milestones.map((milestone, idx) => {
        const isExpanded = expandedMilestones.has(milestone.key)
        const isLast = idx === milestones.length - 1

        const isDoneMilestone = milestone.milestoneStatus === 'done'
        const isPartialMilestone = milestone.milestoneStatus === 'partial'

        const nodeBg = isDoneMilestone ? DONE_BG : isPartialMilestone ? PARTIAL_BG : FUTURE_BG
        const nodeBorder = isDoneMilestone ? DONE_BORDER : isPartialMilestone ? PARTIAL_BORDER : FUTURE_BORDER
        const nodeText = isDoneMilestone ? DONE_TEXT : isPartialMilestone ? PARTIAL_TEXT : ink3

        const doneCount = milestone.vaccines.filter((v) => v.status === 'done').length
        const totalCount = milestone.vaccines.length
        const badgeText = isDoneMilestone
          ? `✓ ${doneCount}/${totalCount} done`
          : isPartialMilestone
          ? `${doneCount}/${totalCount} · due soon`
          : `${totalCount} vaccine${totalCount !== 1 ? 's' : ''}`

        return (
          <View key={milestone.key}>
            {/* Age milestone row */}
            <Pressable
              onPress={() => toggleMilestone(milestone.key)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 }}
            >
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: nodeBg, borderWidth: 2, borderColor: nodeBorder,
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: nodeText, textAlign: 'center', lineHeight: 12 }}>
                  {milestone.label}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: ink }}>
                  {milestone.label}
                </Text>
                <View style={{ backgroundColor: nodeBg, borderRadius: 999, alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, marginTop: 2 }}>
                  <Text style={{ fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: nodeText }}>
                    {badgeText}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: ink3 }}>{isExpanded ? '▾' : '▸'}</Text>
            </Pressable>

            {/* Branch content */}
            {isExpanded ? (
              <View style={{
                borderLeftWidth: 2, borderLeftColor: nodeBorder,
                borderStyle: 'dashed',
                marginLeft: 19, marginBottom: isLast ? 0 : 4, paddingBottom: 4,
              }}>
                {milestone.vaccines.map((vax) => {
                  const apptDate = scheduledVaccines[vax.scheduleKey] ?? null
                  const isPickerOpen = expandedKey === vax.scheduleKey
                  const fullName = vax.name + (vax.doseLabel ? ` · ${vax.doseLabel}` : '')

                  const checkBg = vax.status === 'done' ? DONE_BG
                    : vax.status === 'overdue' ? OVERDUE_BG
                    : vax.status === 'upcoming' ? PARTIAL_BG
                    : 'transparent'
                  const checkBorder = vax.status === 'done' ? DONE_BORDER
                    : vax.status === 'overdue' ? OVERDUE_BORDER
                    : vax.status === 'upcoming' ? PARTIAL_BORDER
                    : FUTURE_BORDER
                  const metaColor = vax.status === 'done' ? DONE_TEXT
                    : vax.status === 'overdue' ? (isDark ? OVERDUE_BORDER : '#8A3A00')
                    : vax.status === 'upcoming' ? PARTIAL_TEXT
                    : ink3

                  return (
                    <View key={vax.scheduleKey}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 5, paddingLeft: 10 }}>
                        {/* Status circle */}
                        <View style={{
                          width: 16, height: 16, borderRadius: 8,
                          backgroundColor: checkBg, borderWidth: 2, borderColor: checkBorder,
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {vax.status === 'done' && <Check size={8} color={DONE_TEXT} strokeWidth={3} />}
                        </View>
                        {/* Name */}
                        <Text style={{ flex: 1, fontSize: 12, fontFamily: 'DMSans_500Medium', color: ink }}>
                          {fullName}
                        </Text>
                        {/* Meta / actions */}
                        {vax.status === 'done' ? (
                          <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: metaColor }}>
                            {vax.givenDate ? formatHealthDate(vax.givenDate) : ''}
                          </Text>
                        ) : vax.status === 'upcoming' || vax.status === 'overdue' ? (
                          apptDate ? (
                            <View style={{ gap: 4, alignItems: 'flex-end' }}>
                              <Pressable
                                onPress={() => onMarkVaccineGiven(
                                  vax.name + (vax.doseLabel ? ` - ${vax.doseLabel}` : ''),
                                  apptDate,
                                  vax.scheduleKey,
                                )}
                                style={[s.hdVaxBtn, { backgroundColor: brand.success + '18', borderColor: brand.success + '50' }]}
                              >
                                <Check size={10} color={brand.success} strokeWidth={3} />
                                <Text style={[s.hdVaxBtnText, { color: brand.success }]}>Mark given</Text>
                              </Pressable>
                              <Pressable onPress={() => {
                                setExpandedKey(isPickerOpen ? null : vax.scheduleKey)
                                setPickerDate(new Date(apptDate + 'T12:00:00'))
                              }}>
                                <Text style={[s.hdChangeDateText, { color: ink3 }]}>Change date</Text>
                              </Pressable>
                            </View>
                          ) : (
                            <Pressable
                              onPress={() => {
                                setExpandedKey(isPickerOpen ? null : vax.scheduleKey)
                                setPickerDate(new Date())
                              }}
                              style={[s.hdVaxBtn, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}
                            >
                              <Text style={[s.hdVaxBtnText, { color: colors.textSecondary }]}>Set date</Text>
                            </Pressable>
                          )
                        ) : (
                          <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: ink3 }}>
                            {vax.dueAge}
                          </Text>
                        )}
                      </View>

                      {/* Inline date picker */}
                      {isPickerOpen && (
                        <View style={{ paddingBottom: 12, paddingLeft: 10 }}>
                          <DateTimePicker
                            value={pickerDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            minimumDate={new Date()}
                            themeVariant={isDark ? 'dark' : 'light'}
                            onChange={(e: DateTimePickerEvent, d?: Date) => {
                              if (Platform.OS === 'android') setExpandedKey(null)
                              if (e.type === 'set' && d) {
                                setPickerDate(d)
                                const y = d.getFullYear()
                                const mo = String(d.getMonth() + 1).padStart(2, '0')
                                const day = String(d.getDate()).padStart(2, '0')
                                onSetVaccineDate(vax.scheduleKey, `${y}-${mo}-${day}`)
                                if (Platform.OS === 'android') setExpandedKey(null)
                              }
                              if (e.type === 'dismissed') setExpandedKey(null)
                            }}
                          />
                          {Platform.OS === 'ios' && (
                            <Pressable
                              onPress={() => setExpandedKey(null)}
                              style={[s.vaccineScheduleBtn, { alignSelf: 'center', marginTop: 4, backgroundColor: brand.primary + '20', borderColor: brand.primary }]}
                            >
                              <Text style={[s.vaccineScheduleBtnText, { color: brand.primary }]}>Done</Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            ) : (
              /* Collapsed: dashed stub + one-line summary for done milestones */
              <View style={{
                borderLeftWidth: 2,
                borderLeftColor: isDoneMilestone ? DONE_BORDER + '60' : FUTURE_BORDER,
                borderStyle: 'dashed',
                marginLeft: 19,
                marginBottom: isLast ? 0 : 4,
                paddingBottom: 4,
                minHeight: 12,
              }}>
                {isDoneMilestone && (
                  <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: ink3, paddingLeft: 10, paddingTop: 2 }} numberOfLines={1}>
                    {milestone.vaccines.map((v) => v.name.split(' ')[0]).join(' · ')}
                    {milestone.vaccines[0]?.givenDate ? ` · ${formatHealthDate(milestone.vaccines[0].givenDate)}` : ''}
                  </Text>
                )}
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors. Common fixes:
- `DMSans_700Bold` — verify this font family name is correct in the project; substitute with `DMSans_600SemiBold` if it isn't registered.
- `colors.borderStrong` — if this token doesn't exist in the theme, replace with `colors.border`.

- [ ] **Step 3: Commit**

```bash
git add components/home/KidsHome.tsx
git commit -m "feat(health): add VaccineScheduleTree component"
```

---

## Task 3: Wire it into `HealthDetailModal`, remove old code

**Files:**
- Modify: `components/home/KidsHome.tsx`

- [ ] **Step 1: Remove stale state from `HealthDetailModal`**

Inside `HealthDetailModal`, find and **delete** these three lines (they move into `VaccineScheduleTree`):

```ts
  const upcomingVaccines = getNextDueVaccines(child.birthDate ?? '', healthHistory.vaccines, child.countryCode ?? 'US')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [pickerDate, setPickerDate] = useState(new Date())
```

- [ ] **Step 2: Replace the "Recent Vaccines" + "Upcoming Vaccines" sections**

Find this entire block (lines ~3449–3570) and **replace it** with the `VaccineScheduleTree` call:

**Find (the full block to replace):**
```tsx
            {/* Recent Vaccines */}
            <Text style={[s.modalSectionTitle, { color: colors.text }]}>Recent Vaccines</Text>
            {/* Block tower visualization — gallery pattern 32 */}
            {healthHistory.vaccines.length > 0 && (() => {
              const towerColors = ['#F5B896', '#F5D652', '#F2B2C7', '#BDD48C', '#9DC3E8', '#C8B6E8']
              const items: BlockTowerItem[] = healthHistory.vaccines.slice(0, 6).map((v, i) => ({
                label: (v.value.split(/[,(]/)[0] || '').trim().slice(0, 10) || `#${i + 1}`,
                color: towerColors[i % towerColors.length],
              }))
              return (
                <View style={{ marginBottom: 10, marginTop: 2 }}>
                  <BlockTower items={items} height={Math.max(80, items.length * 22 + 16)} />
                </View>
              )
            })()}
            {healthHistory.vaccines.length > 0 ? healthHistory.vaccines.slice(0, 4).map((v, i) => (
              <View key={i} style={[s.modalTaskRow, { borderBottomColor: colors.border }]}>
                <View style={[s.modalTaskCheck, { backgroundColor: brand.success, borderWidth: 0 }]}>
                  <Check size={10} color="#FFF" strokeWidth={3} />
                </View>
                <Text style={[s.modalTaskLabel, { color: colors.text }]}>{v.value.split(/[,(]/)[0].trim()}</Text>
                <Text style={[s.modalTaskStatus, { color: colors.textMuted }]}>{formatHealthDate(v.date)}</Text>
              </View>
            )) : (
              <Text style={[s.modalTaskStatus, { color: colors.textMuted, marginBottom: 8 }]}>No vaccines logged yet</Text>
            )}

            {/* Upcoming Vaccines */}
            {upcomingVaccines.length > 0 && (
              <>
                <Text style={[s.modalSectionTitle, { color: colors.text }]}>Upcoming Vaccines</Text>
                {upcomingVaccines.map((uv) => {
                  const apptDate = scheduledVaccines[uv.key] ?? null
                  const isExpanded = expandedKey === uv.key
                  const fullName = uv.name + (uv.doseLabel ? ` · ${uv.doseLabel}` : '')
                  return (
                    <View key={uv.key} style={[{ borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                      {/* Main row */}
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, gap: 10 }}>
                        <View style={[s.hdVaxIcon, { backgroundColor: uv.overdue ? brand.error + '18' : isDark ? '#3A2E00' : '#FFFAE0' }]}>
                          <Syringe size={12} color={uv.overdue ? brand.error : '#8A7400'} strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text style={[s.modalTaskLabel, { color: colors.text }]}>{fullName}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={[s.hdUrgencyBadge, {
                              backgroundColor: uv.overdue ? brand.error + '18' : isDark ? '#3A2E00' : '#FFFAE0',
                            }]}>
                              <Text style={[s.hdUrgencyText, { color: uv.overdue ? brand.error : (isDark ? '#F5D652' : '#6B5800') }]}>
                                {uv.overdue ? 'Overdue' : 'Due'} · {uv.dueAge}
                              </Text>
                            </View>
                          </View>
                          {apptDate && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
                              <NotifyAppointmentDue size={12} />
                              <Text style={[s.hdApptText, { color: brand.success }]}>
                                Appt {formatHealthDate(apptDate)}
                              </Text>
                            </View>
                          )}
                        </View>
                        {apptDate ? (
                          <View style={{ gap: 6, alignItems: 'flex-end' }}>
                            <Pressable
                              onPress={() => onMarkVaccineGiven(uv.name + (uv.doseLabel ? ` - ${uv.doseLabel}` : ''), apptDate, uv.key)}
                              style={[s.hdVaxBtn, { backgroundColor: brand.success + '18', borderColor: brand.success + '50' }]}
                            >
                              <Check size={10} color={brand.success} strokeWidth={3} />
                              <Text style={[s.hdVaxBtnText, { color: brand.success }]}>Mark given</Text>
                            </Pressable>
                            <Pressable onPress={() => { setExpandedKey(isExpanded ? null : uv.key); setPickerDate(new Date(apptDate + 'T12:00:00')) }}>
                              <Text style={[s.hdChangeDateText, { color: colors.textMuted }]}>Change date</Text>
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => { setExpandedKey(isExpanded ? null : uv.key); setPickerDate(new Date()) }}
                            style={[s.hdVaxBtn, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}
                          >
                            <Text style={[s.hdVaxBtnText, { color: colors.textSecondary }]}>Set date</Text>
                          </Pressable>
                        )}
                      </View>

                      {/* Inline date picker */}
                      {isExpanded && (
                        <View style={{ paddingBottom: 12 }}>
                          <DateTimePicker
                            value={pickerDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            minimumDate={new Date()}
                            themeVariant={isDark ? 'dark' : 'light'}
                            onChange={(e: DateTimePickerEvent, d?: Date) => {
                              if (Platform.OS === 'android') setExpandedKey(null)
                              if (e.type === 'set' && d) {
                                setPickerDate(d)
                                const y = d.getFullYear()
                                const m = String(d.getMonth() + 1).padStart(2, '0')
                                const day = String(d.getDate()).padStart(2, '0')
                                onSetVaccineDate(uv.key, `${y}-${m}-${day}`)
                                if (Platform.OS === 'android') setExpandedKey(null)
                              }
                              if (e.type === 'dismissed') setExpandedKey(null)
                            }}
                          />
                          {Platform.OS === 'ios' && (
                            <Pressable
                              onPress={() => setExpandedKey(null)}
                              style={[s.vaccineScheduleBtn, { alignSelf: 'center', marginTop: 4, backgroundColor: brand.primary + '20', borderColor: brand.primary }]}
                            >
                              <Text style={[s.vaccineScheduleBtnText, { color: brand.primary }]}>Done</Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                    </View>
                  )
                })}
              </>
            )}
```

**Replace with:**
```tsx
            {/* Vaccine Schedule */}
            <Text style={[s.modalSectionTitle, { color: colors.text }]}>Vaccine Schedule</Text>
            <VaccineScheduleTree
              child={child}
              healthHistory={healthHistory}
              scheduledVaccines={scheduledVaccines}
              onSetVaccineDate={onSetVaccineDate}
              onMarkVaccineGiven={onMarkVaccineGiven}
            />
```

- [ ] **Step 3: Remove the `BlockTower` / `BlockTowerItem` import**

Find this line near the top of `KidsHome.tsx` (around line 52):
```ts
import { BlockTower, type BlockTowerItem } from '../charts/GalleryCharts'
```

Delete it entirely. (Confirm `BlockTower` is not used anywhere else in the file with a quick search first.)

- [ ] **Step 4: Verify TypeScript compiles clean**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors. Common issues and fixes:
- `colors.borderStrong` undefined → replace with `colors.border`
- `DMSans_700Bold` not registered → replace with `DMSans_600SemiBold`
- Any remaining reference to `expandedKey`, `pickerDate`, `upcomingVaccines` → those should all be gone from `HealthDetailModal`; if any remain, delete them

- [ ] **Step 5: Final commit**

```bash
git add components/home/KidsHome.tsx
git commit -m "feat(health): replace BlockTower vaccine sections with branch tree"
```
