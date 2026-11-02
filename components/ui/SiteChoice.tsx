/**
 * Site-look form pieces for onboarding and sheets.
 *
 * - SiteChoice: a hand-drawn choice chip. Selected → journey tone fill, -1.5° tilt, a tick
 *   pops in; label always stays ink (never tone-on-tone). Optional sticker before the label.
 * - SiteStepper: − value + with hand-drawn discs; the number is the hand-lettered display face
 *   and bumps on every change.
 */

import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, Text, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../constants/theme'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { HandDrawnPill } from './HandDrawn'

export function SiteChoice({
  label,
  selected,
  onPress,
  tone,
  sticker,
  style,
  sub,
  radius = 18,
  align = 'center',
  compact = false,
  tick = true,
  wobble = false,
}: {
  label: string
  selected: boolean
  onPress: () => void
  /** Fill when selected — the journey's soft colour. */
  tone: string
  sticker?: SiteStickerName
  style?: StyleProp<ViewStyle>
  /** Optional second line (muted). */
  sub?: string
  radius?: number
  /** 'start' for full-width list rows (sticker + label on the left, tick on the right). */
  align?: 'center' | 'start'
  /** Smaller pill for filter rows (child picker, date range). */
  compact?: boolean
  /** Show the ✓ when selected (off for single-select filter rows). */
  tick?: boolean
  /** Hand-drawn outline — for top-of-screen filter pills only. */
  wobble?: boolean
}) {
  const { colors, font } = useTheme()
  const ink = colors.text
  const [size, setSize] = useState({ w: 0, h: 0 })
  const sel = useRef(new Animated.Value(selected ? 1 : 0)).current
  const press = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(sel, { toValue: selected ? 1 : 0, friction: 6, tension: 160, useNativeDriver: true }).start()
  }, [selected, sel])

  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress() }}
      onPressIn={() => Animated.spring(press, { toValue: 1, friction: 6, tension: 300, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(press, { toValue: 0, friction: 4, tension: 200, useNativeDriver: true }).start()}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      style={style}
    >
      <Animated.View
        onLayout={(e) => setSize({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })}
        style={{
          transform: [
            { rotate: '0deg' },
            { scale: Animated.multiply(
              sel.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }),
              press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] }),
            ) },
          ],
        }}
      >
        <HandDrawnPill wobble={wobble} width={size.w} height={size.h} fill={colors.surface} stroke={ink} strokeWidth={2.2} radius={radius} seed={label} />
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: sel }]}>
          <HandDrawnPill wobble={wobble} width={size.w} height={size.h} fill={tone} stroke={ink} strokeWidth={2.6} radius={radius} seed={label} />
        </Animated.View>
        <View style={[styles.inner, align === 'start' && styles.innerStart, compact && styles.innerCompact]}>
          {sticker ? <SiteSticker name={sticker} size={24} cut /> : null}
          <View style={{ flexShrink: 1, flexGrow: align === 'start' ? 1 : 0, alignItems: sticker || align === 'start' ? 'flex-start' : 'center' }}>
            <Text style={[styles.label, { color: ink, fontFamily: font.bodyBold }]} numberOfLines={2}>{label}</Text>
            {sub ? <Text style={[styles.sub, { color: colors.textSecondary, fontFamily: font.body }]} numberOfLines={2}>{sub}</Text> : null}
          </View>
          {tick ? <Animated.View style={[styles.tick, { opacity: sel, transform: [{ scale: sel }] }]}>
            <Svg width={14} height={14} viewBox="0 0 18 18">
              <Path d="M3.5 9.5 L7.5 13 L14.5 4.5" stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Animated.View> : null}
        </View>
      </Animated.View>
    </Pressable>
  )
}

export function SiteStepper({
  value,
  onChange,
  min,
  max,
  unit,
  tone,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  unit?: string
  tone: string
}) {
  const { colors, font } = useTheme()
  const ink = colors.text
  const bump = useRef(new Animated.Value(0)).current
  const step = (d: number) => {
    const v = Math.min(max, Math.max(min, value + d))
    if (v === value) return
    Haptics.selectionAsync().catch(() => {})
    onChange(v)
    bump.setValue(1)
    Animated.spring(bump, { toValue: 0, friction: 4, tension: 200, useNativeDriver: true }).start()
  }
  const Btn = ({ d, icon }: { d: number; icon: 'remove' | 'add' }) => {
    const disabled = d < 0 ? value <= min : value >= max
    return (
      <Pressable onPress={() => step(d)} disabled={disabled} hitSlop={8} accessibilityRole="button" accessibilityLabel={d < 0 ? 'Decrease' : 'Increase'}
        style={({ pressed }) => [styles.stepBtn, { opacity: disabled ? 0.35 : 1, transform: [{ scale: pressed ? 0.9 : 1 }] }]}>
        <HandDrawnPill wobble width={52} height={52} fill={tone} stroke={ink} strokeWidth={2.4} seed={icon} />
        <Ionicons name={icon} size={24} color={ink} />
      </Pressable>
    )
  }
  return (
    <View style={styles.stepper} accessibilityRole="adjustable" accessibilityValue={{ min, max, now: value, text: unit ? `${value} ${unit}` : String(value) }}>
      <Btn d={-1} icon="remove" />
      <View style={styles.valueWrap}>
        <Animated.Text style={[styles.value, { color: ink, fontFamily: font.display, transform: [{ scale: bump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }]}>
          {value}
        </Animated.Text>
        {unit ? <Text style={[styles.unit, { color: colors.textSecondary, fontFamily: font.body }]}>{unit}</Text> : null}
      </View>
      <Btn d={1} icon="add" />
    </View>
  )
}

const styles = StyleSheet.create({
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 18, minHeight: 54 },
  innerCompact: { paddingVertical: 9, paddingHorizontal: 16, minHeight: 44, gap: 8 },
  innerStart: { justifyContent: 'flex-start', paddingHorizontal: 16 },
  label: { fontSize: 16 },
  sub: { fontSize: 13, marginTop: 1 },
  tick: { width: 14, marginLeft: -2 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, paddingVertical: 8 },
  stepBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  valueWrap: { alignItems: 'center', minWidth: 96 },
  value: { fontSize: 64, lineHeight: 72 },
  unit: { fontSize: 15, marginTop: -6 },
})
