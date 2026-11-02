/**
 * Menopause Onboarding Flow (E1)
 *
 * A warm, non-clinical stepped flow — mirrors app/onboarding/cycle/index.tsx in
 * structure (internal stepper, OnboardingStep shell, ephemeral answer store,
 * finish-writes-to-Supabase-then-resets). Steps:
 *   intro → stage self-select → last period date → symptoms → HRT → finish.
 *
 * Clinical guardrail: stage is always user-set and editable; nothing here
 * diagnoses. Copy stays gentle and points nowhere prescriptive.
 *
 * Design: tokens-only, dual-variant. Cream reads from useTheme(); Diffuse from
 * useDiffuseTheme(). Mode color is the ember `meno` token via
 * getModeColor('menopause') (current) / getDiffuseAccent('menopause') (Diffuse).
 * Semantic icons are Character blobs (the shared icon system).
 */

import { SiteSticker, type SiteStickerName } from '../../../components/stickers/SiteSticker'
import { PillButton } from '../../../components/ui/PillButton'
import { SiteChoice } from '../../../components/ui/SiteChoice'
import { HandDrawnBox } from '../../../components/ui/HandDrawn'
import { CelebrateHero } from '../../../components/onboarding/Celebrate'
import { EyeAction, ACTION_TONES } from '../../../components/ui/AuthDock'
import { FadeUp } from '../../../components/ui/Motion'
import { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { OnboardingStep, OnboardingNavProvider } from '../../../components/onboarding/OnboardingStep'
import DatePickerField from '../../../components/ui/DatePickerField'
import { BloomChips } from '../../../components/ui/diffuse/pickers/BloomChips'
import { ChoiceTimeline } from '../../../components/ui/diffuse/pickers/ChoiceTimeline'
import { PoleField } from '../../../components/ui/diffuse/pickers/PoleField'
import { DiffuseDotCalendar } from '../../../components/ui/diffuse/DiffusePrimitives'
import { Character, type CharacterName } from '../../../components/characters/Characters'
import {
  useTheme,
  useDiffuseTheme,
  getModeColor,
  getModeColorSoft,
  getDiffuseAccent,
  getDiffuseAccentSoft,
  diffuseFont,
  diffuseFields,
} from '../../../constants/theme'
import { useIsDiffuse } from '../../../components/ui/diffuse/DiffuseKit'
import { useMenopauseOnboardingStore } from '../../../store/useMenopauseOnboardingStore'
import { useMenopauseStore } from '../../../store/useMenopauseStore'
import { useBehaviorStore } from '../../../store/useBehaviorStore'
import { supabase } from '../../../lib/supabase'
import { useJourneyStore } from '../../../store/useJourneyStore'
import { isDevModeActive } from '../../../store/useDevStore'
import { useOnboardingComplete } from '../../../hooks/useOnboardingComplete'
import type { MenopauseStage } from '../../../lib/menopauseStage'
import {
  ALL_MENOPAUSE_SYMPTOMS,
  type MenopauseSymptomId,
  type MenopauseGroup,
} from '../../../lib/menopauseSymptoms'

// ─── Copy (English literals — no menopause i18n keys exist yet) ──────────────

const COPY = {
  introQ: 'A calmer space for',
  introItalic: 'this season.',
  introBody:
    'This is a place to notice how you feel and track what changes — gently, at your own pace. No labels, no diagnoses. You can update anything anytime.',
  introCta: 'Begin',
  stageQ: 'Where are you right now?',
  stageNote: 'This is your call, not a diagnosis — change it whenever it feels right.',
  lastPeriodQ: 'When did your last period start?',
  lastPeriodSkip: 'Not sure',
  symptomsQ: 'What have you been noticing?',
  symptomsNote: 'Pick anything that feels relevant — or none.',
  hrtQ: 'Using HRT or other treatment?',
  hrtNote: 'Optional — it just helps tailor your space.',
  hrtYes: 'Yes, I am',
  hrtNo: 'Not right now',
  doneTitle: "You're all set.",
  doneBody: 'Your space is ready. We’ll keep it gentle and let you lead the way.',
  doneCta: 'Enter my space',
}

const STAGE_OPTIONS: { id: MenopauseStage; label: string; desc: string; icon: CharacterName }[] = [
  { id: 'peri', label: 'Perimenopause', desc: 'Still having periods, but they’re changing', icon: 'sun' },
  { id: 'meno', label: 'Around menopause', desc: 'Periods have mostly stopped recently', icon: 'phase' },
  { id: 'post', label: 'Postmenopause', desc: 'A year or more since my last period', icon: 'star' },
]

// Site-look stickers (non-diffuse only)
const STAGE_STICKERS: Record<MenopauseStage, SiteStickerName> = { peri: 'moon', meno: 'moon2', post: 'leaf' }
const SYMPTOM_STICKERS: Partial<Record<MenopauseSymptomId, SiteStickerName>> = {
  hot_flash: 'flame',
  night_sweat: 'drop',
  sleep: 'zz',
  fatigue: 'cloud',
  low_mood: 'face1',
  anxiety: 'bubble',
  brain_fog: 'brain',
  palpitations: 'heart',
  weight: 'ruler',
  vaginal_dryness: 'flower',
  libido: 'heart',
}

const GROUP_META: Record<MenopauseGroup, { label: string; icon: CharacterName }> = {
  vasomotor: { label: 'Temperature', icon: 'temperature' },
  sleep: { label: 'Sleep & energy', icon: 'sleep' },
  mood: { label: 'Mind & mood', icon: 'mood' },
  physical: { label: 'Body', icon: 'activity' },
  genitourinary: { label: 'Intimate', icon: 'heart' },
}
const GROUP_ORDER: MenopauseGroup[] = ['vasomotor', 'sleep', 'mood', 'physical', 'genitourinary']

// Diffuse per-stage bloom hues for the ChoiceTimeline halos — the `meno` field ramp.
const STAGE_BLOOMS = [diffuseFields.meno.g1, diffuseFields.meno.g2, diffuseFields.meno.g3]

// The store keeps `lastPeriodDate` as an ISO 'YYYY-MM-DD' string; DiffuseDotCalendar
// is controlled by a Date. Convert with LOCAL date parts (not toISOString) so an
// evening selection west of UTC doesn't slide to the previous day. Mirrors the
// cycle/kids onboarding helpers.
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

// ─── Resolved token palette (dual-variant, tokens only) ──────────────────────

function useMenoPalette() {
  const { colors, radius, font, isDark } = useTheme()
  const dt = useDiffuseTheme()
  const diffuse = useIsDiffuse()

  if (diffuse) {
    return {
      diffuse: true,
      // Diffuse must never borrow current-system radius — use dt.radius so the
      // whole palette stays inside one token set (no current+Diffuse mixing).
      radius: dt.radius,
      accent: getDiffuseAccent('menopause', dt.isDark),
      accentSoft: getDiffuseAccentSoft('menopause', dt.isDark),
      bg: dt.colors.bg,
      surface: dt.colors.surface,
      border: dt.colors.line,
      text: dt.colors.ink,
      textSecondary: dt.colors.ink2,
      textMuted: dt.colors.ink3,
      fontDisplay: diffuseFont.display,
      fontBody: diffuseFont.body,
      fontBodyMedium: diffuseFont.bodyMedium,
      fontBodySemiBold: diffuseFont.bodySemiBold,
    } as const
  }
  return {
    diffuse: false,
    radius: { ...radius, md: 14, lg: 18 },
    accent: getModeColor('menopause', isDark),
    accentSoft: getModeColorSoft('menopause', isDark),
    bg: colors.bg,
    surface: colors.surface,
    border: colors.text,
    text: colors.text,
    textSecondary: colors.textSecondary,
    textMuted: colors.textMuted,
    fontDisplay: font.display,
    fontBody: font.body,
    fontBodyMedium: font.bodyBold,
    fontBodySemiBold: font.bodyBold,
  } as const
}

// ─── Step IDs + ordering ─────────────────────────────────────────────────────

type StepId = 'intro' | 'stage' | 'last_period' | 'symptoms' | 'hrt' | 'complete'

function getSteps(stage: MenopauseStage | null): StepId[] {
  const steps: StepId[] = ['intro', 'stage']
  // Postmenopause users are (by their own definition) a year+ past their last
  // period — skip the date question entirely for them.
  if (stage !== 'post') steps.push('last_period')
  steps.push('symptoms', 'hrt', 'complete')
  return steps
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function MenopauseOnboarding() {
  const store = useMenopauseOnboardingStore()
  const { handleComplete: onboardingComplete } = useOnboardingComplete()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  // Re-entrancy guard against a double-tap on the finish CTA — every path in
  // saveAndFinish navigates away, so it's set once and never released.
  const savingRef = useRef(false)

  const steps = getSteps(store.stage)
  const currentStep = steps[Math.min(currentIndex, steps.length - 1)]
  const totalSteps = steps.length - 1 // exclude 'complete' from the counter

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, getSteps(useMenopauseOnboardingStore.getState().stage).length - 1))
  }, [])

  const goBack = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1))
  }, [])

  const handleClose = useCallback(() => {
    store.reset()
    router.back()
  }, [store])

  async function saveAndFinish(): Promise<void> {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)

    const stage = store.stage
    const lastPeriodDate = store.lastPeriodDate

    // Dev mode: dry run — skip every DB write AND the durable-store mutations
    // below (useMenopauseStore is NOT in the dev snapshot, so writing it here
    // would leak past exit()). Just clear the ephemeral buffer + advance the
    // shared queue, exactly like the cycle flow's dev short-circuit.
    if (isDevModeActive()) {
      useMenopauseOnboardingStore.getState().reset()
      return onboardingComplete('menopause')
    }

    // DB writes are best-effort — a failure still enrolls locally + navigates so
    // the user is never stranded (mirrors the cycle flow's non-blocking finish).
    try {
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user.id
      if (!userId) {
        // No session = signed out. Don't enroll a journey we couldn't save — it
        // would open later as an empty home. Send them to sign in instead.
        useMenopauseOnboardingStore.getState().reset()
        router.replace('/(auth)/welcome')
        return
      }
      if (userId) {
        // upsert (NOT update): a menopause-first user has no profiles row yet,
        // and .update() matches 0 rows — silently losing stage + last period.
        // Persist journey mode + the shared name/dob (captured in the earlier
        // "About you" step) alongside so a cold restart doesn't reset the mode.
        const parentName = useJourneyStore.getState().parentName ?? null
        const parentDob = useJourneyStore.getState().parentDob ?? null
        const profilePayload: Record<string, unknown> = {
          id: userId,
          journey_mode: 'menopause',
          menopause_stage: stage,
          last_period_date: lastPeriodDate,
        }
        if (parentName) profilePayload.name = parentName
        if (parentDob) profilePayload.dob = parentDob
        const { error: profileErr } = await supabase
          .from('profiles')
          .upsert(profilePayload, { onConflict: 'id' })
        if (profileErr) console.warn('[menopause onboarding] profile upsert failed:', profileErr.message)

        // 1:1 db behavior type (no alias, unlike pre-pregnancy → 'cycle').
        const { error: behaviorErr } = await supabase.from('behaviors').upsert(
          { user_id: userId, type: 'menopause', active: true },
          { onConflict: 'user_id,type' },
        )
        if (behaviorErr) console.warn('[menopause onboarding] behaviors upsert failed:', behaviorErr.message)
      }
    } catch (e) {
      console.warn('Failed to save menopause onboarding:', e)
    }

    if (stage) useMenopauseStore.getState().setStage(stage)
    useMenopauseStore.getState().setLastPeriodDate(lastPeriodDate)
    useBehaviorStore.getState().enroll('menopause')
    useMenopauseOnboardingStore.getState().reset()
    // Shared onboarding-complete contract: advances the persisted onboarding
    // queue (routes to the transition screen if more flows are queued) and flips
    // the active mode via setModeUnsafe once the enroll above has landed.
    // Replaces the old hardcoded setMode('menopause') + router.replace('/(tabs)').
    onboardingComplete('menopause')
  }

  if (currentStep === 'complete') {
    return <CompletionScreen onFinish={saveAndFinish} saving={saving} />
  }

  return (
    <OnboardingNavProvider onBack={currentIndex > 0 ? goBack : undefined} onClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {currentStep === 'intro' && <StepIntro step={currentIndex + 1} total={totalSteps} onContinue={goNext} />}
        {currentStep === 'stage' && <StepStage step={currentIndex + 1} total={totalSteps} onContinue={goNext} />}
        {currentStep === 'last_period' && (
          <StepLastPeriod step={currentIndex + 1} total={totalSteps} onContinue={goNext} onSkip={goNext} />
        )}
        {currentStep === 'symptoms' && (
          <StepSymptoms step={currentIndex + 1} total={totalSteps} onContinue={goNext} onSkip={goNext} />
        )}
        {currentStep === 'hrt' && <StepHrt step={currentIndex + 1} total={totalSteps} onContinue={goNext} />}
      </KeyboardAvoidingView>
    </OnboardingNavProvider>
  )
}

