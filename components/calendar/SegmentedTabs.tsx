/**
 * SegmentedTabs — pill segmented control for agenda tab switching.
 *
 * Supports 3–4 options (pregnancy uses 4). Inactive = text on paper,
 * active = filled pill with mode-appropriate bg.
 */

import { View, Pressable, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../constants/theme'

export interface SegmentedOption {
  key: string
  label: string
}

interface SegmentedTabsProps {
  options: SegmentedOption[]
  value: string
  onChange: (key: string) => void
  /** Fill color of the active pill. Defaults to ink. */
  activeBg?: string
  /** Text color inside the active pill. Auto-derived if omitted. */
  activeFg?: string
}

export function SegmentedTabs({ options, value, onChange, activeBg, activeFg }: SegmentedTabsProps) {
  const { colors, font, isDark } = useTheme()

  const trackBg = isDark ? colors.surface : '#FFFEF8'
  const trackBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const inactiveFg = isDark ? colors.textSecondary : '#3A3533'
  const defaultActiveBg = isDark ? colors.text : '#141313'
  const resolvedActiveBg = activeBg ?? defaultActiveBg
  const resolvedActiveFg = activeFg ?? (isDark ? colors.bg : '#FFFEF8')

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
            style={[
              styles.segment,
              isActive && {
                backgroundColor: resolvedActiveBg,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  fontFamily: isActive ? font.bodySemiBold : font.bodyMedium,
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
    borderWidth: 1,
    alignItems: 'center',
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    letterSpacing: -0.1,
  },
})
