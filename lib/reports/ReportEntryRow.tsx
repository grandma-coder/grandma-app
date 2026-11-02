/**
 * "Report for the doctor" row — the light-look entry point at the bottom of
 * "The details" in Pregnancy / Cycle / Menopause analytics. Same look as the
 * Kids row (ink-outlined card, doc sticker, title + line, chevron); opens the
 * generic `/report?behavior=…` screen.
 */

import { Pressable, Text, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { router } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useTheme } from '../../constants/theme'
import { useTranslation } from '../i18n'
import { SiteSticker } from '../../components/stickers/SiteSticker'
import type { ReportBehavior } from './reportKit'

export function ReportEntryRow({ behavior, style }: { behavior: ReportBehavior; style?: StyleProp<ViewStyle> }) {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  return (
    <Pressable
      onPress={() => router.push(`/report?behavior=${behavior}`)}
      accessibilityRole="button"
      accessibilityLabel={t('report_cardTitle')}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.text },
        style,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.icon}>
        <SiteSticker name="doc" size={38} cut />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text, fontFamily: font.bodyBold }]}>{t('report_cardTitle')}</Text>
        <Text style={[styles.desc, { color: colors.textSecondary, fontFamily: font.body }]}>{t('report_cardDesc')}</Text>
      </View>
      <ChevronRight size={16} color={colors.text} strokeWidth={2} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    marginTop: 24, marginHorizontal: 20, borderWidth: 1.5, borderRadius: 18,
  },
  icon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16 },
  desc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
})
