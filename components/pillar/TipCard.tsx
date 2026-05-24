/**
 * TipCard — editorial / magazine-style tip row.
 * No card chrome. Big italic Fraunces number, Fraunces label, DM Sans body.
 * Hairline divider sits below each tip (except the last).
 */

import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../constants/theme'

interface TipCardProps {
  label: string
  text: string
  /** 1-based position in the list, formatted as 01, 02, … */
  index?: number
  /** Hide bottom divider on the last tip. */
  isLast?: boolean
  /** Color used for the big editorial number. Defaults to current mode accent. */
  accent?: string
}

export default function TipCard({ label, text, index, isLast, accent }: TipCardProps) {
  const { colors, font, stickers } = useTheme()
  const numberColor = accent ?? stickers.coral

  return (
    <View style={[styles.row, !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
      {index !== undefined && (
        <Text
          style={[
            styles.number,
            { color: numberColor, fontFamily: font.italic },
          ]}
        >
          {String(index).padStart(2, '0')}
        </Text>
      )}
      <Text style={[styles.label, { color: colors.text, fontFamily: font.display }]}>
        {label}
      </Text>
      <Text
        style={[styles.text, { color: colors.textSecondary, fontFamily: font.body }]}
      >
        {text}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 20,
  },
  number: {
    fontSize: 22,
    letterSpacing: -0.3,
    marginBottom: 6,
    opacity: 0.85,
  },
  label: {
    fontSize: 22,
    letterSpacing: -0.4,
    marginBottom: 8,
    lineHeight: 28,
  },
  text: {
    fontSize: 15,
    lineHeight: 23,
  },
})
