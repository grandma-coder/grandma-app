import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native'
import { X, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react-native'
import { useQueryClient } from '@tanstack/react-query'
import { useTheme, brand } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { LineChart } from '../../charts/SvgCharts'
import type { TodayLogEntry } from '../../../lib/analyticsData'
import {
  PregnancyMoodForm,
  PregnancySymptomsForm,
  KickCountForm,
} from '../../calendar/PregnancyLogForms'

const SCREEN_W = Dimensions.get('window').width
const CARD_W = 130

// ─── Types ────────────────────────────────────────────────────────────────────

interface VitalCard {
  id: string
  icon: string
  label: string
  value: string
  subLabel?: string
  progress?: number       // 0–1 for progress bar
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  color: string
  logType: string
}

type LogFormType = 'mood' | 'symptom' | 'kick_count' | 'weight' | 'water' | 'sleep' | 'exercise' | 'nutrition' | null

// ─── History hook ─────────────────────────────────────────────────────────────

interface HistoryPoint { date: string; value: number }

async function fetchMetricHistory(
  userId: string,
  logType: string,
  days = 7
): Promise<HistoryPoint[]> {
  const since = new Date()
  since.setDate(since.getDate() - days + 1)
  const from = since.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('pregnancy_logs')
    .select('log_date, value')
    .eq('user_id', userId)
    .eq('log_type', logType)
    .gte('log_date', from)
    .order('log_date', { ascending: true })

  if (error || !data) return []

  return data
    .map(r => ({
      date: r.log_date as string,
      value: parseFloat(r.value ?? '0'),
    }))
    .filter(r => !isNaN(r.value))
}

function buildChartDays(history: HistoryPoint[], days = 7): { values: number[]; labels: string[] } {
  const result: number[] = []
  const labels: string[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const match = history.find(h => h.date === dateStr)
    result.push(match?.value ?? 0)
    labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2))
  }

  return { values: result, labels }
}

// ─── VitalDetailModal ─────────────────────────────────────────────────────────

interface DetailModalProps {
  card: VitalCard
  userId: string
  weekNumber: number
  onClose: () => void
  onLog: (type: LogFormType) => void
}

