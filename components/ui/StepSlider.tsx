/**
 * StepSlider — touch-and-drag numeric slider snapping to integer steps.
 *
 * The thumb is a sticker — paper-white circle with a hard offset shadow,
 * a slight resting tilt, and a "lift" (scale + brighter shadow) while the
 * user is dragging. Tapping anywhere on the track also sets the value.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  PanResponder,
  StyleSheet,
  LayoutChangeEvent,
  Pressable,
  Animated,
  Easing,
} from 'react-native'
import { useTheme } from '../../constants/theme'

interface StepSliderProps {
  min: number
  max: number
  value: number
  onChange: (n: number) => void
  /** Track + thumb color (mode/brand color) */
  color: string
  /** Optional unit suffix shown next to the value (e.g. "hrs"). */
  unit?: string
}

const TRACK_HEIGHT = 10
const THUMB_SIZE = 36
const THUMB_HIT = THUMB_SIZE + 16

export function StepSlider({
  min,
  max,
  value,
  onChange,
  color,
  unit,
}: StepSliderProps) {
  const { colors, font } = useTheme()
  const [width, setWidth] = useState(0)
  const widthRef = useRef(0)
  const valueRef = useRef(value)
  valueRef.current = value

  const dragAnim = useRef(new Animated.Value(0)).current

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width
    widthRef.current = w
    setWidth(w)
  }

  const stepCount = max - min
  const clamp = (n: number) => Math.max(min, Math.min(max, n))
  const fromX = (x: number) => {
    if (widthRef.current <= 0) return valueRef.current
    const ratio = x / widthRef.current
    return clamp(Math.round(min + ratio * stepCount))
  }

  const animateDrag = (toValue: number) => {
    Animated.timing(dragAnim, {
      toValue,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          animateDrag(1)
          const next = fromX(e.nativeEvent.locationX)
          if (next !== valueRef.current) onChange(next)
        },
        onPanResponderMove: (e) => {
          const next = fromX(e.nativeEvent.locationX)
          if (next !== valueRef.current) onChange(next)
        },
        onPanResponderRelease: () => animateDrag(0),
        onPanResponderTerminate: () => animateDrag(0),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [min, max],
  )

  // Reset drag animation if component unmounts mid-drag
  useEffect(() => () => dragAnim.stopAnimation(), [dragAnim])

  const ratio = stepCount > 0 ? (value - min) / stepCount : 0
  const fillWidth = Math.max(0, ratio * width)
  const thumbLeft = Math.max(0, Math.min(width - THUMB_SIZE, ratio * width - THUMB_SIZE / 2))

  // Animated transforms — sticker lifts and tilts as user drags.
  // Note: shadowOffset can't be animated by the native driver, so we fake the
  // "lift" with a translateY and scale instead — keeps the warning away.
  const scale = dragAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] })
  const translateY = dragAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -2] })
  const restingTilt = -3 // °
  const draggingTilt = 6 // °
  const rotate = dragAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${restingTilt}deg`, `${draggingTilt}deg`],
  })

  return (
    <View style={styles.wrap}>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: colors.text, fontFamily: font.display }]}>
          {value}
          {unit ? <Text style={[styles.unit, { color: colors.textMuted, fontFamily: font.bodyMedium }]}> {unit}</Text> : null}
        </Text>
      </View>

      <View
        style={styles.trackHit}
        onLayout={onLayout}
        {...responder.panHandlers}
      >
        <View
          style={[
            styles.track,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        />
        <View
          style={[
            styles.fill,
            {
              width: fillWidth,
              backgroundColor: color,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.thumb,
            {
              left: thumbLeft,
              backgroundColor: '#FFFEF8',
              borderColor: color,
              transform: [{ translateY }, { scale }, { rotate }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={[styles.thumbDot, { backgroundColor: color }]} />
          {/* sticker highlight — small notch top-left */}
          <View style={styles.thumbHighlight} />
        </Animated.View>
      </View>

      <View style={styles.scaleRow}>
        <Pressable hitSlop={8} onPress={() => onChange(min)}>
          <Text style={[styles.scaleText, { color: colors.textMuted, fontFamily: font.body }]}>{min}</Text>
        </Pressable>
        <Pressable hitSlop={8} onPress={() => onChange(max)}>
          <Text style={[styles.scaleText, { color: colors.textMuted, fontFamily: font.body }]}>{max}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  valueRow: {
    alignItems: 'center',
    marginBottom: 14,
  },
  value: {
    fontSize: 36,
  },
  unit: {
    fontSize: 16,
  },
  trackHit: {
    height: THUMB_HIT,
    justifyContent: 'center',
    paddingHorizontal: THUMB_SIZE / 2,
    marginHorizontal: -THUMB_SIZE / 2,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: 1,
  },
  fill: {
    position: 'absolute',
    left: THUMB_SIZE / 2,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    top: (THUMB_HIT - THUMB_SIZE) / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  thumbDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  thumbHighlight: {
    position: 'absolute',
    top: 4,
    left: 6,
    width: 7,
    height: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    transform: [{ rotate: '-30deg' }],
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  scaleText: {
    fontSize: 12,
  },
})
