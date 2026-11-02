/**
 * CelebrateHero — the payoff at the end of an onboarding flow.
 *
 * A hand-drawn tone disc with the journey sticker pops in; a ring of small stickers bursts
 * out from behind it (spring, staggered, each with its own spin), then everything sways
 * gently. Reduce Motion: stickers appear in place.
 */

import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Animated, View, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../constants/theme'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { HandDrawnPill } from '../ui/HandDrawn'
import { useIdleSway } from '../ui/Motion'

// Burst targets around the disc: [dx, dy, spin, size]
const SPOTS: [number, number, number, number][] = [
  [-118, -46, -18, 30],
  [112, -64, 16, 28],
  [-96, 64, 12, 26],
  [124, 44, -14, 30],
  [-14, -112, 8, 24],
  [36, 104, -10, 24],
]

function Confetti({ name, spot, i }: { name: SiteStickerName; spot: [number, number, number, number]; i: number }) {
  const v = useRef(new Animated.Value(0)).current
  const sway = useIdleSway(8, i * 2 + 3)
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) { v.setValue(1); return }
      Animated.spring(v, { toValue: 1, friction: 6, tension: 60, delay: 380 + i * 70, useNativeDriver: true }).start()
    }).catch(() => v.setValue(1))
  }, [v, i])
  const [dx, dy, spin, size] = spot
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.confetti,
        {
          opacity: v,
          transform: [
            { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
            { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${spin}deg`] }) },
          ],
        },
      ]}
    >
      <Animated.View style={{ transform: [{ translateY: sway.translateY }, { rotate: sway.rotate }] }}>
        <SiteSticker name={name} size={size} cut />
      </Animated.View>
    </Animated.View>
  )
}

export function CelebrateHero({
  sticker,
  tone,
  confetti,
}: {
  sticker: SiteStickerName
  tone: string
  /** Up to 6 small stickers that burst out around the disc. */
  confetti: SiteStickerName[]
}) {
  const { colors } = useTheme()
  const pop = useRef(new Animated.Value(0)).current
  const sway = useIdleSway(5, 1)
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 70, delay: 120, useNativeDriver: true }).start()
  }, [pop])

  return (
    <View style={styles.wrap}>
      {confetti.slice(0, SPOTS.length).map((n, i) => (
        <Confetti key={n + i} name={n} spot={SPOTS[i]} i={i} />
      ))}
      <Animated.View
        style={{
          transform: [
            { scale: pop },
            { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-40deg', '0deg'] }) },
          ],
        }}
      >
        <View style={styles.disc}>
          <HandDrawnPill wobble width={132} height={132} fill={tone} stroke={colors.text} strokeWidth={3} seed={sticker + 'hero'} />
          <Animated.View style={{ transform: [{ translateY: sway.translateY }, { rotate: sway.rotate }] }}>
            <SiteSticker name={sticker} size={70} cut />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { height: 250, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  disc: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center' },
  confetti: { position: 'absolute' },
})
