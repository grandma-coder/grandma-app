/**
 * LatePeriodCard — replaces the cycle ring once the expected period start has passed without a
 * logged period. The ring would otherwise wrap into a new predicted cycle (fresh fertile window,
 * "next period in 22 days"), hiding the one signal a person trying to conceive cares about most.
 * Factual only: how many days past the expected date, and quick ways to log what happens next.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import { SiteSticker } from '../../stickers/SiteSticker'
import { PillButton } from '../../ui/PillButton'

export function LatePeriodCard({
  daysLate,
  onLogPeriod,
  onLogTest,
}: {
  daysLate: number
  onLogPeriod?: () => void
  onLogTest?: () => void
}) {
  const { colors, font } = useTheme()
  const { t } = useTranslation()

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.text }]}>
      <View style={styles.head}>
        <SiteSticker name="cal" size={40} />
        <Text style={[styles.title, { color: colors.text, fontFamily: font.display }]}>
          {daysLate === 1 ? t('cycleHome_late_titleOne') : t('cycleHome_late_title', { count: daysLate })}
        </Text>
      </View>
      <Text style={[styles.body, { color: colors.textSecondary, fontFamily: font.body }]}>
        {t('cycleHome_late_body')}
      </Text>
      {onLogPeriod && (
        <PillButton label={t('cycleHome_late_logPeriod')} onPress={onLogPeriod} style={{ marginTop: 14 }} />
      )}
      {onLogTest && (
        <Pressable onPress={onLogTest} hitSlop={8} style={styles.link}>
          <Text style={[styles.linkText, { color: colors.textSecondary, fontFamily: font.body }]}>
            {t('cycleHome_late_logTest')}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: 24, padding: 18, marginHorizontal: 20, marginTop: 8, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontSize: 22, lineHeight: 26, textTransform: 'uppercase' },
  body: { fontSize: 15, lineHeight: 21 },
  link: { alignSelf: 'center', paddingVertical: 6 },
  linkText: { fontSize: 14, textDecorationLine: 'underline' },
})
