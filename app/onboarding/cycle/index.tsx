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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { OnboardingStep, OnboardingNavProvider } from '../../../components/onboarding/OnboardingStep'
import { Flower, Drop, Moon, Sun, Leaf, Heart } from '../../../components/ui/Stickers'
import { PillButton } from '../../../components/ui/PillButton'
import { useTheme, brand, stickers, getModeColor, getModeColorSoft } from '../../../constants/theme'
import {
  useCycleOnboardingStore,
  type ConditionChip,
  type TryingDuration,
  type TempUnit,
} from '../../../store/useCycleOnboardingStore'
import { supabase } from '../../../lib/supabase'
import { useOnboardingComplete } from '../../../hooks/useOnboardingComplete'
import { useModeStore } from '../../../store/useModeStore'
import { useJourneyStore } from '../../../store/useJourneyStore'
import { useBehaviorStore } from '../../../store/useBehaviorStore'
import { isDevModeActive } from '../../../store/useDevStore'

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

  async function saveAndFinish(): Promise<void> {
    // Dev mode: dry run — no DB writes, no store mutations beyond what
    // the snapshot will roll back on exit.
    if (isDevModeActive()) {
      store.clearAll()
      return onboardingComplete('pre-pregnancy')
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return onboardingComplete('pre-pregnancy')

      const userId = session.user.id
      const parentName = useJourneyStore.getState().parentName ?? null

      // Profile: persist journey mode + parent name so cold restarts don't
      // reset the user to the default mode.
      const profilePayload: Record<string, unknown> = {
        id: userId,
        journey_mode: 'pre-pregnancy',
      }
      if (parentName) profilePayload.name = parentName
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })
      if (profileErr) console.warn('[onboarding] profile upsert failed:', profileErr.message)

      // Behavior row. Schema CHECK constraint requires `cycle` (remapped to
      // `pre-pregnancy` on read in app/_layout.tsx).
      useBehaviorStore.getState().enroll('pre-pregnancy')
      const { error: behaviorErr } = await supabase.from('behaviors').upsert(
        {
          user_id: userId,
          type: 'cycle',
          active: true,
        },
        { onConflict: 'user_id,type' }
      )
      if (behaviorErr) console.warn('[onboarding] behaviors upsert failed:', behaviorErr.message)

      // Initial cycle log if we have a last period date
      if (store.lastPeriodDate) {
        await supabase.from('cycle_logs').insert({
          user_id: userId,
          date: store.lastPeriodDate,
          type: 'period_start',
          value: store.periodDuration?.toString() ?? '5',
          notes: JSON.stringify({
            cycleLength: store.cycleLength,
            conditions: store.conditions,
            conditionsOther: store.conditionsOther,
            tempUnit: store.tempUnit,
            tryingToConceive: store.tryingToConceive,
            tryingDuration: store.tryingDuration,
            trackingTemperature: store.trackingTemperature,
            supplements: store.supplements,
          }),
        })
      }
    } catch (e) {
      // Non-blocking — local mode set below so user can still proceed.
      console.warn('Failed to save cycle onboarding:', e)
    }

    useModeStore.getState().setCycleIntent(store.tryingToConceive ? 'ttc' : 'tracking')

    store.clearAll()
    onboardingComplete('pre-pregnancy')
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
      sticker={<Flower size={56} petal={stickers.pink} center={stickers.yellow} />}
      onContinue={onContinue}
      onSkip={onSkip}
      continueDisabled={!date}
    >
      <View style={stepStyles.centered}>
        <DatePickerField
          inline
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
  const { colors, radius, font, isDark } = useTheme()
  const mode = getModeColor('pre-pregnancy', isDark)
  const modeSoft = getModeColorSoft('pre-pregnancy', isDark)
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
      sticker={<Moon size={52} fill={stickers.lilac} />}
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
              style={[stepStyles.numberInput, { color: colors.text, fontFamily: font.display }]}
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
              backgroundColor: unknown ? modeSoft : colors.surface,
              borderColor: unknown ? mode : colors.border,
              borderRadius: radius.lg,
            },
          ]}
        >
          <Text style={[stepStyles.chipText, { color: unknown ? mode : colors.textSecondary }]}>
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
  const { colors, radius, isDark } = useTheme()
  const mode = getModeColor('pre-pregnancy', isDark)
  const modeSoft = getModeColorSoft('pre-pregnancy', isDark)
  const duration = useCycleOnboardingStore((s) => s.periodDuration)
  const setDuration = useCycleOnboardingStore((s) => s.setPeriodDuration)

  const options = [3, 4, 5, 6, 7, 8]

  return (
    <OnboardingStep
      step={step}
      total={total}
      question="How long does your period usually last?"
      sticker={<Drop size={52} fill={stickers.coral} />}
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
                backgroundColor: duration === n ? modeSoft : colors.surface,
                borderColor: duration === n ? mode : colors.text,
                shadowColor: colors.text,
                borderRadius: radius.full,
              },
            ]}
          >
            <Text
              style={[
                stepStyles.durationChipText,
                { color: duration === n ? mode : colors.text },
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
  const { colors, radius, isDark } = useTheme()
  const mode = getModeColor('pre-pregnancy', isDark)
  const modeSoft = getModeColorSoft('pre-pregnancy', isDark)
  const conditions = useCycleOnboardingStore((s) => s.conditions)
  const conditionsOther = useCycleOnboardingStore((s) => s.conditionsOther)
  const setConditionsOther = useCycleOnboardingStore((s) => s.setConditionsOther)
  const toggle = useCycleOnboardingStore((s) => s.toggleCondition)
  const otherSelected = conditions.includes('other')

  return (
    <OnboardingStep
      step={step}
      total={total}
      question="Any conditions we should know about?"
      sticker={<Leaf size={56} fill={stickers.green} />}
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
                  backgroundColor: selected ? modeSoft : colors.surface,
                  borderColor: selected ? mode : colors.text,
                  shadowColor: colors.text,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text
                style={[
                  stepStyles.conditionChipText,
                  { color: selected ? mode : colors.text },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {otherSelected && (
        <View
          style={[
            stepStyles.otherInputWrap,
            {
              backgroundColor: colors.surface,
              borderColor: colors.text,
              borderRadius: radius.full,
              shadowColor: colors.text,
            },
          ]}
        >
          <TextInput
            value={conditionsOther ?? ''}
            onChangeText={setConditionsOther}
            placeholder="Tell us about it..."
            placeholderTextColor={colors.textMuted}
            style={[stepStyles.otherInputText, { color: colors.text }]}
            autoCapitalize="sentences"
          />
        </View>
      )}
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
  const { colors, radius, isDark } = useTheme()
  const mode = getModeColor('pre-pregnancy', isDark)
  const modeSoft = getModeColorSoft('pre-pregnancy', isDark)
  const unit = useCycleOnboardingStore((s) => s.tempUnit)
  const setUnit = useCycleOnboardingStore((s) => s.setTempUnit)

  return (
    <OnboardingStep
      step={step}
      total={total}
      question="Temperature unit preference?"
      sticker={<Sun size={56} fill={stickers.yellow} />}
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
  const { colors, radius, isDark } = useTheme()
  const mode = getModeColor('pre-pregnancy', isDark)
  const modeSoft = getModeColorSoft('pre-pregnancy', isDark)
  const duration = useCycleOnboardingStore((s) => s.tryingDuration)
  const setDuration = useCycleOnboardingStore((s) => s.setTryingDuration)

  return (
    <OnboardingStep
      step={step}
      total={total}
      question="How long have you been trying?"
      sticker={<Flower size={56} petal={stickers.pink} center={stickers.yellow} />}
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
                  backgroundColor: selected ? modeSoft : colors.surface,
                  borderColor: selected ? mode : colors.text,
                  shadowColor: colors.text,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text
                style={[
                  stepStyles.conditionChipText,
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
      sticker={<Sun size={56} fill={stickers.yellow} />}
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
  const { colors, radius, isDark } = useTheme()
  const mode = getModeColor('pre-pregnancy', isDark)
  const modeSoft = getModeColorSoft('pre-pregnancy', isDark)
  const supplements = useCycleOnboardingStore((s) => s.supplements)
  const setSupplements = useCycleOnboardingStore((s) => s.setSupplements)

  return (
    <OnboardingStep
      step={step}
      total={total}
      question="Any supplements you're taking?"
      sticker={<Leaf size={56} fill={stickers.green} />}
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
  const { colors, radius, font, isDark } = useTheme()
  const modeSoft = getModeColorSoft('pre-pregnancy', isDark)

  return (
    <View style={[completeStyles.root, { backgroundColor: colors.bg }]}>
      <View style={completeStyles.content}>
        <View
          style={[
            completeStyles.iconCircle,
            {
              backgroundColor: modeSoft,
              borderWidth: 1,
              borderColor: colors.border,
            },
          ]}
        >
          <Flower size={56} petal={stickers.pink} center={stickers.yellow} />
        </View>

        <Text style={[completeStyles.title, { color: colors.text, fontFamily: font.display }]}>
          You're all set!
        </Text>

        <Text
          style={[
            completeStyles.message,
            { color: colors.textSecondary, fontFamily: font.body },
          ]}
        >
          Grandma's got everything she needs to guide you on this beautiful journey.
          Your cycle insights are being personalized just for you.
        </Text>
      </View>

      <View style={[completeStyles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <PillButton label="Let's Go" variant="ink" onPress={onFinish} />
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
  const mode = getModeColor('pre-pregnancy', isDark)
  const modeSoft = getModeColorSoft('pre-pregnancy', isDark)

  return (
    <Pressable
      onPress={onPress}
      style={[
        stepStyles.togglePill,
        {
          backgroundColor: active ? modeSoft : colors.surface,
          borderColor: active ? mode : colors.border,
          borderRadius: radius.lg,
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
    textAlign: 'center',
  },
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
  otherInputWrap: {
    marginTop: 16,
    paddingHorizontal: 20,
    height: 56,
    borderWidth: 2,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  otherInputText: {
    fontSize: 16,
    fontWeight: '500',
  },
  durationChip: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  durationChipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  conditionChip: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
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
    letterSpacing: -0.5,
  },
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
    letterSpacing: 0.3,
  },
})
