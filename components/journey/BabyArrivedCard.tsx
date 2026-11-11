/**
 * BabyArrivedCard — the pregnancy home's "Baby arrived" entry point.
 *
 *   • week 37 → due date: a quiet row ("Has your baby arrived?").
 *   • past the due date: a prominent card, kept until she confirms — instead of the home
 *     sitting at week 42 saying "any day now".
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { useTheme, getModeColorSoft, getModeColor } from '../../constants/theme'
import { PaperCard } from '../ui/PaperCard'
import { PillButton } from '../ui/PillButton'
import { SiteSticker } from '../stickers/SiteSticker'
import { useTranslation } from '../../lib/i18n'

export function BabyArrivedCard({ prominent, onPress }: { prominent: boolean; onPress: () => void }) {
  const { colors, font, isDark, radius } = useTheme()
  const { t } = useTranslation()
  const tone = getModeColorSoft('pregnancy', isDark)

  if (!prominent) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('babyArrived_rowTitle')}
        style={({ pressed }) => [styles.row, { borderColor: colors.text, backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 }]}
      >
        <SiteSticker name="baby" size={30} />
        <Text style={[styles.rowText, { color: colors.text, fontFamily: font.bodyMedium }]} numberOfLines={2}>
          {t('babyArrived_rowTitle')}
        </Text>
        <ChevronRight size={18} color={colors.text} />
      </Pressable>
    )
  }

  return (
    <PaperCard tint={tone} radius={radius.lg} padding={18} borderColor={getModeColor('pregnancy', isDark)}>
      <View style={styles.head}>
        <SiteSticker name="baby" size={36} />
        <Text style={[styles.title, { color: colors.text, fontFamily: font.display }]}>{t('babyArrived_cardTitle')}</Text>
      </View>
      <Text style={[styles.body, { color: colors.textSecondary, fontFamily: font.body }]}>{t('babyArrived_cardBody')}</Text>
      <PillButton label={t('babyArrived_cta')} variant="ink" onPress={onPress} leading={<SiteSticker name="heart" size={22} />} style={styles.cta} />
    </PaperCard>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 16,
  },
  rowText: { flex: 1, fontSize: 15 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  title: { flex: 1, fontSize: 18, letterSpacing: 0.2, textTransform: 'uppercase' },
  body: { fontSize: 14.5, lineHeight: 21 },
  cta: { marginTop: 16 },
})
