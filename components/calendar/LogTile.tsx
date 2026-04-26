/**
 * LogTile + LogTileGrid — entry tiles for the Log Activity bottom sheet.
 *
 * Shown on tap of header "+" across all 3 behaviors. Each tile: pastel tint,
 * icon circle, label. Tapping a tile opens the relevant log form.
 *
 * Motion:
 * - Staggered pop-in on mount (scale + opacity, spring), index-based delay.
 * - Press response: spring scale-down + tiny tilt; spring-back on release.
 */

import { ReactNode, useEffect, useRef, Children, cloneElement, isValidElement } from 'react'
import { Animated, Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from '../../constants/theme'
import { Body } from '../ui/Typography'
import { getTint, type TintKey } from './tints'

interface LogTileProps {
  icon: ReactNode
  label: string
  tint?: TintKey | string
  onPress: () => void
  /** Index in the grid — drives the stagger delay. Injected by LogTileGrid. */
  index?: number
}

const ENTRY_STAGGER_MS = 45

export function LogTile({ icon, label, tint = 'activity', onPress, index = 0 }: LogTileProps) {
  const { colors, isDark } = useTheme()
  const { fill, ink } = getTint(tint, isDark)
  const textInk = isDark ? colors.text : '#141313'

  const tileBorder = isDark ? 'transparent' : '#141313'
  const iconBorder = isDark ? 'transparent' : '#141313'

  // ── Mount: spring pop-in (scale + opacity) ────────────────────────────────
  const mount = useRef(new Animated.Value(0)).current
  useEffect(() => {
    mount.setValue(0)
    Animated.spring(mount, {
      toValue: 1,
      friction: 6,
      tension: 90,
      delay: index * ENTRY_STAGGER_MS,
      useNativeDriver: true,
    }).start()
  }, [mount, index])

  // ── Press: spring scale + slight tilt ─────────────────────────────────────
  const press = useRef(new Animated.Value(0)).current
  const handlePressIn = () => {
    Animated.spring(press, { toValue: 1, friction: 5, tension: 220, useNativeDriver: true }).start()
  }
  const handlePressOut = () => {
    Animated.spring(press, { toValue: 0, friction: 4, tension: 180, useNativeDriver: true }).start()
  }

  // Combined transforms — mount.scale * press.scale, plus press tilt.
  const mountScale = mount.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] })
  const pressScale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] })
  const pressTilt = press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-3deg'] })
  const opacity = mount.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })

  return (
    <Animated.View
      style={[
        styles.tileWrap,
        {
          opacity,
          transform: [{ scale: mountScale }, { scale: pressScale }, { rotate: pressTilt }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.tile,
          {
            backgroundColor: fill,
            borderWidth: isDark ? 0 : 1.5,
            borderColor: tileBorder,
            shadowColor: '#141313',
            shadowOpacity: isDark ? 0 : 0.06,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
          },
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: isDark ? ink + '33' : '#FFFEF8',
              borderWidth: isDark ? 0 : 1.5,
              borderColor: iconBorder,
            },
          ]}
        >
          {icon}
        </View>
        <Body size={13} color={textInk} style={{ fontFamily: 'Fraunces_700Bold', letterSpacing: -0.2 }} align="center">
          {label}
        </Body>
      </Pressable>
    </Animated.View>
  )
}

interface LogTileGridProps {
  children: ReactNode
}

export function LogTileGrid({ children }: LogTileGridProps) {
  // Inject the index prop into each LogTile child so they stagger their pop-in.
  let i = 0
  const indexed = Children.map(children, (child) => {
    if (!isValidElement(child)) return child
    if (child.type !== LogTile) return child
    return cloneElement(child as React.ReactElement<LogTileProps>, { index: i++ })
  })
  return <View style={styles.grid}>{indexed}</View>
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tileWrap: {
    width: '31.5%',
    aspectRatio: 1,
  },
  tile: {
    flex: 1,
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
