import { useRef, useState } from 'react'
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useTheme, brand, getModeColor } from '../../constants/theme'
import { useBehaviorStore, type Behavior } from '../../store/useBehaviorStore'
import { useModeStore } from '../../store/useModeStore'

const PILL_ORDER: Array<{ behavior: Behavior; label: string }> = [
  { behavior: 'pre-pregnancy', label: 'Trying' },
  { behavior: 'pregnancy', label: 'Pregnant' },
  { behavior: 'kids', label: 'Parent' },
]

/**
 * 3-column pill grid that switches the active journey mode.
 * Replaces the row-based MyJourneys component.
 *
 * Source: docs/Claude design studio/src/more-screens.jsx:54-65
 */
export function MyJourneyPillGrid() {
  const { colors, radius, isDark, font } = useTheme()
  const currentBehavior = useBehaviorStore((s) => s.currentBehavior)
  const enrolled = useBehaviorStore((s) => s.enrolledBehaviors)
  const switchTo = useBehaviorStore((s) => s.switchTo)
  const setMode = useModeStore((s) => s.setMode)

  const [overlayActive, setOverlayActive] = useState(false)
  const [overlayColor, setOverlayColor] = useState<string>(brand.primary)
  const fade = useRef(new Animated.Value(0)).current

  function handlePress(b: Behavior) {
    if (b === currentBehavior) return

    const isEnrolled = enrolled.includes(b)
    if (!isEnrolled) {
      router.push({
        pathname: '/onboarding/journey',
        params: { addMode: 'true' },
      })
      return
    }

    const accent = getModeColor(b, isDark)
    setOverlayColor(accent)
    setOverlayActive(true)

    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => setOverlayActive(false))

    setTimeout(() => {
      switchTo(b)
      setMode(b)
    }, 100)
  }

  return (
    <>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      >
        <Text style={[styles.header, { color: colors.textMuted }]}>MY JOURNEY</Text>
        <View style={styles.grid}>
          {PILL_ORDER.map(({ behavior, label }) => {
            const isActive = behavior === currentBehavior
            const isEnrolled = enrolled.includes(behavior)
            const accent = getModeColor(behavior, isDark)
            return (
              <Pressable
                key={behavior}
                onPress={() => handlePress(behavior)}
                style={({ pressed }) => [
                  styles.pill,
                  {
                    backgroundColor: isActive ? accent : colors.surfaceRaised,
                    borderColor: colors.border,
                    opacity: isActive ? 1 : isEnrolled ? 0.6 : 0.35,
                  },
                  pressed && { opacity: (isActive ? 1 : 0.6) * 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.pillLabel,
                    { fontFamily: font.display, color: colors.text },
                  ]}
                  allowFontScaling={false}
                >
                  {label}
                </Text>
                {isActive ? (
                  <Text style={[styles.activeHint, { color: colors.text }]}>active</Text>
                ) : !isEnrolled ? (
                  <Text style={[styles.activeHint, { color: colors.textMuted }]}>+ add</Text>
                ) : null}
              </Pressable>
            )
          })}
        </View>
      </View>

      {overlayActive && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: overlayColor, opacity: fade, zIndex: 1000 },
          ]}
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
  },
  header: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  grid: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pillLabel: { fontSize: 14, fontWeight: '600' },
  activeHint: { fontSize: 10, fontWeight: '500', marginTop: 2 },
})
