// components/ui/diffuse/pickers/MetaballBloom.tsx
//
// MetaballBloom — the Diffuse multi-select cluster where mono labels sit over a
// soft blurred "goo" bloom field (cycle conditions, pregnancy feelings). Each
// label is a dot-marker + text that toggles on/off; the field behind them is a
// cluster of overlapping feathered SoftBloom discs tinted with `fieldColor`.
//
// RN equivalent of the HTML `.bloomsvg` + `.bloomlbl` markup in
// docs/design/Onboarding.html.
//
// FEASIBILITY NOTE — the reference uses an SVG goo filter (feGaussianBlur +
// feColorMatrix alpha-sharpen) to merge circles into hard metaballs. That
// primitive IS available in react-native-svg 15.x, but the alpha-sharpen goo
// trick is fragile across the two native backends. We instead render the field
// as several OVERLAPPING SoftBloom discs at the label positions — the same
// feathered clustered-bloom feel, using the established Diffuse primitive, with
// no native-render risk. Fully within spec.
//
// Presentational only — no data/store logic; `value` + `onChange` are controlled.

import { View, Pressable, Text, StyleSheet, type DimensionValue } from 'react-native'
import { useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../../../constants/theme'
import { useModeStore } from '../../../../store/useModeStore'
import { SoftBloom } from '../DiffuseKit'
import { metaballLabelPositions } from '../../../../lib/diffusePickers/metaball'

export interface MetaballOption {
  key: string
  label: string
}

interface MetaballBloomProps {
  options: MetaballOption[]
  value: string[]
  onChange: (next: string[]) => void
  /** Per-mode bloom tint, caller-supplied. Falls back to the active mode accent. */
  fieldColor?: string
}

// A "None"-type option clears the rest (mirrors BloomChips).
const isNoneLabel = (label: string) => /^none/i.test(label.trim())

export function MetaballBloom({ options, value, onChange, fieldColor }: MetaballBloomProps) {
  const { colors } = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const tint = fieldColor ?? getDiffuseAccent(mode)

  const positions = metaballLabelPositions(options.length)

  const handlePress = (opt: MetaballOption) => {
    const selected = value.includes(opt.key)

    if (isNoneLabel(opt.label)) {
      // A "None"-type label clears everything else; tapping it again clears all.
      onChange(selected ? [] : [opt.key])
      return
    }

    // Any real option drops every None-labeled key from the result.
    const noneKeys = new Set(options.filter((o) => isNoneLabel(o.label)).map((o) => o.key))
    const withoutNone = value.filter((k) => !noneKeys.has(k))
    const next = selected ? withoutNone.filter((k) => k !== opt.key) : [...withoutNone, opt.key]
    onChange(next)
  }

  return (
    <View style={styles.root}>
      {/* Bloom field — overlapping feathered discs behind the labels. Selected
          labels bloom brighter; the whole field stays soft and merged. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {options.map((opt, i) => {
          const pos = positions[i]
          const on = value.includes(opt.key)
          return (
            <View
              key={`bloom-${opt.key}`}
              style={[
                styles.bloomDisc,
                {
                  left: pos.left as DimensionValue,
                  top: pos.top as DimensionValue,
                },
              ]}
            >
              <SoftBloom color={tint} opacity={on ? 0.5 : 0.28} cx="50%" cy="50%" spread={0.55} radius="55%" />
            </View>
          )
        })}
      </View>

      {/* Label markers — the tappable multi-select layer. */}
      {options.map((opt, i) => {
        const pos = positions[i]
        const on = value.includes(opt.key)
        return (
          <Pressable
            key={opt.key}
            onPress={() => handlePress(opt)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[
              styles.label,
              {
                left: pos.left as DimensionValue,
                top: pos.top as DimensionValue,
              },
            ]}
          >
            <View
              style={[
                styles.dot,
                { borderColor: on ? colors.ink : colors.line2 },
                on && { backgroundColor: colors.ink },
              ]}
            />
            <Text
              style={[
                styles.labelText,
                { color: on ? colors.ink : colors.ink3, fontFamily: on ? diffuseFont.monoBold : diffuseFont.mono },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const LABEL_W = 96
const DISC = 168

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  bloomDisc: {
    position: 'absolute',
    width: DISC,
    height: DISC,
    marginLeft: -DISC / 2,
    marginTop: -DISC / 2,
  },
  label: {
    position: 'absolute',
    width: LABEL_W,
    marginLeft: -LABEL_W / 2,
    marginTop: -18,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.2,
    marginBottom: 6,
  },
  labelText: {
    fontFamily: diffuseFont.mono,
    fontSize: 9.5,
    letterSpacing: 0.66,
    lineHeight: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
})
