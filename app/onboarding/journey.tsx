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
import { useTheme, stickers, getModeColor, getModeColorSoft } from '../../constants/theme'
import { useBehaviorStore, type Behavior } from '../../store/useBehaviorStore'
import { useOnboardingStore } from '../../store/useOnboardingStore'
import { useModeStore } from '../../store/useModeStore'
import { Flower, Heart, Star } from '../../components/ui/Stickers'
import { Display, DisplayItalic, Body } from '../../components/ui/Typography'
import { PillButton } from '../../components/ui/PillButton'
import { ScreenHeader } from '../../components/ui/ScreenHeader'

interface JourneyOption {
  id: Behavior
  title: string
  subtitle: string
  sticker: (color: string) => React.ReactNode
  modeKey: 'pre' | 'preg' | 'kids'
}

const JOURNEYS: JourneyOption[] = [
  {
    id: 'pre-pregnancy',
    title: 'Trying',
    subtitle: 'Cycle & fertility',
    sticker: (color) => <Flower size={44} petal={color} center={stickers.yellow} />,
    modeKey: 'pre',
  },
  {
    id: 'pregnancy',
    title: 'Pregnant',
    subtitle: 'Week by week',
    sticker: (color) => <Heart size={42} fill={color} />,
    modeKey: 'preg',
  },
  {
    id: 'kids',
    title: 'Parenting',
    subtitle: 'Babies & toddlers',
    sticker: (color) => <Star size={44} fill={color} />,
    modeKey: 'kids',
  },
]

const FIRST_ROUTE: Record<Behavior, string> = {
  'pre-pregnancy': '/onboarding/cycle',
  pregnancy: '/onboarding/pregnancy',
  kids: '/onboarding/kids',
}

export default function JourneyScreen() {
  const insets = useSafeAreaInsets()
  const { colors, font, radius, isDark } = useTheme()
  const params = useLocalSearchParams<{ addMode?: string; preselect?: string }>()

  const isAddMode = params.addMode === 'true'
  const preselect = params.preselect as Behavior | undefined

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
    router.push(FIRST_ROUTE[first] as any)
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
            You have all three journeys
          </Display>
          <DisplayItalic align="center" size={28} color={ink}>
            active, dear.
          </DisplayItalic>
          <Body align="center" color={ink3} style={{ marginTop: 12, maxWidth: 300 }}>
            You are amazing. All your data is being tracked across every journey.
          </Body>
          <PillButton
            label="Back to Profile"
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
          title={isAddMode ? 'Add Journey' : '1 / 10'}
          style={{ marginBottom: 24 }}
        />

        {/* Heading */}
        <Display size={40} color={ink}>
          {isAddMode ? 'Add a' : 'Which journey'}
        </Display>
        <DisplayItalic size={40} color={ink} style={{ marginBottom: 10 }}>
          {isAddMode ? 'journey, dear.' : 'are you on?'}
        </DisplayItalic>

        <Body size={15} color={ink3} style={styles.subtitle}>
          {isAddMode
            ? 'Your existing data stays exactly as it is.'
            : 'Pick the one that fits today. You can switch anytime.'}
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
                      Active
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
            label={isAddMode ? 'Add Journey →' : 'Continue →'}
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
