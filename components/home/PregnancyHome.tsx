/**
 * Pregnancy Home — Command Center (refactored)
 *
 * Section order (top → bottom):
 * 1. BabyHeroCarousel   — swipeable FlatList, full-width, tappable → WeekDetailModal
 * 2. AffirmationRevealCard — glow-burst VFX reveal, Supabase-backed
 * 3. QuickLogStrip      — today's routine chips with checkmark state
 * 4. VitalsCarousel     — horizontal scroll of metric cards, each → detail modal
 * 5. RemindersSection   — upcoming appts + week tips + habit nudges
 * 6. WeightMiniChart    — 6-entry sparkline
 * 7. GrandmaCTA         — deep-link to grandma-talk
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
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { ChevronRight, X } from 'lucide-react-native'
import { useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { supabase } from '../../lib/supabase'
import { pregnancyWeeks, getDaysToGo } from '../../lib/pregnancyData'
import type { PregnancyWeekData } from '../../lib/pregnancyData'
import { usePregnancyWeightHistory, usePregnancyTodayLogs } from '../../lib/analyticsData'
import type { TodayLogEntry } from '../../lib/analyticsData'
import { LineChart } from '../charts/SvgCharts'
import {
  PregnancyMoodForm,
  PregnancySymptomsForm,
  AppointmentForm,
  KickCountForm,
} from '../calendar/PregnancyLogForms'

import { AffirmationRevealCard } from './pregnancy/AffirmationRevealCard'
import { VitalsCarousel } from './pregnancy/VitalsCarousel'
import { RemindersSection } from './pregnancy/RemindersSection'
import { WeekDetailModal } from './pregnancy/WeekDetailModal'

const SCREEN_W = Dimensions.get('window').width

// ─── Week emoji map ────────────────────────────────────────────────────────────

const WEEK_EMOJI: Record<number, string> = {
  1: '🌱', 2: '🌱', 3: '🌱', 4: '🫘', 5: '🍎', 6: '🫛', 7: '🫐', 8: '🍇',
  9: '🍒', 10: '🍓', 11: '🍋', 12: '🍑', 13: '🍑', 14: '🍋', 15: '🍏',
  16: '🥑', 17: '🍐', 18: '🫑', 19: '🥭', 20: '🍌', 21: '🥕', 22: '🍈',
  23: '🍊', 24: '🌽', 25: '🫚', 26: '🥬', 27: '🥦', 28: '🍆', 29: '🎃',
  30: '🥬', 31: '🥥', 32: '🌰', 33: '🍍', 34: '🍈', 35: '🍈', 36: '🥬',
  37: '🥬', 38: '🌿', 39: '🍉', 40: '🎃',
}

function getTrimester(week: number): 1 | 2 | 3 {
  if (week <= 13) return 1
  if (week <= 26) return 2
  return 3
}

// ─── Section 1: Baby Hero Carousel ────────────────────────────────────────────

interface HeroItem { week: number; data: PregnancyWeekData }
const HERO_ITEMS: HeroItem[] = pregnancyWeeks.map((w) => ({ week: w.week, data: w }))

interface BabyHeroCarouselProps {
  currentWeek: number
  daysToGo: number | null
  onPressWeek: (week: number) => void
}

function BabyHeroCarousel({ currentWeek, daysToGo, onPressWeek }: BabyHeroCarouselProps) {
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
      if (viewableItems[0]) setVisibleWeek(viewableItems[0].item.week)
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
      tri === 1 ? ['#1A2A4A', '#2D4A8A']
      : tri === 2 ? ['#2A1050', '#5C2FA8']
      : ['#2A0A3A', '#7B1FA2']

    const triLabel = `T${tri} · Week ${item.week}`
    const daysLabel =
      isCurrent && daysToGo !== null
        ? `${daysToGo} days left`
        : item.week < currentWeek
        ? 'Past week'
        : `Week ${item.week - currentWeek} ahead`

    return (
      // Item is exactly SCREEN_W wide — padding applied to gradient card, not here
      <Pressable
        style={{ width: SCREEN_W }}
        onPress={() => onPressWeek(item.week)}
      >
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
                <Text style={[styles.heroBadgeText, { color: brand.pregnancy }]}>← swipe weeks →</Text>
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

          {/* Tap hint */}
          <View style={styles.heroTapHint}>
            <Text style={[styles.heroTapText, { color: brand.pregnancy }]}>Tap for details ›</Text>
          </View>
        </LinearGradient>
      </Pressable>
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
        decelerationRate="fast"
        snapToInterval={SCREEN_W}
        snapToAlignment="start"
      />
      <View style={styles.heroDotsRow}>
        {[1, 2, 3].map((tri) => (
          <View
            key={tri}
            style={[
              styles.heroDot,
              {
                backgroundColor: getTrimester(visibleWeek) === tri ? brand.pregnancy : 'rgba(255,255,255,0.2)',
                width: getTrimester(visibleWeek) === tri ? 16 : 6,
              },
            ]}
          />
        ))}
      </View>
    </View>
  )
}

