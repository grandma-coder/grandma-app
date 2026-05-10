/**
 * PillButton — 58px height pill CTA, sticker-on-paper aesthetic.
 *
 * Variants:
 *   - "ink"     ink-fill primary (default)
 *   - "paper"   paper bg with ink border (secondary / cancel)
 *   - "accent"  mode-accent fill (use on white cards for emphasis)
 *
 * Every variant gets the 1.5–2px ink border + hard offset shadow that
 * "presses down" on tap, matching the rest of the design system.
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

const INK = '#141313'

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

  const ink = isDark ? colors.text : INK
  const paper = isDark ? colors.surface : '#FFFEF8'
  const bgCanvas = isDark ? colors.bg : '#F3ECD9'
  const borderInk = isDark ? colors.border : INK

  const variants: Record<PillButtonVariant, { bg: string; fg: string; border: string; shadow: string }> = {
    ink:    { bg: ink, fg: bgCanvas, border: borderInk, shadow: borderInk },
    paper:  { bg: paper, fg: ink, border: borderInk, shadow: borderInk },
    accent: { bg: accentColor ?? ink, fg: INK, border: borderInk, shadow: borderInk },
  }

  const v = variants[variant]
  const isInactive = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: 1.5,
          shadowColor: v.shadow,
          shadowOffset: { width: 0, height: pressed ? 1 : 3 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 4,
          opacity: isInactive ? 0.55 : 1,
          transform: [{ translateY: pressed && !isInactive ? 2 : 0 }],
        },
        style,
      ]}
    >
      {leading ? <View style={styles.slot}>{leading}</View> : null}
      <Text style={[styles.label, { fontFamily: font.bodySemiBold, color: v.fg }]}>
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
  label: { fontSize: 16, letterSpacing: -0.2 },
  slot: { alignItems: 'center', justifyContent: 'center' },
})
