/**
 * Pillar detail screen — cream-paper redesign.
 *
 * Single screen for all 3 modes (pre-preg / pregnancy / kids). Renders the
 * pillar's sticker as a hero, then a list of tip cards, then a "Ask Guru
 * Grandma" suggestion section as rose pill buttons.
 */

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { Pillar } from '../../types'
import { pillars } from '../../lib/pillars'
import { prePregPillars } from '../../lib/prePregPillars'
import { pregnancyPillars } from '../../lib/pregnancyPillars'
import TipCard from '../../components/pillar/TipCard'
import PillarMetrics from '../../components/pillar/PillarMetrics'
import { PillButton } from '../../components/ui/PillButton'
import { ScribbleUnderline } from '../../components/ui/ScribbleUnderline'
import { getPillarSticker } from '../../lib/pillarStickerMap'
import { usePillarTipBuckets } from '../../lib/pillarAdaptive'
import { useTranslation } from '../../lib/i18n'
import { useTranslatedContent } from '../../lib/useTranslatedContent'

// Tips have no stable id — slugify the label (unique per pillar) for a
// stable translation-cache key that survives tip-list reordering/filtering.
function slugifyLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export default function PillarDetail() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors, stickers, font, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const ink = diffuse ? dt.colors.ink : (isDark ? colors.text : '#141313')
  // Diffuse: serif=Cormorant, italic accent, body=Hanken; calm ink-3 accents.
  const dFont = diffuse ? diffuseFont : null
  const accentCoral = diffuse ? dt.colors.ink3 : stickers.coral

  const pillar = (
    pillars.find((p) => p.id === id)
      ?? prePregPillars.find((p) => p.id === id)
      ?? pregnancyPillars.find((p) => p.id === id)
  ) as Pillar | undefined

  // Long-form pillar intro is translated at runtime + cached (Phase C). Called
  // unconditionally (Rules of Hooks) even though `pillar` may be undefined —
  // useTranslatedContent no-ops gracefully on an empty source string.
  const { text: intro } = useTranslatedContent(
    pillar ? `pillar_${pillar.id}_intro` : '',
    pillar?.intro ?? '',
  )

  if (!pillar) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ fontSize: 16, color: colors.text, fontFamily: font.body }}>
          {t('pillarDetail_notFound')}
        </Text>
      </View>
    )
  }

  function handleSuggestion(suggestion: string) {
    router.push({
      pathname: '/grandma-talk',
      params: { prefill: suggestion, pillarId: pillar!.id },
    })
  }

  const Sticker = getPillarSticker(pillar.id)
  const { forYou, general, contextLabel } = usePillarTipBuckets(pillar.id, pillar.tips)

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.back, { backgroundColor: diffuse ? 'transparent' : colors.surface, borderColor: diffuse ? dt.colors.hairline : colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={22} color={ink} />
        </Pressable>

        <View style={styles.heroWrap}>
          <View
            style={[
              styles.stickerHero,
              { backgroundColor: diffuse ? 'transparent' : colors.surface, borderColor: diffuse ? dt.colors.line2 : colors.border, borderRadius: radius.full, borderWidth: diffuse ? 1 : 1.5 },
            ]}
          >
            {Sticker ? <Sticker size={88} /> : <Text style={{ fontSize: 56 }}>{pillar.icon}</Text>}
          </View>
        </View>

        <Text style={[styles.name, { color: ink, fontFamily: diffuse ? diffuseFont.display : font.display }]}>{pillar.name}</Text>
        <Text style={[styles.subtitle, { color: diffuse ? dt.colors.ink3 : stickers.coral, fontFamily: diffuse ? diffuseFont.italic : font.italic }]}>
          {pillar.description}
        </Text>

        <PillarMetrics pillarId={pillar.id} />

        {pillar.intro && (
          <Text
            style={[
              styles.intro,
              { color: colors.textSecondary, fontFamily: font.body },
            ]}
          >
            {intro}
          </Text>
        )}

        {forYou.length > 0 && (
          <>
            <View style={styles.sectionHeading}>
              <ScribbleUnderline color={diffuse ? 'transparent' : stickers.coral} strokeWidth={2.5}>
                <Text style={[styles.sectionTitle, { color: ink, fontFamily: diffuse ? diffuseFont.display : font.display }]}>
                  {t('pillarDetail_forYouNow')}
                </Text>
              </ScribbleUnderline>
            </View>
            {contextLabel && (
              <Text
                style={[
                  styles.contextLabel,
                  { color: stickers.coral, fontFamily: font.italic },
                ]}
              >
                {contextLabel}
              </Text>
            )}
            {forYou.map((tip, index) => (
              <TipCard
                key={`fy-${index}`}
                label={tip.label}
                text={tip.text}
                index={index + 1}
                isLast={index === forYou.length - 1}
                accent={stickers.coral}
                translationKey={`pillar_${pillar.id}_tip_${slugifyLabel(tip.label)}`}
              />
            ))}
          </>
        )}

        <View style={[styles.sectionHeading, { marginTop: forYou.length > 0 ? 24 : 8 }]}>
          <ScribbleUnderline color={diffuse ? 'transparent' : stickers.coral} strokeWidth={2.5}>
            <Text style={[styles.sectionTitle, { color: ink, fontFamily: diffuse ? diffuseFont.display : font.display }]}>
              {forYou.length > 0 ? t('pillarDetail_allTips') : t('pillarDetail_tips')}
            </Text>
          </ScribbleUnderline>
        </View>
        {general.map((tip, index) => (
          <TipCard
            key={`g-${index}`}
            label={tip.label}
            text={tip.text}
            index={index + 1}
            isLast={index === general.length - 1}
            accent={stickers.coral}
            translationKey={`pillar_${pillar.id}_tip_${slugifyLabel(tip.label)}`}
          />
        ))}

        <View style={[styles.sectionHeading, { marginTop: 24 }]}>
          <ScribbleUnderline color={diffuse ? 'transparent' : stickers.coral} strokeWidth={2.5}>
            <Text style={[styles.sectionTitle, { color: ink, fontFamily: diffuse ? diffuseFont.display : font.display }]}>
              {t('pillarDetail_askGrandma')}
            </Text>
          </ScribbleUnderline>
        </View>
        <View style={styles.chipsContainer}>
          {pillar.suggestions.map((suggestion, index) => (
            <PillButton
              key={index}
              label={suggestion}
              variant="paper"
              onPress={() => handleSuggestion(suggestion)}
              style={{ alignSelf: 'flex-start' }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 20 },
  back: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 20,
  },
  heroWrap: { alignItems: 'center', marginTop: 8, marginBottom: 16 },
  stickerHero: {
    width: 132, height: 132, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 32, letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 16, lineHeight: 22, marginBottom: 16 },
  intro: { fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 16 },
  sectionHeading: { marginTop: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 26, letterSpacing: -0.4 },
  contextLabel: { fontSize: 14, marginTop: 8, marginBottom: 4, letterSpacing: 0.1 },
  chipsContainer: { flexDirection: 'column', gap: 10, marginTop: 12 },
})
