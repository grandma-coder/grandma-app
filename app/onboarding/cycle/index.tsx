/**
 * B2 — Cycle Tracking Onboarding Flow
 *
 * Internal stepper: 5 base steps + 3 optional TTC steps + completion.
 * Uses OnboardingStep wrapper for consistent UI.
 * Saves answers to Supabase profiles + behaviors table at the end.
 */

import { useState, useCallback, useRef, useMemo } from 'react'
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
import { useTranslation } from '../../../lib/i18n'
import type { TranslationKeys } from '../../../lib/i18n/keys'
import DatePickerField from '../../../components/ui/DatePickerField'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { OnboardingStep, OnboardingNavProvider } from '../../../components/onboarding/OnboardingStep'
import { Flower, Drop, Moon, Sun, Leaf, Heart } from '../../../components/ui/Stickers'
import { PillButton } from '../../../components/ui/PillButton'
import { useTheme, brand, stickers, getModeColor, getModeColorSoft, getDiffuseAccent, diffuseFields } from '../../../constants/theme'
import { useIsDiffuse } from '../../../components/ui/diffuse/DiffuseKit'
import { DiffuseDotCalendar } from '../../../components/ui/diffuse/DiffusePrimitives'
import { DiffuseField } from '../../../components/ui/diffuse/DiffuseField'
import { ArcDial } from '../../../components/ui/diffuse/pickers/ArcDial'
import { SegmentedBloom } from '../../../components/ui/diffuse/pickers/SegmentedBloom'
import { BloomChips } from '../../../components/ui/diffuse/pickers/BloomChips'
import { MetaballBloom } from '../../../components/ui/diffuse/pickers/MetaballBloom'
import { OrbitPicker } from '../../../components/ui/diffuse/pickers/OrbitPicker'
import { PoleField } from '../../../components/ui/diffuse/pickers/PoleField'
import {
  useCycleOnboardingStore,
  type ConditionChip,
  type TryingDuration,
  type TempUnit,
} from '../../../store/useCycleOnboardingStore'
import { supabase } from '../../../lib/supabase'
import { getCycleInfo, toDateStr } from '../../../lib/cycleLogic'
import { useOnboardingComplete } from '../../../hooks/useOnboardingComplete'
import { useModeStore } from '../../../store/useModeStore'
import { useJourneyStore } from '../../../store/useJourneyStore'
import { useConsentStore } from '../../../store/useConsentStore'
import { useBehaviorStore, PRE_PREG_DB_TYPE } from '../../../store/useBehaviorStore'
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

// ─── Local date ↔ ISO string helpers (Diffuse calendar bridge) ──────────────
// The store keeps `lastPeriodDate` as an ISO 'YYYY-MM-DD' string; DiffuseDotCalendar
// is controlled by a Date. Convert with LOCAL date parts (not toISOString) so an
// evening selection west of UTC doesn't slide to the previous day.

function isoToDate(iso: string | null): Date {
  if (!iso) return new Date()
  const [y, m, d] = iso.split('-').map((p) => parseInt(p, 10))
  if (!y || !m || !d) return new Date()
  return new Date(y, m - 1, d)
}

function dateToIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function CycleOnboarding() {
  const store = useCycleOnboardingStore()
  const { handleComplete: onboardingComplete } = useOnboardingComplete()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  // Re-entrancy guard against a double-tap on "Let's Go" (P2-78). Every path in
  // saveAndFinish navigates away, so the guard is set once and never released.
  const savingRef = useRef(false)

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
    // Guard against double-submit (P2-78).
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)

    // Dev mode: dry run — no DB writes, no store mutations beyond what
    // the snapshot will roll back on exit.
    if (isDevModeActive()) {
      store.clearAll()
      return onboardingComplete('pre-pregnancy')
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // No session (offline / signed-out edge): still enroll locally so the
        // mode system has a behavior to switch to, then proceed.
        useBehaviorStore.getState().enroll('pre-pregnancy')
        useModeStore.getState().setCycleIntent(store.tryingToConceive ? 'ttc' : 'tracking')
        store.clearAll()
        return onboardingComplete('pre-pregnancy')
      }

      const userId = session.user.id
      const parentName = useJourneyStore.getState().parentName ?? null
      const parentDob = useJourneyStore.getState().parentDob ?? null

      // Profile: persist journey mode + parent name/dob so cold restarts don't
      // reset the user to the default mode.
      const profilePayload: Record<string, unknown> = {
        id: userId,
        journey_mode: 'pre-pregnancy',
      }
      if (parentName) profilePayload.name = parentName
      if (parentDob) profilePayload.dob = parentDob
      const consentedAt = useConsentStore.getState().consentedAt
      if (consentedAt) profilePayload.consented_at = consentedAt
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })
      if (profileErr) console.warn('[onboarding] profile upsert failed:', profileErr.message)

      // Behavior row. Schema CHECK constraint requires PRE_PREG_DB_TYPE
      // ('cycle'), remapped to 'pre-pregnancy' on read via behaviorFromDbType.
      const { error: behaviorErr } = await supabase.from('behaviors').upsert(
        {
          user_id: userId,
          type: PRE_PREG_DB_TYPE,
          active: true,
        },
        { onConflict: 'user_id,type' }
      )
      if (behaviorErr) console.warn('[onboarding] behaviors upsert failed:', behaviorErr.message)
      // Enroll locally regardless of the server result — the catch path below
      // also lets the user proceed, so local enrollment must always happen.
      useBehaviorStore.getState().enroll('pre-pregnancy')

      // Initial cycle log if we have a last period date
      if (store.lastPeriodDate) {
        const { error: cycleErr } = await supabase.from('cycle_logs').insert({
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
        // Don't block onboarding on this, but at least record the failure so
        // a lost first-period entry is diagnosable rather than silent.
        if (cycleErr) console.warn('[onboarding] cycle_logs insert failed:', cycleErr.message)
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
        saving={saving}
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
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const date = useCycleOnboardingStore((s) => s.lastPeriodDate)
  const setDate = useCycleOnboardingStore((s) => s.setLastPeriodDate)

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="pre-pregnancy"
      question={t('cycleOnboarding_q_lastPeriod')}
      sticker={<Flower size={56} petal={stickers.pink} center={stickers.yellow} />}
      onContinue={onContinue}
      onSkip={onSkip}
      continueDisabled={!date}
    >
      {diffuse ? (
        <DiffuseDotCalendar
          value={isoToDate(date)}
          onChange={(d) => setDate(dateToIso(d))}
          minimumDate={new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)}
          accent={diffuseFields.pre.accent}
        />
      ) : (
        <View style={stepStyles.centered}>
          <DatePickerField
            inline
            label=""
            value={date || ''}
            onChange={setDate}
            placeholder={t('cycleOnboarding_datePlaceholder')}
            modalTitle={t('cycleOnboarding_modalLastPeriod')}
            maximumDate={new Date()}
            minimumDate={new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)}
          />
        </View>
      )}
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
  const { t } = useTranslation()
  const { colors, radius, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
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
      auraMode="pre-pregnancy"
      question={t('cycleOnboarding_q_cycleLength')}
      sticker={<Moon size={52} fill={stickers.lilac} />}
      onContinue={onContinue}
    >
      {diffuse ? (
        <>
          {!unknown && (
            <ArcDial
              min={21}
              max={35}
              value={cycleLength ?? 28}
              onChange={setCycleLength}
              unit={t('cycleOnboarding_days')}
            />
          )}
          {/* Preserve the "I don't know" affordance as a hairline segmented row. */}
          <View style={stepStyles.diffuseRow}>
            <SegmentedBloom
              options={[{ key: 'unknown', label: t('cycleOnboarding_iDontKnow') }]}
              value={unknown ? 'unknown' : null}
              onChange={() => setUnknown(!unknown)}
            />
          </View>

          {/* TTC toggle */}
          <View style={stepStyles.diffuseBlock}>
            <SegmentedBloom
              options={[
                { key: 'yes', label: t('common_yes') },
                { key: 'no', label: t('common_no') },
              ]}
              value={ttc ? 'yes' : 'no'}
              onChange={(k) => setTTC(k === 'yes')}
            />
          </View>
        </>
      ) : (
        <>
          <View style={stepStyles.inputRow}>
            {!unknown && (
              <View style={[stepStyles.numberInputWrap, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
                <TextInput
                  value={cycleLength?.toString() ?? ''}
                  onChangeText={(txt) => {
                    const n = parseInt(txt, 10)
                    setCycleLength(isNaN(n) ? null : Math.min(60, Math.max(1, n)))
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={[stepStyles.numberInput, { color: colors.text, fontFamily: font.display }]}
                  placeholderTextColor={colors.textMuted}
                  placeholder="28"
                />
                <Text style={[stepStyles.unitLabel, { color: colors.textSecondary, fontFamily: font.bodyMedium }]}>{t('cycleOnboarding_days')}</Text>
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
              <Text style={[stepStyles.chipText, { color: unknown ? mode : colors.textSecondary, fontFamily: font.bodySemiBold }]}>
                {t('cycleOnboarding_iDontKnow')}
              </Text>
            </Pressable>
          </View>

          {/* TTC toggle */}
          <View style={[stepStyles.ttcCard, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
            <Text style={[stepStyles.ttcLabel, { color: colors.text, fontFamily: font.bodySemiBold }]}>
              {t('cycleOnboarding_q_ttc')}
            </Text>
            <View style={stepStyles.toggleRow}>
              <TogglePill label={t('common_yes')} active={ttc} onPress={() => setTTC(true)} />
              <TogglePill label={t('common_no')} active={!ttc} onPress={() => setTTC(false)} />
            </View>
          </View>
        </>
      )}
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
  const { t } = useTranslation()
  const { colors, radius, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const mode = getModeColor('pre-pregnancy', isDark)
  const modeSoft = getModeColorSoft('pre-pregnancy', isDark)
  const duration = useCycleOnboardingStore((s) => s.periodDuration)
  const setDuration = useCycleOnboardingStore((s) => s.setPeriodDuration)

  const options = [3, 4, 5, 6, 7, 8]

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="pre-pregnancy"
      question={t('cycleOnboarding_q_periodDuration')}
      sticker={<Drop size={52} fill={stickers.coral} />}
      onContinue={onContinue}
    >
      {diffuse ? (
        <BloomChips
          multi={false}
          options={options.map((n) => ({ key: String(n), label: `${n} ${t('cycleOnboarding_days')}` }))}
          value={duration != null ? [String(duration)] : []}
          onChange={(next) => {
            const n = parseInt(next[0], 10)
            if (!isNaN(n)) setDuration(n)
          }}
        />
      ) : (
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
                  { color: duration === n ? mode : colors.text, fontFamily: font.bodySemiBold },
                ]}
              >
                {n} {t('cycleOnboarding_days')}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </OnboardingStep>
  )
}

// ─── STEP 4: Conditions ────────────────────────────────────────────────────

const CONDITION_OPTIONS: { id: ConditionChip; labelKey: keyof TranslationKeys }[] = [
  { id: 'pcos', labelKey: 'cycleOnboarding_condition_pcos' },
  { id: 'endometriosis', labelKey: 'cycleOnboarding_condition_endometriosis' },
  { id: 'other', labelKey: 'cycleOnboarding_condition_other' },
  { id: 'prefer_not_to_say', labelKey: 'cycleOnboarding_condition_preferNotToSay' },
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
  const { t } = useTranslation()
  const { colors, radius, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
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
      auraMode="pre-pregnancy"
      question={t('cycleOnboarding_q_conditions')}
      sticker={<Leaf size={56} fill={stickers.green} />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      {diffuse ? (
        <>
          <View style={stepStyles.metaballStage}>
            <MetaballBloom
              fieldColor={getDiffuseAccent('pre-pregnancy')}
              options={CONDITION_OPTIONS.map((opt) => ({ key: opt.id, label: t(opt.labelKey) }))}
              value={conditions}
              onChange={(next) => {
                // Fold the picker's next array back through the store's toggle so
                // the "prefer not to say"-exclusive rule stays authoritative.
                const added = next.filter((k) => !conditions.includes(k as ConditionChip))
                const removed = conditions.filter((k) => !next.includes(k))
                added.forEach((k) => toggle(k as ConditionChip))
                removed.forEach((k) => toggle(k))
              }}
            />
          </View>
          {otherSelected && (
            <View style={stepStyles.diffuseBlock}>
              <DiffuseField
                value={conditionsOther ?? ''}
                onChangeText={setConditionsOther}
                placeholder={t('cycleOnboarding_conditionOtherPlaceholder')}
                autoCapitalize="sentences"
              />
            </View>
          )}
        </>
      ) : (
        <>
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
                      { color: selected ? mode : colors.text, fontFamily: font.bodySemiBold },
                    ]}
                  >
                    {t(opt.labelKey)}
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
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  shadowColor: colors.text,
                },
              ]}
            >
              <TextInput
                value={conditionsOther ?? ''}
                onChangeText={setConditionsOther}
                placeholder={t('cycleOnboarding_conditionOtherPlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={[stepStyles.otherInputText, { color: colors.text, fontFamily: font.bodyMedium }]}
                autoCapitalize="sentences"
              />
            </View>
          )}
        </>
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
  const { t } = useTranslation()
  const { colors, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const mode = getModeColor('pre-pregnancy', isDark)
  const modeSoft = getModeColorSoft('pre-pregnancy', isDark)
  const unit = useCycleOnboardingStore((s) => s.tempUnit)
  const setUnit = useCycleOnboardingStore((s) => s.setTempUnit)

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="pre-pregnancy"
      question={t('cycleOnboarding_q_tempUnit')}
      sticker={<Sun size={56} fill={stickers.yellow} />}
      onContinue={onContinue}
    >
      {diffuse ? (
        <SegmentedBloom
          options={[
            { key: 'celsius', label: t('cycleOnboarding_tempCelsius') },
            { key: 'fahrenheit', label: t('cycleOnboarding_tempFahrenheit') },
          ]}
          value={unit}
          onChange={(k) => setUnit(k as TempUnit)}
        />
      ) : (
        <View style={stepStyles.toggleRow}>
          <TogglePill label={t('cycleOnboarding_tempCelsius')} active={unit === 'celsius'} onPress={() => setUnit('celsius')} />
          <TogglePill label={t('cycleOnboarding_tempFahrenheit')} active={unit === 'fahrenheit'} onPress={() => setUnit('fahrenheit')} />
        </View>
      )}
    </OnboardingStep>
  )
}

// ─── TTC EXTRA 1: How Long Trying ─────────────────────────────────────────

const TTC_DURATION_OPTIONS: { id: TryingDuration; labelKey: keyof TranslationKeys }[] = [
  { id: 'just_starting', labelKey: 'cycleOnboarding_ttc_justStarting' },
  { id: 'few_months', labelKey: 'cycleOnboarding_ttc_fewMonths' },
  { id: 'over_a_year', labelKey: 'cycleOnboarding_ttc_overAYear' },
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
  const { t } = useTranslation()
  const { colors, radius, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const mode = getModeColor('pre-pregnancy', isDark)
  const modeSoft = getModeColorSoft('pre-pregnancy', isDark)
  const duration = useCycleOnboardingStore((s) => s.tryingDuration)
  const setDuration = useCycleOnboardingStore((s) => s.setTryingDuration)

  // Pre-preg field hues for the orbit nodes (design accent values).
  const orbitAccents = [diffuseFields.pre.g1, diffuseFields.pre.g2, diffuseFields.pre.g3]

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="pre-pregnancy"
      question={t('cycleOnboarding_q_ttcDuration')}
      sticker={<Flower size={56} petal={stickers.pink} center={stickers.yellow} />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      {diffuse ? (
        <OrbitPicker
          options={TTC_DURATION_OPTIONS.map((opt, i) => ({
            key: opt.id,
            label: t(opt.labelKey),
            accent: orbitAccents[i % orbitAccents.length],
          }))}
          value={duration}
          onChange={(k) => setDuration(k as TryingDuration)}
        />
      ) : (
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
                    { color: selected ? mode : colors.text, fontFamily: font.bodySemiBold },
                  ]}
                >
                  {t(opt.labelKey)}
                </Text>
              </Pressable>
            )
          })}
        </View>
      )}
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
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const tracking = useCycleOnboardingStore((s) => s.trackingTemperature)
  const setTracking = useCycleOnboardingStore((s) => s.setTrackingTemperature)

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="pre-pregnancy"
      question={t('cycleOnboarding_q_trackingTemp')}
      sticker={<Sun size={56} fill={stickers.yellow} />}
      onContinue={onContinue}
    >
      {diffuse ? (
        <PoleField
          options={[
            { key: 'yes', label: t('common_yes'), color: diffuseFields.pre.g2 },
            { key: 'notyet', label: t('cycleOnboarding_notYet'), color: diffuseFields.pre.g3 },
          ]}
          value={tracking === null ? null : tracking ? 'yes' : 'notyet'}
          onChange={(k) => setTracking(k === 'yes')}
        />
      ) : (
        <View style={stepStyles.toggleRow}>
          <TogglePill label={t('common_yes')} active={tracking === true} onPress={() => setTracking(true)} />
          <TogglePill label={t('cycleOnboarding_notYet')} active={tracking === false} onPress={() => setTracking(false)} />
        </View>
      )}
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
  const { t } = useTranslation()
  const { colors, radius, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const mode = getModeColor('pre-pregnancy', isDark)
  const modeSoft = getModeColorSoft('pre-pregnancy', isDark)
  const supplements = useCycleOnboardingStore((s) => s.supplements)
  const setSupplements = useCycleOnboardingStore((s) => s.setSupplements)

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="pre-pregnancy"
      question={t('cycleOnboarding_q_supplements')}
      sticker={<Leaf size={56} fill={stickers.green} />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      {diffuse ? (
        // The store keeps supplements as one free-text string (no chip catalog /
        // i18n keys exist for individual supplements), so the Diffuse path uses
        // the bare underlined field — the v4 equivalent of the cream text area —
        // wired to the SAME setSupplements setter.
        <DiffuseField
          value={supplements ?? ''}
          onChangeText={setSupplements}
          placeholder={t('cycleOnboarding_supplementsPlaceholder')}
          autoCapitalize="sentences"
        />
      ) : (
        <TextInput
          value={supplements ?? ''}
          onChangeText={setSupplements}
          placeholder={t('cycleOnboarding_supplementsPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          style={[
            stepStyles.textArea,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.md,
              fontFamily: font.bodyMedium,
            },
          ]}
        />
      )}
    </OnboardingStep>
  )
}

// ─── Completion Screen ─────────────────────────────────────────────────────

function CompletionScreen({ onFinish, saving = false }: { onFinish: () => void; saving?: boolean }) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { colors, radius, font, isDark } = useTheme()
  const modeSoft = getModeColorSoft('pre-pregnancy', isDark)
  const mode = getModeColor('pre-pregnancy', isDark)

  // Prediction reward — compute the fertile window + next period from what the
  // user just entered, so onboarding pays off immediately (Flo does this well).
  const lastPeriod = useCycleOnboardingStore((s) => s.lastPeriodDate)
  const cycleLen = useCycleOnboardingStore((s) => s.cycleLength)
  const periodDur = useCycleOnboardingStore((s) => s.periodDuration)
  const ttc = useCycleOnboardingStore((s) => s.tryingToConceive)

  const prediction = useMemo(() => {
    if (!lastPeriod) return null
    try {
      const info = getCycleInfo(
        { lastPeriodStart: lastPeriod, cycleLength: cycleLen ?? 28, periodLength: periodDur ?? 5, lutealPhase: 14 },
        toDateStr(new Date()),
      )
      const fmt = (iso: string) => {
        const d = new Date(iso + 'T12:00:00')
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      }
      // Fertile window dates ≈ ovulation − 5 … ovulation + 1.
      const ov = new Date(info.ovulationDate + 'T12:00:00')
      const fStart = new Date(ov); fStart.setDate(ov.getDate() - 5)
      const fEnd = new Date(ov); fEnd.setDate(ov.getDate() + 1)
      const fmtD = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      return {
        fertileWindow: `${fmtD(fStart)} – ${fmtD(fEnd)}`,
        ovulation: fmt(info.ovulationDate),
        nextPeriod: fmt(info.nextPeriodDate),
      }
    } catch { return null }
  }, [lastPeriod, cycleLen, periodDur])

  return (
    <View style={[completeStyles.root, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={completeStyles.content} showsVerticalScrollIndicator={false}>
        <View
          style={[
            completeStyles.iconCircle,
            { backgroundColor: modeSoft, borderWidth: 1, borderColor: colors.border },
          ]}
        >
          <Flower size={56} petal={stickers.pink} center={stickers.yellow} />
        </View>

        <Text style={[completeStyles.title, { color: colors.text, fontFamily: font.display }]}>
          {t('cycleOnboarding_complete_title')}
        </Text>

        <Text style={[completeStyles.message, { color: colors.textSecondary, fontFamily: font.body }]}>
          {prediction ? t('cycleOnboarding_predict_message') : t('cycleOnboarding_complete_message')}
        </Text>

        {/* Prediction reward card */}
        {prediction ? (
          <View style={[completeStyles.predictCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
            {ttc ? (
              <PredictRow icon={<Flower size={22} petal={stickers.green} center={stickers.yellow} />} label={t('cycleOnboarding_predict_fertile')} value={prediction.fertileWindow} accent={mode} colors={colors} font={font} />
            ) : null}
            <PredictRow icon={<Flower size={22} petal={stickers.lilac} center={stickers.pink} />} label={t('cycleOnboarding_predict_ovulation')} value={prediction.ovulation} accent={mode} colors={colors} font={font} />
            <PredictRow icon={<Flower size={22} petal={stickers.coral} center={stickers.yellow} />} label={t('cycleOnboarding_predict_period')} value={prediction.nextPeriod} accent={mode} colors={colors} font={font} last />
          </View>
        ) : null}
      </ScrollView>

      <View style={[completeStyles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <PillButton label={t('cycleOnboarding_complete_btn')} variant="ink" onPress={onFinish} loading={saving} disabled={saving} />
      </View>
    </View>
  )
}

function PredictRow({
  icon, label, value, accent, colors, font, last,
}: {
  icon: React.ReactNode; label: string; value: string; accent: string
  colors: any; font: any; last?: boolean
}) {
  return (
    <View style={[completeStyles.predictRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
      <View style={completeStyles.predictIcon}>{icon}</View>
      <Text style={[completeStyles.predictLabel, { color: colors.textSecondary, fontFamily: font.body }]}>{label}</Text>
      <Text style={[completeStyles.predictValue, { color: accent, fontFamily: font.display }]}>{value}</Text>
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
  const { colors, radius, font, isDark } = useTheme()
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
          { color: active ? mode : colors.textSecondary, fontFamily: font.bodyBold },
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
    width: 60,
    textAlign: 'center',
  },
  unitLabel: {
    fontSize: 16,
  },
  chip: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  chipText: {
    fontSize: 15,
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
  },
  ttcCard: {
    marginTop: 32,
    padding: 20,
    gap: 16,
  },
  ttcLabel: {
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  // Diffuse-only spacing helpers (layout-only; no colors/shadows).
  diffuseRow: {
    marginTop: 20,
    alignItems: 'flex-start',
  },
  diffuseBlock: {
    marginTop: 28,
  },
  metaballStage: {
    height: 300,
    width: '100%',
  },
})

const completeStyles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 20,
  },
  predictCard: {
    width: '100%',
    borderWidth: 1,
    paddingHorizontal: 18,
    marginTop: 4,
  },
  predictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
  },
  predictIcon: { width: 26, alignItems: 'center' },
  predictLabel: { flex: 1, fontSize: 14 },
  predictValue: { fontSize: 16 },
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
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 16,
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
    letterSpacing: 0.3,
  },
})
