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
import { useTheme } from '../../../constants/theme'
import { PaperCard } from '../../ui/PaperCard'
import { Display, MonoCaps, Body } from '../../ui/Typography'
import {
  MoodFace, LogWeight, LogWater, LogSleep, LogKicks, LogNutrition, LogExercise,
} from '../../stickers/RewardStickers'
import { moodFaceVariant, moodFaceFill } from '../../../lib/moodFace'
import { supabase } from '../../../lib/supabase'
import { LineChart } from '../../charts/SvgCharts'
import type { TodayLogEntry } from '../../../lib/analyticsData'
import {
  PregnancyMoodForm,
  PregnancySymptomsForm,
  KickCountForm,
} from '../../calendar/PregnancyLogForms'
import { SimplePregnancyLogForm } from '../../calendar/SimplePregnancyLogForm'
import { PregnancyMealForm } from '../../calendar/PregnancyMealForm'

const SCREEN_W = Dimensions.get('window').width
const CARD_W = 130

// ─── Types ────────────────────────────────────────────────────────────────────

type StickerFn = (props: { size?: number; fill?: string; stroke?: string }) => React.ReactElement

interface VitalCard {
  id: string
  Sticker: StickerFn
  label: string
  value: string
  subLabel?: string
  progress?: number       // 0–1 for progress bar
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  color: string
  tint: string            // soft sticker tint for paper-card bg
  logType: string
  moodKey?: string        // pregnancy mood key, mood card only
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
  const { colors, stickers } = useTheme()
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

  // Most recent mood key (for MoodFace rendering in detail sheet)
  const latestMoodKey = card.logType === 'mood' && history.length > 0
    ? String(history[history.length - 1]?.value ?? '')
    : ''

  const moodMap: Record<string, string> = {
    excited: '😍', happy: '😊', okay: '😐', anxious: '😰', nauseous: '🤢',
  }

