// components/ui/diffuse/pickers/BloomChips.tsx
//
// BloomChips — hairline mono chip picker (the "5 days" chip family) from the
// Diffuse onboarding step-flows. Renders a wrapping row of pill chips; an "on"
// chip reads as ink + bold + a firm hairline border + a subtle bg highlight —
// there is NO filled color pill, per the v3 chip spec. Supports multi-select
// (default) or single-select (`multi={false}`), a "None"-exclusive rule (any
// chip whose label starts with "None", case-insensitive, clears every other
// selection when picked, and is itself cleared the moment another chip is
// picked), and an optional trailing "Other +" chip that reveals a bare
// `DiffuseField` text input beneath the row when toggled on.
//
// Presentational only — no data/store logic. RN equivalent of the HTML
// `.chips` / `.chip` / `.other-input` markup in docs/design/Onboarding.html.

import { View, Pressable, Text, StyleSheet } from 'react-native'
import { diffuseFont, useDiffuseTheme } from '../../../../constants/theme'
import { DiffuseField } from '../DiffuseField'

export interface ChipOption {
  key: string
  label: string
}

interface BloomChipsProps {
  options: ChipOption[]
  value: string[]
  onChange: (next: string[]) => void
  /** Multi-select by default; pass `false` for single-select (replaces the whole value). */
  multi?: boolean
  /** Reveals a trailing "Other +" chip + bare text input when toggled on. */
  allowOther?: boolean
  otherValue?: string
  onOtherChange?: (t: string) => void
}

const isNoneLabel = (label: string) => /^none/i.test(label.trim())

export function BloomChips({
  options,
  value,
  onChange,
  multi = true,
  allowOther = false,
  otherValue = '',
  onOtherChange,
}: BloomChipsProps) {
  const otherKey = '__other__'
  const otherOn = value.includes(otherKey)

  const handlePress = (opt: ChipOption) => {
    const selected = value.includes(opt.key)

    if (!multi) {
      onChange([opt.key])
      return
    }

    if (isNoneLabel(opt.label)) {
      // Selecting a "None"-type chip clears everything else; tapping it again
      // (already on) clears the whole selection.
      onChange(selected ? [] : [opt.key])
      return
    }

    // Selecting any non-None chip drops every None-labeled key from the result.
    const noneKeys = new Set(options.filter((o) => isNoneLabel(o.label)).map((o) => o.key))
    const withoutNone = value.filter((k) => !noneKeys.has(k))
    const next = selected ? withoutNone.filter((k) => k !== opt.key) : [...withoutNone, opt.key]
    onChange(next)
  }

  const handleOtherToggle = () => {
    onChange(otherOn ? value.filter((k) => k !== otherKey) : [...value, otherKey])
  }

  return (
    <View>
      <View style={s.row}>
        {options.map((opt) => {
          const on = value.includes(opt.key)
          return (
            <Chip key={opt.key} label={opt.label} on={on} onPress={() => handlePress(opt)} />
          )
        })}
        {allowOther && (
          <Chip label="Other +" on={otherOn} onPress={handleOtherToggle} />
        )}
      </View>
      {allowOther && otherOn && (
        <View style={s.otherWrap}>
          <DiffuseField
            value={otherValue}
            onChangeText={(t) => onOtherChange?.(t)}
            placeholder="Tell us more…"
          />
        </View>
      )}
    </View>
  )
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { colors } = useDiffuseTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[
        s.chip,
        {
          borderColor: on ? colors.hairline : colors.line,
          backgroundColor: on ? colors.surfaceRaised : colors.surface,
        },
      ]}
    >
      <Text
        style={[
          s.chipText,
          {
            color: on ? colors.ink : colors.ink3,
            fontFamily: on ? diffuseFont.monoBold : diffuseFont.mono,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  chipText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  otherWrap: { marginTop: 14 },
})
