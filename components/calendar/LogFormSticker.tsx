// components/calendar/LogFormSticker.tsx
/**
 * LogFormSticker — header row for bottom-sheet log forms.
 * Shows a branded sticker in a paper chip with a pastel halo + label.
 */

import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../constants/theme'
import { logSticker } from './logStickers'

interface Props {
  /** Log type that maps to a sticker (see logStickers.tsx) */
  type: string
  /** Label shown next to the sticker */
  label: string
  /** Optional pastel halo tint; defaults to surface */
  tint?: string
}

export function LogFormSticker({ type, label, tint }: Props) {
  const { colors, isDark } = useTheme()
  const haloTint = tint ?? colors.surfaceRaised
  const ink = isDark ? 'rgba(255,255,255,0.18)' : '#141313'
  const border = isDark ? colors.border : ink

  return (
    <View style={[styles.row, { backgroundColor: haloTint, borderColor: border }]}>
      <View style={[styles.chip, { backgroundColor: isDark ? colors.surface : '#FFFEF8', borderColor: border }]}>
        {logSticker(type, 32, isDark)}
      </View>
      <Text
        style={[styles.label, { color: isDark ? colors.text : '#141313', fontFamily: 'Fraunces_700Bold', letterSpacing: -0.2 }]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  chip: {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    flex: 1,
  },
})
