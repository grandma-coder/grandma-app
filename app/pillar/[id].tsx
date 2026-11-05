/**
 * Pillar detail — one screen for every journey's pillars (cycle / pre-pregnancy, pregnancy, kids).
 *
 * Site look: ink back button, the pillar's sticker on a hand-drawn tone disc, hand-lettered title,
 * "where you are now" tags, Grandma's intro on a paper card, the tips ("For you right now" first
 * when the cycle phase / pregnancy week / child age picks some), then questions to ask Grandma.
 * Header rises in on mount; the tip list mounts after the push animation and fades up.
 *
 * Language: name + description come from the i18n catalogs; intro, tip titles, tip bodies and
 * questions use the bundled translations for cycle pillars (lib/pillarContent — instant, offline)
 * and fall back to the runtime translator otherwise (lib/useTranslatedContent) — placeholders show
 * while a translation loads, so English never flashes for non-English readers.
 *
 * Cited sources (site look): a small "Source: CDC · NHS" line under the intro and each sourced tip,
 * and a "Sources" list + short disclaimer at the end (lib/medicalSources.ts).
 *
 * Diffuse look: unchanged layout (big sticker circle, editorial numbered tips).
 */

import { createElement } from 'react'
import { useGrandmaChatEnabled } from '../../store/useFeatureFlags'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import type { Pillar } from '../../types'
import TipCard from '../../components/pillar/TipCard'
import PillarMetrics from '../../components/pillar/PillarMetrics'
import { PillButton } from '../../components/ui/PillButton'
import { ScribbleUnderline } from '../../components/ui/ScribbleUnderline'
import { InkBackButton } from '../../components/ui/InkBackButton'
import { HandDrawnBox, HandDrawnPill } from '../../components/ui/HandDrawn'
import { FadeIn, FadeUp, StickerEnter } from '../../components/ui/Motion'
import { useAfterTransition } from '../../components/ui/AfterTransition'
import { Skeleton, SkeletonLines } from '../../components/ui/Skeleton'
import { Display } from '../../components/ui/Typography'
import { SiteSticker } from '../../components/stickers/SiteSticker'
import { getPillarSticker } from '../../lib/pillarStickerMap'
import { usePillarTipBuckets } from '../../lib/pillarAdaptive'
import { useTranslation } from '../../lib/i18n'
import { usePillarText } from '../../lib/pillarContent/usePillarText'
import { findPillar, pillarContentKeys, pillarDescKey, pillarLook, pillarNameKey } from '../../lib/pillarCopy'
import { pillarSources, resolveSources } from '../../lib/medicalSources'
import { SourceLine, SourcesSection } from '../../components/pillar/PillarSources'

function goBack() {
  if (router.canGoBack()) router.back()
  else router.replace('/(tabs)' as never)
}

export default function PillarDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>()
  const found = findPillar(Array.isArray(id) ? id[0] : id)
  if (!found) return <PillarNotFound />
  // keyed so hook state never leaks between two pillars pushed on the same route
  return <PillarDetail key={found.pillar.id} pillar={found.pillar} />
}

// ─── Not found (bad deep link / removed pillar) ────────────────────────────

function PillarNotFound() {
  const insets = useSafeAreaInsets()
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
      <InkBackButton onPress={goBack} ink={colors.text} paper={colors.surface} />
      <View style={styles.notFound}>
        <StickerEnter tilt={-6}>
          <SiteSticker name="cloud" size={72} />
        </StickerEnter>
        <Display size={26} color={colors.text} align="center" style={{ textTransform: 'uppercase', letterSpacing: 0.3 }}>
          {t('pillarDetail_notFound')}
        </Display>
        <Text style={[styles.notFoundBody, { color: colors.textSecondary, fontFamily: font.body }]}>
          {t('pillarDetail_notFoundBody')}
        </Text>
        <PillButton label={t('sw4_goBack')} variant="paper" onPress={goBack} style={{ alignSelf: 'stretch', marginTop: 8 }} />
      </View>
    </View>
  )
}

// ─── Detail ────────────────────────────────────────────────────────────────

