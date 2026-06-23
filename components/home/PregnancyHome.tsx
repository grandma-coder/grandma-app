/**
 * Pregnancy Home — Command Center (refactored)
 *
 * Section order (top → bottom):
 * 1. BabyHeroCarousel   — swipeable FlatList, full-width, tappable → WeekDetailModal
 * 2. AffirmationRevealCard — glow-burst VFX reveal, Supabase-backed
 * 3. QuickLogStrip      — today's routine chips with checkmark state
 * 4. TodaySummaryCard   — single "today at a glance" card → opens daily dashboard modal
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
import { router, useFocusEffect } from 'expo-router'
import { ChevronRight, X } from 'lucide-react-native'
import { useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, font } from '../../constants/theme'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useProfile } from '../../lib/useProfile'
import { useTranslation } from '../../lib/i18n'
import { HomeGreeting } from './HomeGreeting'
import { PaperCard } from '../ui/PaperCard'
import { Leaf } from '../ui/Stickers'
import { Display, MonoCaps, Body } from '../ui/Typography'
import { GrandmaLogo } from '../ui/GrandmaLogo'
import { supabase } from '../../lib/supabase'
import { pregnancyWeeks, getDaysToGo, getCurrentWeekFromDueDate } from '../../lib/pregnancyData'
import type { PregnancyWeekData } from '../../lib/pregnancyData'
import { usePregnancyTodayLogs } from '../../lib/analyticsData'
import { toDateStr } from '../../lib/cycleLogic'
import type { TodayLogEntry } from '../../lib/analyticsData'
import {
  PregnancyMoodForm,
  PregnancySymptomsForm,
  AppointmentForm,
  KickCountForm,
  SleepLogForm,
  WeightLogForm,
  WaterLogForm,
  ExerciseLogForm,
  VitaminsLogForm,
  KegelLogForm,
} from '../calendar/PregnancyLogForms'
import { PregnancyMealForm } from '../calendar/PregnancyMealForm'
import { LogSheet } from '../calendar/LogSheet'

import { WeekCard } from './pregnancy/WeekCard'
import {
  LogVitamins, LogWater, LogMood, LogSymptom, LogWeight, LogSleep,
  LogExercise, LogKicks, LogNutrition, LogKegel,
} from '../stickers/RewardStickers'
import { AffirmationRevealCard } from './pregnancy/AffirmationRevealCard'
import { TodaySummaryCard } from './pregnancy/TodaySummaryCard'
import { RemindersSection } from './pregnancy/RemindersSection'
import type { ReminderLogType } from './pregnancy/RemindersSection'
import { PregnancyUserReminders } from './pregnancy/PregnancyUserReminders'
import { WeekDetailModal } from './pregnancy/WeekDetailModal'
import { WeightTrendCard } from './pregnancy/WeightTrendCard'
import { BirthGuideModal } from '../pregnancy/BirthGuideModal'
import { AppointmentDetailModal } from './pregnancy/AppointmentDetailModal'
import type { StandardAppointment } from '../../lib/pregnancyAppointments'

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

  const renderItem = useCallback(
    ({ item }: { item: HeroItem }) => {
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
    },
    [currentWeek, daysToGo, onPressWeek],
  )

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
  const { t } = useTranslation()
  const visible = ROUTINES.filter((r) => !r.minWeek || weekNumber >= r.minWeek)

  return (
    <View style={styles.section}>
      <MonoCaps style={{ marginBottom: 12 }}>{t('pregnancy_todaysRoutines')}</MonoCaps>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickLogRow}>
        {visible.map((routine) => {
          const logged = todayLogs[routine.type]
          const isDone = !!logged
          const isWater = routine.type === 'water'
          const waterCount = isWater && logged?.value ? parseInt(logged.value, 10) : 0

          const chipBg = isDone ? stickers.greenSoft : colors.surface
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
                  {isWater && isDone
                    ? t('pregnancy_waterChip', { count: waterCount })
                    : isDone
                      ? t('pregnancy_routineDone', { label: routine.label })
                      : `+ ${routine.label}`}
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
  const { t } = useTranslation()
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
            <Display size={18} color={colors.text}>{t('pregnancy_appt_askGrandma')}</Display>
            <Body size={13} color={colors.textMuted} style={{ marginTop: 2, lineHeight: 18 }}>
              {t('pregnancy_grandmaCtaSubtitle')}
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

// Map InlineLogType → translation key for the inline log sheet title.
const INLINE_LOG_TITLE_KEY: Record<Exclude<InlineLogType, null>, string> = {
  mood: 'pregnancy_logTitle_mood',
  symptom: 'pregnancy_logTitle_symptom',
  appointment: 'pregnancy_logTitle_appointment',
  kick_count: 'pregnancy_logTitle_kicks',
  vitamins: 'pregnancy_logTitle_vitamins',
  water: 'pregnancy_logTitle_water',
  weight: 'pregnancy_logTitle_weight',
  sleep: 'pregnancy_logTitle_sleep',
  exercise: 'pregnancy_logTitle_exercise',
  kegel: 'pregnancy_logTitle_kegel',
  nutrition: 'pregnancy_logTitle_nutrition',
}

interface PregnancyHomeProps { topInset?: number }

export function PregnancyHome({ topInset = 0 }: PregnancyHomeProps) {
  const { colors, isDark, stickers } = useTheme()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const storedWeek = usePregnancyStore((s) => s.weekNumber)
  const dueDate = usePregnancyStore((s) => s.dueDate) ?? ''
  const pregHydrated = usePregnancyStore((s) => s.hydrated)
  // Always derive from due date so the week advances with time;
  // fall back to the stored snapshot only when no due date is set.
  const weekNumber = dueDate ? getCurrentWeekFromDueDate(dueDate) : (storedWeek ?? 1)
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

  const { data: todayLogs = {}, refetch: refetchTodayLogs } = usePregnancyTodayLogs(userId)
  // Pull fresh data every time the home screen regains focus (e.g. user
  // switches back from the calendar after logging something).
  useFocusEffect(
    useCallback(() => {
      void refetchTodayLogs()
    }, [refetchTodayLogs]),
  )

  const daysToGo = dueDate ? getDaysToGo(dueDate) : null

  const handleHeroPress = (week: number) => {
    setDetailWeek(week)
    setWeekDetailVisible(true)
  }

  const renderInlineForm = (): React.ReactElement | null => {
    if (activeLog === null) return null
    const today = toDateStr(new Date())
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
    if (activeLog === 'sleep') return <SleepLogForm date={today} onSaved={onClose} />
    if (activeLog === 'weight') return <WeightLogForm date={today} onSaved={onClose} />
    if (activeLog === 'water') return <WaterLogForm date={today} onSaved={onClose} />
    if (activeLog === 'exercise') return <ExerciseLogForm date={today} onSaved={onClose} />
    if (activeLog === 'vitamins') return <VitaminsLogForm date={today} onSaved={onClose} />
    if (activeLog === 'kegel') return <KegelLogForm date={today} onSaved={onClose} />
    return null
  }

  // Uses the device locale instead of forcing en-US so the weekday name
  // matches the user's language.
  const weekdayLabel = new Date()
    .toLocaleDateString(undefined, { weekday: 'long' })
    .toUpperCase()

  // Don't render the home until the persisted pregnancy store has
  // rehydrated. Without this gate the first paint reads dueDate as null,
  // renders week 1, then flips to the real week (e.g. 40) once
  // AsyncStorage finishes loading — the visible "flash" the user reported.
  if (!pregHydrated) {
    return <View style={[styles.root, { backgroundColor: colors.bg }]} />
  }

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
          microLabel={t('pregnancy_weekDay', { week: weekNumber, weekday: weekdayLabel })}
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

      {/* 4. Today summary card — opens full daily dashboard */}
      <View style={[styles.section, { paddingHorizontal: 0 }]}>
        <TodaySummaryCard
          todayLogs={todayLogs}
          weekNumber={weekNumber}
          userId={userId}
        />
      </View>

      {/* 5. Reminders */}
      <View style={styles.section}>
        <MonoCaps style={{ marginBottom: 12 }}>{t('pregnancy_reminders')}</MonoCaps>
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
        <View style={{ height: 12 }} />
        <PregnancyUserReminders userId={userId ?? null} />
      </View>

      {/* 6. Weight trend — rich card with IOM target band */}
      <View style={styles.section}>
        <WeightTrendCard userId={userId} weekNumber={weekNumber} />
      </View>

      {/* 7. Birth guide — sticker-on-paper card */}
      <View style={styles.section}>
        <Pressable
          onPress={() => setBirthGuideVisible(true)}
          style={({ pressed }) => [
            styles.birthGuideWrap,
            pressed && {
              shadowOffset: { width: 0, height: 1 },
              transform: [{ translateY: 2 }],
            },
          ]}
        >
          <PaperCard tint={stickers.greenSoft} radius={20} padding={14} flat style={styles.birthGuideCard}>
            <View style={styles.birthGuideIcon}>
              <Leaf size={36} fill={stickers.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.birthGuideTitle, { color: colors.text }]} numberOfLines={1}>
                {t('pregnancy_birthGuideTitle')}
              </Text>
              <Text style={[styles.birthGuideSub, { color: colors.textMuted }]} numberOfLines={2}>
                {t('pregnancy_birthGuideSubtitle')}
              </Text>
            </View>
            <ChevronRight size={14} color={stickers.green} strokeWidth={2} />
          </PaperCard>
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

      {/* Inline log forms — same shell as the calendar */}
      <LogSheet
        visible={activeLog !== null}
        title={activeLog ? t(INLINE_LOG_TITLE_KEY[activeLog] as any) : ''}
        onClose={() => setActiveLog(null)}
      >
        {renderInlineForm()}
      </LogSheet>
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
  quickChipText: { fontSize: 13, fontFamily: font.bodyMedium },

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

  birthGuideWrap: {
    borderRadius: 20,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  birthGuideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#141313',
  },
  birthGuideIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  birthGuideTitle: {
    fontSize: 14,
    fontFamily: font.bodySemiBold,
    marginBottom: 2,
  },
  birthGuideSub: {
    fontSize: 12,
    fontFamily: font.body,
  },

  simpleForm: { padding: 24, gap: 20, alignItems: 'center' },
  simpleFormHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  simpleFormTitle: { fontSize: 18, fontFamily: font.display, textAlign: 'center' },
  simpleFormBtn: { paddingHorizontal: 40, paddingVertical: 16, borderRadius: 999 },
  simpleFormBtnText: { fontSize: 16, fontFamily: font.bodySemiBold },
})
