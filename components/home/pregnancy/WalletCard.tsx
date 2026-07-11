/**
 * WalletCard — one card in the pregnancy-home "Week Wallet" stack.
 *
 * Modelled on the Apple-Wallet / "Expenses" reference: a chunky saturated card
 * with a circular icon chip top-left, a small muted kicker label above a bold
 * title, and an optional right-aligned value. Cards overlap into a peeking
 * stack. Expandable cards render `children` in a body when `expanded` and their
 * chevron rotates; `linkOnly` cards show an up-right arrow and route / open a
 * modal on press instead of expanding.
 *
 * Follows the reanimated shared-value pattern used across the app
 * (see ActivityPillCard). Honors the Diffuse variant.
 */

import React, { useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated'
import { ChevronDown, ArrowUpRight } from 'lucide-react-native'
import {
  useTheme, font, getModeColor, diffuseFont, useDiffuseTheme,
} from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import type { WalletTone } from '../../../lib/weekWallet'

interface WalletCardProps {
  tone: WalletTone
  icon: React.ReactNode
  title: string
  trailingValue?: string
  expanded: boolean
  /** true → header shows ↗ and press routes/opens a modal (no inline body). */
  linkOnly: boolean
  onPressHeader: () => void
  /** the "last" card drops the negative overlap margin. */
  last?: boolean
  children?: React.ReactNode
}

export function WalletCard({
  tone, icon, title, trailingValue, expanded, linkOnly, onPressHeader, last, children,
}: WalletCardProps) {
  const { colors, stickers, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  const rot = useSharedValue(expanded ? 1 : 0)
  useEffect(() => {
    rot.value = withTiming(expanded ? 1 : 0, { duration: 220, easing: Easing.inOut(Easing.quad) })
  }, [expanded, rot])
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value * 180}deg` }],
  }))

  // ── resolve tone → cover bg + ink ──
  // Full sticker colors (not the pale *Soft) so each card reads as its own
  // hue, wallet-style. Dark ink on the warm tones stays legible; on cream
  // (surface) and lavender we fall back to the theme ink.
  let bg = colors.surface
  let ink = colors.text
  if (diffuse) {
    bg = dt.colors.surface
    ink = dt.colors.ink
  } else if (tone === 'surface') {
    bg = colors.surface
    ink = colors.text
  } else if (tone === 'lavender') {
    bg = getModeColor('pregnancy', isDark)
    ink = isDark ? colors.text : '#141313'
  } else {
    // yellow / lilac / green / peach → the saturated sticker color + its ink tint
    bg = (stickers as Record<string, string>)[tone] ?? colors.surface
    ink = (stickers as Record<string, string>)[tone + 'Ink'] ?? colors.text
  }
  const border = diffuse ? dt.colors.line : colors.border
  // The circular icon chip: paper-white on tinted cards, subtle on cream.
  const chipBg = tone === 'surface' || diffuse
    ? (diffuse ? dt.colors.surfaceRaised : colors.surfaceRaised)
    : '#FFFEF8'

  const showBody = expanded && !linkOnly && !!children

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: diffuse ? 1 : StyleSheet.hairlineWidth,
          marginBottom: last ? 0 : (expanded ? 6 : -16),
          zIndex: expanded ? 30 : undefined,
        },
      ]}
    >
      <Pressable
        onPress={onPressHeader}
        style={({ pressed }) => [styles.header, { opacity: pressed ? 0.9 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={linkOnly ? undefined : { expanded }}
      >
        <View style={[styles.chip, { backgroundColor: chipBg }]}>{icon}</View>

        <Text
          style={[styles.title, { color: ink, fontFamily: diffuse ? diffuseFont.display : font.display }]}
          numberOfLines={1}
        >
          {title}
        </Text>

        {trailingValue ? (
          <Text
            style={[styles.trailing, { color: ink, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold }]}
            numberOfLines={1}
          >
            {trailingValue}
          </Text>
        ) : null}
        {linkOnly ? (
          <ArrowUpRight size={20} color={ink} strokeWidth={2.2} style={{ opacity: 0.8 }} />
        ) : (
          <Animated.View style={arrowStyle}>
            <ChevronDown size={20} color={ink} strokeWidth={2.2} style={{ opacity: 0.8 }} />
          </Animated.View>
        )}
      </Pressable>

      {showBody ? <View style={styles.body}>{children}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 26, overflow: 'hidden' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    paddingHorizontal: 16, paddingVertical: 16,
  },
  chip: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  title: { flex: 1, minWidth: 0, fontSize: 18, letterSpacing: -0.3 },
  trailing: { fontSize: 14 },
  body: { paddingHorizontal: 16, paddingBottom: 18, paddingTop: 2 },
})
