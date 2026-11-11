/**
 * JourneyTransitionHost — the sheets that move a user between journeys. Mounted once in the
 * tabs layout so they survive the home swapping underneath (every log form lives in the tabs).
 *
 *   • Positive pregnancy test (Cycle) → "Congratulations — want to start tracking your
 *     pregnancy?" Start → pregnancy onboarding (LMP prefilled) · Not now → nothing changes.
 *   • After that onboarding lands on Pregnancy → keep or end cycle tracking.
 *   • Baby arrived → a short celebration on the Kids home.
 *
 * Owner-only: hidden while a caregiver is looking at someone else's child.
 */

import { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native'
import { useTheme, getModeColorSoft } from '../../constants/theme'
import { LogSheet } from '../calendar/LogSheet'
import { PillButton } from '../ui/PillButton'
import { CelebrateHero } from '../onboarding/Celebrate'
import { useTranslation } from '../../lib/i18n'
import { afterSheets } from '../../lib/afterSheets'
import { endJourney, startPregnancyFromTest } from '../../lib/journeyTransitionActions'
import { useJourneyTransitionStore } from '../../store/useJourneyTransitionStore'
import { useBehaviorStore } from '../../store/useBehaviorStore'
import { useModeStore } from '../../store/useModeStore'
import { useChildStore } from '../../store/useChildStore'
import { useCycleOnboardingStore } from '../../store/useCycleOnboardingStore'
import { usePushPromptStore } from '../../store/usePushPromptStore'

function SheetText({ children }: { children: string }) {
  const { colors, font } = useTheme()
  return <Text style={[styles.body, { color: colors.textSecondary, fontFamily: font.body }]}>{children}</Text>
}

function SecondaryAction({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { colors, font } = useTheme()
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} accessibilityRole="button" style={styles.secondary}>
      <Text style={[styles.secondaryText, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>{label}</Text>
    </Pressable>
  )
}

// ─── Positive test → start pregnancy? ─────────────────────────────────────────

function PositiveTestSheet() {
  const { t } = useTranslation()
  const pending = useJourneyTransitionStore((s) => s.pendingPositiveTest)
  const resolve = useJourneyTransitionStore((s) => s.resolvePositiveTest)

  function start() {
    if (!pending) return
    const date = pending.date
    resolve()
    afterSheets(() => { void startPregnancyFromTest(date) })
  }

  return (
    <LogSheet visible={!!pending} title={t('posTest_title')} onClose={resolve} sticker="otest">
      <View style={styles.wrap}>
        <SheetText>{t('posTest_body')}</SheetText>
        <PillButton label={t('posTest_start')} variant="ink" onPress={start} style={styles.primary} />
        <SecondaryAction label={t('posTest_notNow')} onPress={resolve} />
      </View>
    </LogSheet>
  )
}

// ─── After the pregnancy onboarding: keep or end cycle tracking ───────────────

function KeepCycleSheet() {
  const { t } = useTranslation()
  const ask = useJourneyTransitionStore((s) => s.askKeepCycle)
  const setAsk = useJourneyTransitionStore((s) => s.setAskKeepCycle)
  const enrolled = useBehaviorStore((s) => s.enrolledBehaviors)
  const hydrated = useBehaviorStore((s) => s.hydrated)
  const mode = useModeStore((s) => s.mode)
  const [ending, setEnding] = useState(false)
  const endingRef = useRef(false)

  // The end-of-onboarding notifications sheet goes first; two sheets can't present at once.
  const pushPending = usePushPromptStore((s) => s.pending)

  const hasCycle = enrolled.includes('pre-pregnancy')
  const visible = ask && hydrated && hasCycle && enrolled.includes('pregnancy') && mode === 'pregnancy' && !pushPending

  // Nothing to ask once cycle tracking is already gone.
  useEffect(() => {
    if (ask && hydrated && !hasCycle) setAsk(false)
  }, [ask, hydrated, hasCycle, setAsk])

  function done() {
    setAsk(false)
    useCycleOnboardingStore.getState().setLastPeriodDate(null)
  }

  async function endCycle() {
    if (endingRef.current) return
    endingRef.current = true
    setEnding(true)
    try {
      await endJourney('pre-pregnancy')
      done()
    } catch (e) {
      console.warn('[keepCycle] end cycle failed:', e instanceof Error ? e.message : String(e))
      // Nothing changed — the sheet stays open to try again.
      Alert.alert(t('keepCycle_errorTitle'), t('keepCycle_errorBody'))
    } finally {
      endingRef.current = false
      setEnding(false)
    }
  }

  return (
    <LogSheet visible={visible} title={t('keepCycle_title')} onClose={ending ? () => {} : done} sticker="flower">
      <View style={styles.wrap}>
        <SheetText>{t('keepCycle_body')}</SheetText>
        <PillButton label={t('keepCycle_keep')} variant="ink" onPress={done} disabled={ending} style={styles.primary} />
        <PillButton label={t('keepCycle_end')} variant="paper" onPress={endCycle} loading={ending} style={styles.primarySecond} />
      </View>
    </LogSheet>
  )
}

// ─── Baby arrived → celebration on the Kids home ──────────────────────────────

function BabyCelebrationSheet() {
  const { t } = useTranslation()
  const { colors, font, isDark } = useTheme()
  const celebrate = useJourneyTransitionStore((s) => s.celebrateBaby)
  const setCelebrate = useJourneyTransitionStore((s) => s.setCelebrateBaby)
  const mode = useModeStore((s) => s.mode)
  const visible = !!celebrate && mode === 'kids'
  const close = () => setCelebrate(null)

  return (
    <LogSheet visible={visible} title={t('babyArrived_celebrateTitle', { name: celebrate?.name ?? '' })} onClose={close} sticker="baby">
      <View style={styles.wrap}>
        {visible ? (
          <CelebrateHero sticker="baby" tone={getModeColorSoft('kids', isDark)} confetti={['star', 'heart', 'bottle', 'bodysuit', 'stroller', 'crib']} />
        ) : null}
        <Text style={[styles.body, styles.center, { color: colors.textSecondary, fontFamily: font.body }]}>{t('babyArrived_celebrateBody')}</Text>
        <PillButton label={t('babyArrived_celebrateCta')} variant="ink" onPress={close} style={styles.primary} />
      </View>
    </LogSheet>
  )
}

export function JourneyTransitionHost() {
  const activeChild = useChildStore((s) => s.activeChild)
  // Caregiver context: these are the owner's decisions, never a caregiver's.
  if (activeChild && activeChild.caregiverRole !== 'parent') return null
  return (
    <>
      <PositiveTestSheet />
      <KeepCycleSheet />
      <BabyCelebrationSheet />
    </>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 4, paddingBottom: 12 },
  body: { fontSize: 15.5, lineHeight: 23 },
  center: { textAlign: 'center' },
  primary: { marginTop: 18 },
  primarySecond: { marginTop: 10 },
  secondary: { alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 12 },
  secondaryText: { fontSize: 15 },
})
