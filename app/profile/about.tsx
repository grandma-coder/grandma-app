/**
 * About grandma.app — mission, medical credibility, privacy stance (Phase 1).
 *
 * Flo's About page leans on scale + expert-developed content + privacy. Ours
 * leads with the same trust pillars, tuned to a parenting companion: our
 * mission, the fact our guidance is grounded in OB-GYN / pediatric expertise
 * (with the honest caveat that it's support, not diagnosis), and our privacy
 * stance (links straight to the transparency screen). Version pulled live from
 * the build so it never drifts from app.json.
 */

import { View, Text, ScrollView, Pressable, StyleSheet, Linking } from 'react-native'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, DisplayItalic } from '../../components/ui/Typography'
import { GrandmaLogo } from '../../components/ui/GrandmaLogo'
import { Heart, Cross, Leaf } from '../../components/ui/Stickers'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'

interface Pillar {
  sticker: 'heart' | 'cross' | 'leaf'
  titleKey: string
  bodyKey: string
  onPress?: () => void
}

export default function AboutScreen() {
  const { colors, font, stickers, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const cardBg = diffuse ? dt.colors.surface : colors.surface
  const cardBorder = diffuse ? dt.colors.line : colors.border

  const version = Constants.expoConfig?.version ?? '1.0.0'

  const pillars: Pillar[] = [
    { sticker: 'heart', titleKey: 'about_missionTitle', bodyKey: 'about_missionBody' },
    { sticker: 'cross', titleKey: 'about_expertiseTitle', bodyKey: 'about_expertiseBody' },
    { sticker: 'leaf', titleKey: 'about_privacyTitle', bodyKey: 'about_privacyBody', onPress: () => router.push('/profile/data-transparency') },
  ]

  function StickerFor({ kind }: { kind: Pillar['sticker'] }) {
    const size = 30
    switch (kind) {
      case 'heart': return <Heart size={size} fill={diffuse ? dt.stickers.pink : stickers.pink} />
      case 'cross': return <Cross size={size} fill={diffuse ? dt.stickers.coral : stickers.coral} />
      case 'leaf': return <Leaf size={size} fill={diffuse ? dt.stickers.green : stickers.green} />
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title="" />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <GrandmaLogo size={72} />
          <Display size={32} color={ink} align="center" style={{ marginTop: 16 }}>{t('about_title')}</Display>
          <DisplayItalic size={17} color={diffuse ? dt.colors.ink : stickers.coral} align="center" style={{ marginTop: 6 }}>
            {t('about_tagline')}
          </DisplayItalic>
        </View>

        <View style={{ gap: 12, marginTop: 20 }}>
          {pillars.map((p) => {
            const Row = (
              <View style={styles.pillarInner}>
                <View style={styles.stickerWrap}><StickerFor kind={p.sticker} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pillarTitle, { color: ink, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>
                    {t(p.titleKey as any)}
                  </Text>
                  <Text style={[styles.pillarBody, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                    {t(p.bodyKey as any)}
                  </Text>
                </View>
                {p.onPress && <ChevronRight size={16} color={inkMuted} strokeWidth={diffuse ? 1.5 : 2} />}
              </View>
            )
            return p.onPress ? (
              <Pressable
                key={p.titleKey}
                onPress={p.onPress}
                style={[styles.pillarCard, diffuse && styles.cardFlat, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }]}
              >
                {Row}
              </Pressable>
            ) : (
              <View
                key={p.titleKey}
                style={[styles.pillarCard, diffuse && styles.cardFlat, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg }]}
              >
                {Row}
              </View>
            )
          })}
        </View>

        {/* Legal + support links */}
        <View style={[styles.linksCard, diffuse && styles.cardFlat, { backgroundColor: cardBg, borderColor: cardBorder, borderRadius: radius.lg, marginTop: 20 }]}>
          <LinkRow label={t('about_privacyPolicy')} onPress={() => router.push('/legal/privacy')} />
          <View style={[styles.divider, { backgroundColor: diffuse ? dt.colors.line : colors.borderLight }]} />
          <LinkRow label={t('about_terms')} onPress={() => router.push('/legal/terms')} />
          <View style={[styles.divider, { backgroundColor: diffuse ? dt.colors.line : colors.borderLight }]} />
          <LinkRow label={t('guidelines_title')} onPress={() => router.push('/profile/community-guidelines')} />
          <View style={[styles.divider, { backgroundColor: diffuse ? dt.colors.line : colors.borderLight }]} />
          <LinkRow label={t('about_help')} onPress={() => router.push('/profile/help')} />
          <View style={[styles.divider, { backgroundColor: diffuse ? dt.colors.line : colors.borderLight }]} />
          <LinkRow label={t('about_contact')} onPress={() => Linking.openURL('mailto:support@grandma.app')} />
        </View>

        <Text style={[styles.version, { color: inkMuted, fontFamily: diffuse ? diffuseFont.mono : font.body }]}>
          grandma.app · v{version}
        </Text>
        <Text style={[styles.copyright, { color: inkMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('about_copyright')}
        </Text>
      </ScrollView>
    </View>
  )
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <Pressable onPress={onPress} style={styles.linkRow}>
      <Text style={[styles.linkLabel, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
        {label}
      </Text>
      <ChevronRight size={16} color={diffuse ? dt.colors.ink3 : stickers.coral} strokeWidth={diffuse ? 1.5 : 2} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  hero: { alignItems: 'center', marginTop: 8 },
  pillarCard: {
    padding: 16,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardFlat: { shadowOpacity: 0, elevation: 0 },
  pillarInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stickerWrap: { width: 34, alignItems: 'center', justifyContent: 'center' },
  pillarTitle: { fontSize: 15 },
  pillarBody: { fontSize: 13, lineHeight: 19, marginTop: 3 },
  linksCard: {
    padding: 4,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  divider: { height: 1, marginHorizontal: 18 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 18 },
  linkLabel: { fontSize: 15 },
  version: { fontSize: 12, textAlign: 'center', marginTop: 24, letterSpacing: 0.5 },
  copyright: { fontSize: 11, textAlign: 'center', marginTop: 6, lineHeight: 16 },
})
