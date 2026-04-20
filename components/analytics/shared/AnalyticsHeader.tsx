/**
 * AnalyticsHeader — Back + "Analytics" centered + Share.
 * Uses the same circle-button pattern as other 2026-redesign screens.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { ChevronLeft, Share as ShareIcon } from 'lucide-react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../../constants/theme'

interface Props {
  title?: string
  onBack?: () => void
  onShare?: () => void
  /** Hide the row entirely (e.g. inside a tab). Only the safe-area spacer remains. */
  hide?: boolean
}

export function AnalyticsHeader({ title = 'Analytics', onBack, onShare, hide }: Props) {
  const { colors, font } = useTheme()
  const insets = useSafeAreaInsets()

  if (hide) {
    return <View style={{ height: insets.top }} />
  }

  const handleBack = onBack ?? (() => router.back())

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }]}>
      <Pressable
        onPress={handleBack}
        style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <ChevronLeft size={16} color={colors.text} />
      </Pressable>
      <Text
        style={[
          styles.title,
          { color: colors.text, fontFamily: font.bodyMedium },
        ]}
      >
        {title}
      </Text>
      <Pressable
        onPress={onShare}
        style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <ShareIcon size={16} color={colors.text} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  btn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
  },
})
