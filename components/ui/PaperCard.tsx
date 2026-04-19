/**
 * PaperCard — the cream-paper card container used across the redesign.
 *
 * Default: paper background, hairline border, 20-28px radius, subtle shadow.
 * Pass `flat` to drop the shadow, `tint` to override the background color
 * (e.g. mode-soft pastel for the home hero cards).
 */

import { ReactNode } from 'react'
import { View, ViewStyle, StyleProp, StyleSheet } from 'react-native'
import { useTheme } from '../../constants/theme'

interface PaperCardProps {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  tint?: string
  flat?: boolean
  radius?: number
  padding?: number
  borderColor?: string
}

export function PaperCard({
  children,
  style,
  tint,
  flat = false,
  radius = 20,
  padding = 16,
  borderColor,
}: PaperCardProps) {
  const { colors, isDark } = useTheme()

  const bg = tint ?? (isDark ? colors.surface : '#FFFEF8')
  const border = borderColor ?? (isDark ? colors.border : 'rgba(20,19,19,0.08)')

  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderColor: border,
          borderRadius: radius,
          borderWidth: 1,
          padding,
        },
        !flat && styles.shadow,
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
})
