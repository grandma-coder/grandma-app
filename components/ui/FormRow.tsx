/**
 * FormRow — paper card row with sticker icon circle + MONO-CAPS label + serif value.
 *
 * Used across onboarding, profile, and any "field as row" pattern in the redesign.
 * Pass `children` to render a custom trailing control (picker, switch, chevron).
 */

import { ReactNode } from 'react'
import { View, Text, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../constants/theme'

interface FormRowProps {
  label: string
  value?: string | number
  sticker?: ReactNode
  stickerTint?: string
  onPress?: () => void
  children?: ReactNode
  showChevron?: boolean
  style?: StyleProp<ViewStyle>
}

export function FormRow({
  label,
  value,
  sticker,
  stickerTint,
  onPress,
  children,
  showChevron = true,
  style,
}: FormRowProps) {
  const { colors, font, isDark } = useTheme()

  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'
  const ink4 = isDark ? colors.textFaint : '#A69E93'
  const stickerBg = stickerTint ?? (isDark ? 'rgba(245,214,82,0.14)' : '#FBEA9E')

  const Container: any = onPress ? Pressable : View

  return (
    <Container
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean }) => [
        styles.row,
        {
          backgroundColor: paper,
          borderColor: paperBorder,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      {sticker && (
        <View style={[styles.stickerCircle, { backgroundColor: stickerBg }]}>
          {sticker}
        </View>
      )}

      <View style={styles.body}>
        <Text
          style={[styles.label, { fontFamily: font.bodyMedium, color: ink4 }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {value !== undefined && (
          <Text
            style={[styles.value, { fontFamily: font.display, color: ink }]}
            numberOfLines={1}
          >
            {value}
          </Text>
        )}
      </View>

      {children ? <View style={styles.trailing}>{children}</View> : null}

      {showChevron && onPress && !children ? (
        <Ionicons name="chevron-forward" size={18} color={ink4} />
      ) : null}
    </Container>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  stickerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  label: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  trailing: {
    marginLeft: 'auto',
  },
})
