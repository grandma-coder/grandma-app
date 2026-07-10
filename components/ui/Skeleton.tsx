/**
 * Skeleton — animated placeholder block matching a card/text shape.
 *
 * Uses colors.surfaceRaised + a 0.4 → 1 opacity pulse (800ms each way).
 * Pass the same radius the real content will use (radius.md for cards,
 * 999 for pills, or a small value for text lines).
 */

import { useEffect, useRef } from 'react'
import { Animated, type ViewStyle, type StyleProp } from 'react-native'
import { useTheme, useDiffuseTheme, radius as r } from '../../constants/theme'
import { useIsDiffuse } from './diffuse/DiffuseKit'

interface SkeletonProps {
  width?: number | `${number}%`
  height?: number
  radius?: number
  style?: StyleProp<ViewStyle>
}

export function Skeleton({
  width = '100%',
  height = 16,
  radius: rad = r.sm,
  style,
}: SkeletonProps) {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: diffuse ? dt.colors.surfaceRaised : colors.surfaceRaised,
          borderRadius: rad,
          opacity,
        },
        style,
      ]}
    />
  )
}
