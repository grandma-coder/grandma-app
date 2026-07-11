import React from 'react'
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native'
import Svg, { Ellipse } from 'react-native-svg'
import { useTheme } from '../../../../constants/theme'
import { orbitNodePositions } from '../../../../lib/diffusePickers/orbit'

export interface OrbitOption {
  key: string
  label: string
  sub?: string
  accent: string
}

interface OrbitPickerProps {
  options: OrbitOption[]
  value: string | null
  onChange: (key: string) => void
}

const CONTAINER_SIZE = 340
const NODE_DOT_SIZE = 13
const GLOW_RING_SIZE = NODE_DOT_SIZE + 6 * 2

/**
 * OrbitPicker — a 4-option single-select picker rendered as a dashed ellipse ring
 * with dot-nodes at its corners. Used across cycle + pregnancy flows for
 * trying-duration / birth-place / care-provider style questions.
 *
 * Presentational only — layout math lives in `lib/diffusePickers/orbit.ts`,
 * selection state is fully controlled via `value` / `onChange`.
 */
export function OrbitPicker({ options, value, onChange }: OrbitPickerProps) {
  const { colors, font } = useTheme()
  const positions = orbitNodePositions(options.length)

  return (
    <View style={[styles.container, { width: CONTAINER_SIZE, height: CONTAINER_SIZE }]}>
      <Svg
        width={CONTAINER_SIZE}
        height={CONTAINER_SIZE}
        viewBox="0 0 100 100"
        style={StyleSheet.absoluteFillObject}
      >
        <Ellipse
          cx={50}
          cy={50}
          rx={33}
          ry={40}
          fill="none"
          stroke={colors.border}
          strokeWidth={0.6}
          strokeDasharray=".6 2.6"
        />
      </Svg>

      {options.map((option, index) => {
        const position = positions[index]
        const selected = value === option.key

        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[
              styles.node,
              { left: position.left, top: position.top } as ViewStyle,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
          >
            <View
              style={[
                styles.glowRing,
                selected && {
                  backgroundColor: `${option.accent}33`,
                },
              ]}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: selected ? option.accent : colors.border,
                    transform: [{ scale: selected ? 1.18 : 1 }],
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.label,
                {
                  fontFamily: font.bodySemiBold,
                  color: selected ? colors.text : colors.textFaint,
                },
              ]}
            >
              {option.label}
            </Text>
            {option.sub ? (
              <Text
                style={[
                  styles.sub,
                  {
                    fontFamily: font.body,
                    color: colors.textFaint,
                  },
                ]}
              >
                {option.sub}
              </Text>
            ) : null}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'center',
  },
  node: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -60 }, { translateY: -30 }],
    width: 120,
  },
  glowRing: {
    width: GLOW_RING_SIZE,
    height: GLOW_RING_SIZE,
    borderRadius: GLOW_RING_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dot: {
    width: NODE_DOT_SIZE,
    height: NODE_DOT_SIZE,
    borderRadius: NODE_DOT_SIZE / 2,
  },
  label: {
    fontSize: 15,
    textAlign: 'center',
  },
  sub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
})
