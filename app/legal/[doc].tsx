/**
 * In-app legal reader (Phase 1 / trust). Route: /legal/privacy | /legal/terms
 *
 * Renders bundled Privacy Policy / Terms of Use content so the docs are readable
 * IN the app — replacing the old "available at grandma.app/…" alert stubs. Shows
 * a tap-to-scroll table of contents, a highlighted "not medical advice" callout
 * for Terms, the effective date, and a link to the canonical hosted version.
 */

import { useRef } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, Linking } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { AlertTriangle, ExternalLink } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, MonoCaps } from '../../components/ui/Typography'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { getLegalDocument, type LegalDoc } from '../../lib/legalContent'

export default function LegalReaderScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>()
  const which: LegalDoc = doc === 'terms' ? 'terms' : 'privacy'
  const document = getLegalDocument(which)

  const { colors, font, stickers, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const scrollRef = useRef<ScrollView>(null)
  const offsets = useRef<Record<string, number>>({})

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const line = diffuse ? dt.colors.line : colors.borderLight
  const accent = diffuse ? dt.stickers.lilac : stickers.lilac
  const cardBg = diffuse ? dt.colors.surface : colors.surface
  const cardBorder = diffuse ? dt.colors.line : colors.border
  const linkColor = diffuse ? dt.colors.ink : stickers.coral

  function scrollTo(id: string) {
    const y = offsets.current[id]
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })
  }

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title="" />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
          <Display size={32} color={ink}>{document.title}</Display>
          <Text style={[styles.effective, { color: inkMuted, fontFamily: diffuse ? diffuseFont.mono : font.body }]}>
            {document.effectiveDate}
          </Text>
        </View>

        <Text style={[styles.intro, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {document.intro}
        </Text>

        {/* Medical-disclaimer callout — Terms only, most important section up top */}
        {which === 'terms' && (
          <View style={[styles.callout, { backgroundColor: diffuse ? dt.stickers.peachSoft : stickers.peachSoft, borderRadius: radius.lg }]}>
            <AlertTriangle size={18} color={diffuse ? dt.stickers.coral : stickers.coral} strokeWidth={2} />
            <Text style={[styles.calloutText, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
              {document.sections.find((s) => s.id === 'notmedical')?.body}
            </Text>
          </View>
        )}

        {/* Table of contents */}
        <View style={{ marginTop: 22 }}>
          <MonoCaps color={inkMuted} style={{ letterSpacing: 1.5 }}>{t('legal_contents')}</MonoCaps>
        </View>
        <View style={[styles.tocCard, diffuse && styles.cardFlat, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }]}>
          {document.sections.map((s, i) => (
            <Pressable key={s.id} onPress={() => scrollTo(s.id)}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: line }]} />}
              <View style={styles.tocRow}>
                <Text style={[styles.tocNum, { color: accent, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold }]}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <Text style={[styles.tocLabel, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                  {s.title}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Full sections */}
        <View style={{ marginTop: 26, gap: 22 }}>
          {document.sections.map((s, i) => (
            <View
              key={s.id}
              onLayout={(e) => { offsets.current[s.id] = e.nativeEvent.layout.y }}
            >
              <Text style={[styles.secTitle, { color: ink, fontFamily: diffuse ? diffuseFont.display : font.display }]}>
                {i + 1}. {s.title}
              </Text>
              <Text style={[styles.secBody, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                {s.body}
              </Text>
            </View>
          ))}
        </View>

        {/* Link to canonical hosted version */}
        <Pressable onPress={() => Linking.openURL(document.hostedUrl)} style={styles.hostedRow}>
          <ExternalLink size={15} color={linkColor} strokeWidth={1.8} />
          <Text style={[styles.hostedText, { color: linkColor, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
            {t('legal_hostedPrefix')} {document.hostedUrl.replace('https://', '')}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 56 },
  titleBlock: { marginTop: 4, marginBottom: 12, paddingHorizontal: 4 },
  effective: { fontSize: 12, marginTop: 8, letterSpacing: 0.4 },
  intro: { fontSize: 14, lineHeight: 21, paddingHorizontal: 4 },
  callout: { flexDirection: 'row', gap: 12, padding: 16, marginTop: 18, alignItems: 'flex-start' },
  calloutText: { flex: 1, fontSize: 13, lineHeight: 19 },
  tocCard: {
    padding: 4,
    marginTop: 8,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardFlat: { shadowOpacity: 0, elevation: 0 },
  divider: { height: 1, marginHorizontal: 16 },
  tocRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 16 },
  tocNum: { fontSize: 13, width: 24 },
  tocLabel: { fontSize: 14, flex: 1 },
  secTitle: { fontSize: 19, marginBottom: 8, paddingHorizontal: 4 },
  secBody: { fontSize: 14, lineHeight: 21, paddingHorizontal: 4 },
  hostedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 30, paddingHorizontal: 4 },
  hostedText: { fontSize: 13, textDecorationLine: 'underline', flex: 1 },
})
