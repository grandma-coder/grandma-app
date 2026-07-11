/**
 * WalletCard — one card in the pregnancy-home "Week Wallet" stack.
 *
 * Collapsed: a single header row (glyph · title · optional trailing value ·
 * arrow). Expandable cards render `children` in a body when `expanded`; the
 * header chevron rotates. `linkOnly` cards show an up-right arrow and route /
 * open a modal on press instead of expanding.
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
    bg = (stickers as Record<string, string>)[tone + 'Soft'] ?? colors.surface
    ink = (stickers as Record<string, string>)[tone + 'Ink'] ?? colors.text
  }
  const border = diffuse ? dt.colors.line : colors.border

  const showBody = expanded && !linkOnly && !!children

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: diffuse ? 1 : StyleSheet.hairlineWidth,
          marginBottom: last ? 0 : (expanded ? 4 : -14),
          zIndex: expanded ? 30 : undefined,
        },
      ]}
    >
      <Pressable
        onPress={onPressHeader}
        style={({ pressed }) => [styles.header, { opacity: pressed ? 0.85 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={linkOnly ? undefined : { expanded }}
      >
        <View style={styles.icon}>{icon}</View>
        <Text
          style={[styles.title, { color: ink, fontFamily: diffuse ? diffuseFont.display : font.display }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {trailingValue ? (
          <Text
            style={[styles.trailing, { color: ink, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium }]}
            numberOfLines={1}
          >
            {trailingValue}
          </Text>
        ) : null}
        {linkOnly ? (
          <ArrowUpRight size={18} color={ink} strokeWidth={2} style={{ opacity: 0.7 }} />
        ) : (
          <Animated.View style={arrowStyle}>
            <ChevronDown size={18} color={ink} strokeWidth={2} style={{ opacity: 0.7 }} />
          </Animated.View>
        )}
      </Pressable>

      {showBody ? <View style={styles.body}>{children}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, overflow: 'hidden' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingHorizontal: 15, paddingVertical: 14,
  },
  icon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { flex: 1, fontSize: 16, letterSpacing: -0.2 },
  trailing: { fontSize: 13 },
  body: { paddingHorizontal: 15, paddingBottom: 16, paddingTop: 2 },
})
