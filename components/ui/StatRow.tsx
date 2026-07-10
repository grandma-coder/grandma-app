import { ReactNode } from 'react'
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from './diffuse/DiffuseKit'

interface StatRowProps {
  icon: ReactNode
  label: string
  value?: string
  onPress?: () => void
  isLast?: boolean
  iconBg?: string
  style?: StyleProp<ViewStyle>
}

/**
 * One-line row with leading sticker-icon circle, label, right value, chevron.
 * Matches the paper-card row pattern from the redesign ProfileScreen.
 */
export function StatRow({
  icon,
  label,
  value,
  onPress,
  isLast,
  iconBg,
  style,
}: StatRowProps) {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  // Diffuse: borderless row separated by a hairline, sans-read label, mono
  // value, and a hairline icon circle (no filled sticker tint). Sticker icons
  // pass straight through — they stay the icon system.
  const dividerColor = diffuse ? dt.colors.line : colors.borderLight
  const labelColor = diffuse ? dt.colors.ink : colors.text
  const valueColor = diffuse ? dt.colors.ink3 : colors.textMuted
  const chevronColor = diffuse ? dt.colors.ink3 : colors.textMuted

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && {
          borderBottomWidth: diffuse ? StyleSheet.hairlineWidth : 1,
          borderBottomColor: dividerColor,
        },
        pressed && onPress ? { opacity: 0.7 } : null,
        style,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          diffuse
            ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2 }
            : { backgroundColor: iconBg ?? colors.surfaceRaised },
        ]}
      >
        {icon}
      </View>
      <Text
        style={[
          styles.label,
          { color: labelColor },
          diffuse && { fontFamily: diffuseFont.body, fontWeight: '400' },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {value ? (
        <Text
          style={[
            styles.value,
            { color: valueColor },
            diffuse && { fontFamily: diffuseFont.mono, fontWeight: '400', letterSpacing: 0.6, textTransform: 'uppercase' },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}
      <ChevronRight size={14} color={chevronColor} strokeWidth={diffuse ? 1.6 : 2} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 14, fontWeight: '500' },
  value: { fontSize: 12, fontWeight: '500' },
})
