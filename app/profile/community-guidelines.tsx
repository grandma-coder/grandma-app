/**
 * Community Guidelines (Phase 1 / WS3). The rules users agree to for every
 * community surface (care-circle chat now, anonymous forum later) + how to
 * report and block. Required before any UGC surface scales (App Store + legal).
 *
 * Static + localized. Reached from settings, the community surface, and the
 * report sheet's "our guidelines" link.
 */

import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, DisplayItalic, MonoCaps } from '../../components/ui/Typography'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'

const RULES = [
  { titleKey: 'guidelines_rule1Title', bodyKey: 'guidelines_rule1Body' },
  { titleKey: 'guidelines_rule2Title', bodyKey: 'guidelines_rule2Body' },
  { titleKey: 'guidelines_rule3Title', bodyKey: 'guidelines_rule3Body' },
  { titleKey: 'guidelines_rule4Title', bodyKey: 'guidelines_rule4Body' },
  { titleKey: 'guidelines_rule5Title', bodyKey: 'guidelines_rule5Body' },
]

export default function CommunityGuidelinesScreen() {
  const { colors, font, stickers, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const accent = diffuse ? dt.stickers.lilac : stickers.coral
  const cardBg = diffuse ? dt.colors.surface : colors.surface
  const cardBorder = diffuse ? dt.colors.line : colors.border

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title="" />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
          <Display size={34} color={ink}>{t('guidelines_title')}</Display>
          <DisplayItalic size={18} color={diffuse ? dt.colors.ink : stickers.coral} style={{ marginTop: 6 }}>
            {t('guidelines_subtitle')}
          </DisplayItalic>
        </View>

        <Text style={[styles.intro, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('guidelines_intro')}
        </Text>

        <View style={{ marginTop: 18, gap: 12 }}>
          {RULES.map((r, i) => (
            <View
              key={r.titleKey}
              style={[styles.ruleCard, diffuse && styles.cardFlat, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }]}
            >
              <View style={styles.ruleHead}>
                <Text style={[styles.ruleNum, { color: accent, fontFamily: diffuse ? diffuseFont.mono : font.display }]}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <Text style={[styles.ruleTitle, { color: ink, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>
                  {t(r.titleKey as any)}
                </Text>
              </View>
              <Text style={[styles.ruleBody, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                {t(r.bodyKey as any)}
              </Text>
            </View>
          ))}
        </View>

        {/* If you see something */}
        <View style={{ marginTop: 24 }}>
          <MonoCaps color={inkMuted} style={{ letterSpacing: 1.5 }}>{t('guidelines_sectionReport')}</MonoCaps>
        </View>
        <View style={[styles.reportCard, { backgroundColor: diffuse ? dt.stickers.lilacSoft : stickers.lilacSoft, borderRadius: radius.lg }]}>
          <Text style={[styles.reportBody, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
            {t('guidelines_reportBody')}
          </Text>
        </View>

        <Text style={[styles.footer, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('guidelines_footer')}
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  titleBlock: { marginTop: 4, marginBottom: 12, paddingHorizontal: 4 },
  intro: { fontSize: 14, lineHeight: 21, paddingHorizontal: 4 },
  ruleCard: {
    padding: 18,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardFlat: { shadowOpacity: 0, elevation: 0 },
  ruleHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  ruleNum: { fontSize: 16, width: 26 },
  ruleTitle: { fontSize: 15, flex: 1 },
  ruleBody: { fontSize: 13, lineHeight: 20 },
  reportCard: { padding: 18, marginTop: 10 },
  reportBody: { fontSize: 14, lineHeight: 21 },
  footer: { fontSize: 12, textAlign: 'center', marginTop: 22, lineHeight: 18, paddingHorizontal: 20 },
})
