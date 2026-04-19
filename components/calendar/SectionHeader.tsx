/**
 * SectionHeader — "Wednesday, Apr 15 · 0 activities" style section divider.
 */

import { View, StyleSheet } from 'react-native'
import { Calendar } from 'lucide-react-native'
import { useTheme } from '../../constants/theme'
import { Body } from '../ui/Typography'

interface SectionHeaderProps {
  title: string
  /** Right side count string e.g. "0 activities" */
  right?: string
  /** Override icon color (defaults to mode accent) */
  iconColor?: string
  /** Hide the leading icon */
  noIcon?: boolean
}

export function SectionHeader({ title, right, iconColor, noIcon }: SectionHeaderProps) {
  const { colors, isDark, font } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  const muted = isDark ? colors.textMuted : '#6E6763'
  const resolvedIconColor = iconColor ?? (isDark ? colors.primary : '#7048B8')

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {!noIcon ? <Calendar size={16} color={resolvedIconColor} strokeWidth={2} /> : null}
        <Body size={15} color={ink} style={{ fontFamily: font.bodySemiBold }}>
          {title}
        </Body>
      </View>
      {right ? (
        <Body size={13} color={muted}>
          {right}
        </Body>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
})
