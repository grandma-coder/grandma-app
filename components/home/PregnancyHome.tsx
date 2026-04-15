/**
 * Pregnancy Home — Command Center
 *
 * Sections (top to bottom, scrollable):
 * 1. BabyHeroCarousel   — swipeable FlatList through all 40 weeks
 * 2. QuickLogStrip      — today's routine chips (done / pending / overdue)
 * 3. VitalsGrid         — 2×2 real-data tiles (weight, kicks, water, mood)
 * 4. MoodPicker         — inline 5-option row, writes pregnancy_logs immediately
 * 5. ContextualCards    — up to 3 smart cards based on current state
 * 6. WeightMiniChart    — 6-entry sparkline with LineChart
 * 7. GrandmaCTA         — static deep-link to grandma-talk
 * 8. AffirmationCard    — rotating daily from pregnancyAffirmations
 * 9. DailyTipCard       — momTip from pregnancyData for current week
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  FlatList,
  Modal,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import {
  ChevronRight,
  Scale,
  Droplets,
  Smile,
  X,
} from 'lucide-react-native'
import { useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { usePregnancyStore } from '../../store/usePregnancyStore'

import { supabase } from '../../lib/supabase'
import { pregnancyWeeks, getDaysToGo } from '../../lib/pregnancyData'
import type { PregnancyWeekData } from '../../lib/pregnancyData'
import { getDailyAffirmation } from '../../lib/pregnancyAffirmations'
import { getUpcomingAppointment } from '../../lib/pregnancyAppointments'
import { usePregnancyWeightHistory, usePregnancyTodayLogs } from '../../lib/analyticsData'
import type { TodayLogEntry } from '../../lib/analyticsData'
import { LineChart } from '../charts/SvgCharts'
import {
  PregnancyMoodForm,
  PregnancySymptomsForm,
  AppointmentForm,
  KickCountForm,
} from '../calendar/PregnancyLogForms'

const SCREEN_W = Dimensions.get('window').width

// ─── Week emoji map ─────────────────────────────────────────────────────────

const WEEK_EMOJI: Record<number, string> = {
  1: '🌱', 2: '🌱', 3: '🌱', 4: '🫘', 5: '🍎', 6: '🫛', 7: '🫐', 8: '🍇',
  9: '🍒', 10: '🍓', 11: '🍋', 12: '🍑', 13: '🍑', 14: '🍋', 15: '🍏',
  16: '🥑', 17: '🍐', 18: '🫑', 19: '🥭', 20: '🍌', 21: '🥕', 22: '🍈',
  23: '🍊', 24: '🌽', 25: '🫚', 26: '🥬', 27: '🥦', 28: '🍆', 29: '🎃',
  30: '🥬', 31: '🥥', 32: '🌰', 33: '🍍', 34: '🍈', 35: '🍈', 36: '🥬',
  37: '🥬', 38: '🌿', 39: '🍉', 40: '🎃',
}

// ─── Trimester helper ────────────────────────────────────────────────────────

function getTrimester(week: number): 1 | 2 | 3 {
  if (week <= 13) return 1
  if (week <= 26) return 2
  return 3
}

// ─── Section 1: Baby Hero Carousel ──────────────────────────────────────────

interface HeroItem {
  week: number
  data: PregnancyWeekData
}

const HERO_ITEMS: HeroItem[] = pregnancyWeeks.map((w) => ({ week: w.week, data: w }))

interface BabyHeroCarouselProps {
  currentWeek: number
  daysToGo: number | null
}

function BabyHeroCarousel({ currentWeek, daysToGo }: BabyHeroCarouselProps) {
  const flatListRef = useRef<FlatList<HeroItem>>(null)
  const [visibleWeek, setVisibleWeek] = useState(currentWeek)

  useEffect(() => {
    const idx = Math.max(0, currentWeek - 1)
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: idx, animated: false })
    }, 150)
    return () => clearTimeout(timer)
  }, [currentWeek])

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: HeroItem }> }) => {
      if (viewableItems[0]) {
        setVisibleWeek(viewableItems[0].item.week)
      }
    },
    []
  )

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current

  const renderItem = ({ item }: { item: HeroItem }) => {
    const isCurrent = item.week === currentWeek
    const tri = getTrimester(item.week)
    const emoji = WEEK_EMOJI[item.week] ?? '👶'
    const progress = item.week / 40

    const gradientColors: [string, string] =
      tri === 1
        ? ['#1A2A4A', '#2D4A8A']
        : tri === 2
        ? ['#2A1050', '#5C2FA8']
        : ['#2A0A3A', '#7B1FA2']

    const triLabel = `T${tri} · Week ${item.week}`
    const daysLabel =
      isCurrent && daysToGo !== null
        ? `${daysToGo} days left`
        : item.week < currentWeek
        ? 'Past week'
        : `Week ${item.week - currentWeek} ahead`

    return (
      <View style={{ width: SCREEN_W, paddingHorizontal: 20 }}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroBadgeRow}>
            <View style={[styles.heroBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={styles.heroBadgeText}>{triLabel}</Text>
            </View>
            {isCurrent && (
              <View style={[styles.heroBadge, { backgroundColor: brand.pregnancy + '40' }]}>
                <Text style={[styles.heroBadgeText, { color: brand.pregnancy }]}>
                  ← swipe weeks →
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.heroEmoji}>{emoji}</Text>

          <Text style={styles.heroWeekText}>Week {item.week}</Text>
          <Text style={styles.heroSizeText}>
            Size of a {item.data.babySize.toLowerCase()} · {item.data.babyLength}
          </Text>
          <Text style={styles.heroDaysText}>{daysLabel}</Text>

          <Text style={styles.heroFact} numberOfLines={2}>
            {item.data.developmentFact}
          </Text>

          <View style={styles.heroProgressContainer}>
            <View style={styles.heroProgressTrack}>
              <View style={[styles.heroProgressFill, { width: `${progress * 100}%` }]} />
            </View>
            <View style={styles.heroProgressLabels}>
              <Text style={styles.heroProgressLabel}>T1</Text>
              <Text style={styles.heroProgressLabel}>T2</Text>
              <Text style={styles.heroProgressLabel}>T3</Text>
              <Text style={styles.heroProgressLabel}>40w</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    )
  }

  return (
    <View>
      <FlatList
        ref={flatListRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={HERO_ITEMS}
        keyExtractor={(item) => String(item.week)}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({
          length: SCREEN_W,
          offset: SCREEN_W * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialNumToRender={5}
        windowSize={5}
        maxToRenderPerBatch={5}
      />
      <View style={styles.heroDotsRow}>
        {[1, 2, 3].map((tri) => (
          <View
            key={tri}
            style={[
              styles.heroDot,
              {
                backgroundColor:
                  getTrimester(visibleWeek) === tri
                    ? brand.pregnancy
                    : 'rgba(255,255,255,0.2)',
                width: getTrimester(visibleWeek) === tri ? 16 : 6,
              },
            ]}
          />
        ))}
      </View>
    </View>
  )
}

// ─── Routine definitions ─────────────────────────────────────────────────────

interface RoutineDef {
  type: string
  label: string
  emoji: string
  goal: number
  minWeek?: number
}

const ROUTINES: RoutineDef[] = [
  { type: 'vitamins', label: 'Vitamins', emoji: '💊', goal: 1 },
  { type: 'water', label: 'Water', emoji: '💧', goal: 8 },
  { type: 'mood', label: 'Mood', emoji: '😊', goal: 1 },
  { type: 'symptom', label: 'Symptoms', emoji: '🤒', goal: 1 },
  { type: 'weight', label: 'Weight', emoji: '⚖️', goal: 1 },
  { type: 'sleep', label: 'Sleep', emoji: '😴', goal: 1 },
  { type: 'exercise', label: 'Exercise', emoji: '🧘', goal: 1 },
  { type: 'kick_count', label: 'Kicks', emoji: '👶', goal: 1, minWeek: 28 },
  { type: 'nutrition', label: 'Meals', emoji: '🥗', goal: 3 },
  { type: 'kegel', label: 'Kegel', emoji: '💪', goal: 1 },
]

// ─── Section 2: Quick Log Strip ──────────────────────────────────────────────

interface QuickLogStripProps {
  todayLogs: Record<string, TodayLogEntry>
  weekNumber: number
  onPressRoutine: (type: string) => void
}

function QuickLogStrip({ todayLogs, weekNumber, onPressRoutine }: QuickLogStripProps) {
  const { colors } = useTheme()
  const visibleRoutines = ROUTINES.filter(
    (r) => r.minWeek === undefined || weekNumber >= r.minWeek
  )

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TODAY'S ROUTINES</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickLogRow}
      >
        {visibleRoutines.map((routine) => {
          const logged = todayLogs[routine.type]
          const isDone = !!logged
          const isKick = routine.type === 'kick_count'
          const isOverdue = isKick && !isDone

          let chipBg = 'rgba(255,255,255,0.08)'
          let chipBorder = 'rgba(255,255,255,0.12)'
          let chipTextColor = colors.text

          if (isDone) {
            chipBg = '#A2FF8620'
            chipBorder = '#A2FF8640'
            chipTextColor = '#A2FF86'
          } else if (isOverdue) {
            chipBg = brand.pregnancy + '20'
            chipBorder = brand.pregnancy + '60'
            chipTextColor = brand.pregnancy
          }

          const chipLabel =
            routine.type === 'water' && logged?.value
              ? `${routine.emoji} ${logged.value}/8 glasses`
              : `${routine.emoji} ${isDone ? '✓ ' : '+ '}${routine.label}`

          return (
            <Pressable
              key={routine.type}
              onPress={() => onPressRoutine(routine.type)}
              style={[
                styles.quickChip,
                { backgroundColor: chipBg, borderColor: chipBorder },
              ]}
            >
              <Text style={[styles.quickChipText, { color: chipTextColor }]}>
                {chipLabel}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

// ─── Section 3: Vitals Grid ──────────────────────────────────────────────────

interface VitalsGridProps {
  todayLogs: Record<string, TodayLogEntry>
  weekNumber: number
}

function VitalsGrid({ todayLogs, weekNumber }: VitalsGridProps) {
  const { colors } = useTheme()

  const weight = todayLogs['weight']?.value
    ? `${parseFloat(todayLogs['weight'].value).toFixed(1)} kg`
    : '—'
  const kicks = todayLogs['kick_count']?.value ?? '—'
  const waterRaw = todayLogs['water']?.value ? parseInt(todayLogs['water'].value, 10) : 0
  const waterText = `${waterRaw} / 8`
  const waterPct = Math.min(1, waterRaw / 8)
  const moodMap: Record<string, string> = {
    excited: '😍',
    happy: '😊',
    okay: '😐',
    anxious: '😰',
    nauseous: '🤢',
  }
  const moodVal = todayLogs['mood']?.notes ?? todayLogs['mood']?.value ?? ''
  const moodEmoji = moodMap[moodVal] ?? (todayLogs['mood'] ? '😊' : '—')

  const tiles = [
    {
      icon: <Scale size={18} color={brand.pregnancy} strokeWidth={2} />,
      label: 'Weight',
      value: weight,
      progress: null as number | null,
    },
    {
      icon: <Text style={{ fontSize: 18 }}>👶</Text>,
      label: weekNumber >= 28 ? 'Kicks today' : 'Kicks (W28+)',
      value: weekNumber >= 28 ? kicks : 'Soon',
      progress: null as number | null,
    },
    {
      icon: <Droplets size={18} color="#6AABF7" strokeWidth={2} />,
      label: 'Hydration',
      value: waterText,
      progress: waterPct,
    },
    {
      icon: <Smile size={18} color="#FBBF24" strokeWidth={2} />,
      label: 'Mood',
      value: moodEmoji,
      progress: null as number | null,
    },
  ]

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TODAY'S VITALS</Text>
      <View style={styles.vitalsGrid}>
        {tiles.map((tile, i) => (
          <View
            key={i}
            style={[styles.vitalsTile, { backgroundColor: colors.surface }]}
          >
            {tile.icon}
            <Text style={[styles.vitalsValue, { color: colors.text }]}>{tile.value}</Text>
            <Text style={[styles.vitalsLabel, { color: colors.textMuted }]}>{tile.label}</Text>
            {tile.progress !== null && (
              <View style={styles.vitalsProgressTrack}>
                <View
                  style={[
                    styles.vitalsProgressFill,
                    {
                      width: `${tile.progress * 100}%`,
                      backgroundColor: '#6AABF7',
                    },
                  ]}
                />
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Section 4: Inline Mood Picker ──────────────────────────────────────────

const MOODS = [
  { id: 'excited', emoji: '😍', label: 'Radiant' },
  { id: 'happy', emoji: '😊', label: 'Happy' },
  { id: 'okay', emoji: '😐', label: 'Okay' },
  { id: 'anxious', emoji: '😰', label: 'Anxious' },
  { id: 'nauseous', emoji: '🤢', label: 'Nauseous' },
]

interface MoodPickerProps {
  currentMood: string | null
  onSelect: (moodId: string) => void
  saving: boolean
}

function MoodPicker({ currentMood, onSelect, saving }: MoodPickerProps) {
  const { colors } = useTheme()

  return (
    <View style={[styles.section, styles.moodCard, { backgroundColor: colors.surface }]}>
      <View style={styles.moodHeader}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted, marginBottom: 0 }]}>
          HOW ARE YOU FEELING?
        </Text>
        {saving && <ActivityIndicator size="small" color={brand.pregnancy} />}
      </View>
      <View style={styles.moodRow}>
        {MOODS.map((mood) => {
          const isActive = currentMood === mood.id
          return (
            <Pressable
              key={mood.id}
              onPress={() => onSelect(mood.id)}
              style={[
                styles.moodOption,
                isActive && {
                  backgroundColor: brand.pregnancy + '30',
                  borderColor: brand.pregnancy,
                },
              ]}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text
                style={[
                  styles.moodLabel,
                  { color: isActive ? brand.pregnancy : colors.textMuted },
                ]}
              >
                {mood.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// ─── Section 5: Contextual Smart Cards ───────────────────────────────────────

interface ContextCard {
  key: string
  color: string
  emoji: string
  title: string
  body: string
  onPress: () => void
}

interface ContextualCardsProps {
  cards: ContextCard[]
}

function ContextualCards({ cards }: ContextualCardsProps) {
  const { colors } = useTheme()
  if (cards.length === 0) return null

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>RIGHT NOW</Text>
      {cards.map((card) => (
        <Pressable
          key={card.key}
          onPress={card.onPress}
          style={[
            styles.contextCard,
            {
              backgroundColor: card.color + '15',
              borderColor: card.color + '40',
            },
          ]}
        >
          <Text style={styles.contextEmoji}>{card.emoji}</Text>
          <View style={styles.contextBody}>
            <Text style={[styles.contextTitle, { color: card.color }]}>{card.title}</Text>
            <Text style={[styles.contextText, { color: colors.textSecondary }]}>
              {card.body}
            </Text>
          </View>
          <ChevronRight size={16} color={card.color} strokeWidth={2} />
        </Pressable>
      ))}
    </View>
  )
}

// ─── Section 6: Weight Mini-Chart ────────────────────────────────────────────

interface WeightMiniChartProps {
  weights: number[]
  labels: string[]
}

function WeightMiniChart({ weights, labels }: WeightMiniChartProps) {
  const { colors } = useTheme()
  if (weights.length < 2) return null

  return (
    <Pressable
      onPress={() => router.push('/insights')}
      style={[styles.section, styles.chartCard, { backgroundColor: colors.surface }]}
    >
      <View style={styles.chartHeader}>
        <View>
          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginBottom: 2 }]}>
            WEIGHT TREND
          </Text>
          <Text style={[styles.chartCurrentValue, { color: colors.text }]}>
            {weights[weights.length - 1].toFixed(1)} kg
          </Text>
        </View>
        <View style={styles.chartCta}>
          <Text style={[styles.chartCtaText, { color: brand.pregnancy }]}>Details</Text>
          <ChevronRight size={14} color={brand.pregnancy} strokeWidth={2} />
        </View>
      </View>
      <LineChart
        data={weights}
        labels={labels}
        color={brand.pregnancy}
        width={SCREEN_W - 80}
        height={72}
        unit=" kg"
      />
    </Pressable>
  )
}

// ─── Section 7: Grandma CTA ──────────────────────────────────────────────────

function GrandmaCTA() {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={() => router.push('/grandma-talk')}
      style={[styles.section, styles.grandmaCard, { backgroundColor: colors.surface }]}
    >
      <Text style={styles.grandmaEmoji}>👵</Text>
      <View style={styles.grandmaBody}>
        <Text style={[styles.grandmaTitle, { color: colors.text }]}>Ask Grandma</Text>
        <Text style={[styles.grandmaSubtitle, { color: colors.textSecondary }]}>
          Questions, worries, or just need a pep talk
        </Text>
      </View>
      <ChevronRight size={20} color={brand.pregnancy} strokeWidth={2} />
    </Pressable>
  )
}

// ─── Section 8: Affirmation ──────────────────────────────────────────────────

function AffirmationCard({ text }: { text: string }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.section, styles.affirmationCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.affirmationLabel, { color: colors.textMuted }]}>
        TODAY'S AFFIRMATION
      </Text>
      <Text style={[styles.affirmationText, { color: colors.text }]}>"{text}"</Text>
    </View>
  )
}

// ─── Section 9: Daily Tip ────────────────────────────────────────────────────

function DailyTipCard({ tip }: { tip: string }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.section, styles.tipCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.affirmationLabel, { color: colors.textMuted }]}>GRANDMA'S TIP</Text>
      <Text style={[styles.tipText, { color: colors.text }]}>{tip}</Text>
    </View>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type InlineLogType = 'mood' | 'symptom' | 'appointment' | 'kick_count' | 'vitamins' | 'water' | 'weight' | 'sleep' | 'exercise' | 'kegel' | 'nutrition' | null

export function PregnancyHome() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  const weekNumber = usePregnancyStore((s) => s.weekNumber) ?? 24
  const dueDate = usePregnancyStore((s) => s.dueDate) ?? ''
  const [activeLog, setActiveLog] = useState<InlineLogType>(null)
  const [moodSaving, setMoodSaving] = useState(false)

  const [userId, setUserId] = useState<string | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id)
    })
  }, [])

  const { data: todayLogs = {} } = usePregnancyTodayLogs(userId)
  const { data: weightHistory = [] } = usePregnancyWeightHistory(userId ?? '', 6)

  const daysToGo = dueDate ? getDaysToGo(dueDate) : null
  const affirmation = getDailyAffirmation()
  const weekData = pregnancyWeeks.find((w) => w.week === weekNumber)
  const upcomingAppt = getUpcomingAppointment(weekNumber)

  // Weight sparkline — PregnancyWeightEntry has { date, weight }
  const weightValues = (weightHistory as Array<{ date: string; weight: number }>).map((e) => e.weight)
  const weightLabels = (weightHistory as Array<{ date: string; weight: number }>).map((e) =>
    new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  )

  const currentMood = todayLogs['mood']?.notes ?? todayLogs['mood']?.value ?? null

  const handleMoodSelect = async (moodId: string) => {
    if (!userId) return
    setMoodSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { error } = await supabase.from('pregnancy_logs').insert({
        user_id: userId,
        log_date: today,
        log_type: 'mood',
        value: moodId,
        notes: null,
      })
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['pregnancy-today-logs', userId] })
    } catch {
      // silent fail
    } finally {
      setMoodSaving(false)
    }
  }

  const contextCards: ContextCard[] = []

  if (weekNumber >= 28 && !todayLogs['kick_count']) {
    contextCards.push({
      key: 'kicks',
      color: '#A2FF86',
      emoji: '👶',
      title: 'Log kick count',
      body: 'No kick session recorded today. Track baby movements.',
      onPress: () => setActiveLog('kick_count'),
    })
  }

  if (upcomingAppt) {
    contextCards.push({
      key: 'appointment',
      color: '#FBBF24',
      emoji: '📅',
      title: upcomingAppt.name,
      body: upcomingAppt.prepNote,
      onPress: () => router.push('/(tabs)/agenda'),
    })
  }

  if (weekData && contextCards.length < 3) {
    contextCards.push({
      key: 'development',
      color: brand.pregnancy,
      emoji: WEEK_EMOJI[weekNumber] ?? '👶',
      title: `Week ${weekNumber} development`,
      body: weekData.developmentFact,
      onPress: () => router.push('/(tabs)/agenda'),
    })
  }

  const renderInlineForm = (): React.ReactElement | null => {
    const today = new Date().toISOString().split('T')[0]
    const onClose = () => {
      setActiveLog(null)
      queryClient.invalidateQueries({ queryKey: ['pregnancy-today-logs', userId] })
    }

    if (activeLog === 'mood') return <PregnancyMoodForm date={today} onSaved={onClose} />
    if (activeLog === 'symptom') return <PregnancySymptomsForm date={today} onSaved={onClose} />
    if (activeLog === 'appointment') return <AppointmentForm date={today} onSaved={onClose} />
    if (activeLog === 'kick_count') return <KickCountForm date={today} onSaved={onClose} />

    if (activeLog === 'vitamins' || activeLog === 'kegel') {
      return (
        <View style={styles.simpleForm}>
          <Text style={[styles.simpleFormTitle, { color: colors.text }]}>
            {activeLog === 'vitamins' ? '💊 Mark vitamins taken' : '💪 Log Kegel sets'}
          </Text>
          <Pressable
            onPress={async () => {
              if (!userId) return
              const today2 = new Date().toISOString().split('T')[0]
              await supabase.from('pregnancy_logs').insert({
                user_id: userId,
                log_date: today2,
                log_type: activeLog,
                value: '1',
                notes: null,
              })
              onClose()
            }}
            style={[styles.simpleFormBtn, { backgroundColor: brand.pregnancy }]}
          >
            <Text style={styles.simpleFormBtnText}>Mark done</Text>
          </Pressable>
        </View>
      )
    }

    router.push('/(tabs)/agenda')
    setActiveLog(null)
    return null
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <BabyHeroCarousel currentWeek={weekNumber} daysToGo={daysToGo} />

      <QuickLogStrip
        todayLogs={todayLogs}
        weekNumber={weekNumber}
        onPressRoutine={(type) => setActiveLog(type as InlineLogType)}
      />

      <VitalsGrid todayLogs={todayLogs} weekNumber={weekNumber} />

      <MoodPicker
        currentMood={currentMood}
        onSelect={handleMoodSelect}
        saving={moodSaving}
      />

      <ContextualCards cards={contextCards.slice(0, 3)} />

      {weightValues.length >= 2 && (
        <WeightMiniChart weights={weightValues} labels={weightLabels} />
      )}

      <GrandmaCTA />

      <AffirmationCard text={affirmation} />

      {weekData && <DailyTipCard tip={weekData.momTip} />}

      <Modal
        visible={activeLog !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveLog(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <Pressable onPress={() => setActiveLog(null)} style={styles.modalClose}>
                <X size={20} color={colors.textMuted} strokeWidth={2} />
              </Pressable>
            </View>
            {renderInlineForm()}
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  heroCard: {
    borderRadius: 32,
    padding: 24,
    marginBottom: 8,
    overflow: 'hidden',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  heroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroBadgeText: {
    fontSize: 11,
    fontFamily: 'Satoshi-Variable',
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  heroEmoji: {
    fontSize: 64,
    textAlign: 'center',
    marginVertical: 8,
  },
  heroWeekText: {
    fontSize: 28,
    fontFamily: 'CabinetGrotesk-Black',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroSizeText: {
    fontSize: 14,
    fontFamily: 'Satoshi-Variable',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 4,
  },
  heroDaysText: {
    fontSize: 13,
    fontFamily: 'Satoshi-Variable',
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginTop: 2,
  },
  heroFact: {
    fontSize: 13,
    fontFamily: 'Satoshi-Variable',
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  heroProgressContainer: { marginTop: 16 },
  heroProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
  },
  heroProgressFill: {
    height: 4,
    backgroundColor: '#B983FF',
    borderRadius: 2,
  },
  heroProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  heroProgressLabel: {
    fontSize: 10,
    fontFamily: 'Satoshi-Variable',
    color: 'rgba(255,255,255,0.4)',
  },
  heroDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  heroDot: {
    height: 6,
    borderRadius: 3,
  },

  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  quickLogRow: { gap: 8, paddingBottom: 4 },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 13,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '600',
  },

  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  vitalsTile: {
    width: (SCREEN_W - 52) / 2,
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  vitalsValue: {
    fontSize: 22,
    fontFamily: 'CabinetGrotesk-Black',
  },
  vitalsLabel: {
    fontSize: 12,
    fontFamily: 'Satoshi-Variable',
  },
  vitalsProgressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: 4,
  },
  vitalsProgressFill: {
    height: 3,
    borderRadius: 2,
  },

  moodCard: {
    borderRadius: 24,
    padding: 20,
  },
  moodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    flex: 1,
    marginHorizontal: 2,
  },
  moodEmoji: { fontSize: 24 },
  moodLabel: {
    fontSize: 10,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },

  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  contextEmoji: { fontSize: 28 },
  contextBody: { flex: 1 },
  contextTitle: {
    fontSize: 14,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '700',
    marginBottom: 2,
  },
  contextText: {
    fontSize: 12,
    fontFamily: 'Satoshi-Variable',
    lineHeight: 16,
  },

  chartCard: {
    borderRadius: 24,
    padding: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  chartCurrentValue: {
    fontSize: 20,
    fontFamily: 'CabinetGrotesk-Black',
  },
  chartCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  chartCtaText: {
    fontSize: 13,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '600',
  },

  grandmaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  grandmaEmoji: { fontSize: 36 },
  grandmaBody: { flex: 1 },
  grandmaTitle: {
    fontSize: 16,
    fontFamily: 'CabinetGrotesk-Black',
    marginBottom: 2,
  },
  grandmaSubtitle: {
    fontSize: 13,
    fontFamily: 'Satoshi-Variable',
    lineHeight: 18,
  },

  affirmationCard: {
    borderRadius: 24,
    padding: 20,
  },
  affirmationLabel: {
    fontSize: 11,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  affirmationText: {
    fontSize: 16,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '500',
    lineHeight: 24,
    fontStyle: 'italic',
  },

  tipCard: {
    borderRadius: 24,
    padding: 20,
  },
  tipText: {
    fontSize: 15,
    fontFamily: 'Satoshi-Variable',
    lineHeight: 22,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    position: 'absolute',
    top: 12,
  },
  modalClose: {
    position: 'absolute',
    right: 20,
    top: 8,
    padding: 8,
  },

  simpleForm: {
    padding: 24,
    gap: 20,
    alignItems: 'center',
  },
  simpleFormTitle: {
    fontSize: 18,
    fontFamily: 'CabinetGrotesk-Black',
    textAlign: 'center',
  },
  simpleFormBtn: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 999,
  },
  simpleFormBtnText: {
    fontSize: 16,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