// ─── STEP: Intro ─────────────────────────────────────────────────────────────

function StepIntro({ step, total, onContinue }: { step: number; total: number; onContinue: () => void }) {
  const pal = useMenoPalette()
  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="menopause"
      question={COPY.introQ}
      italicSuffix={COPY.introItalic}
      sticker={<SiteSticker name="flame" size={48} cut />}
      onContinue={onContinue}
      continueLabel={COPY.introCta}
    >
      {pal.diffuse ? (
        <View style={[styles.introCard, { backgroundColor: pal.accentSoft, borderColor: pal.border, borderRadius: pal.radius.lg }]}>
          <Text style={[styles.introBody, { color: pal.text, fontFamily: pal.fontBody }]}>{COPY.introBody}</Text>
        </View>
      ) : (
        <HandDrawnBox fill={pal.accentSoft} stroke={pal.text} radius={20} seed="meno-intro" style={styles.introCardSite}>
          <Text style={[styles.introBody, { color: pal.text, fontFamily: pal.fontBody }]}>{COPY.introBody}</Text>
        </HandDrawnBox>
      )}
    </OnboardingStep>
  )
}

// ─── STEP: Stage self-select ─────────────────────────────────────────────────

function StepStage({ step, total, onContinue }: { step: number; total: number; onContinue: () => void }) {
  const pal = useMenoPalette()
  const stage = useMenopauseOnboardingStore((s) => s.stage)
  const setStage = useMenopauseOnboardingStore((s) => s.setStage)

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="menopause"
      question={COPY.stageQ}
      sticker={<SiteSticker name="moon2" size={48} cut />}
      onContinue={onContinue}
      continueDisabled={!stage}
    >
      {pal.diffuse ? (
        // Diffuse: shared vertical connector-line single-select (ring-dot nodes +
        // per-stage bloom halo), matching the kids caregiver step.
        <ChoiceTimeline
          options={STAGE_OPTIONS.map((opt, i) => ({
            key: opt.id,
            label: opt.label,
            sub: opt.desc,
            bloomColor: STAGE_BLOOMS[i % STAGE_BLOOMS.length],
          }))}
          value={stage}
          onChange={(k) => setStage(k as MenopauseStage)}
        />
      ) : (
        <View style={styles.optionList}>
          {STAGE_OPTIONS.map((opt) => {
            const selected = stage === opt.id
            return (
              <SiteChoice
                key={opt.id}
                label={opt.label}
                sub={opt.desc}
                selected={selected}
                onPress={() => setStage(opt.id)}
                tone={pal.accentSoft}
                sticker={STAGE_STICKERS[opt.id]}
                align="start"
              />
            )
          })}
        </View>
      )}
      <Text style={[styles.note, { color: pal.textMuted, fontFamily: pal.fontBody }]}>{COPY.stageNote}</Text>
    </OnboardingStep>
  )
}

