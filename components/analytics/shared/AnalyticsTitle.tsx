/**
 * AnalyticsTitle — Editorial Fraunces hero title with italic Instrument Serif accent.
 * Two-line pattern: bold word(s) + italic continuation.
 */

import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../../constants/theme'

interface Props {
  primary: string
  italic: string
}

export function AnalyticsTitle({ primary, italic }: Props) {
  const { colors, font } = useTheme()
  return (
    <View style={styles.wrap}>
      <Text
        style={[
          styles.line,
          { color: colors.text, fontFamily: font.display },
        ]}
      >
        {primary}
      </Text>
      <Text
        style={[
          styles.line,
          styles.italic,
          { color: colors.text, fontFamily: font.italic },
        ]}
      >
        {italic}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 6,
  },
  line: {
    fontSize: 34,
    lineHeight: 38,
  },
  italic: {
    fontStyle: 'italic',
  },
})
