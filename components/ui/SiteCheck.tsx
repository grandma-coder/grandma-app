/**
 * SiteCheckRow — a hand-drawn card with a hand-drawn checkbox, in the site look.
 * Ticking fills the card with the soft tone, the box with pink, and pops the tick in.
 */

import { ReactNode, useEffect, useRef } from 'react'
import { Animated, Pressable, Text, View, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { useTheme, stickers } from '../../constants/theme'
import { HandDrawnBox } from './HandDrawn'

const PINK = '#F4A6C9'

export function SiteCheckRow({
  checked,
  onToggle,
  children,
  tone = stickers.pinkSoft,
}: {
  checked: boolean
  onToggle: () => void
  children: ReactNode
  tone?: string
}) {
  const { colors, font } = useTheme()
  const tick = useRef(new Animated.Value(checked ? 1 : 0)).current
  const press = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(tick, { toValue: checked ? 1 : 0, friction: 5, tension: 160, useNativeDriver: true }).start()
  }, [checked, tick])
  const ink = colors.text

  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onToggle() }}
      onPressIn={() => Animated.spring(press, { toValue: 1, friction: 6, tension: 260, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(press, { toValue: 0, friction: 4, tension: 200, useNativeDriver: true }).start()}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <Animated.View style={{ transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) }] }}>
        <HandDrawnBox style={styles.row} fill={checked ? tone : colors.surface} stroke={ink} radius={18} seed="checkrow">
          <HandDrawnBox style={styles.box} fill={checked ? PINK : colors.surface} stroke={ink} radius={8} strokeWidth={2.2} seed="checkbox">
            <Animated.View style={{ opacity: tick, transform: [{ scale: tick }, { rotate: tick.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '0deg'] }) }] }}>
              <Svg width={18} height={18} viewBox="0 0 18 18">
                <Path d="M3.5 9.5 L7.5 13 L14.5 4.5" stroke={ink} strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Animated.View>
          </HandDrawnBox>
          <Text style={[styles.text, { color: ink, fontFamily: font.body }]}>{children}</Text>
        </HandDrawnBox>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
  },
  box: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, fontSize: 15, lineHeight: 21 },
})
