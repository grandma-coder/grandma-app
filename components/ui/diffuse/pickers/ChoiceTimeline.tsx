// components/ui/diffuse/pickers/ChoiceTimeline.tsx
//
// ChoiceTimeline — the vertical connector-line picker from the Diffuse
// onboarding flow ("KIDS 09 · add caregiver", cycle/pregnancy "who helps"
// style questions). A single 1px line threads down behind a column of rows.
// Each row carries either an icon-node (a 46px hairline circle with a SoftBloom
// behind the glyph when selected) or, when iconless, a small ring-dot sitting on
// the line. The row label is serif-bold; when selected it is wrapped in a
// hairline outline-ellipse (approximating the reference `.tx b::after`). A mono
// uppercase sub sits below.
//
// Presentational only — no data/store logic. RN equivalent of the HTML
// `.choice` / `.choicecard` markup in docs/design/Onboarding.html.

import { ReactNode } from 'react'
import { View, Pressable, Text, StyleSheet } from 'react-native'
import { useDiffuseTheme, diffuseFont } from '../../../../constants/theme'
import { SoftBloom } from '../DiffuseKit'

export interface ChoiceOption {
  key: string
  label: string
  sub?: string
  /** Optional thin Lucide-style glyph — presence switches the row to icon-node mode. */
  icon?: ReactNode
  /** Bloom color behind the icon glyph when selected. Falls back to ink3 wash. */
  bloomColor?: string
}

interface ChoiceTimelineProps {
  options: ChoiceOption[]
  value: string | null
  onChange: (key: string) => void
}

const ICON_NODE = 46
const RING_DOT = 13
// Connector line x-position: centered under the icon-node column (ICON_NODE / 2)
// so it threads through both the 46px circles and the 13px ring-dots.
const LINE_X = ICON_NODE / 2
// Row vertical padding — the line is inset from the first/last node center so it
// starts/ends inside the column (matches the reference top:34 / bottom:34 inset).
const ROW_PAD_V = 14

export function ChoiceTimeline({ options, value, onChange }: ChoiceTimelineProps) {
  const { colors } = useDiffuseTheme()

  return (
    <View style={styles.root}>
      {/* Connector line behind the nodes — inset top+bottom so it spans node
          centers rather than the full column height. */}
      <View
        pointerEvents="none"
        style={[
          styles.line,
          { left: LINE_X, top: ROW_PAD_V + ICON_NODE / 2, bottom: ROW_PAD_V + ICON_NODE / 2, backgroundColor: colors.line },
        ]}
      />

      {options.map((opt) => {
        const selected = opt.key === value
        const hasIcon = opt.icon != null

        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={opt.label}
            style={styles.row}
          >
            {hasIcon ? (
              <View
                style={[
                  styles.iconNode,
                  { borderColor: selected ? colors.ink : colors.line2, backgroundColor: colors.bg },
                ]}
              >
                {selected ? (
                  <View style={styles.iconBloom}>
                    <SoftBloom color={opt.bloomColor ?? colors.ink3} opacity={0.85} spread={0.5} radius="55%" />
                  </View>
                ) : null}
                <View style={styles.iconGlyph}>{opt.icon}</View>
              </View>
            ) : (
              // Iconless: a small ring-dot sitting on the line, centered in the
              // icon-node footprint so labels align across mixed rows.
              <View style={styles.dotSlot}>
                <View
                  style={[
                    styles.ringDot,
                    {
                      borderColor: selected ? colors.ink : colors.line2,
                      backgroundColor: selected ? colors.ink : colors.bg,
                    },
                  ]}
                />
              </View>
            )}

            <View style={styles.tx}>
              <View
                style={[
                  styles.labelWrap,
                  selected && { borderColor: colors.hairline, borderWidth: 1.5 },
                ]}
              >
                <Text style={[styles.label, { color: colors.ink }]}>{opt.label}</Text>
              </View>
              {opt.sub ? (
                <Text style={[styles.sub, { color: colors.ink3 }]}>{opt.sub}</Text>
              ) : null}
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
  },
  line: {
    position: 'absolute',
    width: 1,
    zIndex: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingVertical: ROW_PAD_V,
    zIndex: 1,
  },
  iconNode: {
    width: ICON_NODE,
    height: ICON_NODE,
    borderRadius: ICON_NODE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  iconBloom: {
    ...StyleSheet.absoluteFillObject,
    margin: 2,
    borderRadius: ICON_NODE / 2,
    overflow: 'hidden',
  },
  iconGlyph: {
    zIndex: 1,
  },
  dotSlot: {
    width: ICON_NODE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ringDot: {
    width: RING_DOT,
    height: RING_DOT,
    borderRadius: RING_DOT / 2,
    borderWidth: 1.5,
  },
  tx: {
    flex: 1,
  },
  // The outline-ellipse: a bordered rounded container hugging the label, echoing
  // the reference `.tx b::after` hand-drawn ellipse (inset -7 -15, radius 50%).
  labelWrap: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginLeft: -14,
    marginVertical: -3,
  },
  label: {
    fontFamily: diffuseFont.bodySemiBold,
    fontSize: 16,
    letterSpacing: -0.16,
  },
  sub: {
    fontFamily: diffuseFont.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginTop: 5,
  },
})
