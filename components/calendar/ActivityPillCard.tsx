/**
 * ActivityPillCard — soft pastel card for the Today list across all 3 behaviors.
 *
 * Layout: colored circle icon • title + optional subtitle • optional right chip • chevron
 */

import { ReactNode } from 'react'
import { View, Pressable, Text, StyleSheet } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
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
}

export function ActivityPillCard({
  icon,
  title,
  subtitle,
  tint = 'activity',
  chip,
  onPress,
  noChevron,
}: ActivityPillCardProps) {
  const { colors, isDark, font } = useTheme()
  const { fill, ink } = getTint(tint, isDark)
  const textInk = isDark ? colors.text : '#141313'
  const textMuted = isDark ? colors.textMuted : '#6E6763'

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: fill, opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: isDark ? ink + '33' : '#FFFEF8' }]}>
        {icon}
      </View>

      <View style={styles.textCol}>
        <Body size={15} color={textInk} style={{ fontFamily: font.bodySemiBold }}>
          {title}
        </Body>
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
