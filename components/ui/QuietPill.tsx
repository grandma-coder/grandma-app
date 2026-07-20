/**
 * QuietPill — the shared "quiet" / tertiary action tier (See Results, Answer,
 * Edit). Sits below PillButton (primary 58px CTA) and StickerButton.
 *
 * Two shapes from one prop:
 *  · label present → hairline text pill (optional leading icon before the label)
 *  · label omitted → icon-only glyph (renders `leading` only, no border/bg)
 *
 * Resolves the current (cream-paper) vs Diffuse (v3) variant internally, the
 * same pattern PillButton uses. Never hardcodes tokens.
 */
import React from 'react'
import { Pressable, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont, radius } from '../../constants/theme'
import { useIsDiffuse } from './diffuse/DiffuseKit'

interface QuietPillProps {
  /** Omit for the icon-only glyph form (Edit). */
  label?: string
  onPress: () => void
  /** Optional leading icon. In glyph mode this is the only content. */
  leading?: React.ReactNode
  accessibilityLabel: string
  style?: StyleProp<ViewStyle>
}

export function QuietPill({ label, onPress, leading, accessibilityLabel, style }: QuietPillProps) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  const inkColor = diffuse ? dt.colors.ink3 : colors.textMuted

  // Glyph form — no chrome, just the icon. Bigger hitSlop since it's small.
  if (!label) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }, style]}
      >
        {leading}
      </Pressable>
    )
  }

  // Text pill — hairline in current; transparent + mono-caps in Diffuse.
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.pill,
        {
          borderColor: diffuse ? dt.colors.line2 : colors.border,
          backgroundColor: diffuse ? 'transparent' : colors.surface,
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      {leading}
      <Text
        style={{
          fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold,
          fontSize: 11,
          color: inkColor,
          textTransform: diffuse ? 'uppercase' : 'none',
          letterSpacing: diffuse ? 0.8 : 0,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
})
