import { View, Text, Pressable, StyleSheet } from 'react-native'
import { colors, borderRadius } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import type { JourneyMode } from '../../types'

const MODES: { id: JourneyMode; label: string }[] = [
  { id: 'pre-pregnancy', label: 'Pre-Preg' },
  { id: 'pregnancy', label: 'Pregnancy' },
  { id: 'kids', label: 'Kids' },
]

export function ModeSwitcher() {
  const { mode, setMode } = useModeStore()

  return (
    <View style={styles.container}>
      {MODES.map((m) => {
        const isActive = mode === m.id
        return (
          <Pressable
            key={m.id}
            onPress={() => setMode(m.id)}
            style={[styles.pill, isActive && styles.pillActive]}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {m.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.full,
  },
  pillActive: {
    backgroundColor: colors.accent,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 0.3,
  },
  labelActive: {
    color: colors.textOnAccent,
  },
})
