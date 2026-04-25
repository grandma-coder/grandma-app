/**
 * LogTile + LogTileGrid — entry tiles for the Log Activity bottom sheet.
 *
 * Shown on tap of header "+" across all 3 behaviors. Each tile: pastel tint,
 * icon circle, label. Tapping a tile opens the relevant log form.
 */

import { ReactNode } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '../../constants/theme'
import { Body } from '../ui/Typography'
import { getTint, type TintKey } from './tints'

interface LogTileProps {
  icon: ReactNode
  label: string
  tint?: TintKey | string
  onPress: () => void
}

export function LogTile({ icon, label, tint = 'activity', onPress }: LogTileProps) {
  const { colors, isDark, font } = useTheme()
  const { fill, ink } = getTint(tint, isDark)
  const textInk = isDark ? colors.text : '#141313'

  const tileBorder = isDark ? 'transparent' : '#141313'
  const iconBorder = isDark ? 'transparent' : '#141313'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: fill,
          borderWidth: isDark ? 0 : 1.5,
          borderColor: tileBorder,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          shadowColor: '#141313',
          shadowOpacity: isDark ? 0 : 0.06,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
        },
      ]}
    >
      <View style={[styles.iconWrap, {
        backgroundColor: isDark ? ink + '33' : '#FFFEF8',
        borderWidth: isDark ? 0 : 1.5,
        borderColor: iconBorder,
      }]}>
        {icon}
      </View>
      <Body size={13} color={textInk} style={{ fontFamily: 'Fraunces_700Bold', letterSpacing: -0.2 }} align="center">
        {label}
      </Body>
    </Pressable>
  )
}

interface LogTileGridProps {
  children: ReactNode
}

export function LogTileGrid({ children }: LogTileGridProps) {
  return <View style={styles.grid}>{children}</View>
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 6,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
})