// ─── STEP: Last period date ──────────────────────────────────────────────────

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
  const pal = useMenoPalette()
  const date = useMenopauseOnboardingStore((s) => s.lastPeriodDate)
  const setDate = useMenopauseOnboardingStore((s) => s.setLastPeriodDate)

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="menopause"
      question={COPY.lastPeriodQ}
      sticker={<SiteSticker name="cal" size={48} cut />}
      onContinue={onContinue}
      onSkip={onSkip}
      continueDisabled={!date}
    >
      {pal.diffuse ? (
        // Diffuse: shared hairline dot-grid calendar (bounds only via minimumDate,
        // matching the cycle/kids date steps). The Continue gate still requires a pick.
        <DiffuseDotCalendar
          value={isoToDate(date || null)}
          onChange={(d) => setDate(dateToIso(d))}
          accent={pal.accent}
        />
      ) : (
        <View style={styles.centered}>
          <DatePickerField
            inline
            label=""
            value={date || ''}
            onChange={setDate}
            placeholder={COPY.lastPeriodSkip}
            modalTitle={COPY.lastPeriodQ}
            maximumDate={new Date()}
            accentColor={pal.accent}
          />
        </View>
      )}
    </OnboardingStep>
  )
}

// ─── STEP: Symptoms multi-select ─────────────────────────────────────────────

