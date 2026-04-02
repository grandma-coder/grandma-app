import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native'
import { colors, borderRadius, shadows } from '../../constants/theme'

interface GradientButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
  icon?: React.ReactNode
}

export function GradientButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  icon,
}: GradientButtonProps) {
  const isDisabled = disabled || loading

  if (variant === 'outline') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.outline,
          pressed && styles.pressed,
          isDisabled && styles.disabled,
          style,
        ]}
      >
        {icon}
        <Text style={styles.outlineText}>{title}</Text>
      </Pressable>
    )
  }

  if (variant === 'secondary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.secondary,
          pressed && styles.pressed,
          isDisabled && styles.disabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} size="small" />
        ) : (
          <>
            {icon}
            <Text style={styles.secondaryText}>{title}</Text>
          </>
        )}
      </Pressable>
    )
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.primary,
        shadows.glow,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textOnAccent} size="small" />
      ) : (
        <>
          {icon}
          <Text style={styles.primaryText}>{title}</Text>
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 64,
    paddingHorizontal: 32,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.accent,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textOnAccent,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 64,
    paddingHorizontal: 32,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  outline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 64,
    paddingHorizontal: 32,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.borderLight,
  },
  outlineText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
  disabled: {
    opacity: 0.5,
  },
})
