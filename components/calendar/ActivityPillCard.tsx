/**
 * ActivityPillCard — soft pastel card for the Today list across all 3 behaviors.
 *
 * Layout: colored circle icon • title + optional subtitle • optional right chip • chevron
 */

import { ReactNode, useEffect } from 'react'
import { View, Pressable, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import { ChevronRight, Check } from 'lucide-react-native'
import { useTheme } from '../../constants/theme'
import { Body } from '../ui/Typography'
import { getTint, type TintKey } from './tints'

interface ActivityPillCardProps {
  icon: ReactNode
  title: string
  subtitle?: string
  /** Pastel fill key (defaults to 'activity') */
  tint?: TintKey | string
  /** Small chip on the right (e.g. child name) */
  chip?: { label: string; color?: string }
  onPress?: () => void
  /** Hide chevron */
  noChevron?: boolean
  /** One-shot scale pulse on the icon — use to confirm a freshly-logged entry */
  pulse?: boolean
  /** Show a small green check next to the title to mark the entry as logged */
  logged?: boolean
}

export function ActivityPillCard({
  icon,
  title,
  subtitle,
  tint = 'activity',
  chip,
  onPress,
  noChevron,
  pulse,
  logged,
}: ActivityPillCardProps) {
  const { colors, isDark, font } = useTheme()
  const { fill, ink } = getTint(tint, isDark)
  const textInk = isDark ? colors.text : '#141313'
  const textMuted = isDark ? colors.textMuted : '#6E6763'

  const scale = useSharedValue(1)
  const iconAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  useEffect(() => {
    if (!pulse) return
    scale.value = withSequence(
      withTiming(1.22, { duration: 220, easing: Easing.out(Easing.quad) }),
      withTiming(0.96, { duration: 140, easing: Easing.inOut(Easing.quad) }),
      withDelay(40, withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) })),
    )
  }, [pulse, scale])

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: fill, opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <Animated.View
        style={[
          styles.iconWrap,
          { backgroundColor: isDark ? ink + '33' : '#FFFEF8' },
          iconAnimStyle,
        ]}
      >
        {icon}
      </Animated.View>

      <View style={styles.textCol}>
        <View style={styles.titleRow}>
          <Body size={15} color={textInk} style={{ fontFamily: font.bodySemiBold }}>
            {title}
          </Body>
          {logged ? (
            <View style={styles.checkBadge}>
              <Check size={11} color="#FFFFFF" strokeWidth={3} />
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Body size={12} color={textMuted} style={{ marginTop: 2 }}>
            {subtitle}
          </Body>
        ) : null}
      </View>

      {chip ? (
        <View
          style={[
            styles.chip,
            { backgroundColor: (chip.color ?? ink) + '22', borderColor: (chip.color ?? ink) + '40' },
          ]}
        >
          <Text style={[styles.chipText, { color: chip.color ?? textInk, fontFamily: font.bodySemiBold }]}>
            {chip.label}
          </Text>
        </View>
      ) : null}

      {!noChevron && onPress ? (
        <ChevronRight size={18} color={textMuted} strokeWidth={2} />
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 20,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
  },
})
