/**
 * ConnectionBanner — a quiet ink-outlined pill at the top while reads are failing on the network
 * (see lib/connectionStatus). Tapping it retries the active queries; it hides itself as soon as a
 * read succeeds. Without it an offline user only saw empty screens that read as "nothing logged".
 */

import { Pressable, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useConnectionStore } from '../../lib/connectionStatus'
import { queryClient } from '../../lib/queryClient'
import { useTheme } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { SiteSticker } from '../stickers/SiteSticker'

export function ConnectionBanner() {
  const trouble = useConnectionStore((s) => s.trouble)
  const insets = useSafeAreaInsets()
  const { colors, font } = useTheme()
  const { t } = useTranslation()

  if (!trouble) return null

  return (
    <Pressable
      onPress={() => { void queryClient.refetchQueries({ type: 'active' }) }}
      accessibilityRole="button"
      accessibilityLabel={`${t('connection_troubleTitle')} ${t('common_retry')}`}
      style={({ pressed }) => [
        styles.pill,
        { top: insets.top + 6, backgroundColor: colors.surface, borderColor: colors.text, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <SiteSticker name="cloud" size={22} />
      <Text style={[styles.text, { color: colors.text, fontFamily: font.bodySemiBold }]} numberOfLines={2}>
        {t('connection_troubleTitle')}
      </Text>
      <Text style={[styles.retry, { color: colors.text, fontFamily: font.bodyBold }]}>{t('common_retry')}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  text: { flex: 1, fontSize: 13, lineHeight: 17 },
  retry: { fontSize: 13, textDecorationLine: 'underline' },
})
