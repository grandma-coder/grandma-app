/**
 * MenopauseCalendar — the Calendar-tab surface for the Menopause behavior, the
 * flat (non-cyclical) analogue of cycle's CycleCalendar. A month grid where a day
 * you logged carries group-colored dots, today is ringed, the selected day is
 * bordered; below it a day-detail panel lists that day's entries and a "Log
 * activity" affordance logs for the SELECTED day (threaded via logDate).
 *
 * Design: tokens-only, dual-variant (useMenoPalette). Per-symptom-group sticker
 * hues (like the home + cycle calendar); Character blobs for icons.
 */
import { useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { AgendaHeader } from '../calendar/AgendaHeader'
import { LogSheet } from '../calendar/LogSheet'
import { Character, type CharacterName } from '../characters/Characters'
import { diffuseFont, useTheme, useDiffuseTheme, getDiffuseAccent } from '../../constants/theme'
import { useScrollBottomInset } from '../ui/diffuse/DiffuseKit'
import { DiffuseDotCalendar } from '../ui/diffuse/DiffusePrimitives'
import { useMenopauseLogs, type MenopauseLogRow } from '../../lib/menopauseAnalytics'
import { menopauseSymptomLabel, resolveMenopauseSymptomId } from '../../lib/menopauseSymptoms'
import { useMenopauseStore } from '../../store/useMenopauseStore'
import { MenopauseSymptomForm, MenopausePeriodForm } from './MenopauseLogForms'
import { useMenoPalette, STICKER_SHADOW, type MenoPalette } from './menoPalette'
import { logTypeBlob, symptomStickerKey } from './menopauseIcons'

const COPY = {
  loggedThisDay: 'Logged this day',
  empty: 'Nothing logged for this day yet.',
  logActivity: 'Log activity',
  chooserTitle: 'What would you like to log?',
  chooserSymptom: 'A symptom',
  chooserSymptomDesc: 'Hot flashes, sleep, mood, and more',
  chooserPeriod: 'A period',
  chooserPeriodDesc: 'Track flow and reset your counter',
  sheetSymptom: 'Log a symptom',
  sheetPeriod: 'Log a period',
  period: 'Period',
  note: 'Note',
  flow: 'flow',
  intensity: 'Intensity',
}

type SheetKind = 'none' | 'chooser' | 'symptom' | 'period'
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// ─── Date helpers (local, never toISOString) ─────────────────────────────────

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function startOfMonthGrid(year: number, month: number): Date {
  const first = new Date(year, month, 1)
  const dow = (first.getDay() + 6) % 7 // Monday-first
  return new Date(year, month, 1 - dow)
}
function formatLongDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

// ─── Entry title/subtitle (shared with the old timeline) ─────────────────────

function entryTitle(row: MenopauseLogRow): string {
  if (row.type === 'period') return COPY.period
  if (row.type === 'note') return COPY.note
  const id = resolveMenopauseSymptomId(row.type)
  return id ? menopauseSymptomLabel(id) : COPY.note
}
function entrySubtitle(row: MenopauseLogRow): string | null {
  if (row.type === 'period') return row.value ? `${capitalize(row.value)} ${COPY.flow}` : null
  if (row.severity != null) return `${COPY.intensity} ${row.severity}/5`
  return null
}
function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MenopauseCalendar() {
  const pal = useMenoPalette()
  const { stickers } = useTheme()
  const dt = useDiffuseTheme()
  const s = stickers as Record<string, string>
  const insets = useSafeAreaInsets()
  const bottomInset = useScrollBottomInset(insets.bottom + 40)

  const { data: rows } = useMenopauseLogs()
  const hydrated = useMenopauseStore((st) => st.hydrated)
  const stage = useMenopauseStore((st) => st.stage)
  const isPeri = hydrated && stage === 'peri'

  const today = localDateStr(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [sheet, setSheet] = useState<SheetKind>('none')

  const logsByDate = useMemo(() => {
    const m = new Map<string, MenopauseLogRow[]>()
    for (const r of rows ?? []) {
      const a = m.get(r.date) ?? []
      a.push(r)
      m.set(r.date, a)
    }
    return m
  }, [rows])

  const cells = useMemo(() => {
    const start = startOfMonthGrid(visibleMonth.year, visibleMonth.month)
    const out: { date: string; day: number; inMonth: boolean }[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      out.push({ date: localDateStr(d), day: d.getDate(), inMonth: d.getMonth() === visibleMonth.month })
    }
    return out
  }, [visibleMonth])

  const selectedLogs = logsByDate.get(selectedDate) ?? []
  const monthLabel = new Date(visibleMonth.year, visibleMonth.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function openAdd() {
    setSheet(isPeri ? 'chooser' : 'symptom')
  }
  function prevMonth() {
    setVisibleMonth((m) => (m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 }))
  }
  function nextMonth() {
    setVisibleMonth((m) => (m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 }))
  }

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        <AgendaHeader onAdd={openAdd} />

        {/* ─── Month grid — the SHARED DiffuseDotCalendar primitive (exact cycle-
            calendar parity: same header, nav, weekday row, grid, fonts) in the
            Diffuse variant; hand-rolled grid only in the cream variant. */}
        {pal.diffuse ? (
          <View style={{ marginTop: 4 }}>
            <DiffuseDotCalendar
              value={new Date(selectedDate + 'T12:00:00')}
              month={new Date(visibleMonth.year, visibleMonth.month, 1)}
              accent={getDiffuseAccent('menopause', dt.isDark)}
              onChange={(d) => setSelectedDate(localDateStr(d))}
              onMonthChange={(d) => setVisibleMonth({ year: d.getFullYear(), month: d.getMonth() })}
              dayField={(date) => {
                const logs = logsByDate.get(localDateStr(date)) ?? []
                return logs.length ? { color: s[symptomStickerKey(logs[0].type)], intensity: 0.5 } : null
              }}
              dayMarker={(date) => {
                const logs = logsByDate.get(localDateStr(date)) ?? []
                if (!logs.length) return null
                // The day's primary logged symptom, as a crisp Ink blob (the
                // dayField soft-tints the cell in the same hue behind it).
                const key = symptomStickerKey(logs[0].type)
                return <Character name={logTypeBlob(logs[0].type)} size={15} color={s[`${key}Ink`]} />
              }}
            />
          </View>
        ) : (
        <View
          style={[
            styles.card,
            { ...STICKER_SHADOW, shadowColor: pal.text },
            { backgroundColor: pal.surface, borderColor: pal.border, borderRadius: pal.radius.lg },
          ]}
        >
          <View style={styles.monthHead}>
            <Text style={[styles.monthLabel, { color: pal.text, fontFamily: pal.fontDisplay }]}>{monthLabel}</Text>
            <View style={styles.navRow}>
              <NavBtn dir="back" onPress={prevMonth} pal={pal} />
              <NavBtn dir="fwd" onPress={nextMonth} pal={pal} />
            </View>
          </View>

          <View style={styles.dowRow}>
            {DOW.map((d, i) => (
              <Text key={i} style={[styles.dow, { color: pal.textMuted, fontFamily: pal.diffuse ? diffuseFont.mono : pal.fontBodySemiBold }]}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((c) => {
              const dayLogs = logsByDate.get(c.date) ?? []
              const logged = c.inMonth && dayLogs.length > 0
              const isToday = c.date === today
              const isSelected = c.date === selectedDate
              const hueKeys = logged ? [...new Set(dayLogs.map((l) => symptomStickerKey(l.type)))].slice(0, 3) : []
              return (
                <Pressable
                  key={c.date}
                  onPress={() => setSelectedDate(c.date)}
                  style={[
                    styles.cell,
                    {
                      opacity: c.inMonth ? 1 : 0.3,
                      backgroundColor: isSelected ? pal.accentSoft : 'transparent',
                      borderColor: isSelected ? pal.accent : 'transparent',
                      borderWidth: isSelected ? 1.5 : 0,
                    },
                  ]}
                >
                  <Text style={[styles.dayNum, { color: pal.text, fontFamily: pal.fontDisplay }]}>{c.day}</Text>
                  <View style={styles.dotSlot}>
                    {hueKeys.map((k) => (
                      <View key={k} style={[styles.dot, { backgroundColor: s[k] }]} />
                    ))}
                  </View>
                  {isToday ? <View style={[styles.todayRing, { borderColor: pal.accent }]} pointerEvents="none" /> : null}
                </Pressable>
              )
            })}
          </View>
        </View>
        )}

        {/* ─── Selected-day detail ───────────────────────────────────────── */}
        <View style={styles.detail}>
          <Text style={[styles.detailTitle, { color: pal.text, fontFamily: pal.fontDisplay }]}>
            {formatLongDate(selectedDate)}
            {selectedDate === today ? ' · Today' : ''}
          </Text>
          <Text style={[styles.detailLabel, { color: pal.textMuted, fontFamily: pal.diffuse ? diffuseFont.mono : pal.fontBodySemiBold }]}>
            {COPY.loggedThisDay.toUpperCase()}
          </Text>

          {selectedLogs.length > 0 ? (
            <View style={styles.detailList}>
              {selectedLogs.map((row, i) => {
                const key = symptomStickerKey(row.type)
                const sub = entrySubtitle(row)
                return (
                  <View
                    key={`${row.type}-${i}`}
                    style={[
                      styles.detailCard,
                      !pal.diffuse && { ...STICKER_SHADOW, shadowColor: pal.text },
                      { backgroundColor: pal.surface, borderColor: pal.border, borderRadius: pal.radius.lg },
                    ]}
                  >
                    <View style={[styles.detailBlob, { backgroundColor: s[`${key}Soft`] }]}>
                      <Character name={logTypeBlob(row.type) as CharacterName} size={18} color={s[`${key}Ink`]} bg={s[`${key}Soft`]} />
                    </View>
                    <View style={styles.detailCopy}>
                      <Text style={[styles.detailEntryTitle, { color: pal.text, fontFamily: pal.fontBodySemiBold }]}>{entryTitle(row)}</Text>
                      {sub ? <Text style={[styles.detailEntrySub, { color: pal.textMuted, fontFamily: pal.fontBody }]}>{sub}</Text> : null}
                    </View>
                  </View>
                )
              })}
            </View>
          ) : (
            <Text style={[styles.detailEmpty, { color: pal.textMuted, fontFamily: pal.fontBody }]}>{COPY.empty}</Text>
          )}

          <Pressable
            onPress={openAdd}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.addBtn,
              !pal.diffuse && { ...STICKER_SHADOW, shadowColor: pal.text },
              {
                backgroundColor: pal.accentSoft,
                borderColor: pal.accent,
                borderRadius: pal.diffuse ? pal.radius.xl : pal.radius.full,
                transform: [{ translateY: pressed && !pal.diffuse ? 2 : 0 }],
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name="add" size={16} color={pal.accent} />
            <Text style={[styles.addBtnText, { color: pal.accent, fontFamily: pal.fontBodySemiBold }]}>{COPY.logActivity}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ─── Log sheets — every form targets the SELECTED day via logDate ── */}
      <LogSheet visible={sheet === 'chooser'} title={COPY.chooserTitle} onClose={() => setSheet('none')}>
        <View style={styles.chooser}>
          <ChooserCard icon="temperature" title={COPY.chooserSymptom} desc={COPY.chooserSymptomDesc} pal={pal} onPress={() => setSheet('symptom')} />
          <ChooserCard icon="period" title={COPY.chooserPeriod} desc={COPY.chooserPeriodDesc} pal={pal} onPress={() => setSheet('period')} />
        </View>
      </LogSheet>
      <LogSheet visible={sheet === 'symptom'} title={COPY.sheetSymptom} onClose={() => setSheet('none')}>
        <MenopauseSymptomForm logDate={selectedDate} onSaved={() => setSheet('none')} />
      </LogSheet>
      <LogSheet visible={sheet === 'period'} title={COPY.sheetPeriod} onClose={() => setSheet('none')}>
        <MenopausePeriodForm logDate={selectedDate} onSaved={() => setSheet('none')} />
      </LogSheet>
    </View>
  )
}

// ─── Month nav button ─────────────────────────────────────────────────────────

function NavBtn({ dir, onPress, pal }: { dir: 'back' | 'fwd'; onPress: () => void; pal: MenoPalette }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={dir === 'back' ? 'Previous month' : 'Next month'}
      hitSlop={8}
      style={({ pressed }) => [styles.navBtn, { borderColor: pal.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={dir === 'back' ? 'chevron-back' : 'chevron-forward'} size={16} color={pal.textSecondary} />
    </Pressable>
  )
}

// ─── Chooser card (peri only) ─────────────────────────────────────────────────

function ChooserCard({
  icon,
  title,
  desc,
  pal,
  onPress,
}: {
  icon: CharacterName
  title: string
  desc: string
  pal: MenoPalette
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.chooserCard,
        !pal.diffuse && { ...STICKER_SHADOW, shadowColor: pal.text },
        { backgroundColor: pal.surface, borderColor: pal.border, borderRadius: pal.radius.lg, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.chooserIcon, { backgroundColor: pal.accentSoft, borderColor: pal.border }]}>
        <Character name={icon} size={26} color={pal.accent} bg={pal.accentSoft} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={[styles.detailEntryTitle, { color: pal.text, fontFamily: pal.fontBodySemiBold }]}>{title}</Text>
        <Text style={[styles.detailEntrySub, { color: pal.textMuted, fontFamily: pal.fontBody }]}>{desc}</Text>
      </View>
    </Pressable>
  )
}

const CELL = `${100 / 7}%`

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },

  card: { padding: 16, borderWidth: 1, marginTop: 4 },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthLabel: { fontSize: 22, letterSpacing: -0.4 },
  navRow: { flexDirection: 'row', gap: 8 },
  navBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  dowRow: { flexDirection: 'row', marginBottom: 4 },
  dow: { width: CELL as unknown as number, textAlign: 'center', fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: CELL as unknown as number,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 3,
  },
  dayNum: { fontSize: 15, letterSpacing: -0.2 },
  dotSlot: { flexDirection: 'row', gap: 2, height: 5, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  // Diffuse day markers (rendered inside DiffuseDotCalendar cells).
  markerRow: { flexDirection: 'row', gap: 2, justifyContent: 'center' },
  marker: { width: 4, height: 4, borderRadius: 2 },
  todayRing: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },

  detail: { marginTop: 20, paddingHorizontal: 4 },
  detailTitle: { fontSize: 20, letterSpacing: -0.3 },
  detailLabel: { fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 14 },
  detailList: { gap: 10, marginTop: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1 },
  detailBlob: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  detailCopy: { flex: 1, gap: 2 },
  detailEntryTitle: { fontSize: 15, letterSpacing: -0.2 },
  detailEntrySub: { fontSize: 13, lineHeight: 18 },
  detailEmpty: { fontSize: 14, lineHeight: 20, marginTop: 10 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderWidth: 1.5,
    marginTop: 18,
  },
  addBtnText: { fontSize: 15 },

  chooser: { gap: 12, paddingBottom: 8 },
  chooserCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderWidth: 1 },
  chooserIcon: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
})
