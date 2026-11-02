/**
 * FeedingDetailCalm — the feeding / nutrition pop-up body (site look, calm).
 *
 * One hero number, then quiet rows separated by hairlines. Every section only appears when
 * it has something true to say:
 *
 *   milk feeds   breast + bottle (solids logged as "feeding" don't count as milk)
 *   stats        only the feed types that happened; "per bottle" = bottle ml ÷ bottles
 *   breast×bottle split only when both happened, else a one-line "only breast/bottle"
 *   which side   only when sides were logged ("both" folds half into each side)
 *   time of day  breastfeeds only (that's what's timed) — labelled as such
 *   length       breastfeeds with a duration
 *   solids       kcal per day + top groups per day, when calories were logged
 *   empty        nothing in the range → a friendly empty state
 *
 * Per-day numbers divide by the days in the selected range, so they match the home tiles;
 * a one-day range drops "per day".
 */

import { ScrollView, Text, View, StyleSheet } from 'react-native'
import { useTheme, stickers } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import { SiteSticker, type SiteStickerName } from '../../stickers/SiteSticker'
import { FadeUp } from '../../ui/Motion'

// Food group → a cute sticker + soft tone (labels arrive capitalised or lower-case).
const GROUP: Record<string, { sticker: SiteStickerName; tone: string }> = {
  fruit: { sticker: 'banana', tone: stickers.yellowSoft },
  vegetable: { sticker: 'lettuce', tone: stickers.greenSoft },
  grain: { sticker: 'corn', tone: stickers.peachSoft },
  protein: { sticker: 'egg', tone: stickers.pinkSoft },
  dairy: { sticker: 'bottle', tone: stickers.blueSoft },
  drink: { sticker: 'drop', tone: stickers.blueSoft },
  snack: { sticker: 'rasp', tone: stickers.lilacSoft },
  mixed: { sticker: 'avocado', tone: stickers.greenSoft },
}
const groupOf = (label: string) => GROUP[label.toLowerCase()] ?? GROUP.mixed

const BUCKETS = [
  { key: 'dawn', from: 5, to: 9 },
  { key: 'morning', from: 9, to: 12 },
  { key: 'afternoon', from: 12, to: 17 },
  { key: 'evening', from: 17, to: 22 },
  { key: 'night', from: 22, to: 5 },
] as const
type BucketKey = (typeof BUCKETS)[number]['key']
const bucketOf = (h: number): BucketKey =>
  BUCKETS.find((b) => (b.from < b.to ? h >= b.from && h < b.to : h >= b.from || h < b.to))?.key ?? 'night'

export interface FeedingDetailCalmProps {
  feedingCount: number; feedingBreast: number; feedingBottle: number; feedingMl: number; avgMl: number
  feedingLeft: number; feedingRight: number; feedingBoth: number
  feedingTimes: number[]; feedingDurations: number[]; feedingDays: number
  caloriesTotal?: number; caloriesTarget?: number
  categories?: { label: string; cals: number; color: string }[]
  /** Days in the selected range — every per-day number divides by this (matches the home tiles). */
  rangeDays?: number
}

