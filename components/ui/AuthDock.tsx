/**
 * AuthDock — the welcome screen's actions, laid out like the tab bar: Apple and Google as
 * hand-drawn discs with hand-lettered labels, and the pink eye disc raised in the middle as
 * "Start here" (email sign-up).
 *
 * Motion: discs pop in one after another; each squashes on press (with a light haptic);
 * the eye sways while idle, like the tab bar's centre button.
 */

import { ReactNode, useEffect, useRef } from 'react'
import { ActivityIndicator, Animated, Pressable, Text, View, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { font } from '../../constants/theme'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { HandDrawnPill } from './HandDrawn'
import { useIdleSway } from './Motion'

const EYE_PINK = '#F7C6D9'
const ACCENT = '#E0709A'

export function ActionDisc({
  index = 0,
  delay = 0,
  size,
  fill,
  ink,
  label,
  a11y,
  onPress,
  disabled,
  loading,
  underline,
  children,
}: {
  index?: number
  delay?: number
  size: number
  fill: string
  ink: string
  label: string
  a11y: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  underline?: boolean
  children: ReactNode
}) {
  const pop = useRef(new Animated.Value(0)).current
  const press = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 80, delay: delay + index * 110, useNativeDriver: true }).start()
  }, [pop, delay, index])
  const to = (v: number) => Animated.spring(press, { toValue: v, friction: 5, tension: 260, useNativeDriver: true }).start()
  // A little hop when the disc becomes tappable (e.g. the form just got valid).
  const wake = useRef(new Animated.Value(0)).current
  const wasDisabled = useRef(disabled)
  useEffect(() => {
    if (wasDisabled.current && !disabled) {
      wake.setValue(0)
      Animated.sequence([
        Animated.timing(wake, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.spring(wake, { toValue: 0, friction: 4, tension: 160, useNativeDriver: true }),
      ]).start()
    }
    wasDisabled.current = disabled
  }, [disabled, wake])

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); to(1) }}
      onPressOut={() => to(0)}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={styles.tab}
    >
      <Animated.View
        style={{
          opacity: disabled && !loading ? 0.5 : 1,
          transform: [
            { translateY: wake.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
            { scale: Animated.multiply(pop, press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] })) },
            { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) },
          ],
        }}
      >
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <HandDrawnPill width={size} height={size} fill={fill} stroke={ink} strokeWidth={size > 70 ? 3 : 2.4} seed={label} />
          {loading ? <ActivityIndicator color={ink} /> : children}
        </View>
      </Animated.View>
      <Animated.Text style={[styles.label, { color: ink, opacity: pop }]} numberOfLines={1}>
        {label}
      </Animated.Text>
      {underline ? (
        <Animated.View style={{ opacity: pop, marginTop: 1 }}>
          <Svg width={62} height={8} viewBox="0 0 60 8">
            <Path d="M2 5 C12 2 20 7 30 4 S48 2 58 5" stroke={ACCENT} strokeWidth={2.6} fill="none" strokeLinecap="round" />
          </Svg>
        </Animated.View>
      ) : null}
    </Pressable>
  )
}

export function AuthDock({
  ink,
  paper,
  startLabel,
  appleA11y,
  googleA11y,
  startA11y,
  showApple,
  loading,
  onApple,
  onGoogle,
  onStart,
  appleIcon,
  googleIcon,
  delay = 700,
}: {
  ink: string
  paper: string
  startLabel: string
  appleA11y: string
  googleA11y: string
  startA11y: string
  showApple: boolean
  loading: 'apple' | 'google' | null
  onApple: () => void
  onGoogle: () => void
  onStart: () => void
  appleIcon: ReactNode
  googleIcon: ReactNode
  delay?: number
}) {
  const sway = useIdleSway(6, 2)
  const busy = loading !== null

  return (
    <View style={styles.dock}>
      <View style={styles.tabs}>
        {showApple ? (
          <ActionDisc index={0} delay={delay} size={58} fill="#FFFFFF" ink={ink} label="Apple" a11y={appleA11y}
            onPress={onApple} disabled={busy} loading={loading === 'apple'}>
            {appleIcon}
          </ActionDisc>
        ) : null}

        <View style={styles.center}>
          <ActionDisc index={1} delay={delay} size={84} fill={EYE_PINK} ink={ink} label={startLabel} a11y={startA11y}
            onPress={onStart} disabled={busy} underline>
            <Animated.View style={{ transform: [{ translateY: sway.translateY }, { rotate: sway.rotate }] }}>
              <SiteSticker name="eye" size={54} cut />
            </Animated.View>
          </ActionDisc>
        </View>

        <ActionDisc index={2} delay={delay} size={58} fill="#FFFFFF" ink={ink} label="Google" a11y={googleA11y}
          onPress={onGoogle} disabled={busy} loading={loading === 'google'}>
          {googleIcon}
        </ActionDisc>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  dock: {
    alignSelf: 'stretch',
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
  },
  center: {
    marginTop: -18,
  },
  tab: {
    alignItems: 'center',
    minWidth: 96,
  },
  label: {
    fontFamily: font.display,
    fontSize: 16,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 4,
  },
})

/**
 * The primary action in the site look: a big tone disc with a sticker that fits the action
 * and a hand-lettered label. Vary `sticker` + `fill` per screen so flows don't repeat —
 * the eye is the brand mark, kept for the welcome screen.
 */
export function EyeAction({
  label,
  onPress,
  ink,
  loading,
  disabled,
  index = 0,
  delay = 0,
  a11y,
  sticker = 'eye',
  fill = EYE_PINK,
}: {
  label: string
  onPress: () => void
  ink: string
  loading?: boolean
  disabled?: boolean
  index?: number
  delay?: number
  a11y?: string
  sticker?: SiteStickerName
  fill?: string
}) {
  const sway = useIdleSway(6, 4)
  return (
    <ActionDisc index={index} delay={delay} size={84} fill={fill} ink={ink} label={label} a11y={a11y ?? label}
      onPress={onPress} disabled={disabled || loading} loading={loading} underline>
      <Animated.View style={{ transform: [{ translateY: sway.translateY }, { rotate: sway.rotate }] }}>
        <SiteSticker name={sticker} size={sticker === 'eye' ? 54 : 46} cut />
      </Animated.View>
    </ActionDisc>
  )
}

/** Tone discs for actions (soft site palette). */
export const ACTION_TONES = {
  pink: '#F7C6D9',
  yellow: '#FFE7A3',
  lilac: '#DCCFF9',
  blue: '#CFE1FA',
  green: '#D7F0DD',
  peach: '#FBD3B3',
} as const
