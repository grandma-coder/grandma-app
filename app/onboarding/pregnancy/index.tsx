/**
 * B3 — Pregnancy Onboarding Flow
 *
 * 7-step internal stepper + completion screen.
 * Uses OnboardingStep wrapper for consistent UI.
 * Saves answers to Supabase pregnancy_logs, behaviors, and profiles.
 */

import { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native'
import DatePickerField from '../../../components/ui/DatePickerField'
import { router } from 'expo-router'
import { Heart as HeartIcon } from 'lucide-react-native'
import { Heart, Star, Moon, Sun, Flower, Cloud } from '../../../components/ui/Stickers'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { OnboardingStep, OnboardingNavProvider } from '../../../components/onboarding/OnboardingStep'
import { useTheme, brand, stickers, getModeColor, getModeColorSoft } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import {
  usePregnancyOnboardingStore,
  type BirthPlace,
  type PregnancyMood,
} from '../../../store/usePregnancyOnboardingStore'
import { useCycleOnboardingStore } from '../../../store/useCycleOnboardingStore'
import { usePregnancyStore, type MoodType } from '../../../store/usePregnancyStore'
import { useJourneyStore } from '../../../store/useJourneyStore'
import { useBehaviorStore } from '../../../store/useBehaviorStore'
import { isDevModeActive } from '../../../store/useDevStore'
import { useOnboardingComplete } from '../../../hooks/useOnboardingComplete'
import { supabase } from '../../../lib/supabase'
import { toDateStr } from '../../../lib/cycleLogic'
import { seedPregnancyData } from '../../../lib/pregnancySeeds'

// ─── Constants ─────────────────────────────────────────────────────────────

const TOTAL_STEPS = 7

type StepId =
  | 'due_date'
  | 'first_pregnancy'
  | 'mood'
  | 'birth_place'
  | 'care_provider'
  | 'conditions'
  | 'partner'
  | 'complete'

const STEPS: StepId[] = [
  'due_date',
  'first_pregnancy',
  'mood',
  'birth_place',
  'care_provider',
  'conditions',
  'partner',
  'complete',
]

const MOOD_OPTIONS: { id: PregnancyMood; emoji: string; label: string }[] = [
  { id: 'excited', emoji: '🤩', label: 'Excited' },
  { id: 'happy', emoji: '😊', label: 'Happy' },
  { id: 'calm', emoji: '😌', label: 'Calm' },
  { id: 'anxious', emoji: '😰', label: 'Anxious' },
  { id: 'tired', emoji: '😴', label: 'Tired' },
  { id: 'nauseous', emoji: '🤢', label: 'Nauseous' },
]

const BIRTH_PLACE_OPTIONS: { id: BirthPlace; label: string }[] = [
  { id: 'hospital', label: 'Hospital' },
  { id: 'birth_center', label: 'Birth center' },
  { id: 'home_birth', label: 'Home birth' },
  { id: 'undecided', label: 'Undecided' },
]

// ─── Helpers ───────────────────────────────────────────────────────────────

function calcWeekNumber(dueDateStr: string): number {
  const due = new Date(dueDateStr + 'T00:00:00')
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const week = 40 - Math.ceil(daysLeft / 7)
  return Math.max(1, Math.min(42, week))
}

function daysUntil(dueDateStr: string): number {
  const due = new Date(dueDateStr + 'T00:00:00')
  const now = new Date()
  return Math.max(0, Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function PregnancyOnboarding() {
  const store = usePregnancyOnboardingStore()
  const pregnancyStore = usePregnancyStore()
  const { handleComplete: onboardingComplete } = useOnboardingComplete()
  const { t } = useTranslation()

  const [currentIndex, setCurrentIndex] = useState(0)

  const currentStep = STEPS[currentIndex]

  const goNext = useCallback(() => {
    if (currentIndex < STEPS.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }, [currentIndex])

  const goSkip = useCallback(() => {
    goNext()
  }, [goNext])

  const goBack = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }, [currentIndex])

  const handleClose = useCallback(() => {
    store.clearAll()
    router.back()
  }, [])

  // ─── Save to Supabase ──────────────────────────────────────────────────

  async function saveAndFinish(): Promise<void> {
    // Dev mode: dry run — no DB writes, no persisted-store mutations.
    if (isDevModeActive()) {
      store.clearAll()
      return onboardingComplete('pregnancy')
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return onboardingComplete('pregnancy')

    const userId = session.user.id
    const parentName = useJourneyStore.getState().parentName ?? null

    // ── 1. Profile: journey mode + parent name + optional health notes. ──
    const profilePayload: Record<string, unknown> = {
      id: userId,
      journey_mode: 'pregnancy',
    }
    if (parentName) profilePayload.name = parentName
    if (store.conditionsText) profilePayload.health_notes = store.conditionsText
    if (store.dueDate) profilePayload.due_date = store.dueDate
    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
    if (profileErr) console.warn('[onboarding] profile upsert failed:', profileErr.message)

    // ── 2. REQUIRED: pregnancy behavior row. Block on failure. ───────────
    useBehaviorStore.getState().enroll('pregnancy')
    const { error: behaviorErr } = await supabase.from('behaviors').upsert(
      {
        user_id: userId,
        type: 'pregnancy',
        active: true,
      },
      { onConflict: 'user_id,type' }
    )
    if (behaviorErr) {
      Alert.alert(
        t('preg_onboard_errorTitle'),
        t('preg_onboard_errorBehavior', { message: behaviorErr.message })
      )
      return
    }

    // ── 3. REQUIRED: due-date note + optional mood. Block on failure. ────
    if (store.dueDate) {
      const today = toDateStr(new Date())
      type PregLogRow = {
        user_id: string
        log_date: string
        log_type: 'note' | 'mood'
        value: string | null
        notes: string | null
      }
      const logs: PregLogRow[] = [
        {
          user_id: userId,
          log_date: today,
          log_type: 'note',
          value: 'onboarding',
          notes: JSON.stringify({
            dueDate: store.dueDate,
            firstPregnancy: store.firstPregnancy,
            birthPlace: store.birthPlace,
            careProvider: store.careProvider,
            partnerName: store.partnerName,
            weekNumber: calcWeekNumber(store.dueDate),
          }),
        },
      ]

      if (store.mood) {
        logs.push({
          user_id: userId,
          log_date: today,
          log_type: 'mood',
          value: store.mood,
          notes: null,
        })
      }

      const { error: logsErr } = await supabase.from('pregnancy_logs').insert(logs)
      if (logsErr) {
        Alert.alert(
          t('preg_onboard_errorTitle'),
          t('preg_onboard_errorDueDate', { message: logsErr.message })
        )
        return
      }

      // Local stores (safe — DB persistence already confirmed above).
      pregnancyStore.setDueDate(store.dueDate)
      pregnancyStore.setWeekNumber(calcWeekNumber(store.dueDate))
      if (store.mood) {
        pregnancyStore.setMood(store.mood as MoodType)
      }

      // Seed 14 days of sample data in background — never blocks onboarding.
      const seedWeek = calcWeekNumber(store.dueDate)
      seedPregnancyData(userId, seedWeek, store.dueDate).catch(console.warn)
    }

    store.clearAll()
    onboardingComplete('pregnancy')
  }


  // ─── Render ──────────────────────────────────────────────────────────────

  if (currentStep === 'complete') {
    return <CompletionScreen dueDate={store.dueDate} onFinish={saveAndFinish} />
  }

  return (
    <OnboardingNavProvider onBack={currentIndex > 0 ? goBack : undefined} onClose={handleClose}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {currentStep === 'due_date' && (
        <StepDueDate
          step={1}
          onContinue={goNext}
        />
      )}
      {currentStep === 'first_pregnancy' && (
        <StepFirstPregnancy step={2} onContinue={goNext} />
      )}
      {currentStep === 'mood' && (
        <StepMood step={3} onContinue={goNext} onSkip={goSkip} />
      )}
      {currentStep === 'birth_place' && (
        <StepBirthPlace step={4} onContinue={goNext} onSkip={goSkip} />
      )}
      {currentStep === 'care_provider' && (
        <StepCareProvider step={5} onContinue={goNext} onSkip={goSkip} />
      )}
      {currentStep === 'conditions' && (
        <StepConditions step={6} onContinue={goNext} onSkip={goSkip} />
      )}
      {currentStep === 'partner' && (
        <StepPartner step={7} onContinue={goNext} onSkip={goSkip} />
      )}
    </KeyboardAvoidingView>
    </OnboardingNavProvider>
  )
}

// ─── STEP 1: Due Date ──────────────────────────────────────────────────────

function StepDueDate({
  step,
  onContinue,
}: {
  step: number
  onContinue: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const { t } = useTranslation()
  const mode = getModeColor('pregnancy', isDark)
  const modeSoft = getModeColorSoft('pregnancy', isDark)
  const dueDate = usePregnancyOnboardingStore((s) => s.dueDate)
  const setDueDate = usePregnancyOnboardingStore((s) => s.setDueDate)

  // If the user ran pre-preg onboarding first and entered an LMP, derive the
  // expected due date (LMP + 280 days) and pre-populate the picker. Skipped
  // when the user has already typed a due date this session.
  useEffect(() => {
    if (dueDate) return
    const lmp = useCycleOnboardingStore.getState().lastPeriodDate
    if (!lmp) return
    const lmpDate = new Date(lmp + 'T00:00:00')
    if (isNaN(lmpDate.getTime())) return
    lmpDate.setDate(lmpDate.getDate() + 280)
    setDueDate(toDateStr(lmpDate))
  }, [dueDate, setDueDate])

  const maxDue = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 10)
    return d
  })()

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      question={t('preg_onboard_step_dueDate')}
      sticker={<Heart size={56} fill={stickers.lilac} />}
      onContinue={onContinue}
      continueDisabled={!dueDate}
    >
      <View style={stepStyles.centered}>
        <DatePickerField
          inline
          label=""
          value={dueDate || ''}
          onChange={setDueDate}
          placeholder="Tap to select your due date"
          modalTitle="Due date"
          minimumDate={new Date()}
          maximumDate={maxDue}
        />

        {/* Week indicator */}
        {dueDate && (
          <View
            style={[
              stepStyles.weekBadge,
              { backgroundColor: modeSoft, borderRadius: radius.lg },
            ]}
          >
            <Text style={[stepStyles.weekBadgeText, { color: mode }]}>
              You're at week {calcWeekNumber(dueDate)} — {daysUntil(dueDate)} days to go!
            </Text>
          </View>
        )}
      </View>
    </OnboardingStep>
  )
}

