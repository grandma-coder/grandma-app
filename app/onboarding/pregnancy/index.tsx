/**
 * B3 — Pregnancy Onboarding Flow
 *
 * 7-step internal stepper + completion screen.
 * Uses OnboardingStep wrapper for consistent UI.
 * Saves answers to Supabase pregnancy_logs, behaviors, and profiles.
 */

import { SiteSticker } from '../../../components/stickers/SiteSticker'
import type { SiteStickerName } from '../../../components/stickers/SiteSticker'
import React, { useState, useCallback, useEffect, useRef } from 'react'
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
import { SiteChoice } from '../../../components/ui/SiteChoice'
import { router } from 'expo-router'
import { HandDrawnBox } from '../../../components/ui/HandDrawn'
import { CelebrateHero } from '../../../components/onboarding/Celebrate'
import { EyeAction, ACTION_TONES } from '../../../components/ui/AuthDock'
import { FadeUp } from '../../../components/ui/Motion'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { OnboardingStep, OnboardingNavProvider } from '../../../components/onboarding/OnboardingStep'
import { useTheme, useDiffuseTheme, font, getModeColor, getModeColorSoft, getDiffuseAccent, diffuseFields } from '../../../constants/theme'
import { useIsDiffuse, SoftBloom } from '../../../components/ui/diffuse/DiffuseKit'
import { DiffuseDotCalendar } from '../../../components/ui/diffuse/DiffusePrimitives'
import { DiffuseField } from '../../../components/ui/diffuse/DiffuseField'
import { PoleField } from '../../../components/ui/diffuse/pickers/PoleField'
import { OrbitPicker } from '../../../components/ui/diffuse/pickers/OrbitPicker'
import { MetaballBloom } from '../../../components/ui/diffuse/pickers/MetaballBloom'
import { User } from 'lucide-react-native'
import { useTranslation } from '../../../lib/i18n'
import {
  usePregnancyOnboardingStore,
  type BirthPlace,
  type PregnancyMood,
} from '../../../store/usePregnancyOnboardingStore'
import { useCycleOnboardingStore } from '../../../store/useCycleOnboardingStore'
import { usePregnancyStore, type MoodType } from '../../../store/usePregnancyStore'
import { useJourneyStore } from '../../../store/useJourneyStore'
import { useConsentStore } from '../../../store/useConsentStore'
import { useBehaviorStore } from '../../../store/useBehaviorStore'
import { isDevModeActive } from '../../../store/useDevStore'
import { useOnboardingComplete } from '../../../hooks/useOnboardingComplete'
import { supabase } from '../../../lib/supabase'
import { toDateStr } from '../../../lib/cycleLogic'

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

const MOOD_OPTIONS: {
  id: PregnancyMood
  sticker: SiteStickerName
  label: string
}[] = [
  { id: 'excited', label: 'Excited', sticker: 'star' },
  { id: 'happy', label: 'Happy', sticker: 'face3' },
  { id: 'calm', label: 'Calm', sticker: 'leaf' },
  { id: 'anxious', label: 'Anxious', sticker: 'cloud' },
  { id: 'tired', label: 'Tired', sticker: 'zz' },
  { id: 'nauseous', label: 'Nauseous', sticker: 'face2' },
]

const BIRTH_PLACE_OPTIONS: { id: BirthPlace; label: string; sticker: SiteStickerName }[] = [
  { id: 'hospital', label: 'Hospital', sticker: 'doc' },
  { id: 'birth_center', label: 'Birth center', sticker: 'heart' },
  { id: 'home_birth', label: 'Home birth', sticker: 'house' },
  { id: 'undecided', label: 'Undecided', sticker: 'cloud' },
]

// ─── Helpers ───────────────────────────────────────────────────────────────

