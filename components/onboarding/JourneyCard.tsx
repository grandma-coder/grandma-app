/**
 * JourneyCard — one journey in the picker, in the site look.
 *
 * White hand-drawn card with the journey's sticker on a tone disc. Selected: the card fills
 * with the journey tone, tilts -1.5°, a hand-drawn ink shadow drops in under it, and the
 * chevron disc flips to an ink tick. Cards rise in one after another; press squashes.
 */

import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, Text, View, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../constants/theme'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { HandDrawnPill } from '../ui/HandDrawn'
import { FadeUp, useIdleSway } from '../ui/Motion'

export function JourneyCard({
  index,
  title,
  subtitle,
  sticker,
  tone,
  selected,
  dimmed,
  activeLabel,
  onPress,
}: {
  index: number
  title: string
  subtitle: string
  sticker: SiteStickerName
  tone: string
  selected: boolean
  dimmed: boolean
  activeLabel: string
  onPress: () => void
}) {
  const { colors, font } = useTheme()
  const ink = colors.text
  const paper = colors.surface
  const [size, setSize] = useState({ w: 0, h: 0 })
  const sel = useRef(new Animated.Value(selected ? 1 : 0)).current
  const press = useRef(new Animated.Value(0)).current
  const sway = useIdleSway(5, index * 3 + 1)

  useEffect(() => {
    Animated.spring(sel, { toValue: selected ? 1 : 0, friction: 6, tension: 140, useNativeDriver: true }).start()
  }, [selected, sel])

  return (
    <FadeUp index={index} delay={140}>
      <Pressable
        onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress() }}
        onPressIn={() => Animated.spring(press, { toValue: 1, friction: 6, tension: 280, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 0, friction: 4, tension: 200, useNativeDriver: true }).start()}
        disabled={dimmed}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected, disabled: dimmed }}
        accessibilityLabel={`${title}, ${subtitle}`}
      >
        <Animated.View
          onLayout={(e) => setSize({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })}
          style={{
            opacity: dimmed ? 0.55 : 1,
            transform: [
              { rotate: '0deg' },
              { scale: Animated.multiply(
                sel.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }),
                press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }),
              ) },
            ],
          }}
        >
          {/* hand-drawn ink shadow, only when selected */}
          <Animated.View style={[StyleSheet.absoluteFill, { top: 5, bottom: -5, opacity: sel }]}>
            <HandDrawnPill width={size.w} height={size.h} fill={ink} radius={20} seed={title + 'sh'} />
          </Animated.View>
          <HandDrawnPill width={size.w} height={size.h} fill={paper} stroke={ink} strokeWidth={2.4} radius={20} seed={title} />
          {/* tone wash fades in on select */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: sel }]}>
            <HandDrawnPill width={size.w} height={size.h} fill={tone} stroke={ink} strokeWidth={2.4} radius={20} seed={title} />
          </Animated.View>

          <View style={styles.row}>
            <View style={styles.disc}>
              <HandDrawnPill width={60} height={60} fill={selected ? paper : tone} stroke={ink} strokeWidth={2.2} seed={title + 'disc'} />
              <Animated.View style={{ transform: [{ translateY: sway.translateY }, { rotate: sway.rotate }] }}>
                <SiteSticker name={sticker} size={38} cut />
              </Animated.View>
            </View>

            <View style={styles.text}>
              <Text style={[styles.title, { color: ink, fontFamily: font.display }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: font.body }]}>{subtitle}</Text>
            </View>

            {dimmed ? (
              <View style={[styles.badge, { backgroundColor: ink }]}>
                <Text style={[styles.badgeText, { color: colors.bg }]}>{activeLabel}</Text>
              </View>
            ) : (
              <View style={styles.mark}>
                <HandDrawnPill width={38} height={38} fill={selected ? ink : paper} stroke={ink} strokeWidth={2.2} seed={title + 'mark'} />
                {selected ? (
                  <Animated.View style={{ transform: [{ scale: sel }, { rotate: sel.interpolate({ inputRange: [0, 1], outputRange: ['-40deg', '0deg'] }) }] }}>
                    <Svg width={18} height={18} viewBox="0 0 18 18">
                      <Path d="M3.5 9.5 L7.5 13 L14.5 4.5" stroke={paper} strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </Animated.View>
                ) : (
                  <Ionicons name="chevron-forward" size={17} color={ink} />
                )}
              </View>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </FadeUp>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  disc: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 21, letterSpacing: 0.3, textTransform: 'uppercase' },
  subtitle: { fontSize: 14 },
  mark: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
})
