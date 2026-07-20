/**
 * Pregnancy Home — Command Center (refactored)
 *
 * Section order (top → bottom):
 * 1. BabyHeroCarousel   — swipeable FlatList, full-width, tappable → WeekDetailModal
 * 2. DailyMessageCard — glow-burst VFX reveal, Supabase-backed
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
  ScrollView,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, diffuseFont, useDiffuseTheme } from '../../constants/theme'
import { useIsDiffuse, useScrollBottomInset } from '../ui/diffuse/DiffuseKit'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useChildStore } from '../../store/useChildStore'
import { useProfile } from '../../lib/useProfile'
import type { CaregiverView } from '../../lib/caregiverPermissions'
import { useTranslation } from '../../lib/i18n'
import { HomeGreeting } from './HomeGreeting'
import { CaregiverIdentityHeader } from '../caregiver/CaregiverIdentityHeader'
import { MonoCaps, Display } from '../ui/Typography'
import { supabase } from '../../lib/supabase'
import { pregnancyWeeks, getDaysToGo, getCurrentWeekFromDueDate } from '../../lib/pregnancyData'
import type { PregnancyWeekData } from '../../lib/pregnancyData'
import { usePregnancyTodayLogs } from '../../lib/analyticsData'
import { toDateStr } from '../../lib/cycleLogic'
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
import { DailyMessageCard } from './pregnancy/DailyMessageCard'
import { WeekWallet } from './pregnancy/WeekWallet'
import { EssentialsWalletCard } from './EssentialsWalletCard'
import { TodaySummaryCard } from './pregnancy/TodaySummaryCard'
import { WeekDetailModal } from './pregnancy/WeekDetailModal'
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

interface PregnancyHomeProps {
  topInset?: number
  /** Non-null when a caregiver (not the owner) is viewing — filters cards,
      keeps log entry points inert without log_activity, pins essentials. */
  caregiverView?: CaregiverView | null
}

export function PregnancyHome({ topInset = 0, caregiverView }: PregnancyHomeProps) {
  const { colors } = useTheme()
  // Only read for the pinned essentials card's childId (caregiver path); owners
  // pass no caregiverView so this is inert for them.
  const activeChild = useChildStore((s) => s.activeChild)
  // Owner (caregiverView null) sees every card; a caregiver sees only the shared
  // cards. `readOnly` makes log entry points inert without log_activity.
  const show = (id: string) => !caregiverView || caregiverView.visible.has(id)
  const readOnly = !!caregiverView && !caregiverView.canLog
  // Week Wallet holds these cards (essentials is pinned separately). Hide the
  // whole wallet block for a caregiver whose share includes none of them.
  const WALLET_CARD_IDS = ['appointment', 'week_tip', 'kicks', 'reminders', 'exams', 'birth_guide', 'ask_grandma']
  const walletHasVisibleCard = !caregiverView || WALLET_CARD_IDS.some((id) => caregiverView.visible.has(id))
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const bg = diffuse ? dt.colors.bg : colors.bg
  const insets = useSafeAreaInsets()
  const bottomInset = useScrollBottomInset(insets.bottom + 32)
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

  // Latest logged weight — drives the slim weight row's trailing value.
  // Kept to refresh the weight cache on focus / after logging; the value is
  // read inside Today's pills, not here.
  const { refetch: refetchWeight } = useQuery({
    queryKey: ['pregnancy-latest-weight', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('value')
        .eq('user_id', userId)
        .eq('log_type', 'weight')
        .order('log_date', { ascending: false })
        .limit(1)
      if (error) throw error
      const v = data?.[0]?.value
      const parsed = v ? parseFloat(v) : NaN
      return Number.isNaN(parsed) ? null : parsed
    },
  })

  // Pull fresh data every time the home screen regains focus (e.g. user
  // switches back from the calendar after logging something).
  useFocusEffect(
    useCallback(() => {
      void refetchTodayLogs()
      void refetchWeight()
    }, [refetchTodayLogs, refetchWeight]),
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
      queryClient.invalidateQueries({ queryKey: ['pregnancy-latest-weight', userId] })
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
    return <View style={[styles.root, { backgroundColor: bg }]} />
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: bg }]}
      contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: bottomInset }}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting — a caregiver sees a scoped identity header ("Caring for …" +
          role badge + caregiver child switcher) instead of the owner greeting. */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        {caregiverView ? (
          <CaregiverIdentityHeader />
        ) : (
          <HomeGreeting
            name={displayName}
            microLabel={t('pregnancy_weekDay', { week: weekNumber, weekday: weekdayLabel })}
          />
        )}
      </View>

      {/* 0. Essentials — pinned above everything for a caregiver. */}
      {caregiverView && caregiverView.visible.has('essentials') && activeChild?.id && (
        <View style={styles.section}>
          <EssentialsWalletCard
            childId={activeChild.id}
            ownerUserId={caregiverView.ownerUserId}
            showFull={caregiverView.showFullEssentials}
            pinned
          />
        </View>
      )}

      {/* 1. Hero Carousel — full-width, tappable */}
      {show('week-hero') && (
      <BabyHeroCarousel
        currentWeek={weekNumber}
        daysToGo={daysToGo}
        onPressWeek={handleHeroPress}
      />
      )}

      {/* 2. Daily Message */}
      {show('daily_message') && (
      <View style={styles.section}>
        <DailyMessageCard />
      </View>
      )}

      {/* 3. Quick-log launcher — standalone, customizable. No eyebrow above it:
          the card's own "Log for today" title heads the section (matches cycle). */}
      {show('today_summary') && (
      <View style={styles.section}>
        <TodaySummaryCard
          todayLogs={todayLogs}
          weekNumber={weekNumber}
          userId={userId}
          onLogMetric={readOnly ? undefined : (type) => setActiveLog(type as InlineLogType)}
        />
      </View>
      )}

      {/* 4. Week Wallet — collapsible stack. Heading is a real display-font
          title (same size/weight as the "Log for today" card title) rather than
          a small mono eyebrow, matching the kids home. */}
      {walletHasVisibleCard && (
      <View style={styles.section}>
        {diffuse ? (
          <Text style={{ marginBottom: 12, fontFamily: diffuseFont.display, fontSize: 22, letterSpacing: -0.3, color: dt.colors.ink }}>
            {t('home_wallet_label')}
          </Text>
        ) : (
          <Display size={22} style={{ marginBottom: 12 }}>{t('home_wallet_label')}</Display>
        )}
        <WeekWallet
          weekNumber={weekNumber}
          todayLogs={todayLogs}
          userId={userId}
          onLogMetric={readOnly ? undefined : (type) => setActiveLog(type as InlineLogType)}
          onOpenAppointment={(appt) => setApptDetail(appt)}
          onOpenWeekDetail={() => {
            setDetailWeek(weekNumber)
            setWeekDetailVisible(true)
          }}
          onOpenBirthGuide={() => setBirthGuideVisible(true)}
          visibleCardIds={caregiverView?.visible ?? null}
        />
      </View>
      )}

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
})