  const recentEntries = [...history]
    .reverse()
    .slice(0, 5)
    .map(h => ({
      dateLabel: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      moodKey: card.logType === 'mood' ? String(h.value) : undefined,
      displayValue:
        card.logType === 'mood'
          ? String(h.value).charAt(0).toUpperCase() + String(h.value).slice(1)
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
        {card.id === 'mood' ? (
          <MoodFace size={44} variant={moodFaceVariant(latestMoodKey)} fill={moodFaceFill(latestMoodKey)} />
        ) : (
          <card.Sticker size={44} />
        )}
        <View>
          <MonoCaps size={10} color={colors.textMuted}>{card.label.toUpperCase()}</MonoCaps>
          <Text style={[styles.detailValue, { color: colors.text, marginTop: 2 }]}>{card.value}</Text>
          {card.trendLabel && (
            <View style={styles.trendRow}>
              {card.trend === 'up' && <TrendingUp size={12} color={stickers.green} strokeWidth={2} />}
              {card.trend === 'down' && <TrendingDown size={12} color={stickers.coral} strokeWidth={2} />}
              {card.trend === 'neutral' && <Minus size={12} color={colors.textMuted} strokeWidth={2} />}
              <Text style={[styles.trendText, {
                color: card.trend === 'up' ? stickers.green : card.trend === 'down' ? stickers.coral : colors.textMuted
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
          <MonoCaps size={10} color={colors.textMuted} style={{ marginBottom: 8 }}>7-DAY HISTORY</MonoCaps>
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
          <MonoCaps size={10} color={colors.textMuted} style={{ marginBottom: 8 }}>RECENT ENTRIES</MonoCaps>
          {recentEntries.map((e, i) => (
            <View key={i} style={[styles.recentRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.recentDate, { color: colors.textMuted }]}>{e.dateLabel}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {e.moodKey && (
                  <MoodFace size={18} variant={moodFaceVariant(e.moodKey)} fill={moodFaceFill(e.moodKey)} />
                )}
                <Text style={[styles.recentValue, { color: colors.text }]}>{e.displayValue}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Log button */}
      <Pressable
        onPress={() => onLog(card.logType as LogFormType)}
        style={[styles.logBtn, { backgroundColor: card.color + '20', borderColor: card.color + '60' }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <card.Sticker size={18} />
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
  const { colors, stickers } = useTheme()
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
  const nutritionTotalCals: number = (() => {
    const raw = todayLogs['nutrition']?.notes
    if (!raw) return 0
    try {
      const parsed = JSON.parse(raw) as { totalCals?: number }
      return typeof parsed.totalCals === 'number' ? parsed.totalCals : 0
    } catch { return 0 }
  })()
  const exerciseLogged = !!todayLogs['exercise']

  const moodLabels: Record<string, string> = {
    excited: 'Excited', happy: 'Happy', okay: 'Okay', anxious: 'Anxious', nauseous: 'Nauseous', energetic: 'Energetic', sad: 'Sad',
  }

  const cards: VitalCard[] = [
    {
      id: 'weight',
      Sticker: LogWeight,
      label: 'Weight',
      value: weightVal !== null ? `${weightVal.toFixed(1)} kg` : '—',
      color: stickers.lilac,
      tint: stickers.lilacSoft,
      logType: 'weight',
      trend: 'up',
      trendLabel: 'Log to see trend',
    },
    {
      id: 'water',
      Sticker: LogWater,
      label: 'Hydration',
      value: `${waterVal}/8`,
      subLabel: 'glasses today',
      progress: Math.min(1, waterVal / 8),
      color: stickers.blue,
      tint: stickers.blueSoft,
      logType: 'water',
    },
    {
      id: 'sleep',
      Sticker: LogSleep,
      label: 'Sleep',
      value: sleepVal !== null ? `${sleepVal.toFixed(1)}h` : '—',
      progress: sleepVal !== null ? Math.min(1, sleepVal / 9) : 0,
      color: stickers.lilac,
      tint: stickers.lilacSoft,
      logType: 'sleep',
    },
    ...(weekNumber >= 28
      ? [{
          id: 'kicks',
          Sticker: LogKicks,
          label: 'Kicks',
          value: kicksVal !== null ? String(kicksVal) : '—',
          subLabel: 'Count today',
          color: stickers.green,
          tint: stickers.greenSoft,
          logType: 'kick_count',
          trend: kicksVal === null ? ('neutral' as const) : ('up' as const),
          trendLabel: kicksVal === null ? 'Log kicks' : 'sessions today',
        }]
      : []),
    {
      id: 'mood',
      Sticker: LogExercise,  // mood card renders MoodFace — sticker only used for detail header fallback
      label: 'Mood',
      value: moodVal ? (moodLabels[moodVal] ?? moodVal) : '—',
      subLabel: moodVal ? 'Today' : 'Not logged',
      color: stickers.yellow,
      tint: stickers.yellowSoft,
      logType: 'mood',
      moodKey: moodVal ?? undefined,
    },
    {
      id: 'nutrition',
      Sticker: LogNutrition,
      label: 'Meals',
      value: `${nutritionVal}/3`,
      subLabel: nutritionTotalCals > 0 ? `~${nutritionTotalCals} kcal today` : undefined,
      progress: Math.min(1, nutritionVal / 3),
      color: stickers.peach,
      tint: stickers.peachSoft,
      logType: 'nutrition',
    },
    {
      id: 'exercise',
      Sticker: LogExercise,
      label: 'Exercise',
      value: exerciseLogged ? '✓' : '—',
      subLabel: exerciseLogged ? 'Done today' : 'Not logged',
      color: stickers.pink,
      tint: stickers.pinkSoft,
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
    if (activeLog === 'nutrition') {
      return <PregnancyMealForm userId={userId} onSaved={handleLogClose} />
    }
    if (activeLog === 'weight' || activeLog === 'water' || activeLog === 'sleep'
        || activeLog === 'exercise') {
      return <SimplePregnancyLogForm type={activeLog} userId={userId} onSaved={handleLogClose} />
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
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <PaperCard tint={card.tint} radius={20} padding={14} style={styles.card}>
              <MonoCaps size={10} color={colors.textMuted}>{card.label.toUpperCase()}</MonoCaps>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                {card.id === 'mood' ? (
                  <MoodFace size={22} variant={moodFaceVariant(card.moodKey)} fill={moodFaceFill(card.moodKey)} />
                ) : null}
                <Display size={card.id === 'mood' ? 18 : 26} color={colors.text}>
                  {card.value}
                </Display>
              </View>
              {card.subLabel && (
                <Body size={11} color={colors.textMuted} numberOfLines={1} style={{ marginTop: 2 }}>
                  {card.subLabel}
                </Body>
              )}
              {card.progress !== undefined && (
                <View style={[styles.progressTrack, { backgroundColor: 'rgba(20,19,19,0.08)' }]}>
                  <View style={[styles.progressFill, { width: `${card.progress * 100}%`, backgroundColor: card.color }]} />
                </View>
              )}
            </PaperCard>
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

const styles = StyleSheet.create({
  scrollContainer: { paddingHorizontal: 20, gap: 10, paddingBottom: 4 },

  card: {
    width: CARD_W,
    position: 'relative',
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: { height: 3, borderRadius: 2 },

  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,19,19,0.55)' },

  detailSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(245,237,220,0.2)',
    alignSelf: 'center', marginBottom: 16,
  },
  closeBtn: { position: 'absolute', top: 12, right: 20, padding: 8, zIndex: 10 },

  detailHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, marginBottom: 16,
  },
  detailValue: { fontSize: 32, fontFamily: 'Fraunces_600SemiBold', letterSpacing: -0.5 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  trendText: { fontSize: 12, fontFamily: 'DMSans_500Medium' },

  chartLoadingBox: {
    height: 100, alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginBottom: 16,
  },
  chartBox: {
    marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1,
    borderColor: 'rgba(20,19,19,0.08)',
  },
  chartEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  chartEmptyText: { fontSize: 13, fontFamily: 'DMSans_400Regular', textAlign: 'center' },

  recentSection: { paddingHorizontal: 24, marginBottom: 16 },
  recentRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1,
  },
  recentDate: { fontSize: 13, fontFamily: 'DMSans_400Regular' },
  recentValue: { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },

  logBtn: {
    marginHorizontal: 20, borderRadius: 999, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1,
  },
  logBtnText: { fontSize: 15, fontFamily: 'DMSans_600SemiBold' },

  logFormSheet: {
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingBottom: 40, maxHeight: '80%',
  },

})
