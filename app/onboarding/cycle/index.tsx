/**
 * B2 — Cycle Tracking Onboarding Flow
 *
 * Internal stepper: 5 base steps + 3 optional TTC steps + completion.
 * Uses OnboardingStep wrapper for consistent UI.
 * Saves answers to Supabase profiles + behaviors table at the end.
 */

import { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native'
import DatePickerField from '../../../components/ui/DatePickerField'
import { router } from 'expo-router'
import { Sparkles } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { OnboardingStep, OnboardingNavProvider } from '../../../components/onboarding/OnboardingStep'
import { useTheme, brand } from '../../../constants/theme'
import {
  useCycleOnboardingStore,
  type ConditionChip,
  type TryingDuration,
  type TempUnit,
} from '../../../store/useCycleOnboardingStore'
import { supabase } from '../../../lib/supabase'
import { useOnboardingComplete } from '../../../hooks/useOnboardingComplete'

// ─── Step IDs ──────────────────────────────────────────────────────────────

type StepId =
  | 'last_period'
  | 'cycle_length'
  | 'period_duration'
  | 'conditions'
  | 'temp_unit'
  // TTC extras
  | 'ttc_duration'
  | 'ttc_temperature'
  | 'ttc_supplements'
  // Done
  | 'complete'

function getSteps(ttc: boolean): StepId[] {
  const base: StepId[] = [
    'last_period',
    'cycle_length',
    'period_duration',
    'conditions',
    'temp_unit',
  ]
  if (ttc) {
    return [...base, 'ttc_duration', 'ttc_temperature', 'ttc_supplements', 'complete']
  }
  return [...base, 'complete']
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function CycleOnboarding() {
  const store = useCycleOnboardingStore()
  const { handleComplete: onboardingComplete } = useOnboardingComplete()

  const [currentIndex, setCurrentIndex] = useState(0)

  const steps = getSteps(store.tryingToConceive)
  const currentStep = steps[currentIndex]
  const totalSteps = steps.length - 1 // exclude 'complete' from count

  const goNext = useCallback(() => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }, [currentIndex, steps.length])

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

      // Update profile with cycle preferences
      await supabase.from('profiles').upsert({
        id: userId,
      }, { onConflict: 'id' })

      // Create behavior record
      await supabase.from('behaviors').insert({
        user_id: userId,
        type: 'cycle',
        active: true,
      })

      // Create initial cycle log if we have a last period date
      if (store.lastPeriodDate) {
        await supabase.from('cycle_logs').insert({
          user_id: userId,
          date: store.lastPeriodDate,
          type: 'period_start',
          value: store.periodDuration?.toString() ?? '5',
          notes: JSON.stringify({
            cycleLength: store.cycleLength,
            conditions: store.conditions,
            tempUnit: store.tempUnit,
            tryingToConceive: store.tryingToConceive,
            tryingDuration: store.tryingDuration,
            trackingTemperature: store.trackingTemperature,
            supplements: store.supplements,
          }),
        })
      }
    } catch (e) {
      // Non-blocking — user can still proceed
      console.warn('Failed to save cycle onboarding:', e)
    }

    store.clearAll()
    onboardingComplete()
  }

  // ─── Render current step ────────────────────────────────────────────────

  if (currentStep === 'complete') {
    return (
      <CompletionScreen
        onFinish={saveAndFinish}
      />
    )
  }

  return (
    <OnboardingNavProvider onBack={currentIndex > 0 ? goBack : undefined} onClose={handleClose}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {currentStep === 'last_period' && (
        <StepLastPeriod
          step={currentIndex + 1}
          total={totalSteps}
          onContinue={goNext}
          onSkip={goSkip}
        />
      )}
      {currentStep === 'cycle_length' && (
        <StepCycleLength
          step={currentIndex + 1}
          total={totalSteps}
          onContinue={goNext}
        />
      )}
      {currentStep === 'period_duration' && (
        <StepPeriodDuration
          step={currentIndex + 1}
          total={totalSteps}
          onContinue={goNext}
        />
      )}
      {currentStep === 'conditions' && (
        <StepConditions
          step={currentIndex + 1}
          total={totalSteps}
          onContinue={goNext}
          onSkip={goSkip}
        />
      )}
      {currentStep === 'temp_unit' && (
        <StepTempUnit
          step={currentIndex + 1}
          total={totalSteps}
          onContinue={goNext}
        />
      )}
      {currentStep === 'ttc_duration' && (
        <StepTTCDuration
          step={currentIndex + 1}
          total={totalSteps}
          onContinue={goNext}
          onSkip={goSkip}
        />
      )}
      {currentStep === 'ttc_temperature' && (
        <StepTTCTemperature
          step={currentIndex + 1}
          total={totalSteps}
          onContinue={goNext}
        />
      )}
      {currentStep === 'ttc_supplements' && (
        <StepTTCSupplements
          step={currentIndex + 1}
          total={totalSteps}
          onContinue={goNext}
          onSkip={goSkip}
        />
      )}
    </KeyboardAvoidingView>
    </OnboardingNavProvider>
  )
}

