/**
 * SegmentedTabs — sticker-style segmented control for agenda tab switching.
 *
 * Active = sticker pill (yellow fill, ink border, hard offset shadow, press translates down).
 * Inactive = ink text on cream paper. Supports 2–4 options.
 */

import { View, Pressable, Text, StyleSheet } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'

const ST_INK = '#141313'

export interface SegmentedOption {
  key: string
  label: string
}

interface SegmentedTabsProps {
  options: SegmentedOption[]
  value: string
  onChange: (key: string) => void
  /** Fill color of the active pill. Defaults to sticker yellow. */
  activeBg?: string
  /** Text color inside the active pill. Defaults to ink. */
  activeFg?: string
}

export function SegmentedTabs(props: SegmentedTabsProps) {
  const diffuse = useIsDiffuse()
  return diffuse ? <DiffuseSegmentedTabs {...props} /> : <CurrentSegmentedTabs {...props} />
}

// ─── Diffuse (v3) — `.seg`: containerless hairline mono pills ───────────────
// No filled track, no offset shadow. Active = surface fill + ink hairline +
// mono-bold; inactive = transparent + faint hairline + mono. Mode-agnostic
// (shared across Kids / Pregnancy / Cycle agendas).
function DiffuseSegmentedTabs({ options, value, onChange }: SegmentedTabsProps) {
  const { colors } = useDiffuseTheme()
  return (
    <View style={dstyles.row}>
      {options.map((opt) => {
        const isActive = opt.key === value
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={({ pressed }) => [
              dstyles.pill,
              {
                borderColor: isActive ? colors.hairline : colors.line,
                backgroundColor: isActive ? colors.surface : 'transparent',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={{
                fontFamily: isActive ? diffuseFont.monoBold : diffuseFont.mono,
                fontSize: options.length > 3 ? 11 : 12,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: isActive ? colors.ink : colors.ink3,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function CurrentSegmentedTabs({ options, value, onChange, activeBg, activeFg }: SegmentedTabsProps) {
  const { colors, font, isDark } = useTheme()

  const trackBg = colors.surface
  const trackBorder = colors.text
  const inactiveFg = colors.textSecondary
  const resolvedActiveBg = activeBg ?? colors.text
  const resolvedActiveFg = activeFg ?? colors.bg

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: trackBg,
          borderColor: trackBorder,
        },
      ]}
    >
      {options.map((opt) => {
        const isActive = opt.key === value
        const fontSize = options.length > 3 ? 13 : 14
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={({ pressed }) => [
              styles.segment,
              isActive && {
                backgroundColor: resolvedActiveBg,
                borderWidth: 1.5,
                borderColor: colors.text,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  fontFamily: isActive ? font.bodyBold : font.bodyMedium,
                  color: isActive ? resolvedActiveFg : inactiveFg,
                  fontSize,
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

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 999,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    letterSpacing: -0.1,
  },
})

const dstyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  pill: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