// ─── Section 3: Quick Log Strip ───────────────────────────────────────────────

interface RoutineDef { type: string; label: string; emoji: string; goal: number; minWeek?: number }

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

interface QuickLogStripProps {
  todayLogs: Record<string, TodayLogEntry>
  weekNumber: number
  onPressRoutine: (type: string) => void
}

function QuickLogStrip({ todayLogs, weekNumber, onPressRoutine }: QuickLogStripProps) {
  const { colors } = useTheme()
  const visible = ROUTINES.filter((r) => !r.minWeek || weekNumber >= r.minWeek)

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TODAY'S ROUTINES</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickLogRow}>
        {visible.map((routine) => {
          const logged = todayLogs[routine.type]
          const isDone = !!logged
          const isWater = routine.type === 'water'
          const waterCount = isWater && logged?.value ? parseInt(logged.value, 10) : 0

          let chipBg = 'rgba(255,255,255,0.08)'
          let chipBorder = 'rgba(255,255,255,0.12)'
          let chipTextColor = colors.text

          if (isDone) {
            chipBg = '#A2FF8620'
            chipBorder = '#A2FF8640'
            chipTextColor = '#A2FF86'
          }

          const chipLabel = isWater && isDone
            ? `${routine.emoji} ${waterCount}/8 glasses`
            : isDone
            ? `${routine.emoji} ✓ ${routine.label}`
            : `${routine.emoji} + ${routine.label}`

          return (
            <Pressable
              key={routine.type}
              onPress={() => onPressRoutine(routine.type)}
              style={[styles.quickChip, { backgroundColor: chipBg, borderColor: chipBorder }]}
            >
              <Text style={[styles.quickChipText, { color: chipTextColor }]}>{chipLabel}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

// ─── Section 6: Weight Mini-Chart ─────────────────────────────────────────────

interface WeightMiniChartProps { weights: number[]; labels: string[] }

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
          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginBottom: 2 }]}>WEIGHT TREND</Text>
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

// ─── Section 7: Grandma CTA ───────────────────────────────────────────────────

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

// ─── Main Component ───────────────────────────────────────────────────────────

type InlineLogType =
  | 'mood' | 'symptom' | 'appointment' | 'kick_count'
  | 'vitamins' | 'water' | 'weight' | 'sleep' | 'exercise' | 'kegel' | 'nutrition'
  | null

interface PregnancyHomeProps { topInset?: number }

export function PregnancyHome({ topInset = 0 }: PregnancyHomeProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  const weekNumber = usePregnancyStore((s) => s.weekNumber) ?? 24
  const dueDate = usePregnancyStore((s) => s.dueDate) ?? ''

  const [activeLog, setActiveLog] = useState<InlineLogType>(null)
  const [weekDetailVisible, setWeekDetailVisible] = useState(false)
  const [detailWeek, setDetailWeek] = useState(weekNumber)

  const [userId, setUserId] = useState<string | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id)
    })
  }, [])

  const { data: todayLogs = {} } = usePregnancyTodayLogs(userId)
  const { data: weightHistory = [] } = usePregnancyWeightHistory(userId ?? '', 6)

  const daysToGo = dueDate ? getDaysToGo(dueDate) : null

  const weightValues = (weightHistory as Array<{ date: string; weight: number }>).map(e => e.weight)
  const weightLabels = (weightHistory as Array<{ date: string; weight: number }>).map(e =>
    new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  )

  const handleHeroPress = (week: number) => {
    setDetailWeek(week)
    setWeekDetailVisible(true)
  }

  // Redirect unhandled log types to agenda
  useEffect(() => {
    const handled: InlineLogType[] = ['mood', 'symptom', 'appointment', 'kick_count', 'vitamins', 'kegel']
    if (activeLog !== null && !handled.includes(activeLog)) {
      setActiveLog(null)
      router.push('/(tabs)/agenda')
    }
  }, [activeLog])

  const renderInlineForm = (): React.ReactElement | null => {
    if (activeLog === null) return null
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
              await supabase.from('pregnancy_logs').insert({
                user_id: userId,
                log_date: today,
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
    return null
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Hero Carousel — full-width, tappable */}
      <BabyHeroCarousel
        currentWeek={weekNumber}
        daysToGo={daysToGo}
        onPressWeek={handleHeroPress}
      />

      {/* 2. Affirmation Reveal */}
      <View style={styles.section}>
        <AffirmationRevealCard />
      </View>

      {/* 3. Routine chips */}
      <QuickLogStrip
        todayLogs={todayLogs}
        weekNumber={weekNumber}
        onPressRoutine={(type) => setActiveLog(type as InlineLogType)}
      />

      {/* 4. Vitals carousel */}
      <View style={[styles.section, { paddingHorizontal: 0 }]}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted, paddingHorizontal: 20, marginBottom: 12 }]}>
          TODAY'S VITALS
        </Text>
        <VitalsCarousel
          todayLogs={todayLogs}
          weekNumber={weekNumber}
          userId={userId}
        />
      </View>

      {/* 5. Reminders */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>REMINDERS</Text>
        <RemindersSection
          weekNumber={weekNumber}
          todayLogs={todayLogs}
          onOpenWeekDetail={() => {
            setDetailWeek(weekNumber)
            setWeekDetailVisible(true)
          }}
        />
      </View>

      {/* 6. Weight chart */}
      {weightValues.length >= 2 && (
        <WeightMiniChart weights={weightValues} labels={weightLabels} />
      )}

      {/* 7. Grandma CTA */}
      <GrandmaCTA />

      {/* Week detail modal */}
      <WeekDetailModal
        visible={weekDetailVisible}
        week={detailWeek}
        onClose={() => setWeekDetailVisible(false)}
      />

      {/* Inline log forms modal */}
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

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Hero
  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  heroBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  heroBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  heroBadgeText: { fontSize: 11, fontFamily: 'Satoshi-Variable', color: 'rgba(255,255,255,0.8)', fontWeight: '600', letterSpacing: 0.5 },
  heroEmoji: { fontSize: 64, textAlign: 'center', marginVertical: 8 },
  heroWeekText: { fontSize: 28, fontFamily: 'CabinetGrotesk-Black', color: '#FFFFFF', textAlign: 'center' },
  heroSizeText: { fontSize: 14, fontFamily: 'Satoshi-Variable', color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 4 },
  heroDaysText: { fontSize: 13, fontFamily: 'Satoshi-Variable', color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 2 },
  heroFact: { fontSize: 13, fontFamily: 'Satoshi-Variable', color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginTop: 12, lineHeight: 18 },
  heroProgressContainer: { marginTop: 16 },
  heroProgressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2 },
  heroProgressFill: { height: 4, backgroundColor: '#B983FF', borderRadius: 2 },
  heroProgressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  heroProgressLabel: { fontSize: 10, fontFamily: 'Satoshi-Variable', color: 'rgba(255,255,255,0.4)' },
  heroTapHint: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(185,131,255,0.15)',
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroTapText: { fontSize: 11, fontFamily: 'Satoshi-Variable', fontWeight: '700' },
  heroDotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 8, marginBottom: 4 },
  heroDot: { height: 6, borderRadius: 3 },

  // Shared section
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionLabel: { fontSize: 11, fontFamily: 'Satoshi-Variable', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },

  // Routines
  quickLogRow: { gap: 8, paddingBottom: 4 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  quickChipText: { fontSize: 13, fontFamily: 'Satoshi-Variable', fontWeight: '600' },

  // Weight chart
  chartCard: { borderRadius: 24, padding: 20 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  chartCurrentValue: { fontSize: 20, fontFamily: 'CabinetGrotesk-Black' },
  chartCta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  chartCtaText: { fontSize: 13, fontFamily: 'Satoshi-Variable', fontWeight: '600' },

  // Grandma
  grandmaCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, padding: 20, gap: 16 },
  grandmaEmoji: { fontSize: 36 },
  grandmaBody: { flex: 1 },
  grandmaTitle: { fontSize: 16, fontFamily: 'CabinetGrotesk-Black', marginBottom: 2 },
  grandmaSubtitle: { fontSize: 13, fontFamily: 'Satoshi-Variable', lineHeight: 18 },

  // Inline log modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { alignItems: 'center', paddingTop: 12, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', justifyContent: 'center' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', position: 'absolute', top: 12 },
  modalClose: { position: 'absolute', right: 20, top: 8, padding: 8 },

  simpleForm: { padding: 24, gap: 20, alignItems: 'center' },
  simpleFormTitle: { fontSize: 18, fontFamily: 'CabinetGrotesk-Black', textAlign: 'center' },
  simpleFormBtn: { paddingHorizontal: 40, paddingVertical: 16, borderRadius: 999 },
  simpleFormBtnText: { fontSize: 16, fontFamily: 'Satoshi-Variable', fontWeight: '700', color: '#FFFFFF' },
})
