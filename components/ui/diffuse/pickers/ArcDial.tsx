// components/ui/diffuse/pickers/ArcDial.tsx
//
// ArcDial — the WOVE-style arc-scroll number dial from the Diffuse onboarding
// (cycle length, kid count, …). Numbers sit on a circular arc; the selected
// value anchors dead-center as a big delicate serif with its unit in mono
// beneath it, and neighbours fan up/down the arc, shrinking + fading with
// distance. Drag vertically (or tap a neighbour) to spin the dial.
//
// The layout math is the pure `arcNumberLayout` port in
// `lib/diffusePickers/arcDial.ts` (tested); this file is the RN gesture +
// render shell. Constants (CX/CY/R/STEP/SIZES/OPAC) and the -3..3 window live
// there and match the `.arcpick` block in docs/design/Onboarding.html.
//
// Presentational + gesture only — controlled by `value`, no store/data logic.

import { useRef } from 'react'
import { View, Text, PanResponder, StyleSheet } from 'react-native'
import { useDiffuseTheme, diffuseFont } from '../../../../constants/theme'
import { arcNumberLayout, type ArcRow } from '../../../../lib/diffusePickers/arcDial'

interface ArcDialProps {
  min: number
  max: number
  /** Controlled selected value. */
  value: number
  onChange: (v: number) => void
  /** Unit label under the centered value (e.g. "days", "kids"). */
  unit: string
}

// Stage geometry. Height matches the `.arcpick` prototype (336px). The arc math
// uses an origin at (CX=-110, CY=170); those offsets are already baked into the
// x/y returned by arcNumberLayout. The centered (k=0) number therefore lands
// near x≈190 on the right of the arc, with neighbours sweeping up the left side
// — exactly as in the reference.
const STAGE_HEIGHT = 336
// Fixed width of each number's anchor box. It's left-aligned to the arc point
// and vertically centered on it (the readout reads rightward off the arc, as in
// the prototype where numbers hang to the right of the sweep).
const ANCHOR_WIDTH = 220
// Drag distance (px) that advances the dial by one step — matches the HTML
// pointer accumulator threshold (`dacc > 22`).
const STEP_THRESHOLD = 22

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function ArcDial({ min, max, value, onChange, unit }: ArcDialProps) {
  const rows = arcNumberLayout(value, min, max)

  // Latest value + bounds kept in refs so the PanResponder (created once) always
  // steps from the current controlled value without re-creating handlers.
  const valueRef = useRef(value)
  valueRef.current = value
  const boundsRef = useRef({ min, max })
  boundsRef.current = { min, max }
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const accRef = useRef(0)
  const lastYRef = useRef(0)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (e) => {
        accRef.current = 0
        lastYRef.current = e.nativeEvent.locationY
      },

      onPanResponderMove: (e) => {
        const y = e.nativeEvent.locationY
        // Dragging UP (y decreases) increments — matches the reference, where
        // `dacc += (lastY - clientY)` makes upward motion positive → step +1.
        accRef.current += lastYRef.current - y
        lastYRef.current = y
        while (Math.abs(accRef.current) >= STEP_THRESHOLD) {
          const dir = accRef.current > 0 ? 1 : -1
          const { min: lo, max: hi } = boundsRef.current
          const next = clamp(valueRef.current + dir, lo, hi)
          if (next !== valueRef.current) {
            valueRef.current = next
            onChangeRef.current(next)
          }
          accRef.current -= dir * STEP_THRESHOLD
        }
      },

      onPanResponderRelease: () => {
        accRef.current = 0
      },
    }),
  ).current

  return (
    <View style={styles.stage} {...panResponder.panHandlers}>
      {rows.map((row) => (
        <ArcNumber key={row.k} row={row} unit={unit} onPress={onChange} />
      ))}
    </View>
  )
}

function ArcNumber({
  row,
  unit,
  onPress,
}: {
  row: ArcRow
  unit: string
  onPress: (v: number) => void
}) {
  const { colors } = useDiffuseTheme()
  const isCenter = row.k === 0
  const angleDeg = `${(row.angleRad * 180) / Math.PI}deg`

  return (
    <View
      // Anchor box left-aligned to the arc point (x) and vertically centered on
      // it (top shifted by half the box height) — the RN equivalent of the
      // prototype's vertical translate(-50%). The glyph is rotated by the arc
      // angle so numbers tilt along the sweep.
      pointerEvents="box-none"
      style={[
        styles.anchor,
        {
          left: row.x,
          top: row.y - STAGE_HEIGHT / 2,
          opacity: row.opacity,
          transform: [{ rotate: angleDeg }],
        },
      ]}
    >
      {isCenter ? (
        <View
          style={styles.centerRow}
          onStartShouldSetResponder={() => false}
        >
          <Text
            style={[
              styles.centerNum,
              { color: colors.ink, fontSize: row.size },
            ]}
          >
            {row.value}
          </Text>
          <Text style={[styles.unit, { color: colors.ink3 }]}>{unit}</Text>
        </View>
      ) : (
        <Text
          onPress={() => onPress(row.value)}
          suppressHighlighting
          style={[styles.num, { color: colors.ink, fontSize: row.size }]}
        >
          {row.value}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  stage: {
    position: 'relative',
    width: '100%',
    height: STAGE_HEIGHT,
    overflow: 'hidden',
  },
  anchor: {
    position: 'absolute',
    width: ANCHOR_WIDTH,
    height: STAGE_HEIGHT,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerNum: {
    fontFamily: diffuseFont.displayLight,
    lineHeight: 76,
    letterSpacing: -1,
  },
  unit: {
    fontFamily: diffuseFont.mono,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginLeft: 12,
  },
  num: {
    fontFamily: diffuseFont.mono,
    letterSpacing: -0.5,
  },
})
