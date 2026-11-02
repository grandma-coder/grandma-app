/**
 * Back button in the site look: a 44pt hand-drawn ink circle with a chevron that nudges
 * left when pressed. Defaults to router.back().
 */

import { useRef } from 'react'
import { Animated, Pressable, type StyleProp, type ViewStyle } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { HandDrawnPill } from './HandDrawn'

export function InkBackButton({
  onPress,
  ink,
  paper,
  label = 'Go back',
  icon = 'chevron-back',
  style,
}: {
  onPress?: () => void
  ink: string
  paper: string
  label?: string
  /** 'close' turns it into the ✕ variant (no nudge). */
  icon?: 'chevron-back' | 'close'
  style?: StyleProp<ViewStyle>
}) {
  const press = useRef(new Animated.Value(0)).current
  const to = (v: number) => Animated.spring(press, { toValue: v, friction: 6, tension: 260, useNativeDriver: true }).start()
  return (
    <Pressable
      onPress={onPress ?? (() => router.back())}
      onPressIn={() => to(1)}
      onPressOut={() => to(0)}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[{ width: 44, height: 44, marginBottom: 20 }, style]}
    >
      <Animated.View
        style={{
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }) }],
        }}
      >
        <HandDrawnPill wobble width={44} height={44} fill={paper} stroke={ink} strokeWidth={2.2} seed={icon} />
        <Animated.View style={{ transform: [{ translateX: press.interpolate({ inputRange: [0, 1], outputRange: [0, icon === 'close' ? 0 : -3] }) }] }}>
          <Ionicons name={icon} size={20} color={ink} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  )
}