function StepSymptoms({
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
  const pal = useMenoPalette()
  const symptoms = useMenopauseOnboardingStore((s) => s.symptoms)
  const setSymptoms = useMenopauseOnboardingStore((s) => s.setSymptoms)

  const toggle = (id: MenopauseSymptomId) => {
    setSymptoms(symptoms.includes(id) ? symptoms.filter((x) => x !== id) : [...symptoms, id])
  }

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="menopause"
      question={COPY.symptomsQ}
      sticker={<SiteSticker name="thermo" size={48} cut />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.symptomScroll}>
        {GROUP_ORDER.map((group) => {
          const items = ALL_MENOPAUSE_SYMPTOMS.filter((s) => s.group === group)
          const meta = GROUP_META[group]
          return (
            <View key={group} style={styles.groupBlock}>
              <View style={styles.groupHead}>
                <Character name={meta.icon} size={20} color={pal.accent} bg={pal.bg} />
                <Text style={[styles.groupLabel, { color: pal.textMuted, fontFamily: pal.diffuse ? pal.fontBodySemiBold : 'SpaceMono_400Regular' }]}>
                  {meta.label}
                </Text>
              </View>
              {pal.diffuse ? (
                // Diffuse: shared hairline mono chip cluster (multi), one per group —
                // matches the kids allergies step. Global symptom array is spliced
                // per group so each BloomChips only owns its own ids.
                <BloomChips
                  options={items.map((s) => ({ key: s.id, label: s.label }))}
                  value={symptoms.filter((id) => items.some((s) => s.id === id))}
                  onChange={(next) => {
                    const others = symptoms.filter((id) => !items.some((s) => s.id === id))
                    setSymptoms([...others, ...(next as MenopauseSymptomId[])])
                  }}
                />
              ) : (
                <View style={styles.chipWrap}>
                  {items.map((s) => {
                    const selected = symptoms.includes(s.id)
                    return (
                      <SiteChoice
                        key={s.id}
                        label={s.label}
                        selected={selected}
                        onPress={() => toggle(s.id)}
                        tone={pal.accentSoft}
                        sticker={SYMPTOM_STICKERS[s.id]}
                      />
                    )
                  })}
                </View>
              )}
            </View>
          )
        })}
        <Text style={[styles.note, { color: pal.textMuted, fontFamily: pal.fontBody }]}>{COPY.symptomsNote}</Text>
      </ScrollView>
    </OnboardingStep>
  )
}

