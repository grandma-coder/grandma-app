// components/ui/diffuse/pickers/SegmentedBloom.tsx
//
// SegmentedBloom — hairline mono segmented control (single-select "5 days"
// pill family) from the Diffuse onboarding step-flows. Renders a row of
// hairline mono pills; the selected pill reads as ink + bold + a firm
// hairline border + a subtle bg highlight — no filled color pill, matching
// the `.seg button.on` spec.
//
// Presentational only — no data/store logic. RN equivalent of the HTML
// `.seg` markup in docs/design/Onboarding.html.

import { View, Pressable, Text, StyleSheet } from 'react-native'
import { useDiffuseTheme, diffuseFont } from '../../../../constants/theme'

export interface SegmentedBloomOption {
  key: string
  label: string
}

interface SegmentedBloomProps {
  options: SegmentedBloomOption[]
  value: string | null
  onChange: (key: string) => void
}

export function SegmentedBloom({ options, value, onChange }: SegmentedBloomProps) {
  const { colors } = useDiffuseTheme()

  return (
    <View style={s.row}>
      {options.map((opt) => {
        const on = opt.key === value
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[
              s.seg,
              {
                borderColor: on ? colors.hairline : colors.line,
                backgroundColor: on ? colors.surfaceRaised : colors.surface,
              },
            ]}
          >
            <Text
              style={[
                s.segText,
                {
                  color: on ? colors.ink : colors.ink3,
                  fontFamily: on ? diffuseFont.monoBold : diffuseFont.mono,
                },
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

const s = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  seg: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 22,
  },
  segText: {
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
})
