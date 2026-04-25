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
import { useProfile } from '../../lib/useProfile'
import { HomeGreeting } from './HomeGreeting'
import { PaperCard } from '../ui/PaperCard'
import { Display, MonoCaps, Body } from '../ui/Typography'
import { GrandmaLogo } from '../ui/GrandmaLogo'
import { supabase } from '../../lib/supabase'
import { pregnancyWeeks, getDaysToGo } from '../../lib/pregnancyData'
import type { PregnancyWeekData } from '../../lib/pregnancyData'
import { usePregnancyTodayLogs } from '../../lib/analyticsData'
import type { TodayLogEntry } from '../../lib/analyticsData'
import {
  PregnancyMoodForm,
  PregnancySymptomsForm,
  AppointmentForm,
  KickCountForm,
} from '../calendar/PregnancyLogForms'
import { SimplePregnancyLogForm } from '../calendar/SimplePregnancyLogForm'
import { PregnancyMealForm } from '../calendar/PregnancyMealForm'

import { WeekCard } from './pregnancy/WeekCard'
import {
  LogVitamins, LogWater, LogMood, LogSymptom, LogWeight, LogSleep,
  LogExercise, LogKicks, LogNutrition, LogKegel,
} from '../stickers/RewardStickers'
import { AffirmationRevealCard } from './pregnancy/AffirmationRevealCard'
import { VitalsCarousel } from './pregnancy/VitalsCarousel'
import { RemindersSection } from './pregnancy/RemindersSection'
import type { ReminderLogType } from './pregnancy/RemindersSection'
import { WeekDetailModal } from './pregnancy/WeekDetailModal'
import { WeightTrendCard } from './pregnancy/WeightTrendCard'
import { BirthGuideModal } from '../pregnancy/BirthGuideModal'
import { AppointmentDetailModal } from './pregnancy/AppointmentDetailModal'
import type { StandardAppointment } from '../../lib/pregnancyAppointments'

