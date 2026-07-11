import React from 'react'
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native'
import Svg, { Ellipse } from 'react-native-svg'
import { useDiffuseTheme, diffuseFont } from '../../../../constants/theme'
import { orbitNodePositions } from '../../../../lib/diffusePickers/orbit'
import { SoftBloom } from '../DiffuseKit'

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
const BLOOM_SIZE = NODE_DOT_SIZE * 2.75

/**
 * OrbitPicker — a 4-option single-select picker rendered as a dashed ellipse ring
 * with dot-nodes at its corners. Used across cycle + pregnancy flows for
 * trying-duration / birth-place / care-provider style questions.
 *
 * Presentational only — layout math lives in `lib/diffusePickers/orbit.ts`,
 * selection state is fully controlled via `value` / `onChange`.
 */
export function OrbitPicker({ options, value, onChange }: OrbitPickerProps) {
  const dt = useDiffuseTheme()
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
          stroke={dt.colors.line2}
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
            <View style={styles.glowRing}>
              {selected ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.bloomWrap,
                    { width: BLOOM_SIZE, height: BLOOM_SIZE, borderRadius: BLOOM_SIZE / 2 },
                  ]}
                >
                  <SoftBloom color={option.accent} opacity={0.75} spread={0.55} radius="55%" />
                </View>
              ) : null}
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: selected ? option.accent : dt.colors.line2,
                    transform: [{ scale: selected ? 1.18 : 1 }],
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.label,
                {
                  fontFamily: diffuseFont.bodySemiBold,
                  color: selected ? dt.colors.ink : dt.colors.ink3,
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
                    fontFamily: diffuseFont.mono,
                    color: dt.colors.ink3,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  bloomWrap: {
    position: 'absolute',
    alignSelf: 'center',
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
