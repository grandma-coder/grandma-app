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
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
  icon?: React.ReactNode
  color?: string
}

export function GradientButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  icon,
  color,
}: GradientButtonProps) {
  const isDisabled = disabled || loading

  // Ghost variant — text only
  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.ghost,
          pressed && styles.pressed,
          isDisabled && styles.disabled,
          style,
        ]}
      >
        {icon}
        <Text style={[styles.ghostText, color ? { color } : null]}>{title}</Text>
      </Pressable>
    )
  }

  // Outline variant
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

  // Secondary variant
  if (variant === 'secondary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.secondary,
          color ? { borderColor: color } : null,
          pressed && styles.pressed,
          isDisabled && styles.disabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={color || colors.text} size="small" />
        ) : (
          <>
            {icon}
            <Text style={[styles.secondaryText, color ? { color } : null]}>{title}</Text>
          </>
        )}
      </Pressable>
    )
  }

  // Primary variant — full neon yellow pill
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.primary,
        shadows.glow,
        color ? { backgroundColor: color } : null,
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
  // Primary — yellow bg, black text, full pill
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 64,
    paddingHorizontal: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textOnAccent,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  // Secondary — outlined pill
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 64,
    paddingHorizontal: 32,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.borderLight,
    backgroundColor: 'transparent',
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  // Outline — same as secondary but thinner border
  outline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 64,
    paddingHorizontal: 32,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlineText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  // Ghost — text only, no background
  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  ghostText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.accent,
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
