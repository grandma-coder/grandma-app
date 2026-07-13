/**
 * WalletCard — one card in a home "wallet" stack (shared by the pregnancy Week
 * Wallet and the kids home wallet).
 *
 * Modelled on the Apple-Wallet / "Expenses" reference: a chunky card with a
 * circular icon chip top-left and a bold title, cards overlapping into a
 * peeking stack. Expandable cards render `children` in a body when `expanded`
 * and their chevron rotates; `linkOnly` cards show an up-right arrow and route /
 * open a modal on press instead of expanding.
 *
 * Follows the reanimated shared-value pattern used across the app
 * (see ActivityPillCard). Honors the Diffuse variant. The 'mode' tone resolves
 * to the active journey mode's brand color via getModeColor.
 */

import React, { useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated'
import { ChevronDown, ArrowUpRight } from 'lucide-react-native'
import {
  useTheme, font, getModeColor, diffuseFont, useDiffuseTheme,
} from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { useModeStore } from '../../store/useModeStore'
import type { WalletTone } from '../../lib/wallet'

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
  /** hide the trailing chevron/arrow entirely (tap acts directly, e.g. opens a
   *  detail sheet). The card never expands inline when this is set. */
  hideChevron?: boolean
  children?: React.ReactNode
}

export function WalletCard({
  tone, icon, title, trailingValue, expanded, linkOnly, onPressHeader, last, hideChevron, children,
}: WalletCardProps) {
  const { colors, stickers, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)

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
  // (surface) and the mode color we fall back to the theme ink.
  let bg = colors.surface
  let ink = colors.text
  if (diffuse) {
    bg = dt.colors.surface
    ink = dt.colors.ink
  } else if (tone === 'surface') {
    bg = colors.surface
    ink = colors.text
  } else if (tone === 'mode' || tone === 'lavender') {
    bg = tone === 'mode' ? getModeColor(mode, isDark) : getModeColor('pregnancy', isDark)
    ink = isDark ? colors.text : '#141313'
  } else {
    // yellow / lilac / green / peach / blue / coral → the saturated sticker color + its ink tint
    bg = (stickers as Record<string, string>)[tone] ?? colors.surface
    ink = (stickers as Record<string, string>)[tone + 'Ink'] ?? colors.text
  }
  const border = diffuse ? dt.colors.line : colors.border

  // The circular icon chip.
  //  · Current: paper-white on tinted cards, subtle raised on cream.
  //  · Diffuse: the card surface stays hairline-clean, so the chip carries the
  //    per-tone color (soft sticker tint) — this is how cards stay visually
  //    distinguishable under Diffuse without saturated fills.
  let chipBg: string
  if (diffuse) {
    const softTone =
      tone === 'surface' ? dt.colors.surfaceRaised
      : tone === 'mode' || tone === 'lavender' ? getModeColor(mode, isDark) + '2E'
      : ((stickers as Record<string, string>)[tone + 'Soft'] ?? dt.colors.surfaceRaised)
    chipBg = softTone
  } else {
    chipBg = tone === 'surface' ? colors.surfaceRaised : '#FFFEF8'
  }

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
        {hideChevron ? null : linkOnly ? (
          <ArrowUpRight size={20} color={ink} strokeWidth={2.2} style={{ opacity: 0.8 }} />
        ) : (
          <Animated.View style={arrowStyle}>
            <ChevronDown size={20} color={ink} strokeWidth={2.2} style={{ opacity: 0.8 }} />
          </Animated.View>
        )}
      </Pressable>

      {showBody && !hideChevron ? <View style={styles.body}>{children}</View> : null}
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
