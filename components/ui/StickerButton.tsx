/**
 * StickerButton — pill sticker-style CTA from the 2026 design system.
 *
 * Active:   full color fill + matching darker border + hard offset shadow (sticker-on-paper)
 * Inactive: soft tint fill + color border — always readable, never ghost on cream
 */

import { Pressable, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native'
import { useTheme } from '../../constants/theme'

interface StickerButtonProps {
  label: string
  /** Main sticker color (e.g. stickers.yellow) */
  color: string
  /** Soft tint for inactive state (e.g. stickers.yellowSoft). Falls back to color at 35% opacity. */
  colorSoft?: string
  /** Shadow / border color — slightly darker than `color`. Defaults to color. */
  colorDark?: string
  onPress?: () => void
  active?: boolean
  disabled?: boolean
  height?: number
  fontSize?: number
  style?: StyleProp<ViewStyle>
}

export function StickerButton({
  label,
  color,
  colorSoft,
  colorDark,
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
      <Text
        style={[
          styles.label,
          {
            fontFamily: font.bodySemiBold,
            color: '#141313',
            fontSize,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

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