// ─── STEP 1: Last Period Date ──────────────────────────────────────────────

function StepLastPeriod({
  step,
  total,
  onContinue,
  onSkip,
}: {
  step: number
  total: number
  onContinue: () => void
  onSkip: () => void
}) {
  const date = useCycleOnboardingStore((s) => s.lastPeriodDate)
  const setDate = useCycleOnboardingStore((s) => s.setLastPeriodDate)

  return (
    <OnboardingStep
      step={step}
      total={total}
      question="When did your last period start?"
      onContinue={onContinue}
      onSkip={onSkip}
      continueDisabled={!date}
    >
      <View style={stepStyles.centered}>
        <DatePickerField
          label=""
          value={date || ''}
          onChange={setDate}
          placeholder="Tap to select a date"
          modalTitle="Last period start"
          maximumDate={new Date()}
          minimumDate={new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)}
        />
      </View>
    </OnboardingStep>
  )
}

// ─── STEP 2: Cycle Length + TTC Toggle ─────────────────────────────────────

function StepCycleLength({
  step,
  total,
  onContinue,
}: {
  step: number
  total: number
  onContinue: () => void
}) {
  const { colors, radius } = useTheme()
  const cycleLength = useCycleOnboardingStore((s) => s.cycleLength)
  const unknown = useCycleOnboardingStore((s) => s.cycleLengthUnknown)
  const setCycleLength = useCycleOnboardingStore((s) => s.setCycleLength)
  const setUnknown = useCycleOnboardingStore((s) => s.setCycleLengthUnknown)
  const ttc = useCycleOnboardingStore((s) => s.tryingToConceive)
  const setTTC = useCycleOnboardingStore((s) => s.setTryingToConceive)

  return (
    <OnboardingStep
      step={step}
      total={total}
      question="How long is your usual cycle?"
      onContinue={onContinue}
    >
      <View style={stepStyles.inputRow}>
        {!unknown && (
          <View style={[stepStyles.numberInputWrap, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
            <TextInput
              value={cycleLength?.toString() ?? ''}
              onChangeText={(t) => {
                const n = parseInt(t, 10)
                setCycleLength(isNaN(n) ? null : Math.min(60, Math.max(1, n)))
              }}
              keyboardType="number-pad"
              maxLength={2}
              style={[stepStyles.numberInput, { color: colors.text }]}
              placeholderTextColor={colors.textMuted}
              placeholder="28"
            />
            <Text style={[stepStyles.unitLabel, { color: colors.textSecondary }]}>days</Text>
          </View>
        )}

        <Pressable
          onPress={() => setUnknown(!unknown)}
          style={[
            stepStyles.chip,
            {
              backgroundColor: unknown ? colors.primaryTint : colors.surface,
              borderColor: unknown ? colors.primary : colors.border,
              borderRadius: radius.lg,
            },
          ]}
        >
          <Text style={[stepStyles.chipText, { color: unknown ? colors.primary : colors.textSecondary }]}>
            I don't know
          </Text>
        </Pressable>
      </View>

      {/* TTC toggle */}
      <View style={[stepStyles.ttcCard, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
        <Text style={[stepStyles.ttcLabel, { color: colors.text }]}>
          Are you trying to conceive?
        </Text>
        <View style={stepStyles.toggleRow}>
          <TogglePill label="Yes" active={ttc} onPress={() => setTTC(true)} />
          <TogglePill label="No" active={!ttc} onPress={() => setTTC(false)} />
        </View>
      </View>
    </OnboardingStep>
  )
}

// ─── STEP 3: Period Duration ───────────────────────────────────────────────

function StepPeriodDuration({
  step,
  total,
  onContinue,
}: {
  step: number
  total: number
  onContinue: () => void
}) {
  const { colors, radius } = useTheme()
  const duration = useCycleOnboardingStore((s) => s.periodDuration)
  const setDuration = useCycleOnboardingStore((s) => s.setPeriodDuration)

  const options = [3, 4, 5, 6, 7, 8]

  return (
    <OnboardingStep
      step={step}
      total={total}
      question="How long does your period usually last?"
      onContinue={onContinue}
    >
      <View style={stepStyles.chipGrid}>
        {options.map((n) => (
          <Pressable
            key={n}
            onPress={() => setDuration(n)}
            style={[
              stepStyles.durationChip,
              {
                backgroundColor: duration === n ? colors.primaryTint : colors.surface,
                borderColor: duration === n ? colors.primary : colors.border,
                borderRadius: radius.lg,
              },
            ]}
          >
            <Text
              style={[
                stepStyles.durationChipText,
                { color: duration === n ? colors.primary : colors.text },
              ]}
            >
              {n} days
            </Text>
          </Pressable>
        ))}
      </View>
    </OnboardingStep>
  )
}

// ─── STEP 4: Conditions ────────────────────────────────────────────────────

const CONDITION_OPTIONS: { id: ConditionChip; label: string }[] = [
  { id: 'pcos', label: 'PCOS' },
  { id: 'endometriosis', label: 'Endometriosis' },
  { id: 'other', label: 'Other' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say' },
]

function StepConditions({
  step,
  total,
  onContinue,
  onSkip,
}: {
  step: number
  total: number
  onContinue: () => void
  onSkip: () => void
}) {
  const { colors, radius } = useTheme()
  const conditions = useCycleOnboardingStore((s) => s.conditions)
  const toggle = useCycleOnboardingStore((s) => s.toggleCondition)

  return (
    <OnboardingStep
      step={step}
      total={total}
      question="Any conditions we should know about?"
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <View style={stepStyles.chipGrid}>
        {CONDITION_OPTIONS.map((opt) => {
          const selected = conditions.includes(opt.id)
          return (
            <Pressable
              key={opt.id}
              onPress={() => toggle(opt.id)}
              style={[
                stepStyles.conditionChip,
                {
                  backgroundColor: selected ? colors.primaryTint : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text
                style={[
                  stepStyles.conditionChipText,
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

// ─── STEP 5: Temperature Unit ──────────────────────────────────────────────

function StepTempUnit({
  step,
  total,
  onContinue,
}: {
  step: number
  total: number
  onContinue: () => void
}) {
  const { colors, radius } = useTheme()
  const unit = useCycleOnboardingStore((s) => s.tempUnit)
  const setUnit = useCycleOnboardingStore((s) => s.setTempUnit)

  return (
    <OnboardingStep
      step={step}
      total={total}
      question="Temperature unit preference?"
      onContinue={onContinue}
    >
      <View style={stepStyles.toggleRow}>
        <TogglePill label="°C Celsius" active={unit === 'celsius'} onPress={() => setUnit('celsius')} />
        <TogglePill label="°F Fahrenheit" active={unit === 'fahrenheit'} onPress={() => setUnit('fahrenheit')} />
      </View>
    </OnboardingStep>
  )
}

// ─── TTC EXTRA 1: How Long Trying ─────────────────────────────────────────

const TTC_DURATION_OPTIONS: { id: TryingDuration; label: string }[] = [
  { id: 'just_starting', label: 'Just starting' },
  { id: 'few_months', label: 'A few months' },
  { id: 'over_a_year', label: 'Over a year' },
]

function StepTTCDuration({
  step,
  total,
  onContinue,
  onSkip,
}: {
  step: number
  total: number
  onContinue: () => void
  onSkip: () => void
}) {
  const { colors, radius } = useTheme()
  const duration = useCycleOnboardingStore((s) => s.tryingDuration)
  const setDuration = useCycleOnboardingStore((s) => s.setTryingDuration)

  return (
    <OnboardingStep
      step={step}
      total={total}
      question="How long have you been trying?"
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <View style={stepStyles.chipGrid}>
        {TTC_DURATION_OPTIONS.map((opt) => {
          const selected = duration === opt.id
          return (
            <Pressable
              key={opt.id}
              onPress={() => setDuration(opt.id)}
              style={[
                stepStyles.conditionChip,
                {
                  backgroundColor: selected ? colors.primaryTint : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text
                style={[
                  stepStyles.conditionChipText,
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

// ─── TTC EXTRA 2: Tracking Temperature ────────────────────────────────────

function StepTTCTemperature({
  step,
  total,
  onContinue,
}: {
  step: number
  total: number
  onContinue: () => void
}) {
  const tracking = useCycleOnboardingStore((s) => s.trackingTemperature)
  const setTracking = useCycleOnboardingStore((s) => s.setTrackingTemperature)

  return (
    <OnboardingStep
      step={step}
      total={total}
      question="Are you tracking your temperature each morning?"
      onContinue={onContinue}
    >
      <View style={stepStyles.toggleRow}>
        <TogglePill label="Yes" active={tracking === true} onPress={() => setTracking(true)} />
        <TogglePill label="Not yet" active={tracking === false} onPress={() => setTracking(false)} />
      </View>
    </OnboardingStep>
  )
}

// ─── TTC EXTRA 3: Supplements ──────────────────────────────────────────────

function StepTTCSupplements({
  step,
  total,
  onContinue,
  onSkip,
}: {
  step: number
  total: number
  onContinue: () => void
  onSkip: () => void
}) {
  const { colors, radius } = useTheme()
  const supplements = useCycleOnboardingStore((s) => s.supplements)
  const setSupplements = useCycleOnboardingStore((s) => s.setSupplements)

  return (
    <OnboardingStep
      step={step}
      total={total}
      question="Any supplements you're taking?"
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <TextInput
        value={supplements ?? ''}
        onChangeText={setSupplements}
        placeholder="e.g. Folic acid, Vitamin D, CoQ10..."
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

// ─── Completion Screen ─────────────────────────────────────────────────────

function CompletionScreen({ onFinish }: { onFinish: () => void }) {
  const insets = useSafeAreaInsets()
  const { colors, radius } = useTheme()

  return (
    <View style={[completeStyles.root, { backgroundColor: colors.bg }]}>
      <View style={completeStyles.content}>
        <View style={[completeStyles.iconCircle, { backgroundColor: colors.primaryTint }]}>
          <Sparkles size={40} color={colors.primary} strokeWidth={2} />
        </View>

        <Text style={[completeStyles.title, { color: colors.text }]}>
          You're all set!
        </Text>

        <Text style={[completeStyles.message, { color: colors.textSecondary }]}>
          Grandma's got everything she needs to guide you on this beautiful journey.
          Your cycle insights are being personalized just for you.
        </Text>
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
    justifyContent: 'center',
    flex: 1,
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
  inputRow: {
    gap: 16,
  },
  numberInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
    height: 64,
    gap: 8,
  },
  numberInput: {
    fontSize: 28,
    fontWeight: '800',
    width: 60,
    textAlign: 'center', fontFamily: 'Fraunces_600SemiBold' },
  unitLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  chip: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  durationChip: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  durationChipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  conditionChip: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  conditionChipText: {
    fontSize: 15,
    fontWeight: '600',
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
  ttcCard: {
    marginTop: 32,
    padding: 20,
    gap: 16,
  },
  ttcLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  textArea: {
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
    fontWeight: '500',
    minHeight: 120,
    textAlignVertical: 'top',
  },
})

const completeStyles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
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
