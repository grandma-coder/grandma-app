/**
 * How We Use Your Data — transparency screen (Phase 1 / trust).
 *
 * Flo has a 10+ Q FAQ accordion explaining what they collect and why. Ours is a
 * plain-language, category-by-category breakdown: what we collect, why we need
 * it, and — the superset bit — an explicit "we never" list. Female-health and
 * children's-medical data is legally sensitive; this screen states our stance
 * in the app, not just in a policy PDF.
 *
 * Static content (localized). Reached from Data & Privacy.
 */

import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, DisplayItalic, MonoCaps } from '../../components/ui/Typography'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'

interface Entry {
  titleKey: string
  bodyKey: string
}

// What we collect + why. Order = most-sensitive first, so the reassurance lands.
const ENTRIES: Entry[] = [
  { titleKey: 'dataTrans_healthTitle', bodyKey: 'dataTrans_healthBody' },
  { titleKey: 'dataTrans_childTitle', bodyKey: 'dataTrans_childBody' },
  { titleKey: 'dataTrans_accountTitle', bodyKey: 'dataTrans_accountBody' },
  { titleKey: 'dataTrans_aiTitle', bodyKey: 'dataTrans_aiBody' },
  { titleKey: 'dataTrans_photosTitle', bodyKey: 'dataTrans_photosBody' },
  { titleKey: 'dataTrans_usageTitle', bodyKey: 'dataTrans_usageBody' },
]

// The "we never" list — the trust anchor.
const NEVER_KEYS = ['dataTrans_never1', 'dataTrans_never2', 'dataTrans_never3', 'dataTrans_never4']

export default function DataTransparencyScreen() {
  const { colors, font, stickers, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const line = diffuse ? dt.colors.line : colors.borderLight
  const accent = diffuse ? dt.stickers.green : stickers.green
  const cardBg = diffuse ? dt.colors.surface : colors.surface
  const cardBorder = diffuse ? dt.colors.line : colors.border

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title="" />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
          <Display size={34} color={ink}>{t('dataTrans_title')}</Display>
          <DisplayItalic size={18} color={diffuse ? dt.colors.ink : stickers.coral} style={{ marginTop: 6 }}>
            {t('dataTrans_subtitle')}
          </DisplayItalic>
        </View>

        <Text style={[styles.intro, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('dataTrans_intro')}
        </Text>

        <View style={{ marginTop: 16 }}>
          <MonoCaps color={inkMuted} style={{ letterSpacing: 1.5 }}>{t('dataTrans_sectionCollect')}</MonoCaps>
        </View>
        <View style={{ gap: 10, marginTop: 10 }}>
          {ENTRIES.map((e) => (
            <View
              key={e.titleKey}
              style={[styles.entryCard, diffuse && styles.cardFlat, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }]}
            >
              <Text style={[styles.entryTitle, { color: ink, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>
                {t(e.titleKey as any)}
              </Text>
              <Text style={[styles.entryBody, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                {t(e.bodyKey as any)}
              </Text>
            </View>
          ))}
        </View>

        {/* We never … */}
        <View style={{ marginTop: 22 }}>
          <MonoCaps color={inkMuted} style={{ letterSpacing: 1.5 }}>{t('dataTrans_sectionNever')}</MonoCaps>
        </View>
        <View style={[styles.neverCard, diffuse && styles.cardFlat, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }]}>
          {NEVER_KEYS.map((k, i) => (
            <View key={k}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: line }]} />}
              <View style={styles.neverRow}>
                <View style={[styles.dot, { backgroundColor: accent }]} />
                <Text style={[styles.neverText, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                  {t(k as any)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.footer, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('dataTrans_footer')}
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
  intro: { fontSize: 14, lineHeight: 20, paddingHorizontal: 4 },
  entryCard: {
    padding: 18,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardFlat: { shadowOpacity: 0, elevation: 0 },
  entryTitle: { fontSize: 15, marginBottom: 6 },
  entryBody: { fontSize: 13, lineHeight: 19 },
  neverCard: {
    padding: 4,
    marginTop: 10,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  divider: { height: 1, marginHorizontal: 18 },
  neverRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 18 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  neverText: { fontSize: 14, flex: 1, lineHeight: 19 },
  footer: { fontSize: 12, textAlign: 'center', marginTop: 22, lineHeight: 18, paddingHorizontal: 20 },
})
