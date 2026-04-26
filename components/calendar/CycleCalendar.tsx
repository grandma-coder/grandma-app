/**
 * C4 — Cycle Calendar (cream-paper redesign, Apr 2026)
 *
 * 3-tab shell: Cycle / Checklist / Visits (ink active pill).
 * Cycle tab: week strip + Today section with pastel ActivityPillCards for each
 * loggable type. Tapping a card opens the matching LogSheet form.
 * "+" in header opens a Log Activity sheet with all quick-log tiles.
 */

import { useState, useMemo } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native'
import { X, Check, Circle as CircleIcon } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { getCycleInfo, toDateStr, type CyclePhase } from '../../lib/cycleLogic'
import { LogSheet } from './LogSheet'
import { AgendaHeader } from './AgendaHeader'
import { SegmentedTabs } from './SegmentedTabs'
import { AgendaWeekStrip } from './AgendaWeekStrip'
import { ActivityPillCard } from './ActivityPillCard'
import { LogTile, LogTileGrid } from './LogTile'
import { SectionHeader } from './SectionHeader'
import { PaperCard } from '../ui/PaperCard'
import { Display, Body } from '../ui/Typography'
import { logSticker } from './logStickers'
import {
  PeriodStartForm,
  PeriodEndForm,
  SymptomsForm,
  MoodForm,
  TemperatureForm,
  IntimacyForm,
} from './LogForms'
import { ExamForm } from '../exams/ExamForm'

// ─── Constants ─────────────────────────────────────────────────────────────

type LogType = 'period_start' | 'period_end' | 'symptom' | 'mood' | 'basal_temp' | 'intercourse' | 'exam'
type ViewTab = 'cycle' | 'checklist' | 'visits'

interface LogEntry {
  id: LogType
  label: string
  subtitle: string
  tint: string
}

const LOG_ENTRIES: LogEntry[] = [
  { id: 'basal_temp',   label: 'Temperature',  subtitle: 'Daily BBT reading',     tint: 'temperature' },
  { id: 'symptom',      label: 'Symptoms',     subtitle: 'How you feel today',    tint: 'symptom' },
  { id: 'mood',         label: 'Mood',         subtitle: "Today's mood check-in", tint: 'mood' },
  { id: 'intercourse',  label: 'Intimacy',     subtitle: 'Track fertile moments', tint: 'intimacy' },
  { id: 'period_start', label: 'Period start', subtitle: 'Begin a new cycle',     tint: 'period' },
  { id: 'period_end',   label: 'Period end',   subtitle: 'Close out your flow',   tint: 'period' },
  { id: 'exam',         label: 'Exam result',  subtitle: 'Lab or fertility test', tint: 'exam' },
]

// ─── Log Activity Sheet (opened by header "+") ─────────────────────────────