// ─── STEP 2: First Pregnancy ───────────────────────────────────────────────

function StepFirstPregnancy({
  step,
  onContinue,
}: {
  step: number
  onContinue: () => void
}) {
  const { t } = useTranslation()
  const first = usePregnancyOnboardingStore((s) => s.firstPregnancy)
  const setFirst = usePregnancyOnboardingStore((s) => s.setFirstPregnancy)

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      question={t('preg_onboard_step_firstPregnancy')}
      sticker={<Star size={52} fill={stickers.yellow} />}
      onContinue={onContinue}
      continueDisabled={first === null}
    >
      <View style={stepStyles.toggleRow}>
        <TogglePill label={t('preg_onboard_yes')} active={first === true} onPress={() => setFirst(true)} />
        <TogglePill label={t('preg_onboard_no')} active={first === false} onPress={() => setFirst(false)} />
      </View>
    </OnboardingStep>
  )
}

// ─── STEP 3: Mood ──────────────────────────────────────────────────────────

function StepMood({
  step,
  onContinue,
  onSkip,
}: {
  step: number
  onContinue: () => void
  onSkip: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const { t } = useTranslation()
  const mode = getModeColor('pregnancy', isDark)
  const modeSoft = getModeColorSoft('pregnancy', isDark)
  const mood = usePregnancyOnboardingStore((s) => s.mood)
  const setMood = usePregnancyOnboardingStore((s) => s.setMood)

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      question={t('preg_onboard_step_mood')}
      sticker={<Sun size={56} fill={stickers.peach} />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <View style={stepStyles.moodGrid}>
        {MOOD_OPTIONS.map((opt) => {
          const selected = mood === opt.id
          return (
            <Pressable
              key={opt.id}
              onPress={() => setMood(opt.id)}
              style={[
                stepStyles.moodCard,
                {
                  backgroundColor: selected ? modeSoft : colors.surface,
                  borderColor: selected ? mode : colors.text,
                  shadowColor: colors.text,
                  borderRadius: radius.lg,
                },
              ]}
            >
              <Text style={stepStyles.moodEmoji}>{opt.emoji}</Text>
              <Text
                style={[
                  stepStyles.moodLabel,
                  { color: selected ? mode : colors.textSecondary },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </OnboardingStep>
  )
}

// ─── STEP 4: Birth Place ───────────────────────────────────────────────────

function StepBirthPlace({
  step,
  onContinue,
  onSkip,
}: {
  step: number
  onContinue: () => void
  onSkip: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const { t } = useTranslation()
  const mode = getModeColor('pregnancy', isDark)
  const modeSoft = getModeColorSoft('pregnancy', isDark)
  const place = usePregnancyOnboardingStore((s) => s.birthPlace)
  const setPlace = usePregnancyOnboardingStore((s) => s.setBirthPlace)

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      question={t('preg_onboard_step_birthPlace')}
      sticker={<Cloud size={64} fill={stickers.blue} />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <View style={stepStyles.chipGrid}>
        {BIRTH_PLACE_OPTIONS.map((opt) => {
          const selected = place === opt.id
          return (
            <Pressable
              key={opt.id}
              onPress={() => setPlace(opt.id)}
              style={[
                stepStyles.placeChip,
                {
                  backgroundColor: selected ? modeSoft : colors.surface,
                  borderColor: selected ? mode : colors.text,
                  shadowColor: colors.text,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text
                style={[
                  stepStyles.placeChipText,
                  { color: selected ? mode : colors.text },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </OnboardingStep>
  )
}

// ─── STEP 5: Care Provider ─────────────────────────────────────────────────

function StepCareProvider({
  step,
  onContinue,
  onSkip,
}: {
  step: number
  onContinue: () => void
  onSkip: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const { t } = useTranslation()
  const mode = getModeColor('pregnancy', isDark)
  const modeSoft = getModeColorSoft('pregnancy', isDark)
  const provider = usePregnancyOnboardingStore((s) => s.careProvider)
  const setProvider = usePregnancyOnboardingStore((s) => s.setCareProvider)

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      question={t('preg_onboard_step_careProvider')}
      sticker={<Flower size={56} petal={stickers.lilac} center={stickers.yellow} />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <TextInput
        value={provider ?? ''}
        onChangeText={setProvider}
        placeholder={t('preg_onboard_careProviderPlaceholder')}
        placeholderTextColor={colors.textMuted}
        style={[
          stepStyles.textInput,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
        autoCapitalize="words"
      />
    </OnboardingStep>
  )
}

// ─── STEP 6: Conditions ────────────────────────────────────────────────────

function StepConditions({
  step,
  onContinue,
  onSkip,
}: {
  step: number
  onContinue: () => void
  onSkip: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const { t } = useTranslation()
  const mode = getModeColor('pregnancy', isDark)
  const modeSoft = getModeColorSoft('pregnancy', isDark)
  const conditions = usePregnancyOnboardingStore((s) => s.conditionsText)
  const setConditions = usePregnancyOnboardingStore((s) => s.setConditionsText)

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      question={t('preg_onboard_step_conditions')}
      sticker={<Moon size={52} fill={stickers.lilac} />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <TextInput
        value={conditions ?? ''}
        onChangeText={setConditions}
        placeholder={t('preg_onboard_conditionsPlaceholder')}
        placeholderTextColor={colors.textMuted}
        multiline
        style={[
          stepStyles.textArea,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      />
    </OnboardingStep>
  )
}

// ─── STEP 7: Partner ───────────────────────────────────────────────────────

function StepPartner({
  step,
  onContinue,
  onSkip,
}: {
  step: number
  onContinue: () => void
  onSkip: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const { t } = useTranslation()
  const mode = getModeColor('pregnancy', isDark)
  const modeSoft = getModeColorSoft('pregnancy', isDark)
  const partner = usePregnancyOnboardingStore((s) => s.partnerName)
  const setPartner = usePregnancyOnboardingStore((s) => s.setPartnerName)

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      question={t('preg_onboard_step_partner')}
      sticker={<Heart size={56} fill={stickers.pink} />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <TextInput
        value={partner ?? ''}
        onChangeText={setPartner}
        placeholder={t('preg_onboard_partnerNamePlaceholder')}
        placeholderTextColor={colors.textMuted}
        style={[
          stepStyles.textInput,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
        autoCapitalize="words"
      />
      <Text style={[stepStyles.hint, { color: colors.textMuted }]}>
        They'll be able to follow along and get updates too.
      </Text>
    </OnboardingStep>
  )
}

// ─── Completion Screen ─────────────────────────────────────────────────────

function CompletionScreen({
  dueDate,
  onFinish,
}: {
  dueDate: string | null
  onFinish: () => void
}) {
  const insets = useSafeAreaInsets()
  const { colors, radius, isDark } = useTheme()
  const { t } = useTranslation()
  const mode = getModeColor('pregnancy', isDark)
  const modeSoft = getModeColorSoft('pregnancy', isDark)

  const days = dueDate ? daysUntil(dueDate) : null
  const week = dueDate ? calcWeekNumber(dueDate) : null

  return (
    <View style={[completeStyles.root, { backgroundColor: colors.bg }]}>
      <View style={completeStyles.content}>
        <View
          style={[completeStyles.iconCircle, { backgroundColor: brand.pregnancy + '20' }]}
        >
          <HeartIcon size={40} color={brand.pregnancy} strokeWidth={2} fill={brand.pregnancy} />
        </View>

        <Text style={[completeStyles.title, { color: colors.text }]}>
          {t('preg_onboard_completionTitle')}
        </Text>

        <Text style={[completeStyles.message, { color: colors.textSecondary }]}>
          {t('preg_onboard_completionBody')}
        </Text>

        {dueDate && days !== null && week !== null && (
          <View
            style={[
              completeStyles.countdownCard,
              { backgroundColor: colors.surfaceRaised, borderRadius: radius.xl },
            ]}
          >
            <Text style={[completeStyles.countdownDays, { color: mode }]}>
              {days}
            </Text>
            <Text style={[completeStyles.countdownLabel, { color: colors.textSecondary }]}>
              days until you meet your little one
            </Text>
            <Text style={[completeStyles.countdownWeek, { color: colors.textMuted }]}>
              Currently at week {week}
            </Text>
          </View>
        )}
      </View>

      <View style={[completeStyles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={onFinish}
          style={({ pressed }) => [
            completeStyles.button,
            {
              backgroundColor: brand.pregnancy,
              borderRadius: radius.full,
            },
            pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
          ]}
        >
          <Text style={[completeStyles.buttonText, { color: colors.bg }]}>Let's Go</Text>
        </Pressable>
      </View>
    </View>
  )
}

// ─── Toggle Pill (reusable) ────────────────────────────────────────────────

function TogglePill({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const { t } = useTranslation()
  const mode = getModeColor('pregnancy', isDark)
  const modeSoft = getModeColorSoft('pregnancy', isDark)

  return (
    <Pressable
      onPress={onPress}
      style={[
        stepStyles.togglePill,
        {
          backgroundColor: active ? modeSoft : colors.surface,
          borderColor: active ? mode : colors.text,
          shadowColor: colors.text,
          borderRadius: radius.full,
        },
      ]}
    >
      <Text
        style={[
          stepStyles.togglePillText,
          { color: active ? mode : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const stepStyles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    gap: 20,
  },
  dateButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderWidth: 1,
    width: '100%',
  },
  dateButtonText: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  weekBadge: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  weekBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  togglePill: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  togglePillText: {
    fontSize: 16,
    fontWeight: '700',
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moodCard: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderWidth: 2,
    gap: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  moodEmoji: {
    fontSize: 32 },
  moodLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  placeChip: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  placeChipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    paddingHorizontal: 20,
    height: 56,
    fontSize: 16,
    fontWeight: '500',
  },
  textArea: {
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
    fontWeight: '500',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 12,
    lineHeight: 18,
  },
})

const completeStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5, fontFamily: 'Fraunces_600SemiBold' },
  message: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
  },
  countdownCard: {
    alignItems: 'center',
    padding: 24,
    marginTop: 8,
    width: '100%',
    gap: 4,
  },
  countdownDays: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -2, fontFamily: 'Fraunces_600SemiBold' },
  countdownLabel: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  countdownWeek: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  bottom: {
    paddingHorizontal: 24,
  },
  button: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
})