export function FeedingDetailCalm(p: FeedingDetailCalmProps) {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  const ink = colors.text
  const ink2 = colors.textSecondary
  const days = Math.max(1, p.rangeDays ?? p.feedingDays)
  const oneDay = days === 1
  const r1 = (n: number) => Math.round(n * 10) / 10

  const milk = p.feedingBreast + p.feedingBottle
  const breastPct = milk > 0 ? Math.round((p.feedingBreast / milk) * 100) : 0
  const perBottle = p.feedingBottle > 0 && p.feedingMl > 0 ? Math.round(p.feedingMl / p.feedingBottle) : 0

  const sideKnown = p.feedingLeft + p.feedingRight + p.feedingBoth
  const leftPct = sideKnown > 0 ? Math.round(((p.feedingLeft + p.feedingBoth / 2) / sideKnown) * 100) : 0

  const counts: Record<BucketKey, number> = { dawn: 0, morning: 0, afternoon: 0, evening: 0, night: 0 }
  for (const h of p.feedingTimes) counts[bucketOf(h)]++
  const maxB = Math.max(1, ...Object.values(counts))
  const peak = BUCKETS.reduce((a, b) => (counts[b.key] > counts[a.key] ? b : a), BUCKETS[0]).key
  const inPart: Record<BucketKey, string> = {
    dawn: t('feedCalm_inDawn'), morning: t('feedCalm_inMorning'), afternoon: t('feedCalm_inAfternoon'),
    evening: t('feedCalm_inEvening'), night: t('feedCalm_inNight'),
  }

  const totalMin = p.feedingDurations.reduce((a, b) => a + b, 0)
  const avgMin = p.feedingDurations.length ? Math.round(totalMin / p.feedingDurations.length) : 0

  const kcal = p.caloriesTotal ?? 0
  const kcalGoal = p.caloriesTarget ?? 0
  const cats = (p.categories ?? []).filter((c) => c.cals > 0).sort((a, b) => b.cals - a.cals)
  const catMax = Math.max(1, ...cats.map((c) => c.cals))

  const eyebrow = [styles.eyebrow, { color: ink2 }]
  const Divider = () => <View style={[styles.divider, { backgroundColor: colors.border }]} />

  // ── Empty ──
  if (milk === 0 && kcal === 0) {
    return (
      <View style={styles.empty} testID="feeding-empty">
        <SiteSticker name="bottle" size={56} cut />
        <Text style={[styles.emptyTitle, { color: ink, fontFamily: font.display }]}>{t('feedCalm_emptyTitle')}</Text>
        <Text style={[styles.line, { color: ink2, fontFamily: font.body, textAlign: 'center' }]}>{t('feedCalm_emptyHint')}</Text>
      </View>
    )
  }

  const Stat = ({ sticker, value, label }: { sticker: SiteStickerName; value: string; label: string }) => (
    <View style={styles.stat}>
      <SiteSticker name={sticker} size={26} />
      <Text style={[styles.statValue, { color: ink, fontFamily: font.displayBold }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: ink2, fontFamily: font.body }]}>{label}</Text>
    </View>
  )
  const Split = ({ a, aLabel, bLabel, aColor, bColor }: { a: number; aLabel: string; bLabel: string; aColor: string; bColor: string }) => (
    <View style={{ gap: 6 }}>
      <View style={[styles.split, { borderColor: ink }]}>
        {a > 0 ? <View style={{ flex: a, backgroundColor: aColor }} /> : null}
        {a < 100 ? <View style={{ flex: 100 - a, backgroundColor: bColor }} /> : null}
      </View>
      <View style={styles.splitLabels}>
        <Text style={[styles.small, { color: ink, fontFamily: font.bodySemiBold }]}>{aLabel}</Text>
        <Text style={[styles.small, { color: ink, fontFamily: font.bodySemiBold }]}>{bLabel}</Text>
      </View>
    </View>
  )

  let i = 0
  let first = true
  const sep = () => { if (first) { first = false; return null } return <Divider /> }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
      {milk > 0 ? (
        <FadeUp index={i++}>
          {sep()}
          <Text style={eyebrow}>{oneDay ? t('feedCalm_milk') : t('feedCalm_milkPerDay')}</Text>
          <View style={styles.heroRow}>
            <Text style={[styles.hero, { color: ink, fontFamily: font.displayBold }]} testID="feeding-hero">
              {oneDay ? milk : r1(milk / days)}
            </Text>
            <Text style={[styles.heroSub, { color: ink2, fontFamily: font.body }]}>
              {[!oneDay ? t('feedCalm_feeds', { n: milk }) : null, p.feedingMl > 0 ? t('feedCalm_mlByBottle', { ml: p.feedingMl.toLocaleString() }) : null]
                .filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View style={styles.stats}>
            {p.feedingBreast > 0 ? <Stat sticker="heart" value={`${p.feedingBreast}`} label={t('feedCalm_breast')} /> : null}
            {p.feedingBottle > 0 ? <Stat sticker="bottle" value={`${p.feedingBottle}`} label={t('feedCalm_bottle')} /> : null}
            {perBottle > 0 ? <Stat sticker="drop" value={`${perBottle} ml`} label={t('feedCalm_avgBottle')} /> : null}
          </View>
        </FadeUp>
      ) : null}

      {milk > 0 ? (
        <FadeUp index={i++}>
          {sep()}
          <Text style={eyebrow}>{t('feedCalm_breastVsBottle')}</Text>
          {p.feedingBreast > 0 && p.feedingBottle > 0 ? (
            <Split a={breastPct} aLabel={`${t('feedCalm_breast')} ${breastPct}%`} bLabel={`${t('feedCalm_bottle')} ${100 - breastPct}%`} aColor={stickers.pinkSoft} bColor={stickers.blueSoft} />
          ) : (
            <Text style={[styles.line, { color: ink, fontFamily: font.body }]}>
              {p.feedingBreast > 0 ? t('feedCalm_onlyBreast') : t('feedCalm_onlyBottle')}
            </Text>
          )}
        </FadeUp>
      ) : null}

      {sideKnown > 0 ? (
        <FadeUp index={i++}>
          {sep()}
          <Text style={eyebrow}>{t('feedCalm_side')}</Text>
          <Split a={leftPct} aLabel={t('feedCalm_left', { p: leftPct })} bLabel={t('feedCalm_right', { p: 100 - leftPct })} aColor={stickers.pinkSoft} bColor={stickers.lilacSoft} />
          {p.feedingBoth > 0 ? (
            <Text style={[styles.small, { color: ink2, fontFamily: font.body, marginTop: 6 }]}>{t('feedCalm_bothSides', { n: p.feedingBoth })}</Text>
          ) : null}
        </FadeUp>
      ) : null}

      {p.feedingTimes.length > 0 ? (
        <FadeUp index={i++}>
          {sep()}
          <View style={styles.rowBetween}>
            <Text style={eyebrow}>{t('feedCalm_timeOfDay')}</Text>
            <Text style={[styles.small, { color: ink2, fontFamily: font.body }]}>{t('feedCalm_mostIn', { part: inPart[peak] })}</Text>
          </View>
          <View style={styles.bars}>
            {BUCKETS.map((b) => {
              const c = counts[b.key]
              const isPeak = b.key === peak && c > 0
              return (
                <View key={b.key} style={styles.barCol}>
                  <Text style={[styles.small, { color: ink, fontFamily: font.bodySemiBold }]}>{c || ''}</Text>
                  <View style={[styles.bar, { height: 6 + (c / maxB) * 54, backgroundColor: isPeak ? stickers.peach : stickers.peachSoft, borderColor: isPeak ? ink : 'transparent' }]} />
                  <Text style={[styles.small, { color: isPeak ? ink : ink2, fontFamily: isPeak ? font.bodyBold : font.body }]} numberOfLines={1}>
                    {t(`feedCalm_${b.key}` as 'feedCalm_dawn')}
                  </Text>
                </View>
              )
            })}
          </View>
        </FadeUp>
      ) : null}

      {avgMin > 0 ? (
        <FadeUp index={i++}>
          {sep()}
          <Text style={eyebrow}>{t('feedCalm_sessions')}</Text>
          <Text style={[styles.line, { color: ink, fontFamily: font.bodySemiBold }]}>
            {oneDay ? t('feedCalm_sessionLineDay', { avg: avgMin }) : t('feedCalm_sessionLine', { avg: avgMin, day: Math.round(totalMin / days) })}
          </Text>
        </FadeUp>
      ) : null}

      {kcal > 0 ? (
        <FadeUp index={i++}>
          {sep()}
          <Text style={eyebrow}>{oneDay ? t('feedCalm_solids') : t('feedCalm_solidsPerDay')}</Text>
          <View style={styles.heroRow}>
            <Text style={[styles.solidHero, { color: ink, fontFamily: font.displayBold }]} testID="solids-hero">
              {Math.round(kcal / days).toLocaleString()} kcal
            </Text>
            {kcalGoal > 0 ? (
              <Text style={[styles.heroSub, { color: ink2, fontFamily: font.body }]}>
                {oneDay ? t('feedCalm_of', { n: Math.round(kcalGoal).toLocaleString() }) : t('feedCalm_ofDay', { n: Math.round(kcalGoal / days).toLocaleString() })}
              </Text>
            ) : null}
          </View>
          {cats.length > 0 ? (
            <View style={styles.cats}>
              {cats.map((c) => {
                const g = groupOf(c.label)
                const perDay = Math.round(c.cals / days)
                const share = Math.round((c.cals / Math.max(1, kcal)) * 100)
                return (
                  <View key={c.label} style={styles.catRow}>
                    <View style={[styles.catDisc, { backgroundColor: g.tone, borderColor: ink }]}>
                      <SiteSticker name={g.sticker} size={26} />
                    </View>
                    <View style={{ flex: 1, gap: 5 }}>
                      <View style={styles.rowBetween}>
                        <Text style={[styles.line, { color: ink, fontFamily: font.bodySemiBold, textTransform: 'capitalize' }]}>{c.label}</Text>
                        <Text style={[styles.line, { color: ink, fontFamily: font.bodyBold }]}>
                          {perDay.toLocaleString()} kcal
                          <Text style={{ color: ink2, fontFamily: font.body }}>{`  ${share}%`}</Text>
                        </Text>
                      </View>
                      <View style={[styles.catTrack, { backgroundColor: colors.border }]}>
                        <View style={[styles.catFill, { width: `${(c.cals / catMax) * 100}%`, backgroundColor: g.tone, borderColor: ink }]} />
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          ) : null}
        </FadeUp>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  hero: { fontSize: 56, lineHeight: 62, letterSpacing: -1.5 },
  heroSub: { fontSize: 15 },
  solidHero: { fontSize: 30, lineHeight: 36 },
  stats: { flexDirection: 'row', marginTop: 18, gap: 8 },
  stat: { flex: 1, alignItems: 'flex-start', gap: 2 },
  statValue: { fontSize: 22, marginTop: 4 },
  statLabel: { fontSize: 13 },
  divider: { height: StyleSheet.hairlineWidth * 2, marginVertical: 20 },
  split: { flexDirection: 'row', height: 12, borderRadius: 6, borderWidth: 1.5, overflow: 'hidden' },
  splitLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontSize: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '100%', borderRadius: 8, borderWidth: 1.5 },
  line: { fontSize: 15, lineHeight: 22 },
  cats: { marginTop: 16, gap: 14 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catDisc: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  catTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  catFill: { height: 8, borderRadius: 4, borderWidth: 1 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 22, textTransform: 'uppercase', letterSpacing: 0.3 },
})
