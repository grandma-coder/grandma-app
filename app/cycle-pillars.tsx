/**
 * /cycle-pillars — index of all 6 pre-pregnancy pillars.
 *
 * Reached via the "See all" link on CyclePillarsGrid.
 * Each tile routes to /pillar/[id].
 */

import { View, ScrollView, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, useDiffuseTheme, diffuseFont } from '../constants/theme'
import { useIsDiffuse } from '../components/ui/diffuse/DiffuseKit'
import { prePregPillars } from '../lib/prePregPillars'
import { getPillarSticker } from '../lib/pillarStickerMap'
import { Display, Body } from '../components/ui/Typography'
import { useTranslation } from '../lib/i18n'
import { InkBackButton } from '../components/ui/InkBackButton'
import { SiteSticker, type SiteStickerName } from '../components/stickers/SiteSticker'

const SITE_PILLAR: Record<string, SiteStickerName> = {
  fertility: 'flower', 'fertility-basics': 'flower', 'nutrition-prep': 'leaf',
  'emotional-readiness': 'heart', 'financial-planning': 'bars', 'partner-journey': 'me',
  'health-checkups': 'thermo',
}

const TINT_BY_INDEX = ['greenSoft', 'lilacSoft', 'peachSoft', 'blueSoft', 'yellowSoft', 'pinkSoft'] as const

export default function CyclePillarsIndex() {
  const insets = useSafeAreaInsets()
  const { colors, stickers, font, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const ink = diffuse ? dt.colors.ink : (isDark ? colors.text : '#141313')

  function tintFor(i: number): string {
    const key = TINT_BY_INDEX[i % TINT_BY_INDEX.length]
    return (stickers as any)[key]
  }

  return (
    <View style={{ flex: 1, backgroundColor: diffuse ? dt.colors.bg : colors.bg }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {diffuse ? (
        <>
        <Pressable
          onPress={() => router.back()}
          style={[styles.back, { backgroundColor: 'transparent', borderColor: dt.colors.hairline }]}
          accessibilityRole="button"
          accessibilityLabel={t('cyclePillars_back')}
        >
          <Ionicons name="arrow-back" size={22} color={ink} />
        </Pressable>

        <Display size={32} color={ink}>{t('cyclePillars_title')}</Display>
        <Text style={[styles.subtitle, { color: dt.colors.ink2, fontFamily: diffuseFont.italic }]}>
          {t('cyclePillars_subtitle')}
        </Text>
        </>
        ) : (
        <>
        <InkBackButton ink={colors.text} paper={colors.bg} label={t('cyclePillars_back')} />
        <Display size={30} color={ink} style={{ textTransform: 'uppercase', letterSpacing: 0.3 }}>{t('cyclePillars_title')}</Display>
        <Text style={[styles.subtitle, { color: colors.textMuted, fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' }]}>
          {t('cyclePillars_subtitle')}
        </Text>
        </>
        )}

        {!diffuse ? (
          // Site look: card-less sticker rows split by hairlines.
          <View>
            {prePregPillars.map((p, i) => (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/pillar/${p.id}` as any)}
                accessibilityRole="button"
                accessibilityLabel={p.name}
                style={({ pressed }) => [styles.siteRow, { borderTopColor: colors.border, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, opacity: pressed ? 0.7 : 1 }]}
              >
                <SiteSticker name={SITE_PILLAR[p.id] ?? 'star'} size={48} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Display size={18} color={ink} style={{ textTransform: 'uppercase', letterSpacing: 0.3 }}>{p.name}</Display>
                  <Body size={13} color={colors.textSecondary} numberOfLines={2}>{p.description}</Body>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        ) : (
        <View style={styles.grid}>
          {prePregPillars.map((p, i) => {
            const Sticker = getPillarSticker(p.id)
            return (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/pillar/${p.id}` as any)}
                style={({ pressed }) => [
                  styles.tile,
                  diffuse
                    ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, borderRadius: radius.lg }
                    : { backgroundColor: tintFor(i), borderColor: colors.border, borderRadius: radius.lg },
                  pressed && { transform: [{ scale: 0.97 }], opacity: 0.95 },
                ]}
              >
                <View style={[styles.stickerChip, diffuse ? { backgroundColor: 'transparent', borderColor: dt.colors.line2 } : { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {Sticker ? <Sticker size={28} /> : <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 24 }}>{p.icon}</Text>}
                </View>
                <Display size={18} color={ink}>{p.name}</Display>
                <Body size={12} color={diffuse ? dt.colors.ink3 : colors.textMuted} numberOfLines={2}>
                  {p.description}
                </Body>
              </Pressable>
            )
          })}
        </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 4 },
  back: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 20,
  },
  subtitle: { fontSize: 16, lineHeight: 22, marginBottom: 24, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  siteRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  tile: {
    width: '47.5%', padding: 14, borderWidth: 1,
    gap: 8, minHeight: 150, justifyContent: 'flex-start',
  },
  stickerChip: {
    width: 40, height: 40, borderRadius: 999, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
})
