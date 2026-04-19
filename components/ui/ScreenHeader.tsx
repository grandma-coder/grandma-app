/**
 * ScreenHeader — the top strip used above screen content.
 *
 * Left: circular back button (paper, hairline border).
 * Center (optional): title in DM Sans.
 * Right (optional): action(s).
 */

import { ReactNode } from 'react'
import { View, Text, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '../../constants/theme'

interface ScreenHeaderProps {
  title?: string
  onBack?: () => void
  hideBack?: boolean
  right?: ReactNode
  style?: StyleProp<ViewStyle>
}

export function ScreenHeader({ title, onBack, hideBack, right, style }: ScreenHeaderProps) {
  const { colors, font, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'

  const handleBack = () => {
    if (onBack) return onBack()
    if (router.canGoBack()) router.back()
  }

  return (
    <View style={[styles.row, style]}>
      {hideBack ? (
        <View style={styles.slot} />
      ) : (
        <Pressable onPress={handleBack} hitSlop={12}>
          <View style={[styles.backBtn, { backgroundColor: paper, borderColor: paperBorder }]}>
            <Ionicons name="chevron-back" size={20} color={ink} />
          </View>
        </Pressable>
      )}

      {title ? (
        <Text
          style={[styles.title, { fontFamily: font.bodyMedium, color: ink }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      ) : (
        <View style={styles.titleSpace} />
      )}

      <View style={styles.slot}>{right}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    minHeight: 44,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  titleSpace: { flex: 1 },
  slot: {
    minWidth: 38,
    alignItems: 'flex-end',
  },
})
