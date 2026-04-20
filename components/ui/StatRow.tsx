import { ReactNode } from 'react'
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { useTheme } from '../../constants/theme'

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
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
        pressed && onPress ? { opacity: 0.7 } : null,
        style,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: iconBg ?? colors.surfaceRaised },
        ]}
      >
        {icon}
      </View>
      <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text style={[styles.value, { color: colors.textMuted }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
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
