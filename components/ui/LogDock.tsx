/**
 * LogDock — quick-log launchers laid out like the tab bar: no pills, just a sticker with a
 * hand-lettered label under it. Logged today → the label gets the tab bar's wavy underline in
 * the journey tone and a little ink tick sits on the sticker.
 *
 * Motion: stickers pop in one after another and sway; a press squashes + tilts the sticker
 * (light haptic). The save moment: when an item turns done (the sheet saved and the log is
 * back), the sticker hops, the ✓ springs in, the underline draws and the phone gives a
 * success tap. Five fit per row; more wrap to a second row.
 */

import { useEffect, useRef } from 'react'
import { Animated, Pressable, Text, View, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../constants/theme'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { useIdleSway } from './Motion'

export interface LogDockItem {
  key: string
  label: string
  sticker: SiteStickerName
  done: boolean
  onPress?: () => void
}

const UNDERLINE = 'M2 5 C12 2 20 7 30 4 S48 2 58 5'

function DockItem({ item, index, accent }: { item: LogDockItem; index: number; accent: string }) {
  const { colors, font } = useTheme()
  const ink = colors.text
  const pop = useRef(new Animated.Value(0)).current
  const press = useRef(new Animated.Value(0)).current
  const sway = useIdleSway(5, index * 2 + 1)
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, delay: 120 + index * 70, useNativeDriver: true }).start()
  }, [pop, index])
  const to = (v: number) => Animated.spring(press, { toValue: v, friction: 5, tension: 280, useNativeDriver: true }).start()

  // Save moment — only on a live false → true flip, never on first render (already-done items).
  const celebrate = useRef(new Animated.Value(0)).current
  const tickIn = useRef(new Animated.Value(item.done ? 1 : 0)).current
  const wasDone = useRef(item.done)
  // Celebrate only a save the user just made from this item — not ticks that appear when
  // today's logs finish loading on app open.
  const armedAt = useRef(0)
  useEffect(() => {
    if (item.done && !wasDone.current && Date.now() - armedAt.current < 120000) {
      celebrate.setValue(0)
      tickIn.setValue(0)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      Animated.parallel([
        Animated.sequence([
          Animated.timing(celebrate, { toValue: 1, duration: 160, useNativeDriver: true }),
          Animated.spring(celebrate, { toValue: 0, friction: 4, tension: 160, useNativeDriver: true }),
        ]),
        Animated.spring(tickIn, { toValue: 1, friction: 4, tension: 140, delay: 120, useNativeDriver: true }),
      ]).start()
    } else {
      tickIn.setValue(item.done ? 1 : 0)
    }
    wasDone.current = item.done
  }, [item.done, celebrate, tickIn])

  return (
    <Pressable
      onPress={item.onPress ? () => { armedAt.current = Date.now(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); item.onPress?.() } : undefined}
      onPressIn={() => to(1)}
      onPressOut={() => to(0)}
      disabled={!item.onPress}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ checked: item.done, disabled: !item.onPress }}
      style={styles.item}
    >
      <Animated.View
        style={{
          transform: [
            { scale: Animated.multiply(pop, press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.85] })) },
            { rotate: press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-10deg'] }) },
            { translateY: celebrate.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
            { scale: celebrate.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) },
          ],
        }}
      >
        <Animated.View style={{ transform: [{ translateY: sway.translateY }, { rotate: sway.rotate }] }}>
          <SiteSticker name={item.sticker} size={40} />
        </Animated.View>
        {item.done ? (
          <Animated.View style={[styles.tick, { backgroundColor: ink, borderColor: colors.bg, transform: [{ scale: tickIn }] }]}>
            <Svg width={10} height={10} viewBox="0 0 18 18">
              <Path d="M3.5 9.5 L7.5 13 L14.5 4.5" stroke={colors.bg} strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Animated.View>
        ) : null}
      </Animated.View>
      <Text style={[styles.label, { color: item.done ? ink : colors.textSecondary, fontFamily: font.display }]} numberOfLines={2}>
        {item.label}
      </Text>
      <Animated.View style={{ height: 8, opacity: item.done ? tickIn : 0, transform: [{ scaleX: tickIn }] }}>
        <Svg width={44} height={8} viewBox="0 0 60 8">
          <Path d={UNDERLINE} stroke={accent} strokeWidth={3} fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </Pressable>
  )
}

export function LogDock({ items, accent }: { items: LogDockItem[]; accent: string }) {
  return (
    <View style={styles.row}>
      {items.map((it, i) => <DockItem key={it.key} item={it} index={i} accent={accent} />)}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 },
  item: { width: '20%', alignItems: 'center', paddingTop: 4 },
  label: { fontSize: 13, lineHeight: 17, paddingTop: 2, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 4, textAlign: 'center' },
  tick: { position: 'absolute', right: -6, top: -4, width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
})
