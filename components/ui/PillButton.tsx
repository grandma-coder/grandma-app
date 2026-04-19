/**
 * PillButton — 58px height pill CTA.
 *
 * Variants:
 *   - "ink"     ink-fill primary (default)
 *   - "paper"   paper bg with hairline border (secondary / Google)
 *   - "accent"  mode-accent fill (use on white cards for emphasis)
 */

import { ReactNode } from 'react'
import { Pressable, Text, StyleSheet, ViewStyle, StyleProp, View } from 'react-native'
import { useTheme } from '../../constants/theme'

export type PillButtonVariant = 'ink' | 'paper' | 'accent'

interface PillButtonProps {
  label: string
  onPress?: () => void
  variant?: PillButtonVariant
  disabled?: boolean
  loading?: boolean
  leading?: ReactNode
  trailing?: ReactNode
  accentColor?: string
  style?: StyleProp<ViewStyle>
  height?: number
}

export function PillButton({
  label,
  onPress,
  variant = 'ink',
  disabled = false,
  loading = false,
  leading,
  trailing,
  accentColor,
  style,
  height = 58,
}: PillButtonProps) {
  const { colors, font, isDark } = useTheme()

  const ink = isDark ? colors.text : '#141313'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const bgCanvas = isDark ? colors.bg : '#F3ECD9'

  const variants: Record<PillButtonVariant, { bg: string; fg: string; border?: string }> = {
    ink: { bg: ink, fg: bgCanvas },
    paper: { bg: paper, fg: ink, border: paperBorder },
    accent: { bg: accentColor ?? ink, fg: '#141313' },
  }

  const v = variants[variant]

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: v.border ? 1 : 0,
          opacity: pressed ? 0.88 : disabled || loading ? 0.6 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {leading ? <View style={styles.slot}>{leading}</View> : null}
      <Text style={[styles.label, { fontFamily: font.bodyMedium, color: v.fg }]}>
        {loading ? '…' : label}
      </Text>
      {trailing ? <View style={styles.slot}>{trailing}</View> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  label: { fontSize: 16 },
  slot: { alignItems: 'center', justifyContent: 'center' },
})