// Local date ↔ ISO 'YYYY-MM-DD' bridge for DiffuseDotCalendar (controlled by a
// Date; the store keeps `dueDate` as an ISO string). Uses LOCAL date parts (not
// toISOString) so an evening selection west of UTC doesn't slide back a day.
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
  const [saving, setSaving] = useState(false)
  // Re-entrancy guard against a double-tap on "Let's Go" (P2-78).
  const savingRef = useRef(false)

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
    // Guard against double-submit (P2-78).
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    // Released in `finally` on any path that doesn't complete; on success the
    // screen navigates away (unmounts) so the guard stays set.
    let completed = false

    // Dev mode: dry run — no DB writes, no persisted-store mutations.
    if (isDevModeActive()) {
      store.clearAll()
      completed = true
      return onboardingComplete('pregnancy')
    }

    try {
    let session
    try {
      session = (await supabase.auth.getSession()).data.session
    } catch (e) {
      console.warn('[onboarding] getSession failed:', e)
      session = null
    }
    if (!session) {
      // No session = signed out. Don't enroll a journey we couldn't save — it
      // would open later as an empty home. Send them to sign in instead.
      store.clearAll()
      completed = true
      router.replace('/(auth)/welcome')
      return
    }

    const userId = session.user.id
    const parentName = useJourneyStore.getState().parentName ?? null
    const parentDob = useJourneyStore.getState().parentDob ?? null

    // ── 1. Profile: journey mode + parent name/dob + optional health notes. ──
    const profilePayload: Record<string, unknown> = {
      id: userId,
      journey_mode: 'pregnancy',
    }
    if (parentName) profilePayload.name = parentName
    if (parentDob) profilePayload.dob = parentDob
    const consentedAt = useConsentStore.getState().consentedAt
    if (consentedAt) profilePayload.consented_at = consentedAt
    if (store.conditionsText) profilePayload.health_notes = store.conditionsText
    if (store.dueDate) profilePayload.due_date = store.dueDate
    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
    if (profileErr) console.warn('[onboarding] profile upsert failed:', profileErr.message)

    // ── 2. REQUIRED: pregnancy behavior row. Block on failure. ───────────
    const { error: behaviorErr } = await supabase.from('behaviors').upsert(
      {
        user_id: userId,
        type: 'pregnancy',
        active: true,
      },
      { onConflict: 'user_id,type' }
    )
    if (behaviorErr) {
      // Do NOT enroll locally — leaving the user enrolled with no server row
      // strands them in a broken pregnancy mode on every cold start.
      Alert.alert(
        t('preg_onboard_errorTitle'),
        t('preg_onboard_errorBehavior', { message: behaviorErr.message })
      )
      return
    }
    // Server row committed — now safe to mark enrolled locally.
    useBehaviorStore.getState().enroll('pregnancy')

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

      // No sample-data backfill. pregnancy_logs holds ONLY the real facts we
      // just wrote (due date + optional mood) plus whatever the user logs from
      // the UI. Week/size/appointments are DERIVED from the due date in code
      // (see pregnancyWeeks + pregnancyAppointments) — we never fabricate
      // backdated log history for a brand-new account.
    }

    store.clearAll()
    completed = true
    onboardingComplete('pregnancy')
    } catch (e) {
      // Unexpected failure (e.g. SecureStore throw) — surface it and let the
      // user retry rather than the tap silently doing nothing. Draft is kept.
      const msg = e instanceof Error ? e.message : String(e)
      console.warn('Failed to save pregnancy onboarding:', msg)
      Alert.alert(
        t('preg_onboard_errorTitle'),
        t('preg_onboard_errorBehavior', { message: msg })
      )
    } finally {
      // Release the submit guard unless we completed (success navigates away).
      if (!completed) {
        savingRef.current = false
        setSaving(false)
      }
    }
  }


  // ─── Render ──────────────────────────────────────────────────────────────

  if (currentStep === 'complete') {
    return <CompletionScreen dueDate={store.dueDate} onFinish={saveAndFinish} saving={saving} />
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
  const diffuse = useIsDiffuse()
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
      auraMode="pregnancy"
      question={t('preg_onboard_step_dueDate')}
      sticker={<SiteSticker name="cal" size={48} cut />}
      onContinue={onContinue}
      continueDisabled={!dueDate}
    >
      {diffuse ? (
        <DiffuseDotCalendar
          value={isoToDate(dueDate)}
          onChange={(d) => setDueDate(dateToIso(d))}
          minimumDate={new Date()}
          accent={diffuseFields.preg.accent}
        />
      ) : (
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
            emptyHint={t('preg_onboard_dueDateHint')}
          />

          {/* Week indicator */}
          {dueDate && (
            <HandDrawnBox fill={modeSoft} stroke={colors.text} radius={18} seed="weekbadge" style={stepStyles.weekBadge}>
              <Text style={[stepStyles.weekBadgeText, { color: colors.text }]}>
                {t('preg_onboard_completionBadge', { week: calcWeekNumber(dueDate), days: daysUntil(dueDate) })}
              </Text>
            </HandDrawnBox>
          )}
        </View>
      )}
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
  const diffuse = useIsDiffuse()
  const first = usePregnancyOnboardingStore((s) => s.firstPregnancy)
  const setFirst = usePregnancyOnboardingStore((s) => s.setFirstPregnancy)

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      auraMode="pregnancy"
      question={t('preg_onboard_step_firstPregnancy')}
      sticker={<SiteSticker name="star" size={48} cut />}
      onContinue={onContinue}
      continueDisabled={first === null}
    >
      {diffuse ? (
        <PoleField
          options={[
            { key: 'yes', label: t('preg_onboard_yes'), color: diffuseFields.preg.g2 },
            { key: 'no', label: t('preg_onboard_no'), color: diffuseFields.preg.g3 },
          ]}
          value={first === null ? null : first ? 'yes' : 'no'}
          onChange={(k) => setFirst(k === 'yes')}
        />
      ) : (
        <View style={stepStyles.toggleRow}>
          <TogglePill label={t('preg_onboard_yes')} active={first === true} onPress={() => setFirst(true)} />
          <TogglePill label={t('preg_onboard_no')} active={first === false} onPress={() => setFirst(false)} />
        </View>
      )}
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
  const diffuse = useIsDiffuse()
  const mode = getModeColor('pregnancy', isDark)
  const modeSoft = getModeColorSoft('pregnancy', isDark)
  const mood = usePregnancyOnboardingStore((s) => s.mood)
  const setMood = usePregnancyOnboardingStore((s) => s.setMood)

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      auraMode="pregnancy"
      question={t('preg_onboard_step_mood')}
      sticker={<SiteSticker name="face2" size={48} cut />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      {diffuse ? (
        // The store holds a single PregnancyMood; MetaballBloom is multi-select,
        // so drive it single — value is the one selected mood (or none) and
        // onChange keeps only the newly-tapped key. Store shape is unchanged.
        <View style={stepStyles.metaballStage}>
          <MetaballBloom
            fieldColor={getDiffuseAccent('pregnancy', isDark)}
            options={MOOD_OPTIONS.map((opt) => ({ key: opt.id, label: opt.label }))}
            value={mood ? [mood] : []}
            onChange={(next) => {
              const added = next.find((k) => k !== mood)
              setMood(added ? (added as PregnancyMood) : null)
            }}
          />
        </View>
      ) : (
        <View style={stepStyles.moodGrid}>
          {MOOD_OPTIONS.map((opt) => (
            <SiteChoice
              key={opt.id}
              label={opt.label}
              selected={mood === opt.id}
              onPress={() => setMood(opt.id)}
              tone={modeSoft}
              sticker={opt.sticker}
              style={stepStyles.moodCard}
            />
          ))}
        </View>
      )}
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
  const diffuse = useIsDiffuse()
  const mode = getModeColor('pregnancy', isDark)
  const modeSoft = getModeColorSoft('pregnancy', isDark)
  const place = usePregnancyOnboardingStore((s) => s.birthPlace)
  const setPlace = usePregnancyOnboardingStore((s) => s.setBirthPlace)

  // Pregnancy field hues for the orbit nodes (design accent values).
  const orbitAccents = [
    diffuseFields.preg.accent,
    diffuseFields.preg.g1,
    diffuseFields.preg.g2,
    diffuseFields.preg.g3,
  ]

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      auraMode="pregnancy"
      question={t('preg_onboard_step_birthPlace')}
      sticker={<SiteSticker name="house" size={48} cut />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      {diffuse ? (
        <OrbitPicker
          options={BIRTH_PLACE_OPTIONS.map((opt, i) => ({
            key: opt.id,
            label: opt.label,
            accent: orbitAccents[i % orbitAccents.length],
          }))}
          value={place}
          onChange={(k) => setPlace(k as BirthPlace)}
        />
      ) : (
        <View style={stepStyles.choiceCol}>
          {BIRTH_PLACE_OPTIONS.map((opt) => (
            <SiteChoice
              key={opt.id}
              label={opt.label}
              selected={place === opt.id}
              onPress={() => setPlace(opt.id)}
              tone={modeSoft}
              sticker={opt.sticker}
              align="start"
            />
          ))}
        </View>
      )}
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
  const diffuse = useIsDiffuse()
  const mode = getModeColor('pregnancy', isDark)
  const modeSoft = getModeColorSoft('pregnancy', isDark)
  const provider = usePregnancyOnboardingStore((s) => s.careProvider)
  const setProvider = usePregnancyOnboardingStore((s) => s.setCareProvider)

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      auraMode="pregnancy"
      question={t('preg_onboard_step_careProvider')}
      sticker={<SiteSticker name="doc" size={48} cut />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      {diffuse ? (
        // The store keeps careProvider as one free-text string (no provider
        // chip catalog / i18n keys exist), so the Diffuse path uses the bare
        // underlined field wired to the SAME setProvider setter.
        <DiffuseField
          value={provider ?? ''}
          onChangeText={setProvider}
          placeholder={t('preg_onboard_careProviderPlaceholder')}
          autoCapitalize="words"
        />
      ) : (
        <HandDrawnBox fill={colors.surface} stroke={colors.text} radius={16} seed="preg-provider">
          <TextInput
            value={provider ?? ''}
            onChangeText={setProvider}
            placeholder={t('preg_onboard_careProviderPlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={[stepStyles.textInput, { color: colors.text }]}
            autoCapitalize="words"
          />
        </HandDrawnBox>
      )}
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
  const diffuse = useIsDiffuse()
  const mode = getModeColor('pregnancy', isDark)
  const modeSoft = getModeColorSoft('pregnancy', isDark)
  const conditions = usePregnancyOnboardingStore((s) => s.conditionsText)
  const setConditions = usePregnancyOnboardingStore((s) => s.setConditionsText)

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      auraMode="pregnancy"
      question={t('preg_onboard_step_conditions')}
      sticker={<SiteSticker name="thermo" size={48} cut />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      {diffuse ? (
        // The store keeps conditions as one free-text string (no condition chip
        // catalog / i18n keys exist), so the Diffuse path uses the bare
        // underlined field wired to the SAME setConditions setter.
        <DiffuseField
          value={conditions ?? ''}
          onChangeText={setConditions}
          placeholder={t('preg_onboard_conditionsPlaceholder')}
          autoCapitalize="sentences"
        />
      ) : (
        <HandDrawnBox fill={colors.surface} stroke={colors.text} radius={16} seed="preg-conditions">
          <TextInput
            value={conditions ?? ''}
            onChangeText={setConditions}
            placeholder={t('preg_onboard_conditionsPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            style={[stepStyles.textArea, { color: colors.text }]}
          />
        </HandDrawnBox>
      )}
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
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const mode = getModeColor('pregnancy', isDark)
  const modeSoft = getModeColorSoft('pregnancy', isDark)
  const partner = usePregnancyOnboardingStore((s) => s.partnerName)
  const setPartner = usePregnancyOnboardingStore((s) => s.setPartnerName)

  return (
    <OnboardingStep
      step={step}
      total={TOTAL_STEPS}
      auraMode="pregnancy"
      question={t('preg_onboard_step_partner')}
      sticker={<SiteSticker name="bubble" size={48} cut />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      {diffuse ? (
        // Bloom avatar + bare underlined field wired to the SAME setPartner
        // setter. Invite / skip stays with OnboardingStep's CTA + text link.
        <View style={stepStyles.partnerBlock}>
          <View style={stepStyles.partnerAvatarWrap}>
            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
              <SoftBloom color={diffuseFields.preg.accent} opacity={0.5} spread={0.55} radius="55%" />
            </View>
            <User size={40} color={dt.colors.ink} strokeWidth={1.4} />
          </View>
          <DiffuseField
            value={partner ?? ''}
            onChangeText={setPartner}
            placeholder={t('preg_onboard_partnerNamePlaceholder')}
            autoCapitalize="words"
          />
          <Text style={[stepStyles.partnerHint, { color: dt.colors.ink3, fontFamily: font.body }]}>
            {t('preg_onboard_partnerHint')}
          </Text>
        </View>
      ) : (
        <>
          <HandDrawnBox fill={colors.surface} stroke={colors.text} radius={16} seed="preg-partner">
            <TextInput
              value={partner ?? ''}
              onChangeText={setPartner}
              placeholder={t('preg_onboard_partnerNamePlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={[stepStyles.textInput, { color: colors.text }]}
              autoCapitalize="words"
            />
          </HandDrawnBox>
          <Text style={[stepStyles.hint, { color: colors.textMuted }]}>
            {t('preg_onboard_partnerHint')}
          </Text>
        </>
      )}
    </OnboardingStep>
  )
}

// ─── Completion Screen ─────────────────────────────────────────────────────

function CompletionScreen({
  dueDate,
  onFinish,
  saving = false,
}: {
  dueDate: string | null
  onFinish: () => void
  saving?: boolean
}) {
  const insets = useSafeAreaInsets()
  const { colors, radius, font, isDark } = useTheme()
  const { t } = useTranslation()
  const mode = getModeColor('pregnancy', isDark)
  const modeSoft = getModeColorSoft('pregnancy', isDark)

  const days = dueDate ? daysUntil(dueDate) : null
  const week = dueDate ? calcWeekNumber(dueDate) : null

  return (
    <View style={[completeStyles.root, { backgroundColor: colors.bg }]}>
      <View style={completeStyles.content}>
        <CelebrateHero sticker="heart" tone={modeSoft} confetti={['star', 'baby', 'flower', 'moon', 'bodysuit', 'cloud']} />

        <Text style={[completeStyles.title, { color: colors.text, fontFamily: font.display }]}>
          {t('preg_onboard_completionTitle')}
        </Text>

        <Text
          style={[
            completeStyles.message,
            { color: colors.textSecondary, fontFamily: font.body },
          ]}
        >
          {t('preg_onboard_completionBody')}
        </Text>

        {dueDate && days !== null && week !== null && (
          <FadeUp index={0} delay={700} style={{ alignSelf: 'stretch' }}>
            <HandDrawnBox fill={colors.surface} stroke={colors.text} radius={20} seed="preg-countdown" style={completeStyles.countdownCard}>
              {/* the number sits on a tone tag — ink on tone, never tone on white */}
              <View style={[completeStyles.countdownTag, { backgroundColor: modeSoft, borderColor: colors.text }]}>
                <Text style={[completeStyles.countdownDays, { color: colors.text, fontFamily: font.displayBold }]}>
                  {days}
                </Text>
              </View>
              <Text
                style={[
                  completeStyles.countdownLabel,
                  { color: colors.textSecondary, fontFamily: font.body },
                ]}
              >
                {t('preg_onboard_completionCountdownLabel')}
              </Text>
              <Text
                style={[
                  completeStyles.countdownWeek,
                  { color: colors.textMuted, fontFamily: font.body },
                ]}
              >
                {t('preg_onboard_completionCurrentlyWeek', { week })}
              </Text>
            </HandDrawnBox>
          </FadeUp>
        )}
      </View>

      <View style={[completeStyles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <EyeAction label="Let's Go" onPress={onFinish} ink={colors.text} loading={saving} disabled={saving} sticker="star" fill={ACTION_TONES.pink} delay={900} />
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

  // Site look: the hand-drawn choice chip (ink label, tone fill, tick) — never tone-on-tone text.
  if (!useIsDiffuse()) {
    return <SiteChoice label={label} selected={active} onPress={onPress} tone={getModeColorSoft('pregnancy', isDark)} style={stepStyles.togglePill} />
  }
  return (
    <Pressable
      onPress={onPress}
      style={[
        stepStyles.togglePill,
        {
          backgroundColor: active ? modeSoft : colors.surface,
          borderColor: colors.text,
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
    borderWidth: 1.5,
    width: '100%',
  },
  dateButtonText: {
    fontSize: 17,
    fontFamily: font.bodyBold,
    textAlign: 'center',
  },
  weekBadge: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 14,
    transform: [{ rotate: '-1.5deg' }],
  },
  weekBadgeText: {
    fontSize: 14,
    fontFamily: font.bodyBold,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  togglePill: {
    flex: 1,
  },
  togglePillText: {
    fontSize: 16,
    fontFamily: font.bodyBold,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moodCard: { width: '47%' },
  choiceCol: { gap: 12 },
  textInput: {
    paddingHorizontal: 20,
    height: 56,
    fontSize: 16,
    fontFamily: font.body,
  },
  textArea: {
    padding: 16,
    fontSize: 16,
    fontFamily: font.body,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 13,
    fontFamily: font.body,
    marginTop: 12,
    lineHeight: 18,
  },
  // Diffuse-only spacing helpers (layout-only; no colors/shadows).
  metaballStage: {
    height: 340,
    width: '100%',
  },
  partnerBlock: {
    gap: 24,
  },
  partnerAvatarWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerHint: {
    fontSize: 13,
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
  title: {
    fontSize: 28,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  message: {
    fontSize: 16,
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
  countdownTag: { borderWidth: 1.5, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 4, transform: [{ rotate: '-2deg' }] },
  countdownDays: {
    fontSize: 56,
    letterSpacing: 0,
  },
  countdownLabel: {
    fontSize: 15,
    textAlign: 'center',
  },
  countdownWeek: {
    fontSize: 13,
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
    fontFamily: font.bodyBold,
    letterSpacing: 0.3,
  },
})
