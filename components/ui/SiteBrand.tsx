/**
 * The site's brand mark and hero headline, shared by the welcome screen and anywhere
 * the app introduces itself.
 *
 * - SiteBrand: eye sticker + "grandma" (Hanken 800, tight), like the site's top bar.
 * - RebusHeadline: a hand-lettered line whose [name] tokens are inline stickers that pop
 *   in one after another (scale 0 → 1, -30° → 0°, spring) and boing when tapped.
 */

import { useEffect, useRef } from 'react'
import { Animated, Easing, Pressable, Text, View, StyleSheet, type TextStyle, type StyleProp } from 'react-native'
import { font } from '../../constants/theme'
import { SiteSticker, SITE_STICKER_NAMES, type SiteStickerName } from '../stickers/SiteSticker'

export function SiteBrand({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <View style={styles.brand} accessibilityRole="header" accessibilityLabel="grandma">
      <SiteSticker name="eye" size={size * 1.55} />
      <Text style={[styles.brandText, { color, fontSize: size }]}>grandma</Text>
    </View>
  )
}

const TOKEN = /\[([a-z0-9]+)\]/

function PopSticker({ name, size, index, delay }: { name: SiteStickerName; size: number; index: number; delay: number }) {
  const pop = useRef(new Animated.Value(0)).current
  const boing = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, delay: delay + index * 120, useNativeDriver: true }).start()
  }, [pop, delay, index])

  const onPress = () => {
    boing.setValue(0)
    Animated.timing(boing, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }

  const scale = Animated.multiply(
    pop,
    boing.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: [1, 1.3, 0.9, 1] }),
  )
  const rotate = Animated.add(
    pop.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }),
    boing.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: [0, 12, -6, 0] }),
  ).interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] })

  return (
    <Pressable onPress={onPress} hitSlop={6} accessible={false}>
      <Animated.View style={{ marginLeft: size * 0.12, marginRight: size * 0.02, transform: [{ translateY: size * 0.2 }, { scale }, { rotate }] }}>
        <SiteSticker name={name} size={size} />
      </Animated.View>
    </Pressable>
  )
}

/** `text` like "Your cycle [flower], your pregnancy [heart]…" — unknown tokens render as nothing. */
export function RebusHeadline({
  text,
  style,
  stickerSize = 40,
  delay = 250,
}: {
  text: string
  style?: StyleProp<TextStyle>
  stickerSize?: number
  delay?: number
}) {
  const parts = text.split(TOKEN)
  let n = 0
  return (
    <Text style={style} accessibilityRole="header" accessibilityLabel={text.replace(/\s*\[[a-z0-9]+\]/g, '')}>
      {parts.map((p, i) => {
        if (i % 2 === 0) return p
        if (!(SITE_STICKER_NAMES as string[]).includes(p)) return null
        return (
          <Text key={i}>
            <PopSticker name={p as SiteStickerName} size={stickerSize} index={n++} delay={delay} />
          </Text>
        )
      })}
    </Text>
  )
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandText: {
    fontFamily: font.bodyBold,
    letterSpacing: -1,
  },
})