// ─── STEP: HRT / treatment ───────────────────────────────────────────────────

function StepHrt({ step, total, onContinue }: { step: number; total: number; onContinue: () => void }) {
  const pal = useMenoPalette()
  const onHrt = useMenopauseOnboardingStore((s) => s.onHrt)
  const setOnHrt = useMenopauseOnboardingStore((s) => s.setOnHrt)

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="menopause"
      question={COPY.hrtQ}
      sticker={<SiteSticker name="syringe" size={48} cut />}
      onContinue={onContinue}
    >
      {pal.diffuse ? (
        // Diffuse: shared binary 2-blob single-select — matches the cycle
        // temperature-tracking step.
        <PoleField
          options={[
            { key: 'yes', label: COPY.hrtYes, color: diffuseFields.meno.g2 },
            { key: 'no', label: COPY.hrtNo, color: diffuseFields.meno.g4 },
          ]}
          value={onHrt ? 'yes' : 'no'}
          onChange={(k) => setOnHrt(k === 'yes')}
        />
      ) : (
        <View style={styles.toggleRow}>
          <TogglePill label={COPY.hrtYes} active={onHrt} onPress={() => setOnHrt(true)} />
          <TogglePill label={COPY.hrtNo} active={!onHrt} onPress={() => setOnHrt(false)} />
        </View>
      )}
      <Text style={[styles.note, { color: pal.textMuted, fontFamily: pal.fontBody }]}>{COPY.hrtNote}</Text>
    </OnboardingStep>
  )
}