function PillarDetail({ pillar }: { pillar: Pillar }) {
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  const chatOn = useGrandmaChatEnabled()
  const name = t(pillarNameKey(pillar.id))
  const description = t(pillarDescKey(pillar.id))
  const intro = usePillarText(pillarContentKeys.intro(pillar.id), pillar.intro ?? '')
  const buckets = usePillarTipBuckets(pillar.id, pillar.tips)

  const ask = (question: string) => {
    router.push({ pathname: '/grandma-talk', params: { prefill: question, pillarId: pillar.id } })
  }

  const props = { pillar, name, description, intro, buckets, chatOn, ask }
  return diffuse ? <DiffuseBody {...props} /> : <SiteBody {...props} />
}

interface BodyProps {
  pillar: Pillar
  name: string
  description: string
  intro: { text: string; loading: boolean }
  buckets: ReturnType<typeof usePillarTipBuckets>
  chatOn: boolean
  ask: (question: string) => void
}

// ─── Site look ─────────────────────────────────────────────────────────────

function SiteBody({ pillar, name, description, intro, buckets, chatOn, ask }: BodyProps) {
  const insets = useSafeAreaInsets()
  const { colors, stickers, font } = useTheme()
  const { t } = useTranslation()
  const ready = useAfterTransition()
  const look = pillarLook(pillar.id)
  const tone = (stickers as Record<string, string>)[look.tone] ?? colors.surface
  const ink = colors.text
  const { forYou, general, contextLabel } = buckets
  const sources = pillarSources(pillar)

  const sectionTitle = (label: string) => (
    <Display size={20} color={ink} style={styles.siteSection}>{label}</Display>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        <InkBackButton onPress={goBack} ink={ink} paper={colors.surface} />

        <FadeUp index={0}>
          <View style={styles.disc}>
            <HandDrawnPill wobble width={76} height={76} fill={tone} stroke={ink} strokeWidth={2.4} seed={pillar.id} />
            <StickerEnter delay={140} tilt={-6} seed={pillar.id.length}>
              <SiteSticker name={look.sticker} size={46} cut />
            </StickerEnter>
          </View>
          <Display size={30} color={ink} style={styles.siteTitle}>{name}</Display>
          <Text style={[styles.siteSubtitle, { color: colors.textSecondary, fontFamily: font.body }]}>{description}</Text>
        </FadeUp>

        <FadeUp index={1}>
          <PillarMetrics pillarId={pillar.id} tone={tone} />
        </FadeUp>

        {!!pillar.intro && (
          <FadeUp index={2}>
            <HandDrawnBox fill={colors.surface} stroke={ink} radius={20} strokeWidth={1.8} seed={`${pillar.id}-intro`} style={styles.introCard}>
              {intro.loading ? (
                <SkeletonLines lines={4} />
              ) : (
                <>
                  <Text style={[styles.introText, { color: ink, fontFamily: font.body }]}>{intro.text}</Text>
                  <SourceLine sources={resolveSources(pillar.introSources)} style={styles.introSources} />
                </>
              )}
            </HandDrawnBox>
          </FadeUp>
        )}

        {!ready ? (
          <View style={{ gap: 14, marginTop: 28 }}>
            <Skeleton height={20} width="45%" radius={6} />
            <SkeletonLines lines={3} />
            <SkeletonLines lines={3} />
          </View>
        ) : (
          <FadeIn>
            {forYou.length > 0 && (
              <>
                {sectionTitle(t('pillarDetail_forYouNow'))}
                {contextLabel ? (
                  <Text style={[styles.contextLabel, { color: colors.textMuted, fontFamily: font.body }]}>{contextLabel}</Text>
                ) : null}
                {forYou.map((tip, i) => (
                  <TipCard
                    key={`fy-${tip.label}`}
                    label={tip.label}
                    text={tip.text}
                    isLast={i === forYou.length - 1}
                    accent={tone}
                    translationKey={pillarContentKeys.tipBody(pillar.id, tip.label)}
                    labelTranslationKey={pillarContentKeys.tipLabel(pillar.id, tip.label)}
                    sources={resolveSources(tip.sources)}
                  />
                ))}
              </>
            )}

            {sectionTitle(forYou.length > 0 ? t('pillarDetail_allTips') : t('pillarDetail_tips'))}
            {general.map((tip, i) => (
              <TipCard
                key={`g-${tip.label}`}
                label={tip.label}
                text={tip.text}
                isLast={i === general.length - 1}
                accent={tone}
                translationKey={pillarContentKeys.tipBody(pillar.id, tip.label)}
                labelTranslationKey={pillarContentKeys.tipLabel(pillar.id, tip.label)}
                sources={resolveSources(tip.sources)}
              />
            ))}

            {/* Ask Grandma — behind the remote grandma_chat flag (command center) */}
            {chatOn && pillar.suggestions.length > 0 && (
              <>
                {sectionTitle(t('pillarDetail_askGrandma'))}
                <View style={{ gap: 10, marginTop: 10 }}>
                  {pillar.suggestions.map((q, i) => (
                    <SiteQuestion key={i} pillarId={pillar.id} index={i} question={q} onAsk={ask} />
                  ))}
                </View>
              </>
            )}

            {/* Where the health claims come from (App Store 1.4.1) — only pillars that cite any */}
            {sources.length > 0 && (
              <>
                {sectionTitle(t('pillarSources_title'))}
                <SourcesSection sources={sources} />
              </>
            )}
          </FadeIn>
        )}
      </ScrollView>
      {/* Paper band behind the status bar so scrolled content never runs under the clock. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.bg }} />
    </View>
  )
}

function SiteQuestion({ pillarId, index, question, onAsk }: { pillarId: string; index: number; question: string; onAsk: (q: string) => void }) {
  const { colors, font } = useTheme()
  const { text, loading } = usePillarText(pillarContentKeys.suggestion(pillarId, index), question)
  return (
    <Pressable
      onPress={() => onAsk(text)}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={loading ? undefined : text}
      style={({ pressed }) => [
        styles.question,
        { backgroundColor: colors.surface, borderColor: colors.text, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <SiteSticker name="bubble" size={22} />
      {loading ? (
        <View style={{ flex: 1 }}><Skeleton height={14} width="80%" radius={6} /></View>
      ) : (
        <Text style={[styles.questionText, { color: colors.text, fontFamily: font.bodyMedium }]}>{text}</Text>
      )}
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  )
}

// ─── Diffuse look (layout unchanged; copy now localized) ───────────────────

function DiffuseBody({ pillar, name, description, intro, buckets, chatOn, ask }: BodyProps) {
  const insets = useSafeAreaInsets()
  const { colors, font, radius } = useTheme()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const ink = dt.colors.ink
  const Sticker = getPillarSticker(pillar.id)
  const { forYou, general, contextLabel } = buckets

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={goBack}
          style={[styles.back, { backgroundColor: 'transparent', borderColor: dt.colors.hairline }]}
          accessibilityRole="button"
          accessibilityLabel={t('sw4_goBack')}
        >
          <Ionicons name="arrow-back" size={22} color={ink} />
        </Pressable>

        <View style={styles.heroWrap}>
          <View style={[styles.stickerHero, { backgroundColor: 'transparent', borderColor: dt.colors.line2, borderRadius: radius.full, borderWidth: 1 }]}>
            {Sticker ? createElement(Sticker, { size: 88 }) : <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 56 }}>{pillar.icon}</Text>}
          </View>
        </View>

        <Text style={[styles.name, { color: ink, fontFamily: diffuseFont.display }]}>{name}</Text>
        <Text style={[styles.subtitle, { color: dt.colors.ink3, fontFamily: diffuseFont.italic }]}>{description}</Text>

        <PillarMetrics pillarId={pillar.id} />

        {!!pillar.intro && (
          intro.loading
            ? <SkeletonLines lines={4} style={{ marginTop: 8, marginBottom: 16 }} />
            : <Text style={[styles.intro, { color: colors.textSecondary, fontFamily: font.body }]}>{intro.text}</Text>
        )}

        {forYou.length > 0 && (
          <>
            <View style={styles.sectionHeading}>
              <ScribbleUnderline color="transparent" strokeWidth={2.5}>
                <Text style={[styles.sectionTitle, { color: ink, fontFamily: diffuseFont.display }]}>{t('pillarDetail_forYouNow')}</Text>
              </ScribbleUnderline>
            </View>
            {contextLabel && (
              <Text style={[styles.contextLabel, { color: colors.textMuted, fontFamily: font.italic }]}>{contextLabel}</Text>
            )}
            {forYou.map((tip, index) => (
              <TipCard
                key={`fy-${tip.label}`}
                label={tip.label}
                text={tip.text}
                index={index + 1}
                isLast={index === forYou.length - 1}
                translationKey={pillarContentKeys.tipBody(pillar.id, tip.label)}
                labelTranslationKey={pillarContentKeys.tipLabel(pillar.id, tip.label)}
              />
            ))}
          </>
        )}

        <View style={[styles.sectionHeading, { marginTop: forYou.length > 0 ? 24 : 8 }]}>
          <ScribbleUnderline color="transparent" strokeWidth={2.5}>
            <Text style={[styles.sectionTitle, { color: ink, fontFamily: diffuseFont.display }]}>
              {forYou.length > 0 ? t('pillarDetail_allTips') : t('pillarDetail_tips')}
            </Text>
          </ScribbleUnderline>
        </View>
        {general.map((tip, index) => (
          <TipCard
            key={`g-${tip.label}`}
            label={tip.label}
            text={tip.text}
            index={index + 1}
            isLast={index === general.length - 1}
            translationKey={pillarContentKeys.tipBody(pillar.id, tip.label)}
            labelTranslationKey={pillarContentKeys.tipLabel(pillar.id, tip.label)}
          />
        ))}

        {chatOn && (
          <>
            <View style={[styles.sectionHeading, { marginTop: 24 }]}>
              <ScribbleUnderline color="transparent" strokeWidth={2.5}>
                <Text style={[styles.sectionTitle, { color: ink, fontFamily: diffuseFont.display }]}>{t('pillarDetail_askGrandma')}</Text>
              </ScribbleUnderline>
            </View>
            <View style={styles.chipsContainer}>
              {pillar.suggestions.map((q, i) => (
                <DiffuseQuestion key={i} pillarId={pillar.id} index={i} question={q} onAsk={ask} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

function DiffuseQuestion({ pillarId, index, question, onAsk }: { pillarId: string; index: number; question: string; onAsk: (q: string) => void }) {
  const { text, loading } = usePillarText(pillarContentKeys.suggestion(pillarId, index), question)
  if (loading) return <Skeleton height={44} radius={22} />
  return <PillButton label={text} variant="paper" onPress={() => onAsk(text)} style={{ alignSelf: 'flex-start' }} />
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  // not found
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 },
  notFoundBody: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 300 },
  // site look
  disc: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  siteTitle: { textTransform: 'uppercase', letterSpacing: 0.3 },
  siteSubtitle: { fontSize: 15, lineHeight: 22, marginTop: 4 },
  introCard: { marginTop: 18, padding: 16 },
  introText: { fontSize: 15, lineHeight: 23 },
  introSources: { marginTop: 10 },
  siteSection: { textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 30 },
  question: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14,
  },
  questionText: { flex: 1, fontSize: 15, lineHeight: 21 },
  // diffuse (unchanged)
  back: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 20,
  },
  heroWrap: { alignItems: 'center', marginTop: 8, marginBottom: 16 },
  stickerHero: { width: 132, height: 132, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 32, letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 16, lineHeight: 22, marginBottom: 16 },
  intro: { fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 16 },
  sectionHeading: { marginTop: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 26, letterSpacing: -0.4 },
  contextLabel: { fontSize: 14, marginTop: 6, marginBottom: 2, letterSpacing: 0.1 },
  chipsContainer: { flexDirection: 'column', gap: 10, marginTop: 12 },
})
