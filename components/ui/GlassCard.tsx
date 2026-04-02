import { StyleSheet, View, type ViewStyle } from 'react-native'
import { colors, borderRadius, shadows } from '../../constants/theme'

interface GlassCardProps {
  children: React.ReactNode
  style?: ViewStyle
  variant?: 'default' | 'accent' | 'elevated'
  noPadding?: boolean
  color?: string
}

export function GlassCard({
  children,
  style,
  variant = 'default',
  noPadding = false,
  color,
}: GlassCardProps) {
  const borderColor =
    variant === 'accent' ? colors.borderAccent : colors.border
  const bgColor = color || (variant === 'elevated' ? colors.surfaceLight : colors.surfaceGlass)

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: bgColor, borderColor },
        variant === 'elevated' && shadows.card,
        noPadding && { padding: 0 },
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    overflow: 'hidden',
  },
})
