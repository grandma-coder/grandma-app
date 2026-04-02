import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { colors, gradients, borderRadius, shadows } from '../../constants/theme'

interface GlassCardProps {
  children: React.ReactNode
  style?: ViewStyle
  variant?: 'default' | 'accent' | 'elevated'
  noPadding?: boolean
}

export function GlassCard({
  children,
  style,
  variant = 'default',
  noPadding = false,
}: GlassCardProps) {
  const borderColor =
    variant === 'accent' ? colors.borderAccent : colors.border
  const gradientColors =
    variant === 'elevated' ? gradients.cardHover : gradients.glass

  return (
    <View style={[styles.outer, variant === 'elevated' && shadows.card, style]}>
      <LinearGradient
        colors={[...gradientColors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          { borderColor },
          noPadding && { padding: 0 },
        ]}
      >
        {children}
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
})
