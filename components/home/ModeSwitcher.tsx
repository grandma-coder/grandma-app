import { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme, useDiffuseTheme, diffuseFont, borderRadius } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { useModeStore } from '../../store/useModeStore'
import { useBehaviorStore } from '../../store/useBehaviorStore'
import type { JourneyMode } from '../../types'

export function ModeSwitcher() {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const { mode, cycleIntent, setMode } = useModeStore()
  const enrolledBehaviors = useBehaviorStore((s) => s.enrolledBehaviors)

  const MODES: { id: JourneyMode; label: string }[] = [
    { id: 'pre-pregnancy', label: cycleIntent === 'ttc' ? 'Dreaming' : 'Cycle' },
    { id: 'pregnancy', label: 'Expecting' },
    { id: 'kids', label: 'Raising' },
  ]

  function handlePress(m: JourneyMode) {
    const enrolled = enrolledBehaviors.includes(m)
    if (enrolled) {
      setMode(m)
      return
    }
    // Locked — route into the add-journey flow with this mode preselected.
    router.push({
      pathname: '/onboarding/journey',
      params: { addMode: 'true', preselect: m },
    } as any)
  }

  return (
    <View style={[styles.container, diffuse && {
      backgroundColor: 'transparent',
      borderColor: dt.colors.line,
    }]}>
      {MODES.map((m) => {
        const isActive = mode === m.id
        const isLocked = !enrolledBehaviors.includes(m.id)
        return (
          <Pressable
            key={m.id}
            onPress={() => handlePress(m.id)}
            style={[
              styles.pill,
              // Diffuse: active = hairline paper pill (no filled accent).
              diffuse
                ? (isActive && { backgroundColor: dt.colors.surface, borderWidth: 1, borderColor: dt.colors.hairline })
                : (isActive && styles.pillActive),
              isLocked && styles.pillLocked,
            ]}
          >
            <View style={styles.pillContent}>
              {isLocked && (
                <Ionicons
                  name="lock-closed"
                  size={10}
                  color={diffuse ? dt.colors.ink3 : colors.textMuted}
                  style={styles.lockIcon}
                />
              )}
              <Text
                style={[
                  styles.label,
                  diffuse
                    ? { fontFamily: diffuseFont.mono, fontWeight: '400', color: isActive ? dt.colors.ink : dt.colors.ink3 }
                    : [isActive && styles.labelActive, isLocked && styles.labelLocked],
                ]}
              >
                {m.label}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pill: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: borderRadius.full,
  },
  pillActive: {
    backgroundColor: colors.accent,
  },
  pillLocked: {
    opacity: 0.55,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lockIcon: {
    opacity: 0.85,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelActive: {
    color: colors.textInverse,
  },
  labelLocked: {
    color: colors.textMuted,
  },
})