function VitalDetailModal({ card, userId, weekNumber, onClose, onLog }: DetailModalProps) {
  const { colors } = useTheme()
  const [history, setHistory] = React.useState<HistoryPoint[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetchMetricHistory(userId, card.logType, 7).then(h => {
      setHistory(h)
      setLoading(false)
    })
  }, [userId, card.logType])

  const { values, labels } = buildChartDays(history)
  const hasData = values.some(v => v > 0)

  const moodMap: Record<string, string> = {
    excited: '😍', happy: '😊', okay: '😐', anxious: '😰', nauseous: '🤢',
  }

  const recentEntries = [...history]
    .reverse()
    .slice(0, 5)
    .map(h => ({
      dateLabel: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      displayValue:
        card.logType === 'mood'
          ? (moodMap[String(h.value)] ?? '😊')
          : card.logType === 'weight'
          ? `${h.value.toFixed(1)} kg`
          : card.logType === 'water'
          ? `${Math.round(h.value)} / 8 glasses`
          : card.logType === 'sleep'
          ? `${h.value.toFixed(1)} h`
          : String(Math.round(h.value)),
    }))

  const logLabel =
    card.logType === 'weight' ? 'Log Weight'
    : card.logType === 'water' ? 'Log Water Intake'
    : card.logType === 'sleep' ? 'Log Sleep'
    : card.logType === 'kick_count' ? 'Log Kick Session'
    : card.logType === 'mood' ? 'Log Mood'
    : card.logType === 'nutrition' ? 'Log Meal'
    : 'Log Today'

  return (
    <View style={[styles.detailSheet, { backgroundColor: colors.bgWarm }]}>
      <View style={styles.handle} />
      <Pressable onPress={onClose} style={styles.closeBtn}>
        <X size={18} color={colors.textMuted} strokeWidth={2} />
      </Pressable>

      {/* Header */}
      <View style={styles.detailHeader}>
        <Text style={{ fontSize: 40, fontFamily: 'Fraunces_600SemiBold' }}>{card.icon}</Text>
        <View>
          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{card.label.toUpperCase()}</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{card.value}</Text>
          {card.trendLabel && (
            <View style={styles.trendRow}>
              {card.trend === 'up' && <TrendingUp size={12} color="#A2FF86" strokeWidth={2} />}
              {card.trend === 'down' && <TrendingDown size={12} color="#FF8AD8" strokeWidth={2} />}
              {card.trend === 'neutral' && <Minus size={12} color={colors.textMuted} strokeWidth={2} />}
              <Text style={[styles.trendText, {
                color: card.trend === 'up' ? '#A2FF86' : card.trend === 'down' ? '#FF8AD8' : colors.textMuted
              }]}>{card.trendLabel}</Text>
            </View>
          )}
        </View>
      </View>

      {/* 7-day chart */}
      {loading ? (
        <View style={styles.chartLoadingBox}>
          <ActivityIndicator color={card.color} />
        </View>
      ) : hasData ? (
        <View style={[styles.chartBox, { backgroundColor: colors.surface }]}>
          <Text style={[styles.chartBoxLabel, { color: colors.textMuted }]}>7-DAY HISTORY</Text>
          <LineChart
            data={values}
            labels={labels}
            color={card.color}
            width={SCREEN_W - 80}
            height={80}
          />
        </View>
      ) : (
        <View style={[styles.chartBox, styles.chartEmpty, { backgroundColor: colors.surface }]}>
          <Text style={[styles.chartEmptyText, { color: colors.textMuted }]}>
            No history yet — start logging to see your trend
          </Text>
        </View>
      )}

      {/* Recent entries */}
      {recentEntries.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={[styles.recentLabel, { color: colors.textMuted }]}>RECENT ENTRIES</Text>
          {recentEntries.map((e, i) => (
            <View key={i} style={[styles.recentRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.recentDate, { color: colors.textMuted }]}>{e.dateLabel}</Text>
              <Text style={[styles.recentValue, { color: colors.text }]}>{e.displayValue}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Log button */}
      <Pressable
        onPress={() => onLog(card.logType as LogFormType)}
        style={[styles.logBtn, { backgroundColor: card.color + '20', borderColor: card.color + '60' }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 15 }}>{card.icon}</Text>
          <Text style={[styles.logBtnText, { color: card.color }]}>{logLabel}</Text>
        </View>
      </Pressable>
    </View>
  )
}

// ─── VitalsCarousel ───────────────────────────────────────────────────────────

interface Props {
  todayLogs: Record<string, TodayLogEntry>
  weekNumber: number
  userId: string | undefined
}

export function VitalsCarousel({ todayLogs, weekNumber, userId }: Props) {
  const { colors } = useTheme()
  const queryClient = useQueryClient()
  const [selectedCard, setSelectedCard] = useState<VitalCard | null>(null)
  const [activeLog, setActiveLog] = useState<LogFormType>(null)

  // Build card data from today's logs
  const weightVal = todayLogs['weight']?.value ? parseFloat(todayLogs['weight'].value) : null
  const waterVal = todayLogs['water']?.value ? parseInt(todayLogs['water'].value, 10) : 0
  const sleepVal = todayLogs['sleep']?.value ? parseFloat(todayLogs['sleep'].value) : null
  const kicksVal = todayLogs['kick_count']?.value ? parseInt(todayLogs['kick_count'].value, 10) : null
  const moodVal = todayLogs['mood']?.notes ?? todayLogs['mood']?.value ?? null
  const nutritionVal = todayLogs['nutrition']?.value ? parseInt(todayLogs['nutrition'].value, 10) : 0
  const exerciseLogged = !!todayLogs['exercise']

  const moodEmojis: Record<string, string> = {
    excited: '😍', happy: '😊', okay: '😐', anxious: '😰', nauseous: '🤢',
  }

  const cards: VitalCard[] = [
    {
      id: 'weight',
      icon: '⚖️',
      label: 'Weight',
      value: weightVal !== null ? `${weightVal.toFixed(1)} kg` : '—',
      color: brand.pregnancy,
      logType: 'weight',
      trend: 'up',
      trendLabel: 'Log to see trend',
    },
    {
      id: 'water',
      icon: '💧',
      label: 'Hydration',
      value: `${waterVal}/8`,
      subLabel: 'glasses today',
      progress: Math.min(1, waterVal / 8),
      color: '#6AABF7',
      logType: 'water',
    },
    {
      id: 'sleep',
      icon: '😴',
      label: 'Sleep',
      value: sleepVal !== null ? `${sleepVal.toFixed(1)}h` : '—',
      progress: sleepVal !== null ? Math.min(1, sleepVal / 9) : 0,
      color: '#C4A8F0',
      logType: 'sleep',
    },
    ...(weekNumber >= 28
      ? [{
          id: 'kicks',
          icon: '👶',
          label: 'Kicks',
          value: kicksVal !== null ? String(kicksVal) : '—',
          subLabel: 'Count today',
          color: '#A2FF86',
          logType: 'kick_count',
          trend: kicksVal === null ? ('neutral' as const) : ('up' as const),
          trendLabel: kicksVal === null ? 'Log kicks' : 'sessions today',
        }]
      : []),
    {
      id: 'mood',
      icon: '😊',
      label: 'Mood',
      value: moodVal ? (moodEmojis[moodVal] ?? '😊') : '—',
      subLabel: moodVal ?? 'Not logged',
      color: '#FBBF24',
      logType: 'mood',
    },
    {
      id: 'nutrition',
      icon: '🥗',
      label: 'Meals',
      value: `${nutritionVal}/3`,
      progress: Math.min(1, nutritionVal / 3),
      color: '#FF6B35',
      logType: 'nutrition',
    },
    {
      id: 'exercise',
      icon: '🧘',
      label: 'Exercise',
      value: exerciseLogged ? '✓' : '—',
      subLabel: exerciseLogged ? 'Done today' : 'Not logged',
      color: '#A2FF86',
      logType: 'exercise',
    },
  ]

  const handleLog = (type: LogFormType) => {
    setSelectedCard(null)
    setActiveLog(type)
  }

  const handleLogClose = () => {
    setActiveLog(null)
    if (userId) {
      queryClient.invalidateQueries({ queryKey: ['pregnancy-today-logs', userId] })
    }
  }

  const renderLogForm = () => {
    const today = new Date().toISOString().split('T')[0]
    if (activeLog === 'mood') return <PregnancyMoodForm date={today} onSaved={handleLogClose} />
    if (activeLog === 'symptom') return <PregnancySymptomsForm date={today} onSaved={handleLogClose} />
    if (activeLog === 'kick_count') return <KickCountForm date={today} onSaved={handleLogClose} />
    if (activeLog === 'weight' || activeLog === 'water' || activeLog === 'sleep'
        || activeLog === 'exercise' || activeLog === 'nutrition') {
      return <SimpleLogForm type={activeLog} userId={userId} onSaved={handleLogClose} />
    }
    return null
  }

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {cards.map((card) => (
          <Pressable
            key={card.id}
            onPress={() => userId && setSelectedCard(card)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            {/* Tap hint */}
            <View style={[styles.tapHint, { backgroundColor: card.color + '20' }]}>
              <ChevronRight size={10} color={card.color} strokeWidth={2.5} />
            </View>

            <Text style={{ fontSize: 20, marginBottom: 2 }}>{card.icon}</Text>
            <Text style={[styles.cardValue, { color: colors.text }]}>{card.value}</Text>
            {card.subLabel && (
              <Text style={[styles.cardSubLabel, { color: colors.textMuted }]} numberOfLines={1}>
                {card.subLabel}
              </Text>
            )}
            <Text style={[styles.cardLabel, { color: colors.textMuted }]}>{card.label}</Text>

            {card.progress !== undefined && (
              <View style={[styles.progressTrack, { backgroundColor: colors.surfaceGlass }]}>
                <View style={[styles.progressFill, { width: `${card.progress * 100}%`, backgroundColor: card.color }]} />
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {/* Vital detail modal */}
      <Modal
        visible={selectedCard !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCard(null)}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.overlayBg} onPress={() => setSelectedCard(null)} />
          {selectedCard && userId && (
            <VitalDetailModal
              card={selectedCard}
              userId={userId}
              weekNumber={weekNumber}
              onClose={() => setSelectedCard(null)}
              onLog={handleLog}
            />
          )}
        </View>
      </Modal>

      {/* Log form modal */}
      <Modal
        visible={activeLog !== null}
        transparent
        animationType="slide"
        onRequestClose={handleLogClose}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.overlayBg} onPress={handleLogClose} />
          <View style={[styles.logFormSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.handle} />
            <Pressable onPress={handleLogClose} style={styles.closeBtn}>
              <X size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
            {renderLogForm()}
          </View>
        </View>
      </Modal>
    </>
  )
}

// ─── SimpleLogForm ────────────────────────────────────────────────────────────

interface SimpleLogFormProps {
  type: 'weight' | 'water' | 'sleep' | 'exercise' | 'nutrition'
  userId: string | undefined
  onSaved: () => void
}

function SimpleLogForm({ type, userId, onSaved }: SimpleLogFormProps) {
  const { colors } = useTheme()
  const [value, setValue] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const configs = {
    weight: { label: '⚖️ Log Weight', placeholder: 'e.g. 68.5', unit: 'kg', keyboard: 'decimal-pad' as const },
    water: { label: '💧 Log Water', placeholder: 'Glasses today (0–8)', unit: 'glasses', keyboard: 'number-pad' as const },
    sleep: { label: '😴 Log Sleep', placeholder: 'Hours slept e.g. 7.5', unit: 'hours', keyboard: 'decimal-pad' as const },
    exercise: { label: '🧘 Log Exercise', placeholder: 'Minutes e.g. 30', unit: 'min', keyboard: 'number-pad' as const },
    nutrition: { label: '🥗 Log Meals', placeholder: 'Meals today (1–6)', unit: 'meals', keyboard: 'number-pad' as const },
  }

  const cfg = configs[type]

  const handleSave = async () => {
    if (!userId || !value.trim()) return
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('pregnancy_logs').insert({
      user_id: userId,
      log_date: today,
      log_type: type,
      value: value.trim(),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <View style={styles.simpleForm}>
      <Text style={[styles.simpleFormTitle, { color: colors.text }]}>{cfg.label}</Text>
      <View style={[styles.simpleInput, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}>
        <Text
          style={[styles.simpleInputText, { color: value ? colors.text : colors.textMuted }]}
          onPress={() => {}}
        >
          {value || cfg.placeholder}
        </Text>
        <Text style={[styles.simpleUnit, { color: colors.textMuted }]}>{cfg.unit}</Text>
      </View>
      <View style={styles.simpleNumpad}>
        {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map((key) => (
          <Pressable
            key={key}
            onPress={() => {
              if (key === '⌫') setValue(v => v.slice(0, -1))
              else if (key === '.' && value.includes('.')) return
              else setValue(v => v + key)
            }}
            style={({ pressed }) => [styles.numpadKey, { backgroundColor: pressed ? colors.surface : colors.surfaceGlass }]}
          >
            <Text style={[styles.numpadKeyText, { color: colors.text }]}>{key}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={handleSave}
        style={[styles.saveBtn, { backgroundColor: brand.pregnancy }]}
        disabled={saving || !value.trim()}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>Save</Text>
        }
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  scrollContainer: { paddingHorizontal: 20, gap: 10, paddingBottom: 4 },

  card: {
    width: CARD_W,
    borderRadius: 20,
    padding: 14,
    gap: 4,
    position: 'relative',
  },
  tapHint: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: { fontSize: 20, marginBottom: 2, fontFamily: undefined },
  cardValue: {
    fontSize: 22,
    fontFamily: 'CabinetGrotesk-Black',
    lineHeight: 26,
  },
  cardSubLabel: {
    fontSize: 10,
    fontFamily: 'Satoshi-Variable',
    lineHeight: 14,
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '600',
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: { height: 3, borderRadius: 2 },

  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },

  detailSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginBottom: 16,
  },
  closeBtn: { position: 'absolute', top: 12, right: 20, padding: 8, zIndex: 10 },

  detailHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, marginBottom: 16,
  },
  detailIcon: { fontSize: 40, fontFamily: undefined },
  detailLabel: {
    fontSize: 11, fontFamily: 'Satoshi-Variable', fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2,
  },
  detailValue: { fontSize: 32, fontFamily: 'CabinetGrotesk-Black' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  trendText: { fontSize: 12, fontFamily: 'Satoshi-Variable', fontWeight: '600' },

  chartLoadingBox: {
    height: 100, alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginBottom: 16,
  },
  chartBox: {
    marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 16,
  },
  chartBoxLabel: {
    fontSize: 10, fontFamily: 'Satoshi-Variable', fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
  },
  chartEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  chartEmptyText: { fontSize: 13, fontFamily: 'Satoshi-Variable', textAlign: 'center' },

  recentSection: { paddingHorizontal: 24, marginBottom: 16 },
  recentLabel: {
    fontSize: 10, fontFamily: 'Satoshi-Variable', fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
  },
  recentRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1,
  },
  recentDate: { fontSize: 13, fontFamily: 'Satoshi-Variable' },
  recentValue: { fontSize: 13, fontFamily: 'Satoshi-Variable', fontWeight: '700' },

  logBtn: {
    marginHorizontal: 20, borderRadius: 999, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1,
  },
  logBtnText: { fontSize: 15, fontFamily: 'Satoshi-Variable', fontWeight: '700' },

  logFormSheet: {
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingBottom: 40, maxHeight: '80%',
  },

  simpleForm: { padding: 24, gap: 16 },
  simpleFormTitle: { fontSize: 18, fontFamily: 'CabinetGrotesk-Black', textAlign: 'center' },
  simpleInput: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1,
  },
  simpleInputText: { fontSize: 18, fontFamily: 'CabinetGrotesk-Black', flex: 1 },
  simpleUnit: { fontSize: 13, fontFamily: 'Satoshi-Variable' },
  simpleNumpad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  numpadKey: {
    width: (SCREEN_W - 48 - 16) / 3 - 6,
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  numpadKeyText: { fontSize: 18, fontFamily: 'CabinetGrotesk-Black' },
  saveBtn: {
    borderRadius: 999, paddingVertical: 16, alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontFamily: 'Satoshi-Variable', fontWeight: '700', color: '#fff' },
})
