/**
 * HomeGreeting — "Hi, {name}" serif greeting + MONO-CAPS date/mode micro-label.
 *
 * Shared across CycleHome, PregnancyHome, KidsHome so they all share
 * the same top-of-screen pattern in the redesign.
 */

import { View, StyleSheet } from 'react-native'
import { Display, DisplayItalic, MonoCaps } from '../ui/Typography'
import { useTheme } from '../../constants/theme'

interface HomeGreetingProps {
  /** Parent first name — falls back to "dear" */
  name?: string | null
  /** Micro-label above greeting — e.g. "WEEK 24 · FRIDAY", "JUNO · 5 MONTHS" */
  microLabel?: string
}

export function HomeGreeting({ name, microLabel }: HomeGreetingProps) {
  const { colors, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  const displayName = name?.trim() || 'dear'

  return (
    <View style={styles.wrap}>
      {microLabel ? <MonoCaps style={{ marginBottom: 6 }}>{microLabel}</MonoCaps> : null}
      <View style={styles.row}>
        <Display size={32} color={ink}>Hi,</Display>
        <DisplayItalic size={32} color={ink} style={{ marginLeft: 8 }}>
          {displayName}
        </DisplayItalic>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'baseline' },
})