function TogglePill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const pal = useMenoPalette()
  if (!pal.diffuse) {
    return <SiteChoice label={label} selected={active} onPress={onPress} tone={pal.accentSoft} style={{ flex: 1 }} />
  }
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.togglePill,
        {
          backgroundColor: active ? pal.accentSoft : pal.surface,
          borderColor: pal.border,
          borderRadius: pal.radius.lg,
        },
      ]}
    >
      <Text style={[styles.togglePillText, { color: pal.text, fontFamily: pal.fontBodySemiBold }]}>
        {label}
      </Text>
    </Pressable>
  )
}

// ─── Completion screen ───────────────────────────────────────────────────────

function CompletionScreen({ onFinish, saving }: { onFinish: () => void; saving: boolean }) {
  const insets = useSafeAreaInsets()
  const pal = useMenoPalette()
  const symptomCount = useMenopauseOnboardingStore((s) => s.symptoms.length)
  const stage = useMenopauseOnboardingStore((s) => s.stage)
  const stageLabel = STAGE_OPTIONS.find((o) => o.id === stage)?.label ?? null

  return (
    <View style={[completeStyles.root, { backgroundColor: pal.bg }]}>
      <ScrollView contentContainerStyle={completeStyles.content} showsVerticalScrollIndicator={false}>
        {pal.diffuse ? (
          <View style={[completeStyles.iconCircle, { backgroundColor: pal.accentSoft, borderColor: pal.border }]}>
            <SiteSticker name="flame" size={52} cut />
          </View>
        ) : (
          <CelebrateHero sticker="flame" tone={pal.accentSoft} confetti={['leaf', 'moon2', 'heart', 'star', 'thermo', 'flower']} />
        )}

        <Text style={[completeStyles.title, { color: pal.text, fontFamily: pal.fontDisplay }]}>{COPY.doneTitle}</Text>
        <Text style={[completeStyles.message, { color: pal.textSecondary, fontFamily: pal.fontBody }]}>{COPY.doneBody}</Text>

        {pal.diffuse ? (
          <View style={[completeStyles.summary, { backgroundColor: pal.surface, borderColor: pal.border, borderRadius: pal.radius.lg }]}>
          {stageLabel && (
            <SummaryRow icon="phase" label="Stage" value={stageLabel} pal={pal} />
          )}
          <SummaryRow
            icon="health"
            label="Tracking"
            value={symptomCount > 0 ? `${symptomCount} thing${symptomCount === 1 ? '' : 's'}` : 'Nothing yet'}
            pal={pal}
            last
          />
          </View>
        ) : (
          <FadeUp index={0} delay={700} style={{ alignSelf: 'stretch' }}>
            <HandDrawnBox fill={pal.surface} stroke={pal.text} radius={20} seed="meno-summary" style={completeStyles.summarySite}>
          {stageLabel && (
            <SummaryRow icon="phase" label="Stage" value={stageLabel} pal={pal} />
          )}
          <SummaryRow
            icon="health"
            label="Tracking"
            value={symptomCount > 0 ? `${symptomCount} thing${symptomCount === 1 ? '' : 's'}` : 'Nothing yet'}
            pal={pal}
            last
          />
            </HandDrawnBox>
          </FadeUp>
        )}
      </ScrollView>

      <View style={[completeStyles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {pal.diffuse ? (
          <PillButton label={COPY.doneCta} variant="ink" onPress={onFinish} loading={saving} disabled={saving} />
        ) : (
          <EyeAction label={COPY.doneCta} onPress={onFinish} ink={pal.text} loading={saving} disabled={saving} sticker="leaf" fill={ACTION_TONES.yellow} delay={900} />
        )}
      </View>
    </View>
  )
}

function SummaryRow({
  icon,
  label,
  value,
  pal,
  last,
}: {
  icon: CharacterName
  label: string
  value: string
  pal: ReturnType<typeof useMenoPalette>
  last?: boolean
}) {
  return (
    <View style={[completeStyles.summaryRow, !last && { borderBottomWidth: pal.diffuse ? 1 : 0.75, borderBottomColor: pal.border }]}>
      {pal.diffuse
        ? <Character name={icon} size={22} color={pal.accent} bg={pal.bg} />
        : <SiteSticker name={icon === 'phase' ? 'moon' : 'thermo'} size={26} cut />}
      <Text style={[completeStyles.summaryLabel, { color: pal.diffuse ? pal.textMuted : pal.text, fontFamily: pal.fontBody }]}>{label}</Text>
      {pal.diffuse ? (
        <Text style={[completeStyles.summaryValue, { color: pal.text, fontFamily: pal.fontDisplay }]}>{value}</Text>
      ) : (
        <View style={[completeStyles.summaryTag, { backgroundColor: pal.accentSoft, borderColor: pal.text }]}>
          <Text style={[completeStyles.summaryValue, { color: pal.text, fontFamily: pal.fontBodyMedium }]}>{value}</Text>
        </View>
      )}
    </View>
  )
}

// ─── Styles (layout only — all colors/fonts injected from tokens) ────────────

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center', flex: 1 },

  introCard: { padding: 20, borderWidth: 1.5 },
  introCardSite: { padding: 20 },
  introBody: { fontSize: 16, lineHeight: 24 },

  optionList: { gap: 12 },

  note: { fontSize: 13, lineHeight: 19, marginTop: 16 },

  symptomScroll: { paddingBottom: 8 },
  groupBlock: { marginBottom: 18 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  groupLabel: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  toggleRow: { flexDirection: 'row', gap: 12 },
  togglePill: { flex: 1, paddingVertical: 18, alignItems: 'center', borderWidth: 1.5 },
  togglePillText: { fontSize: 16 },
})

const completeStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center' },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 18,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 28, letterSpacing: 0.2, textTransform: 'uppercase', textAlign: 'center' },
  message: { fontSize: 16, textAlign: 'center', lineHeight: 24, maxWidth: 320 },
  summary: { width: '100%', borderWidth: 1.5, paddingHorizontal: 18, marginTop: 8 },
  summarySite: { width: '100%', paddingHorizontal: 18, marginTop: 4 },
  summaryTag: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, transform: [{ rotate: '-2deg' }] },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 },
  summaryLabel: { flex: 1, fontSize: 14 },
  summaryValue: { fontSize: 16 },
  bottom: { paddingHorizontal: 24 },
})
