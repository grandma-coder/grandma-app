import { View, StyleSheet, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAppTheme } from './ThemeProvider'

interface CosmicBackgroundProps {
  children: React.ReactNode
  style?: ViewStyle
  variant?: 'default' | 'pregnancy'
}

export function CosmicBackground({
  children,
  style,
  variant = 'default',
}: CosmicBackgroundProps) {
  const { gradients } = useAppTheme()

  const gradientColors =
    variant === 'pregnancy' ? gradients.pregnancy : gradients.background

  return (
    <LinearGradient
      colors={[...gradientColors]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
