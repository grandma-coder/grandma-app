/**
 * B3 — Pregnancy Onboarding Flow
 *
 * 7-step internal stepper + completion screen.
 * Uses OnboardingStep wrapper for consistent UI.
 * Saves answers to Supabase pregnancy_logs, behaviors, and profiles.
 */

import { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router } from 'expo-router'
import { Heart } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { OnboardingStep, OnboardingNavProvider } from '../../../components/onboarding/OnboardingStep'
import { useTheme, brand } from '../../../constants/theme'
import {
  usePregnancyOnboardingStore,
  type BirthPlace,
  type PregnancyMood,
} from '../../../store/usePregnancyOnboardingStore'
import { usePregnancyStore } from '../../../store/usePregnancyStore'
import { useOnboardingComplete } from '../../../hooks/useOnboardingComplete'
import { supabase } from '../../../lib/supabase'
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
  const due = new Date(dueDateStr)
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const week = 40 - Math.floor(daysLeft / 7)
  return Math.max(1, Math.min(42, week))
}

function daysUntil(dueDateStr: string): number {
  const due = new Date(dueDateStr)
  const now = new Date()
  return Math.max(0, Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function PregnancyOnboarding() {
  const store = usePregnancyOnboardingStore()
  const pregnancyStore = usePregnancyStore()
  const { handleComplete: onboardingComplete } = useOnboardingComplete()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios')

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

  async function saveAndFinish() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return onboardingComplete()

      const userId = session.user.id

      // Update profile with conditions/allergies if provided
      if (store.conditionsText) {
        await supabase.from('profiles').upsert(
          {
            id: userId,
            health_notes: store.conditionsText,
          },
          { onConflict: 'id' }
        )
      }

      // Create pregnancy behavior
      await supabase.from('behaviors').insert({
        user_id: userId,
        type: 'pregnancy',
        active: true,
      })

      // Save due date + initial data as pregnancy logs
      if (store.dueDate) {
        const logs = [
          {
            user_id: userId,
            date: new Date().toISOString().split('T')[0],
            type: 'note' as const,
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

        // Save initial mood if selected
        if (store.mood) {
          logs.push({
            user_id: userId,
            date: new Date().toISOString().split('T')[0],
            type: 'mood' as const,
            value: store.mood,
            notes: null as any,
          })
        }

        await supabase.from('pregnancy_logs').insert(logs)

        // Also set pregnancy store for immediate use in the app
        pregnancyStore.setDueDate(store.dueDate)
        pregnancyStore.setWeekNumber(calcWeekNumber(store.dueDate))
        if (store.mood) {
          pregnancyStore.setMood(store.mood as any)
        }

        // Seed 14 days of sample data in background — never blocks onboarding
        const seedWeek = calcWeekNumber(store.dueDate)
        seedPregnancyData(userId, seedWeek, store.dueDate).catch(console.warn)
      }
    } catch (e) {
      console.warn('Failed to save pregnancy onboarding:', e)
    }

    store.clearAll()
    onboardingComplete()
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
          showPicker={showDatePicker}
          setShowPicker={setShowDatePicker}
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
  showPicker,
  setShowPicker,
  onContinue,
}: {
  step: number
  showPicker: boolean
  setShowPicker: (v: boolean) => void
  onContinue: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const dueDate = usePregnancyOnboardingStore((s) => s.dueDate)
  const setDueDate = usePregnancyOnboardingStore((s) => s.setDueDate)

  // Default to ~6 months from now for picker initial value
  const defaultDate = new Date()
  defaultDate.setMonth(defaultDate.getMonth() + 6)
  const dateValue = dueDate ? new Date(dueDate) : defaultDate

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      question="When is your due date?"
      onContinue={onContinue}
      continueDisabled={!dueDate}
    >
      <View style={stepStyles.centered}>
        {Platform.OS === 'android' && !showPicker && (
          <Pressable
            onPress={() => setShowPicker(true)}
            style={[
              stepStyles.dateButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
              },
            ]}
          >
            <Text
              style={[
                stepStyles.dateButtonText,
                { color: dueDate ? colors.text : colors.textMuted },
              ]}
            >
              {dueDate
                ? new Date(dueDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Tap to select your due date'}
            </Text>
          </Pressable>
        )}
        {showPicker && (
          <DateTimePicker
            value={dateValue}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            maximumDate={(() => {
              const d = new Date()
              d.setMonth(d.getMonth() + 10)
              return d
            })()}
            onChange={(_, selected) => {
              if (Platform.OS === 'android') setShowPicker(false)
              if (selected) setDueDate(selected.toISOString().split('T')[0])
            }}
            themeVariant={isDark ? 'dark' : 'light'}
          />
        )}

        {/* Week indicator */}
        {dueDate && (
          <View
            style={[
              stepStyles.weekBadge,
              { backgroundColor: colors.primaryTint, borderRadius: radius.lg },
            ]}
          >
            <Text style={[stepStyles.weekBadgeText, { color: colors.primary }]}>
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
  const first = usePregnancyOnboardingStore((s) => s.firstPregnancy)
  const setFirst = usePregnancyOnboardingStore((s) => s.setFirstPregnancy)

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      question="Is this your first pregnancy?"
      onContinue={onContinue}
      continueDisabled={first === null}
    >
      <View style={stepStyles.toggleRow}>
        <TogglePill label="Yes" active={first === true} onPress={() => setFirst(true)} />
        <TogglePill label="No" active={first === false} onPress={() => setFirst(false)} />
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
  const { colors, radius } = useTheme()
  const mood = usePregnancyOnboardingStore((s) => s.mood)
  const setMood = usePregnancyOnboardingStore((s) => s.setMood)

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      question="How are you feeling right now?"
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
                  backgroundColor: selected ? colors.primaryTint : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                  borderRadius: radius.lg,
                },
              ]}
            >
              <Text style={stepStyles.moodEmoji}>{opt.emoji}</Text>
              <Text
                style={[
                  stepStyles.moodLabel,
                  { color: selected ? colors.primary : colors.textSecondary },
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
  const { colors, radius } = useTheme()
  const place = usePregnancyOnboardingStore((s) => s.birthPlace)
  const setPlace = usePregnancyOnboardingStore((s) => s.setBirthPlace)

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      question="Where are you planning to give birth?"
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
                  backgroundColor: selected ? colors.primaryTint : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text
                style={[
                  stepStyles.placeChipText,
                  { color: selected ? colors.primary : colors.text },
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
  const { colors, radius } = useTheme()
  const provider = usePregnancyOnboardingStore((s) => s.careProvider)
  const setProvider = usePregnancyOnboardingStore((s) => s.setCareProvider)

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      question="Who is your care provider?"
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <TextInput
        value={provider ?? ''}
        onChangeText={setProvider}
        placeholder="e.g. Dr. Sarah Mitchell"
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
  const { colors, radius } = useTheme()
  const conditions = usePregnancyOnboardingStore((s) => s.conditionsText)
  const setConditions = usePregnancyOnboardingStore((s) => s.setConditionsText)

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      question="Any conditions or allergies we should know?"
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <TextInput
        value={conditions ?? ''}
        onChangeText={setConditions}
        placeholder="e.g. Gestational diabetes, penicillin allergy..."
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
  const { colors, radius } = useTheme()
  const partner = usePregnancyOnboardingStore((s) => s.partnerName)
  const setPartner = usePregnancyOnboardingStore((s) => s.setPartnerName)

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      question="Want to add your partner?"
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <TextInput
        value={partner ?? ''}
        onChangeText={setPartner}
        placeholder="Partner's name"
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
  const { colors, radius } = useTheme()

  const days = dueDate ? daysUntil(dueDate) : null
  const week = dueDate ? calcWeekNumber(dueDate) : null

  return (
    <View style={[completeStyles.root, { backgroundColor: colors.bg }]}>
      <View style={completeStyles.content}>
        <View
          style={[completeStyles.iconCircle, { backgroundColor: brand.pregnancy + '20' }]}
        >
          <Heart size={40} color={brand.pregnancy} strokeWidth={2} fill={brand.pregnancy} />
        </View>

        <Text style={[completeStyles.title, { color: colors.text }]}>
          Congratulations!
        </Text>

        <Text style={[completeStyles.message, { color: colors.textSecondary }]}>
          What an incredible journey you're on. Grandma will be right here with you
          every step of the way.
        </Text>

        {dueDate && days !== null && week !== null && (
          <View
            style={[
              completeStyles.countdownCard,
              { backgroundColor: colors.surfaceRaised, borderRadius: radius.xl },
            ]}
          >
            <Text style={[completeStyles.countdownDays, { color: colors.primary }]}>
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
              backgroundColor: colors.primary,
              borderRadius: radius.lg,
            },
            pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
          ]}
        >
          <Text style={completeStyles.buttonText}>Let's Go</Text>
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
  const { colors, radius } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      style={[
        stepStyles.togglePill,
        {
          backgroundColor: active ? colors.primaryTint : colors.surface,
          borderColor: active ? colors.primary : colors.border,
          borderRadius: radius.lg,
        },
      ]}
    >
      <Text
        style={[
          stepStyles.togglePillText,
          { color: active ? colors.primary : colors.textSecondary },
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
    borderWidth: 1,
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
    borderWidth: 1,
    gap: 6,
  },
  moodEmoji: {
    fontSize: 32, fontFamily: 'Fraunces_600SemiBold' },
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
    borderWidth: 1,
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
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
})