function LogActivitySheet({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (type: LogType) => void
}) {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()

  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const bg = isDark ? colors.bg : '#F3ECD9'
  const ink = isDark ? colors.text : '#141313'

  function handleSelect(type: LogType) {
    onClose()
    onSelect(type)
  }

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: paperBorder }]} />
        </View>
        <View style={styles.sheetHeader}>
          <Display size={22} color={ink}>Log Activity</Display>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: paper, borderColor: paperBorder }]}>
            <X size={18} color={ink} />
          </Pressable>
        </View>
        <View style={styles.sheetBody}>
          <LogTileGrid>
            {LOG_ENTRIES.map((e) => (
              <LogTile
                key={e.id}
                label={e.label}
                tint={e.tint}
                icon={logSticker(e.id, 36, isDark)}
                onPress={() => handleSelect(e.id)}
              />
            ))}
          </LogTileGrid>
        </View>
      </View>
    </Modal>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export function CycleCalendar() {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()

  const [tab, setTab] = useState<ViewTab>('cycle')
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [sheetType, setSheetType] = useState<LogType | null>(null)
  const [logSheetOpen, setLogSheetOpen] = useState(false)

  // Cycle config (mock — will come from Supabase)
  const cycleConfig = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 10)
    return { lastPeriodStart: toDateStr(d), cycleLength: 28, periodLength: 5 }
  }, [])

  const selectedInfo = getCycleInfo(cycleConfig, selectedDate)
  const modeColor = brand.prePregnancy

  function handleSaved() {
    setSheetType(null)
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AgendaHeader onAdd={() => setLogSheetOpen(true)} />

        <View style={{ marginBottom: 14 }}>
          <SegmentedTabs
            options={[
              { key: 'cycle', label: 'Cycle' },
              { key: 'checklist', label: 'Checklist' },
              { key: 'visits', label: 'Visits' },
            ]}
            value={tab}
            onChange={(k) => setTab(k as ViewTab)}
          />
        </View>

        {tab === 'cycle' && (
          <>
            <View style={{ marginBottom: 14 }}>
              <AgendaWeekStrip
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                modeColor={modeColor}
              />
            </View>

            {/* Phase pill */}
            <PaperCard style={{ marginBottom: 14 }}>
              <View style={styles.phaseRow}>
                <View style={[styles.phaseDot, { backgroundColor: phaseColor(selectedInfo.phase) }]} />
                <Body size={13} color={isDark ? colors.text : '#141313'} style={{ flex: 1, fontWeight: '600' }}>
                  {selectedInfo.phaseLabel} · Day {selectedInfo.cycleDay}
                </Body>
                {selectedInfo.conceptionProbability !== 'none' ? (
                  <View
                    style={[
                      styles.fertilityTag,
                      {
                        backgroundColor: isDark ? phaseColor(selectedInfo.phase) + '55' : phaseColor(selectedInfo.phase),
                        borderColor: isDark ? colors.text : '#141313',
                      },
                    ]}
                  >
                    <Text style={[styles.fertilityTagText, { color: isDark ? colors.text : '#141313' }]}>
                      {selectedInfo.conceptionProbability.toUpperCase()} CHANCE
                    </Text>
                  </View>
                ) : null}
              </View>
              <Body size={13} color={isDark ? colors.textSecondary : '#3A3533'} style={{ marginTop: 6 }}>
                {selectedInfo.phaseDescription}
              </Body>
            </PaperCard>

            <SectionHeader
              title={`Today · ${formatDayShort(selectedDate)}`}
              right={`${LOG_ENTRIES.length} to log`}
              iconColor={modeColor}
            />

            <View style={{ gap: 10, marginTop: 8 }}>
              {LOG_ENTRIES.map((e) => (
                <ActivityPillCard
                  key={e.id}
                  icon={logSticker(e.id, 28, isDark)}
                  title={`Log ${e.label.toLowerCase()}`}
                  subtitle={e.subtitle}
                  tint={e.tint}
                  onPress={() => setSheetType(e.id)}
                />
              ))}
            </View>
          </>
        )}

        {tab === 'checklist' && (
          <PaperCard style={{ marginTop: 4 }}>
            <View style={styles.tabEmpty}>
              <View style={[styles.tabEmptyIcon, { backgroundColor: modeColor + '22' }]}>
                <Check size={22} color={modeColor} strokeWidth={2} />
              </View>
              <Display size={20} color={isDark ? colors.text : '#141313'}>Fertility checklist</Display>
              <Body size={13} color={isDark ? colors.textMuted : '#6E6763'} align="center" style={{ marginTop: 6 }}>
                Build your cycle routine: folate, BBT logging, ovulation tests, and stress care. We'll track your progress here.
              </Body>
            </View>
          </PaperCard>
        )}

        {tab === 'visits' && (
          <PaperCard style={{ marginTop: 4 }}>
            <View style={styles.tabEmpty}>
              <View style={[styles.tabEmptyIcon, { backgroundColor: modeColor + '22' }]}>
                <CircleIcon size={22} color={modeColor} strokeWidth={2} />
              </View>
              <Display size={20} color={isDark ? colors.text : '#141313'}>Upcoming visits</Display>
              <Body size={13} color={isDark ? colors.textMuted : '#6E6763'} align="center" style={{ marginTop: 6 }}>
                Doctor appointments, fertility consults, and labs go here. Tap "+" above to add one.
              </Body>
            </View>
          </PaperCard>
        )}
      </ScrollView>

      {/* ─── Bottom sheets per log type ────────────────────────────────── */}

      <LogSheet visible={sheetType === 'period_start'} title="Log Period Start" onClose={() => setSheetType(null)}>
        <PeriodStartForm date={selectedDate} onSaved={handleSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'period_end'} title="Log Period End" onClose={() => setSheetType(null)}>
        <PeriodEndForm date={selectedDate} onSaved={handleSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'symptom'} title="Log Symptoms" onClose={() => setSheetType(null)}>
        <SymptomsForm date={selectedDate} onSaved={handleSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'mood'} title="Log Mood" onClose={() => setSheetType(null)}>
        <MoodForm date={selectedDate} onSaved={handleSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'basal_temp'} title="Log Temperature" onClose={() => setSheetType(null)}>
        <TemperatureForm date={selectedDate} onSaved={handleSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'intercourse'} title="Log Intimacy" onClose={() => setSheetType(null)}>
        <IntimacyForm date={selectedDate} onSaved={handleSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'exam'} title="Log Exam Result" onClose={() => setSheetType(null)}>
        <ExamForm behavior="pre-pregnancy" date={selectedDate} onSaved={() => setSheetType(null)} />
      </LogSheet>

      {/* Log Activity sheet (opened by header "+") */}
      <LogActivitySheet
        open={logSheetOpen}
        onClose={() => setLogSheetOpen(false)}
        onSelect={(type) => setSheetType(type)}
      />
    </View>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function phaseColor(phase: CyclePhase): string {
  if (phase === 'menstruation') return brand.phase.menstrual
  if (phase === 'follicular') return brand.prePregnancy
  if (phase === 'ovulation') return brand.phase.ovulation
  return brand.phase.luteal
}

function formatDayShort(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },

  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  phaseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  fertilityTag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  fertilityTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    fontFamily: 'DMSans_700Bold',
  },

  tabEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
    gap: 4,
  },
  tabEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  // Sheet
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,8,6,0.55)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 42, height: 4, borderRadius: 2 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: { paddingHorizontal: 20 },
})
