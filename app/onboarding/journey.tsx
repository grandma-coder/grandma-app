/**
 * Journey Selection Screen (Apr 2026 redesign)
 *
 * Two modes:
 * 1. FIRST TIME (no enrolled behaviors): multi-select, full onboarding.
 * 2. ADD MODE (from Profile): only un-enrolled behaviors selectable,
 *    enrolled shown as dimmed. Single-select, adds to existing journeys.
 */

import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, stickers, getModeColor, getModeColorSoft, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useBehaviorStore, type Behavior } from '../../store/useBehaviorStore'
import { useOnboardingStore } from '../../store/useOnboardingStore'
import { useModeStore } from '../../store/useModeStore'
import { Flower, Heart, Star } from '../../components/ui/Stickers'
import { Display, DisplayItalic, Body } from '../../components/ui/Typography'
import { PillButton } from '../../components/ui/PillButton'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { AuraField, AURA } from '../../components/ui/diffuse/AuraField'
import { DiffuseSolidCTA, DiffuseTextLink } from '../../components/ui/diffuse/DiffuseActions'
import { BlobPicker, type BlobOption } from '../../components/ui/diffuse/pickers/BlobPicker'
import { useTranslation } from '../../lib/i18n'

interface JourneyOption {
  id: Behavior
  title: string
  subtitle: string
  sticker: (color: string) => React.ReactNode
  modeKey: 'pre' | 'preg' | 'kids'
  /** Diffuse blob field: color (blob `--c` first stop) + CENTER anchor coords. */
  blobColor: string
  blobCx: string
  blobCy: string
}

const FIRST_ROUTE: Record<Behavior, string> = {
  'pre-pregnancy': '/onboarding/cycle',
  pregnancy: '/onboarding/pregnancy',
  kids: '/onboarding/kids',
}

