// components/ui/diffuse/pickers/PoleField.tsx
//
// PoleField — a binary (2-option) single-select picker where the answer IS the
// diagram: two soft blooms sit at opposite corners (top-right / bottom-left),
// joined by a thin diagonal connector line. Selecting a blob brightens its
// bloom (opacity .4 → .9) and scales it up ~1.1; its label brightens from
// muted ink3 to full ink. Used for binary questions like temp-tracking? and
// first-pregnancy?.
//
// Presentational only — no data/store logic. RN equivalent of the HTML
// `.polefield` / `.poleblob` / `.poleline` markup in docs/design/Onboarding.html.

import { View, Pressable, Text, StyleSheet } from 'react-native'
import Svg, { Line } from 'react-native-svg'
import { useDiffuseTheme, diffuseFont } from '../../../../constants/theme'
import { SoftBloom } from '../DiffuseKit'

export interface PoleOption {
  key: string
  label: string
  sub?: string
  /** Bloom color, caller-supplied — passed straight through to SoftBloom. */
  color: string
}

interface PoleFieldProps {
  options: [PoleOption, PoleOption]
  value: string | null
  onChange: (key: string) => void
}

const FIELD_HEIGHT = 340
const BLOB_SIZE = 152
const BLOOM_SIZE = 120

export function PoleField({ options, value, onChange }: PoleFieldProps) {
  const dt = useDiffuseTheme()
  const [topRight, bottomLeft] = options

  return (
    <View style={[styles.root, { height: FIELD_HEIGHT }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFillObject}
      >
        <Line x1={74} y1={26} x2={26} y2={78} stroke={dt.colors.line2} strokeWidth={0.4} />
      </Svg>

      <PoleBlob option={topRight} selected={value === topRight.key} onPress={() => onChange(topRight.key)} placement={styles.topRight} />
      <PoleBlob option={bottomLeft} selected={value === bottomLeft.key} onPress={() => onChange(bottomLeft.key)} placement={styles.bottomLeft} />
    </View>
  )
}

function PoleBlob({
  option,
  selected,
  onPress,
  placement,
}: {
  option: PoleOption
  selected: boolean
  onPress: () => void
  placement: object
}) {
  const dt = useDiffuseTheme()

  return (
    <Pressable
      onPress={onPress}
      style={[styles.blob, placement]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={option.label}
    >
      <View
        pointerEvents="none"
        style={[
          styles.bloomWrap,
          { width: BLOOM_SIZE, height: BLOOM_SIZE, borderRadius: BLOOM_SIZE / 2 },
          selected && styles.bloomSelected,
        ]}
      >
        <SoftBloom color={option.color} opacity={selected ? 0.9 : 0.4} spread={0.6} radius="55%" />
      </View>
      <Text style={[styles.label, { color: selected ? dt.colors.ink : dt.colors.ink3 }]}>{option.label}</Text>
      {option.sub ? <Text style={[styles.sub, { color: dt.colors.ink3 }]}>{option.sub}</Text> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    width: '100%',
  },
  blob: {
    position: 'absolute',
    width: BLOB_SIZE,
    alignItems: 'center',
  },
  topRight: {
    right: -6,
    top: '5%',
  },
  bottomLeft: {
    left: -6,
    bottom: '5%',
  },
  bloomWrap: {
    marginBottom: 14,
  },
  bloomSelected: {
    transform: [{ scale: 1.1 }],
  },
  label: {
    fontFamily: diffuseFont.bodySemiBold,
    fontSize: 17,
    letterSpacing: -0.17,
    textAlign: 'center',
  },
  sub: {
    fontFamily: diffuseFont.mono,
    fontSize: 9.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 5,
  },
})
