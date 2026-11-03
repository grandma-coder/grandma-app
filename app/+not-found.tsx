/**
 * Not found — any link that resolves to no route (an old notification, a removed screen).
 * Replaces expo-router's stock "Unmatched Route" page, which ignored the app's theme.
 */

import { View, StyleSheet } from 'react-native'
import { router, Stack } from 'expo-router'
import { useTheme } from '../constants/theme'
import { useTranslation } from '../lib/i18n'
import { EmptyState } from '../components/ui/EmptyState'
import { SiteSticker } from '../components/stickers/SiteSticker'

export default function NotFoundScreen() {
  const { colors } = useTheme()
  const { t } = useTranslation()

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <EmptyState
        icon={<SiteSticker name="globe" size={48} cut />}
        iconBg={colors.surface}
        title={t('notFound_title')}
        message={t('notFound_body')}
        ctaLabel={t('notFound_cta')}
        onCtaPress={() => router.replace('/')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
})