export default function JourneyScreen() {
  const insets = useSafeAreaInsets()
  const { colors, font, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const params = useLocalSearchParams<{ addMode?: string; preselect?: string }>()

  const isAddMode = params.addMode === 'true'
  const preselect = params.preselect as Behavior | undefined

  const JOURNEYS: JourneyOption[] = [
    {
      id: 'pre-pregnancy',
      title: t('onboardingJourney_trying'),
      subtitle: t('onboardingJourney_cycleSubtitle'),
      sticker: (color) => <Flower size={44} petal={color} center={stickers.yellow} />,
      modeKey: 'pre',
      blobColor: '#F2654E',
      blobCx: '28%',
      blobCy: '22%',
    },
    {
      id: 'pregnancy',
      title: t('onboardingJourney_pregnant'),
      subtitle: t('onboardingJourney_pregnantSubtitle'),
      sticker: (color) => <Heart size={42} fill={color} />,
      modeKey: 'preg',
      blobColor: '#B06AD8',
      blobCx: '72%',
      blobCy: '34%',
    },
    {
      id: 'kids',
      title: t('onboardingJourney_parenting'),
      subtitle: t('onboardingJourney_parentingSubtitle'),
      sticker: (color) => <Star size={44} fill={color} />,
      modeKey: 'kids',
      blobColor: '#46C173',
      blobCx: '30%',
      blobCy: '62%',
    },
  ]

  const enrolledBehaviors = useBehaviorStore((s) => s.enrolledBehaviors)
  const enroll = useBehaviorStore((s) => s.enroll)
  const switchTo = useBehaviorStore((s) => s.switchTo)
  const buildQueue = useOnboardingStore((s) => s.buildQueue)
  // Onboarding stages the mode before the per-mode flow finishes calling
  // enroll() — use the unsafe setter so the guard doesn't reject it.
  const setMode = useModeStore((s) => s.setModeUnsafe)

  // Both first-time and add-mode buffer selections in local state and only
  // persist on continue. Previously, first-time mode toggled the persisted
  // `enrolledBehaviors` store on every card tap — an app kill between tap
  // and continue left the user with a half-enrolled behavior and the root
  // guard treating onboarding as "complete" with no data behind it.
  const [newSelections, setNewSelections] = useState<Behavior[]>([])

  // When deep-linked from a locked ModeSwitcher pill, pre-select that
  // journey so the user only needs to tap "Add Journey" to confirm.
  useEffect(() => {
    if (preselect && isAddMode && !enrolledBehaviors.includes(preselect)) {
      setNewSelections([preselect])
    }
  }, [preselect, isAddMode, enrolledBehaviors])

  const bg = colors.bg
  const paper = colors.surface
  const paperBorder = colors.border
  const ink = colors.text
  const ink3 = colors.textMuted
  const ink4 = colors.textFaint

  const unenrolledBehaviors = JOURNEYS.filter((j) => !enrolledBehaviors.includes(j.id))
  const allEnrolled = unenrolledBehaviors.length === 0

  const selections = newSelections
  const hasSelection = selections.length > 0

  function handleToggle(b: Behavior) {
    setNewSelections((prev) => {
      if (isAddMode) {
        // Add-mode: single-select replacement.
        return prev.includes(b) ? [] : [b]
      }
      // First-time: multi-select toggle.
      return prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    })
  }

  // Diffuse blob-field data (only consumed by the diffuse branch). Each journey
  // maps to a BlobOption carrying the same center-anchor cx/cy the inline blobs
  // used. Already-enrolled journeys are dimmed in add-mode. BlobPicker.onChange
  // hands back the option key (always a Behavior id here) → handleToggle.
  const blobOptions: BlobOption[] = JOURNEYS.map((journey) => ({
    key: journey.id,
    kicker: journey.subtitle,
    name: journey.title,
    color: journey.blobColor,
    cx: journey.blobCx,
    cy: journey.blobCy,
  }))
  const dimmedKeys = isAddMode ? enrolledBehaviors : []
  const handleBlobChange = (key: string) => handleToggle(key as Behavior)

  function handleContinue() {
    if (!hasSelection) return

    if (isAddMode) {
      const behavior = newSelections[0]
      if (!behavior) return
      enroll(behavior)
      buildQueue([behavior])
      setMode(behavior)
      switchTo(behavior)
      router.replace(FIRST_ROUTE[behavior] as any)
      return
    }
    // P2-73: do NOT enroll all selections up front. Each per-mode flow enrolls
    // itself only after its server write succeeds (see each saveAndFinish), so
    // killing the app mid-queue can't leave the user enrolled in a mode whose
    // data never persisted. We enroll only `first` here — switchTo() no-ops
    // unless the target is already enrolled, and we need the first mode active
    // to render its flow. The queue (useOnboardingStore) drives progression to
    // the remaining modes independently of enrollment.
    buildQueue(newSelections)
    const first = useOnboardingStore.getState().currentOnboarding
    if (!first) return
    enroll(first)
    setMode(first)
    switchTo(first)
    // B5: capture name + DOB once, before the first per-mode flow. about-you
    // persists to useJourneyStore (read by each saveAndFinish) then continues
    // to the first mode's route.
    router.push({
      pathname: '/onboarding/about-you',
      params: { next: FIRST_ROUTE[first] },
    } as any)
  }

  // ─── Diffuse (v3) render — GENERAL 01 · journey picker ───────────────────
  // Additive branch; the cream render below is unchanged and all enrollment
  // logic (handleToggle/handleContinue/enroll) is shared. Layout mirrors the
  // GENERAL 01 frame: aura field (one bloom per journey color) → mono step
  // kicker → serif "Where are / you right now?" → free-floating blob field →
  // "Skip for now" text link + solid continue CTA. The HTML frame is single-
  // select, but this screen is a multi-select enrollment picker; per "match
  // look, not flow" the blobs keep the existing multi-select toggle — selected
  // state is driven by newSelections, enrolled-in-add-mode blobs are dimmed.
  // No fills, no pills, no shadows — hairlines + blooms only.
  if (diffuse) {
    return (
      <AuraField blooms={AURA.journey}>
        <ScrollView
          contentContainerStyle={[
            dStyles.scroll,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Step / add kicker */}
          <Text style={[dStyles.step, { fontFamily: diffuseFont.mono, color: dt.colors.ink3 }]}>
            {isAddMode ? t('onboardingJourney_addTitle') : 'step 01 / 02'}
          </Text>

          {/* Serif question */}
          <Text style={[dStyles.q, { fontFamily: diffuseFont.display, color: dt.colors.ink }]}>
            {isAddMode ? t('onboardingJourney_addHeading1') : t('onboardingJourney_heading1')}
          </Text>
          <Text style={[dStyles.qItalic, { fontFamily: diffuseFont.italic, color: dt.colors.ink }]}>
            {isAddMode ? t('onboardingJourney_addHeading2') : t('onboardingJourney_heading2')}
          </Text>
          <Text style={[dStyles.qsub, { fontFamily: diffuseFont.body, color: dt.colors.ink2 }]}>
            {isAddMode ? t('onboardingJourney_addSubtitle') : t('onboardingJourney_subtitle')}
          </Text>

          {/* Blob field — free-floating bloom circles via the shared BlobPicker
              primitive. Wired to the existing multi-select toggle: selectedKeys
              drives the bright/scaled state, disabledKeys dims already-enrolled
              journeys in add-mode. Center-anchor cx/cy come straight from each
              JOURNEYS entry (same coords the inline version used). */}
          <View style={dStyles.blobfield}>
            <BlobPicker
              options={blobOptions}
              value={null}
              onChange={handleBlobChange}
              selectedKeys={newSelections}
              disabledKeys={dimmedKeys}
            />
          </View>
        </ScrollView>

        {/* Footer — skip link + continue CTA */}
        <View style={[dStyles.footer, { paddingBottom: insets.bottom + 20 }]}>
          {hasSelection && (
            <DiffuseSolidCTA
              label={isAddMode ? t('onboardingJourney_addCta') : t('auth_continue')}
              onPress={handleContinue}
            />
          )}
          <View style={dStyles.skipRow}>
            <DiffuseTextLink label={t('onboardingTransition_skip')} onPress={() => router.back()} />
          </View>
        </View>
      </AuraField>
    )
  }

  // All enrolled — warm empty state
  if (isAddMode && allEnrolled) {
    return (
      <View style={[styles.root, { backgroundColor: bg }]}>
        <View style={[styles.emptyWrap, { paddingTop: insets.top + 80 }]}>
          <View style={[styles.emptyIcon, { backgroundColor: paper, borderColor: paperBorder }]}>
            <Heart size={52} fill={stickers.coral} />
          </View>
          <Display align="center" size={28} color={ink}>
            {t('onboardingJourney_allEnrolled1')}
          </Display>
          <DisplayItalic align="center" size={28} color={ink}>
            {t('onboardingJourney_allEnrolled2')}
          </DisplayItalic>
          <Body align="center" color={ink3} style={{ marginTop: 12, maxWidth: 300 }}>
            {t('onboardingJourney_allEnrolledBody')}
          </Body>
          <PillButton
            label={t('onboardingJourney_backToProfile')}
            variant="ink"
            onPress={() => router.back()}
            style={{ marginTop: 24, alignSelf: 'stretch' }}
          />
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 140 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          hideBack={!isAddMode}
          title={isAddMode ? t('onboardingJourney_addTitle') : '1 / 10'}
          style={{ marginBottom: 24 }}
        />

        {/* Heading */}
        <Display size={40} color={ink}>
          {isAddMode ? t('onboardingJourney_addHeading1') : t('onboardingJourney_heading1')}
        </Display>
        <DisplayItalic size={40} color={ink} style={{ marginBottom: 10 }}>
          {isAddMode ? t('onboardingJourney_addHeading2') : t('onboardingJourney_heading2')}
        </DisplayItalic>

        <Body size={15} color={ink3} style={styles.subtitle}>
          {isAddMode ? t('onboardingJourney_addSubtitle') : t('onboardingJourney_subtitle')}
        </Body>

        {/* Journey cards */}
        <View style={styles.cards}>
          {JOURNEYS.map((journey) => {
            const isEnrolled = enrolledBehaviors.includes(journey.id)
            const isSelected = newSelections.includes(journey.id)
            const isDimmed = isAddMode && isEnrolled
            const softBg = getModeColorSoft(journey.modeKey, isDark)
            const accent = getModeColor(journey.modeKey, isDark)

            return (
              <Pressable
                key={journey.id}
                onPress={() => !isDimmed && handleToggle(journey.id)}
                disabled={isDimmed}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: isSelected || isDimmed ? softBg : paper,
                    borderColor: isSelected ? accent : paperBorder,
                    borderWidth: isSelected ? 1.5 : 1,
                    borderRadius: radius.lg,
                    opacity: isDimmed ? 0.55 : 1,
                  },
                  pressed && !isDimmed && { transform: [{ scale: 0.98 }] },
                ]}
              >
                {/* Sticker circle */}
                <View style={[styles.stickerCircle, { backgroundColor: paper, borderColor: paperBorder }]}>
                  {journey.sticker(accent)}
                </View>

                {/* Text */}
                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, { fontFamily: font.display, color: isDimmed ? ink4 : ink }]}>
                    {journey.title}
                  </Text>
                  <Text style={[styles.cardSubtitle, { fontFamily: font.body, color: ink3 }]}>
                    {journey.subtitle}
                  </Text>
                </View>

                {/* Status indicator */}
                {isDimmed ? (
                  <View style={[styles.activeBadge, { backgroundColor: accent }]}>
                    <Text style={[styles.activeBadgeText, { fontFamily: font.bodyMedium, color: bg }]}>
                      {t('onboardingJourney_activeBadge')}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.chevronCircle, { backgroundColor: isSelected ? ink : paper, borderColor: paperBorder }]}>
                    <Ionicons
                      name={isSelected ? 'checkmark' : 'chevron-forward'}
                      size={16}
                      color={isSelected ? bg : ink}
                    />
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      {/* Fixed CTA */}
      {hasSelection && (
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: insets.bottom + 16, backgroundColor: bg },
          ]}
        >
          <PillButton
            label={isAddMode ? t('onboardingJourney_addCta') : t('auth_continue')}
            variant="ink"
            onPress={handleContinue}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24 },

  subtitle: {
    marginBottom: 24,
    maxWidth: 300,
    lineHeight: 22,
  },

  cards: { gap: 12 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },

  stickerCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 22, letterSpacing: -0.4 },
  cardSubtitle: { fontSize: 13 },

  chevronCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  activeBadgeText: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
})

// ─── Diffuse (v3) styles — GENERAL 01 · journey picker ──────────────────────
const dStyles = StyleSheet.create({
  scroll: { paddingHorizontal: 28 },
  step: {
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginBottom: 22,
  },
  q: {
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1,
  },
  qItalic: {
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.6,
  },
  qsub: {
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 260,
    marginTop: 12,
  },
  // Free-layout blob field; the BlobPicker inside positions blobs by CENTER
  // anchor. This wrapper just reserves the field's footprint.
  blobfield: {
    position: 'relative',
    width: '100%',
    height: 420,
    marginTop: 28,
  },
  footer: {
    paddingHorizontal: 28,
  },
  skipRow: {
    alignItems: 'center',
    marginTop: 4,
  },
})
