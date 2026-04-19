/**
 * DailyPulse (Apr 2026 redesign) — paper empty state for today's symptoms.
 */

import { View, StyleSheet } from 'react-native'
import { useTheme, stickers } from '../../constants/theme'
import { Burst } from '../ui/Stickers'
import { MonoCaps, Body, DisplayItalic } from '../ui/Typography'

interface DailyPulseProps {
  weight?: number | null
  mood?: string | null
  onAddSymptom?: () => void
}

export function DailyPulse(_: DailyPulseProps) {
  const { colors, isDark } = useTheme()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink3 = isDark ? colors.textMuted : '#6E6763'

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <MonoCaps>Daily Pulse</MonoCaps>
      </View>

      <View style={[styles.card, { backgroundColor: paper, borderColor: paperBorder }]}>
        <Burst size={44} fill={isDark ? stickers.yellow : '#F5D652'} />
        <DisplayItalic size={18} color={ink3} style={{ marginTop: 10 }}>
          Nothing logged yet, dear.
        </DisplayItalic>
        <Body size={13} color={ink3} align="center" style={{ marginTop: 4, maxWidth: 240 }}>
          Add a symptom, mood, or weight when you have a minute.
        </Body>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  header: { marginBottom: 10, paddingHorizontal: 4 },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
})
