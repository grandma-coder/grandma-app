/**
 * MyJourneys — behavior switcher card for Profile screen.
 *
 * Shows all enrolled behaviors with status lines.
 * One tap to switch — like switching Instagram accounts.
 * + Add a journey button for enrolling new behaviors.
 */

import { useState, useRef } from 'react'
import {
  View,
  Text,
  Pressable,
  Animated,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { router } from 'expo-router'
import { Moon, Heart, Star, Plus, Trash2 } from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import { useBehaviorStore, type Behavior } from '../../store/useBehaviorStore'
import { useModeStore } from '../../store/useModeStore'
import { useChildStore } from '../../store/useChildStore'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { getCycleInfo, toDateStr } from '../../lib/cycleLogic'

const SCREEN = Dimensions.get('window')

// ─── Behavior config ───────────────────────────────────────────────────────

const BEHAVIOR_CONFIG: Record<Behavior, {
  label: string
  icon: typeof Moon
  color: string
}> = {
  'pre-pregnancy': { label: 'Cycle Tracking', icon: Moon, color: brand.prePregnancy },
  pregnancy: { label: 'Pregnancy', icon: Heart, color: brand.pregnancy },
  kids: { label: 'Kids', icon: Star, color: brand.kids },
}

// ─── Status line generators ────────────────────────────────────────────────

function getCycleStatus(): string {
  const d = new Date()
  d.setDate(d.getDate() - 10)
  const info = getCycleInfo({ lastPeriodStart: toDateStr(d), cycleLength: 28, periodLength: 5 })
  return `Day ${info.cycleDay} · ${info.phaseLabel}`
}

function getPregnancyStatus(): string {
  const week = usePregnancyStore.getState().weekNumber ?? 24
  const dueDate = usePregnancyStore.getState().dueDate
  const dueFmt = dueDate
    ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''
  return `Week ${week}${dueFmt ? ` · Due ${dueFmt}` : ''}`
}

function getKidsStatus(): string {
  const children = useChildStore.getState().children
  if (children.length === 0) return 'No children added'
  return children
    .slice(0, 3)
    .map((c) => {
      const age = formatAge(c.birthDate)
      return `${c.name} ${age}`
    })
    .join(' · ')
}

function formatAge(birthDate: string): string {
  if (!birthDate) return ''
  const born = new Date(birthDate)
  const now = new Date()
  const months =
    (now.getFullYear() - born.getFullYear()) * 12 +
    (now.getMonth() - born.getMonth())
  if (months < 1) return 'newborn'
  if (months < 12) return `${months}m`
  const y = Math.floor(months / 12)
  const m = months % 12
  return m > 0 ? `${y}y ${m}m` : `${y}y`
}

function getStatusLine(b: Behavior): string {
  switch (b) {
    case 'pre-pregnancy': return getCycleStatus()
    case 'pregnancy': return getPregnancyStatus()
    case 'kids': return getKidsStatus()
  }
}

// ─── Main Component ────────────────────────────────────────────────────────

export function MyJourneys() {
  const { colors, radius, spacing } = useTheme()
  const enrolledBehaviors = useBehaviorStore((s) => s.enrolledBehaviors)
  const currentBehavior = useBehaviorStore((s) => s.currentBehavior)
  const switchTo = useBehaviorStore((s) => s.switchTo)
  const unenroll = useBehaviorStore((s) => s.unenroll)
  const setMode = useModeStore((s) => s.setMode)

  // Transition overlay
  const [transitioning, setTransitioning] = useState(false)
  const [transitionColor, setTransitionColor] = useState(brand.primary)
  const fadeAnim = useRef(new Animated.Value(0)).current

  function handleSwitch(b: Behavior) {
    if (b === currentBehavior) return

    const config = BEHAVIOR_CONFIG[b]
    setTransitionColor(config.color)
    setTransitioning(true)

    // Fade in
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setTransitioning(false)
    })

    // Switch immediately during the fade
    setTimeout(() => {
      switchTo(b)
      setMode(b)
      router.navigate('/(tabs)/')
    }, 100)
  }

  function handleRemove(b: Behavior) {
    const config = BEHAVIOR_CONFIG[b]
    const isLast = enrolledBehaviors.length === 1

    Alert.alert(
      `Remove ${config.label}?`,
      isLast
        ? 'This is your only journey. Removing it will take you back to the journey selection screen. Your data is preserved and you can re-enroll anytime.'
        : `Your ${config.label.toLowerCase()} data will be preserved. You can re-add this journey anytime from your profile.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            unenroll(b)
            // If it was active, unenroll auto-switches to next enrolled
            const next = useBehaviorStore.getState().currentBehavior
            if (next) {
              setMode(next)
            } else {
              // No more journeys — go to journey selection
              router.replace('/onboarding/journey' as any)
            }
          },
        },
      ]
    )
  }

  function handleAddJourney() {
    router.push({ pathname: '/onboarding/journey', params: { addMode: 'true' } })
  }

  if (enrolledBehaviors.length === 0) return null

  return (
    <>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceGlass,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      >
        {/* Title */}
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          MY JOURNEYS
        </Text>

        {/* Behavior rows */}
        {enrolledBehaviors.map((b) => {
          const config = BEHAVIOR_CONFIG[b]
          const Icon = config.icon
          const isActive = b === currentBehavior
          const status = getStatusLine(b)

          return (
            <Pressable
              key={b}
              onPress={() => !isActive && handleSwitch(b)}
              onLongPress={() => handleRemove(b)}
              delayLongPress={600}
              style={({ pressed }) => [
                styles.row,
                !isActive && pressed && { opacity: 0.7 },
              ]}
            >
              {/* Icon circle */}
              <View style={[styles.iconCircle, { backgroundColor: config.color + '20' }]}>
                <Icon size={22} color={config.color} strokeWidth={2} />
              </View>

              {/* Text */}
              <View style={styles.textWrap}>
                <Text style={[styles.behaviorName, { color: colors.text }]}>
                  {config.label}
                </Text>
                <Text style={[styles.statusLine, { color: colors.textSecondary }]} numberOfLines={1}>
                  {status}
                </Text>
              </View>

              {/* Right side: active chip, or switch + remove */}
              {isActive ? (
                <View style={styles.rightCol}>
                  <View style={[styles.activeChip, { backgroundColor: colors.primary + '20', borderRadius: radius.full }]}>
                    <Text style={[styles.activeText, { color: colors.primary }]}>ACTIVE</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.rightCol}>
                  <Text style={[styles.switchText, { color: colors.primary }]}>Switch</Text>
                  <Pressable onPress={() => handleRemove(b)} hitSlop={6}>
                    <Trash2 size={16} color={colors.textMuted} strokeWidth={2} />
                  </Pressable>
                </View>
              )}
            </Pressable>
          )
        })}

        {/* Divider + Add journey */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Pressable onPress={handleAddJourney} style={styles.addRow}>
          <Plus size={16} color={colors.primary} strokeWidth={2.5} />
          <Text style={[styles.addText, { color: colors.primary }]}>Add a journey</Text>
        </Pressable>
      </View>

      {/* Transition overlay */}
      {transitioning && (
        <Animated.View
          style={[
            styles.overlay,
            { backgroundColor: transitionColor, opacity: fadeAnim },
          ]}
          pointerEvents="none"
        />
      )}
    </>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  behaviorName: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusLine: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Right column
  rightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },

  // Active chip
  activeChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  activeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Switch button
  switchText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Add
  divider: {
    height: 1,
    marginTop: 8,
    marginBottom: 12,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Overlay
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN.width,
    height: SCREEN.height,
    zIndex: 999,
  },
})
