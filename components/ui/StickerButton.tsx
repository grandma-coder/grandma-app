/**
 * StickerButton — pill sticker-style CTA from the 2026 design system.
 *
 * Active:   full color fill + matching darker border + hard offset shadow (sticker-on-paper)
 * Inactive: soft tint fill + color border — always readable, never ghost on cream
 *
 * Optional `icon` (rendered to the left of the label) and `tone="destructive"`
 * (forces white/coral text on a coral fill so destructive actions read as such).
 */

import { Pressable, Text, View, StyleSheet, ViewStyle, StyleProp } from 'react-native'
import { ReactNode } from 'react'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from './diffuse/DiffuseKit'

interface StickerButtonProps {
  label: string
  /** Main sticker color (e.g. stickers.yellow) */
  color: string
  /** Soft tint for inactive state (e.g. stickers.yellowSoft). Falls back to color at 35% opacity. */
  colorSoft?: string
  /** Shadow / border color — slightly darker than `color`. Defaults to color. */
  colorDark?: string
  /** Optional element rendered to the left of the label (e.g. lucide icon) */
  icon?: ReactNode
  /** "primary" reads as a filled CTA (white text only when bg is dark). Default reads ink on color. */
  textColor?: string
  onPress?: () => void
  active?: boolean
  disabled?: boolean
  height?: number
  fontSize?: number
  style?: StyleProp<ViewStyle>
}

const INK = '#141313'

export function StickerButton(props: StickerButtonProps) {
  const diffuse = useIsDiffuse()
  return diffuse ? <DiffuseStickerButton {...props} /> : <CurrentStickerButton {...props} />
}

function CurrentStickerButton({
  label,
  color,
  colorSoft,
  colorDark,
  icon,
  textColor,
  onPress,
  active = true,
  disabled = false,
  height = 52,
  fontSize = 15,
  style,
}: StickerButtonProps) {
  const { font } = useTheme()

  const shadow = colorDark ?? color
  const inactiveBg = colorSoft ?? color + '55'
  const resolvedTextColor = textColor ?? INK

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: active ? color : inactiveBg,
          borderColor: active ? shadow : color,
          // Hard offset shadow — the "stuck on paper" sticker depth
          shadowColor: shadow,
          shadowOffset: { width: 0, height: pressed ? 1 : 3 },
          shadowOpacity: active ? 1 : 0,
          shadowRadius: 0,
          elevation: active ? 4 : 0,
          opacity: disabled ? 0.45 : 1,
          transform: [{ translateY: pressed && active ? 2 : 0 }],
        },
        style,
      ]}
    >
      {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}
      <Text
        style={[
          styles.label,
          {
            fontFamily: font.bodySemiBold,
            color: resolvedTextColor,
            fontSize,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

// ─── Diffuse (hairline chip + soft color bloom, sticker icon kept) ──────────
// The colored fill becomes a soft bloom of the same color behind a hairline
// mono chip. Active = --d-hairline ring + brighter bloom + mono weight, per
// the .chip.on / .gm-ring vocabulary. The sticker `icon` stays.

function DiffuseStickerButton({
  label,
  color,
  icon,
  textColor,
  onPress,
  active = true,
  disabled = false,
  height = 52,
  fontSize = 13,
  style,
}: StickerButtonProps) {
  const { colors } = useDiffuseTheme()

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        diffuseStyles.base,
        {
          height,
          backgroundColor: colors.surface,
          borderColor: active ? colors.hairline : colors.line,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {/* soft color bloom */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: color, opacity: active ? 0.28 : 0.12, borderRadius: 999 },
        ]}
      />
      {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}
      <Text
        style={[
          diffuseStyles.label,
          {
            fontFamily: active ? diffuseFont.monoBold : diffuseFont.mono,
            color: textColor ?? (active ? colors.ink : colors.ink3),
            fontSize,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const diffuseStyles = StyleSheet.create({
  base: {
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
})

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  label: {
    letterSpacing: -0.2,
  },
})
