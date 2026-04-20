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
import { router } from 'expo-router'
import { ChevronRight, X } from 'lucide-react-native'
import { useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { HomeGreeting } from './HomeGreeting'
import { Emoji } from '../ui/Emoji'
import { PaperCard } from '../ui/PaperCard'
import { Display, DisplayItalic, MonoCaps, Body } from '../ui/Typography'
import { GrandmaLogo } from '../ui/GrandmaLogo'
import { Burst, Heart as HeartSticker } from '../stickers/BrandStickers'
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
  const { colors, isDark, stickers } = useTheme()
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

  // Hero card tint — soft lavender paper in both themes
  const heroTint = stickers.lilacSoft
  const pillBg = isDark ? 'rgba(20,19,19,0.35)' : 'rgba(20,19,19,0.06)'
  const triNames = ['first', 'second', 'third'] as const

  const renderItem = ({ item }: { item: HeroItem }) => {
    const isCurrent = item.week === currentWeek
    const tri = getTrimester(item.week)
    const daysLabel =
      isCurrent && daysToGo !== null
        ? `${daysToGo} days to go`
        : item.week < currentWeek
        ? 'past week'
        : `${item.week - currentWeek} weeks ahead`

    return (
      <Pressable
        style={{ width: SCREEN_W, paddingHorizontal: 20 }}
        onPress={() => onPressWeek(item.week)}
      >
        <PaperCard tint={heroTint} radius={28} padding={24} style={styles.heroCard}>
          {/* Corner sticker cluster — yellow Burst + pink Heart */}
          <View style={styles.heroSticker} pointerEvents="none">
            <Burst size={120} fill={stickers.yellow} stroke="#141313" points={11} wobble={0.2} />
            <View style={styles.heroStickerHeart}>
              <HeartSticker size={40} fill={stickers.pink} stroke="#141313" />
            </View>
          </View>

          <MonoCaps size={10} color={colors.textMuted}>WEEK</MonoCaps>
          <Display size={72} color={colors.text} style={{ marginTop: 2 }}>
            {item.week}
          </Display>
          <DisplayItalic size={22} color={colors.text} style={{ marginTop: 2, opacity: 0.85 }}>
            {triNames[tri - 1]} trimester
          </DisplayItalic>

          {/* Size pill */}
          <View style={[styles.heroPill, { backgroundColor: pillBg }]}>
            <View style={[styles.heroPillDot, { backgroundColor: stickers.peach }]} />
            <Text style={[styles.heroPillText, { color: colors.text }]} numberOfLines={1}>
              Baby is the size of a{' '}
              <Text style={{ fontFamily: 'DMSans_600SemiBold' }}>
                {item.data.babySize.toLowerCase()}
              </Text>
            </Text>
          </View>

          {/* Days + tap hint footer */}
          <View style={styles.heroFooter}>
            <MonoCaps size={10} color={colors.textMuted}>{daysLabel}</MonoCaps>
            <Text style={[styles.heroTapText, { color: colors.textMuted }]}>Tap for details ›</Text>
          </View>
        </PaperCard>
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
        {[1, 2, 3].map((tri) => {
          const active = getTrimester(visibleWeek) === tri
          return (
            <View
              key={tri}
              style={[
                styles.heroDot,
                {
                  backgroundColor: active ? colors.text : colors.borderStrong,
                  width: active ? 18 : 6,
                  opacity: active ? 1 : 0.5,
                },
              ]}
            />
          )
        })}
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
  const { colors, isDark, stickers } = useTheme()
  const visible = ROUTINES.filter((r) => !r.minWeek || weekNumber >= r.minWeek)

  return (
    <View style={styles.section}>
      <MonoCaps style={{ marginBottom: 12 }}>TODAY'S ROUTINES</MonoCaps>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickLogRow}>
        {visible.map((routine) => {
          const logged = todayLogs[routine.type]
          const isDone = !!logged
          const isWater = routine.type === 'water'
          const waterCount = isWater && logged?.value ? parseInt(logged.value, 10) : 0

          const chipBg = isDone
            ? stickers.greenSoft
            : isDark
            ? colors.surface
            : '#FFFEF8'
          const chipBorder = isDone
            ? (isDark ? stickers.green : '#9FB86A')
            : colors.border
          const chipTextColor = isDone
            ? (isDark ? stickers.green : '#4A6A1F')
            : colors.text

          return (
            <Pressable
              key={routine.type}
              onPress={() => onPressRoutine(routine.type)}
              style={[styles.quickChip, { backgroundColor: chipBg, borderColor: chipBorder }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Emoji size={14}>{routine.emoji}</Emoji>
                <Text style={[styles.quickChipText, { color: chipTextColor }]}>
                  {isWater && isDone ? `${waterCount}/8 glasses` : isDone ? `✓ ${routine.label}` : `+ ${routine.label}`}
                </Text>
              </View>
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
  const { colors, stickers } = useTheme()
  if (weights.length < 2) return null

  return (
    <View style={styles.section}>
      <Pressable onPress={() => router.push('/insights')}>
        <PaperCard radius={24} padding={20}>
          <View style={styles.chartHeader}>
            <View>
              <MonoCaps style={{ marginBottom: 4 }}>WEIGHT TREND</MonoCaps>
              <Display size={26} color={colors.text}>
                {weights[weights.length - 1].toFixed(1)}
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.textMuted }}> kg</Text>
              </Display>
            </View>
            <View style={styles.chartCta}>
              <Body size={13} color={stickers.lilac} style={{ fontFamily: 'DMSans_600SemiBold' }}>Details</Body>
              <ChevronRight size={14} color={stickers.lilac} strokeWidth={2} />
            </View>
          </View>
          <LineChart
            data={weights}
            labels={labels}
            color={stickers.lilac}
            width={SCREEN_W - 80}
            height={72}
            unit=" kg"
          />
        </PaperCard>
      </Pressable>
    </View>
  )
}

// ─── Section 7: Grandma CTA ───────────────────────────────────────────────────

function GrandmaCTA() {
  const { colors, isDark, stickers } = useTheme()
  return (
    <View style={styles.section}>
      <Pressable onPress={() => router.push('/grandma-talk')}>
        <PaperCard radius={24} padding={18} style={styles.grandmaCard}>
          <GrandmaLogo
            size={44}
            body={stickers.yellow}
            accent={stickers.coral}
            outline={isDark ? colors.text : '#141313'}
            motion="default"
          />
          <View style={styles.grandmaBody}>
            <Display size={18} color={colors.text}>Ask Grandma</Display>
            <Body size={13} color={colors.textMuted} style={{ marginTop: 2, lineHeight: 18 }}>
              Questions, worries, or just need a pep talk
            </Body>
          </View>
          <ChevronRight size={20} color={stickers.lilac} strokeWidth={2} />
        </PaperCard>
      </Pressable>
    </View>
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
  const parentName = useJourneyStore((s) => s.parentName)

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
            style={[styles.simpleFormBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.simpleFormBtnText, { color: colors.textInverse }]}>Mark done</Text>
          </Pressable>
        </View>
      )
    }
    return null
  }

  const weekdayLabel = new Date()
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toUpperCase()

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <HomeGreeting
          name={parentName}
          microLabel={`WEEK ${weekNumber} · ${weekdayLabel}`}
        />
      </View>

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
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <MonoCaps>TODAY'S VITALS</MonoCaps>
        </View>
        <VitalsCarousel
          todayLogs={todayLogs}
          weekNumber={weekNumber}
          userId={userId}
        />
      </View>

      {/* 5. Reminders */}
      <View style={styles.section}>
        <MonoCaps style={{ marginBottom: 12 }}>REMINDERS</MonoCaps>
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
    overflow: 'hidden',
    position: 'relative',
    minHeight: 220,
  },
  heroSticker: {
    position: 'absolute',
    top: -24,
    right: -24,
    width: 140,
    height: 140,
  },
  heroStickerHeart: {
    position: 'absolute',
    top: 44,
    left: 44,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 18,
    maxWidth: '92%',
  },
  heroPillDot: { width: 10, height: 10, borderRadius: 5 },
  heroPillText: { fontSize: 13, fontFamily: 'DMSans_400Regular', flexShrink: 1 },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  heroTapText: { fontSize: 11, fontFamily: 'DMSans_500Medium', letterSpacing: 0.5 },
  heroDotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 12, marginBottom: 4 },
  heroDot: { height: 6, borderRadius: 3 },

  // Shared section
  section: { paddingHorizontal: 20, marginTop: 24 },

  // Routines
  quickLogRow: { gap: 8, paddingBottom: 4, paddingRight: 20 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  quickChipText: { fontSize: 13, fontFamily: 'DMSans_500Medium' },

  // Weight chart
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  chartCta: { flexDirection: 'row', alignItems: 'center', gap: 2 },

  // Grandma
  grandmaCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  grandmaBody: { flex: 1 },

  // Inline log modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,19,19,0.55)' },
  modalSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { alignItems: 'center', paddingTop: 12, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', justifyContent: 'center' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', position: 'absolute', top: 12 },
  modalClose: { position: 'absolute', right: 20, top: 8, padding: 8 },

  simpleForm: { padding: 24, gap: 20, alignItems: 'center' },
  simpleFormTitle: { fontSize: 18, fontFamily: 'Fraunces_600SemiBold', textAlign: 'center' },
  simpleFormBtn: { paddingHorizontal: 40, paddingVertical: 16, borderRadius: 999 },
  simpleFormBtnText: { fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
})
