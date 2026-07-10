// components/ui/diffuse/pickers/BlobPicker.tsx
//
// BlobPicker — the free-floating bloom-circle picker from the Diffuse
// onboarding journey picker ("GENERAL 01 · journey picker"). Each option is a
// soft radial bloom absolutely positioned in free layout, carrying a mono
// uppercase kicker + a serif-italic name centered on it. Selecting an option
// brightens its bloom (higher opacity) and scales it up ~1.06; the kicker turns
// from muted to ink. Single-select by default (controlled by `value`), with
// optional multi-select (`selectedKeys`) + disabled/dimmed (`disabledKeys`)
// support for consumers like the enrollment journey picker.
//
// Presentational only — no data/store logic. RN equivalent of the HTML
// `.blobpick` / `.bopt` markup in docs/design/Onboarding.html.

import { View, Pressable, Text, StyleSheet, type ViewStyle, type DimensionValue } from 'react-native'
import { useDiffuseTheme, diffuseFont } from '../../../../constants/theme'
import { SoftBloom } from '../DiffuseKit'

export interface BlobOption {
  key: string
  kicker: string
  name: string
  /** Bloom color, caller-supplied — passed straight through to SoftBloom. */
  color: string
  /** Free-layout offset, a CSS length like '-6px' or '24%'. */
  cx: string
  cy: string
}

interface BlobPickerProps {
  options: BlobOption[]
  value: string | null
  onChange: (key: string) => void
  /**
   * Optional multi-select. When provided, an option is "selected" if its key is
   * in this array — overrides the single `value` check. Omit for single-select.
   */
  selectedKeys?: string[]
  /**
   * Optional disabled/dimmed keys. Options listed here render at ~0.55 opacity,
   * are non-tappable, and never fire onChange (e.g. already-enrolled journeys).
   */
  disabledKeys?: string[]
}

const OPTION_SIZE = 188

export function BlobPicker({ options, value, onChange, selectedKeys, disabledKeys }: BlobPickerProps) {
  const { colors } = useDiffuseTheme()

  return (
    <View style={styles.root}>
      {options.map((opt) => {
        // Multi-select (`selectedKeys`) overrides the single-`value` check when
        // provided; otherwise fall back to the original single-select path.
        const selected = selectedKeys ? selectedKeys.includes(opt.key) : opt.key === value
        const disabled = disabledKeys?.includes(opt.key) ?? false
        // A dimmed (disabled) option keeps its bloom bright/scaled to read as an
        // already-committed choice, but is muted and non-tappable.
        const active = selected || disabled
        // Translate by half the size so the offset anchors the option's center
        // (matches the free-layout corner/edge placement in the reference).
        // cx/cy are caller-supplied CSS lengths ('-6px', '24%', …); RN accepts
        // them at runtime but its DimensionValue type is narrower, so cast.
        const placement: ViewStyle = {
          left: opt.cx as DimensionValue,
          top: opt.cy as DimensionValue,
          transform: [{ translateX: -OPTION_SIZE / 2 }, { translateY: -OPTION_SIZE / 2 }],
          opacity: disabled ? 0.55 : 1,
        }
        return (
          <Pressable
            key={opt.key}
            onPress={() => !disabled && onChange(opt.key)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            style={[styles.opt, placement]}
          >
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, active && styles.bloomSelected]}
            >
              <SoftBloom
                color={opt.color}
                opacity={active ? 0.82 : 0.5}
                cx="50%"
                cy="50%"
                spread={0.6}
                radius="50%"
              />
            </View>
            <Text
              style={[
                styles.kicker,
                { color: active ? colors.ink : colors.ink3 },
              ]}
            >
              {opt.kicker}
            </Text>
            <Text style={[styles.name, { color: colors.ink }]}>{opt.name}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  opt: {
    position: 'absolute',
    width: OPTION_SIZE,
    height: OPTION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloomSelected: {
    transform: [{ scale: 1.06 }],
  },
  kicker: {
    fontFamily: diffuseFont.mono,
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  name: {
    fontFamily: diffuseFont.italic,
    fontSize: 27,
    letterSpacing: -0.3,
    marginTop: 1,
  },
})