const SCREEN_W = Dimensions.get('window').width
const BIRTH_ACCENT = '#C4B5FD'

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
  const { colors } = useTheme()
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
    const daysLabel =
      isCurrent && daysToGo !== null
        ? `${daysToGo} days to go`
        : item.week < currentWeek
        ? 'past week'
        : `${item.week - currentWeek} weeks ahead`

    return (
      <View style={{ width: SCREEN_W, paddingHorizontal: 20 }}>
        <WeekCard
          week={item.week}
          daysLabel={daysLabel}
          width={SCREEN_W - 40}
          onPress={() => onPressWeek(item.week)}
        />
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

type StickerFn = (props: { size?: number; fill?: string; stroke?: string }) => React.ReactElement
interface RoutineDef { type: string; label: string; Sticker: StickerFn; goal: number; minWeek?: number }

const ROUTINES: RoutineDef[] = [
  { type: 'vitamins', label: 'Vitamins', Sticker: LogVitamins, goal: 1 },
  { type: 'water', label: 'Water', Sticker: LogWater, goal: 8 },
  { type: 'mood', label: 'Mood', Sticker: LogMood, goal: 1 },
  { type: 'symptom', label: 'Symptoms', Sticker: LogSymptom, goal: 1 },
  { type: 'weight', label: 'Weight', Sticker: LogWeight, goal: 1 },
  { type: 'sleep', label: 'Sleep', Sticker: LogSleep, goal: 1 },
  { type: 'exercise', label: 'Exercise', Sticker: LogExercise, goal: 1 },
  { type: 'kick_count', label: 'Kicks', Sticker: LogKicks, goal: 1, minWeek: 28 },
  { type: 'nutrition', label: 'Meals', Sticker: LogNutrition, goal: 3 },
  { type: 'kegel', label: 'Kegel', Sticker: LogKegel, goal: 1 },
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <routine.Sticker size={18} />
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

// ─── Section 7: Grandma CTA ───────────────────────────────────────────────────

function GrandmaCTA() {
  const { colors, isDark, stickers } = useTheme()
  return (
    <View style={styles.section}>
      <Pressable onPress={() => router.push('/grandma-talk')}>
        <PaperCard radius={24} padding={18} style={styles.grandmaCard}>
          <GrandmaLogo
            size={44}
            palette="lilac"
            outline={isDark ? colors.text : '#141313'}
            motion="float"
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
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  const weekNumber = usePregnancyStore((s) => s.weekNumber) ?? 24
  const dueDate = usePregnancyStore((s) => s.dueDate) ?? ''
  const parentName = useJourneyStore((s) => s.parentName)
  const { data: profile } = useProfile()
  const displayName = profile?.name ?? parentName

  const [activeLog, setActiveLog] = useState<InlineLogType>(null)
  const [weekDetailVisible, setWeekDetailVisible] = useState(false)
  const [detailWeek, setDetailWeek] = useState(weekNumber)
  const [apptDetail, setApptDetail] = useState<StandardAppointment | null>(null)
  const [birthGuideVisible, setBirthGuideVisible] = useState(false)

  const [userId, setUserId] = useState<string | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id)
    })
  }, [])

  const { data: todayLogs = {} } = usePregnancyTodayLogs(userId)

  const daysToGo = dueDate ? getDaysToGo(dueDate) : null

  const handleHeroPress = (week: number) => {
    setDetailWeek(week)
    setWeekDetailVisible(true)
  }

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

    if (activeLog === 'nutrition') {
      return <PregnancyMealForm userId={userId} onSaved={onClose} />
    }
    if (activeLog === 'water' || activeLog === 'weight' || activeLog === 'sleep'
        || activeLog === 'exercise') {
      return <SimplePregnancyLogForm type={activeLog} userId={userId} onSaved={onClose} />
    }

    if (activeLog === 'vitamins' || activeLog === 'kegel') {
      const Sticker = activeLog === 'vitamins' ? LogVitamins : LogKegel
      const title = activeLog === 'vitamins' ? 'Mark vitamins taken' : 'Log Kegel sets'
      return (
        <View style={styles.simpleForm}>
          <View style={styles.simpleFormHeader}>
            <Sticker size={32} />
            <Text style={[styles.simpleFormTitle, { color: colors.text }]}>{title}</Text>
          </View>
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
          name={displayName}
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
          onLog={(type: ReminderLogType) => setActiveLog(type as InlineLogType)}
          onOpenAppointment={(appt) => setApptDetail(appt)}
        />
      </View>

      {/* 6. Weight trend — rich card with IOM target band */}
      <View style={styles.section}>
        <WeightTrendCard userId={userId} weekNumber={weekNumber} />
      </View>

      {/* 7. Birth guide — compact banner */}
      <View style={styles.section}>
        <Pressable
          onPress={() => setBirthGuideVisible(true)}
          style={({ pressed }) => [
            styles.birthBanner,
            {
              backgroundColor: colors.surface,
              borderColor: BIRTH_ACCENT,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <View style={[styles.birthBannerTile, { backgroundColor: isDark ? colors.surfaceRaised ?? colors.surface : '#F0EBFF' }]}>
            <Text style={styles.birthBannerEmoji}>🌿</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.birthBannerTitle, { color: colors.text }]}>
              Birth Guide
            </Text>
            <Text style={[styles.birthBannerSub, { color: colors.textSecondary }]}>
              Natural · C-Section · Home · Water
            </Text>
          </View>
          <Text style={styles.birthBannerChevron}>›</Text>
        </Pressable>
      </View>

      {/* 8. Grandma CTA */}
      <GrandmaCTA />

      {/* Week detail modal */}
      <WeekDetailModal
        visible={weekDetailVisible}
        week={detailWeek}
        onClose={() => setWeekDetailVisible(false)}
      />

      {/* Appointment detail modal */}
      <AppointmentDetailModal
        visible={apptDetail !== null}
        appointment={apptDetail}
        currentWeek={weekNumber}
        onClose={() => setApptDetail(null)}
      />

      {/* Birth guide modal */}
      <BirthGuideModal
        visible={birthGuideVisible}
        onClose={() => setBirthGuideVisible(false)}
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
  heroDotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 12, marginBottom: 4 },
  heroDot: { height: 6, borderRadius: 3 },

  // Shared section
  section: { paddingHorizontal: 20, marginTop: 24 },

  // Routines
  quickLogRow: { gap: 8, paddingBottom: 4, paddingRight: 20 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  quickChipText: { fontSize: 13, fontFamily: 'DMSans_500Medium' },

  // Weight chart
  // Grandma
  grandmaCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  grandmaBody: { flex: 1 },

  // Inline log modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,19,19,0.55)' },
  modalSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { alignItems: 'center', paddingTop: 12, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', justifyContent: 'center' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', position: 'absolute', top: 12 },
  modalClose: { position: 'absolute', right: 20, top: 8, padding: 8 },

  birthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: BIRTH_ACCENT,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  birthBannerTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  birthBannerEmoji: { fontSize: 20 },
  birthBannerTitle: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
  },
  birthBannerSub: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    marginTop: 2,
  },
  birthBannerChevron: {
    fontSize: 20,
    color: BIRTH_ACCENT,
  },

  simpleForm: { padding: 24, gap: 20, alignItems: 'center' },
  simpleFormHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  simpleFormTitle: { fontSize: 18, fontFamily: 'Fraunces_600SemiBold', textAlign: 'center' },
  simpleFormBtn: { paddingHorizontal: 40, paddingVertical: 16, borderRadius: 999 },
  simpleFormBtnText: { fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
})
