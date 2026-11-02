/**
 * FeedingDetailCalm — the feeding pop-up body, calm version (site look).
 *
 * One clear hero number, then quiet rows: no stacks of coloured boxes. Hairline dividers,
 * small stickers, one thin split bar per comparison, a light time-of-day strip. Sections
 * fade up one after another.
 */

import { ScrollView, Text, View, StyleSheet } from 'react-native'
import { useTheme, stickers } from '../../../constants/theme'
import { SiteSticker, type SiteStickerName } from '../../stickers/SiteSticker'
import { FadeUp } from '../../ui/Motion'

const BUCKETS = [
  { key: 'dawn', label: 'Dawn', from: 5, to: 9 },
  { key: 'morning', label: 'Morning', from: 9, to: 12 },
  { key: 'afternoon', label: 'Afternoon', from: 12, to: 17 },
  { key: 'evening', label: 'Evening', from: 17, to: 22 },
  { key: 'night', label: 'Night', from: 22, to: 5 },
]
const bucketOf = (h: number) => BUCKETS.find((b) => (b.from < b.to ? h >= b.from && h < b.to : h >= b.from || h < b.to))?.key ?? 'night'

export function FeedingDetailCalm(p: {
  feedingCount: number; feedingBreast: number; feedingBottle: number; feedingMl: number; avgMl: number
  feedingLeft: number; feedingRight: number; feedingBoth: number
  feedingTimes: number[]; feedingDurations: number[]; feedingDays: number
  /** Mixed stage: solids on top of milk. */
  caloriesTotal?: number; caloriesTarget?: number
  categories?: { label: string; cals: number; color: string }[]
  /** Days in the selected range — every per-day number divides by this (matches the home tiles). */
  rangeDays?: number
}) {
  const { colors, font } = useTheme()
  const ink = colors.text
  const ink2 = colors.textSecondary
  const days = Math.max(1, p.rangeDays ?? p.feedingDays)
  const perDay = Math.round((p.feedingCount / days) * 10) / 10
  const bb = p.feedingBreast + p.feedingBottle
  const breastPct = bb > 0 ? Math.round((p.feedingBreast / bb) * 100) : 0

  const sideKnown = p.feedingLeft + p.feedingRight + p.feedingBoth
  const leftPct = sideKnown > 0 ? Math.round(((p.feedingLeft + p.feedingBoth / 2) / sideKnown) * 100) : 0

  const counts: Record<string, number> = { dawn: 0, morning: 0, afternoon: 0, evening: 0, night: 0 }
  for (const h of p.feedingTimes) counts[bucketOf(h)]++
  const maxB = Math.max(1, ...Object.values(counts))
  const peak = BUCKETS.reduce((a, b) => (counts[b.key] > counts[a.key] ? b : a), BUCKETS[0])

  const totalMin = p.feedingDurations.reduce((a, b) => a + b, 0)
  const avgMin = p.feedingDurations.length ? Math.round(totalMin / p.feedingDurations.length) : 0

  const eyebrow = [styles.eyebrow, { color: ink2 }]
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
        <View style={{ flex: Math.max(a, 1), backgroundColor: aColor }} />
        <View style={{ flex: Math.max(100 - a, 1), backgroundColor: bColor }} />
      </View>
      <View style={styles.splitLabels}>
        <Text style={[styles.small, { color: ink, fontFamily: font.bodySemiBold }]}>{aLabel}</Text>
        <Text style={[styles.small, { color: ink, fontFamily: font.bodySemiBold }]}>{bLabel}</Text>
      </View>
    </View>
  )
  const Divider = () => <View style={[styles.divider, { backgroundColor: colors.border }]} />

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
      {p.feedingCount > 0 ? (<>
      <FadeUp index={0}>
        <Text style={eyebrow}>FEEDS · PER DAY</Text>
        <View style={styles.heroRow}>
          <Text style={[styles.hero, { color: ink, fontFamily: font.displayBold }]}>{perDay}</Text>
          <Text style={[styles.heroSub, { color: ink2, fontFamily: font.body }]}>
            {`${p.feedingCount} feeds${p.feedingMl > 0 ? ` · ${p.feedingMl.toLocaleString()} ml` : ''}`}
          </Text>
        </View>
      </FadeUp>

      <FadeUp index={1}>
        <View style={styles.stats}>
          <Stat sticker="heart" value={`${p.feedingBreast}`} label="Breast" />
          <Stat sticker="bottle" value={`${p.feedingBottle}`} label="Bottle" />
          <Stat sticker="drop" value={p.avgMl > 0 ? `${p.avgMl} ml` : '—'} label="Avg bottle" />
        </View>
      </FadeUp>
      </>) : null}

      {bb > 0 ? (
        <FadeUp index={2}>
          <Divider />
          <Text style={eyebrow}>BREAST VS BOTTLE</Text>
          <Split a={breastPct} aLabel={`Breast ${breastPct}%`} bLabel={`Bottle ${100 - breastPct}%`} aColor={stickers.pinkSoft} bColor={stickers.blueSoft} />
        </FadeUp>
      ) : null}

      {sideKnown > 0 ? (
        <FadeUp index={3}>
          <Divider />
          <Text style={eyebrow}>BREAST SIDE</Text>
          <Split a={leftPct} aLabel={`Left ${leftPct}%`} bLabel={`Right ${100 - leftPct}%`} aColor={stickers.pinkSoft} bColor={stickers.lilacSoft} />
        </FadeUp>
      ) : null}

      {p.feedingTimes.length > 0 ? (
        <FadeUp index={4}>
          <Divider />
          <View style={styles.rowBetween}>
            <Text style={eyebrow}>TIME OF DAY</Text>
            <Text style={[styles.small, { color: ink2, fontFamily: font.body }]}>{`most in the ${peak.label.toLowerCase()}`}</Text>
          </View>
          <View style={styles.bars}>
            {BUCKETS.map((b) => {
              const c = counts[b.key]
              const isPeak = b.key === peak.key && c > 0
              return (
                <View key={b.key} style={styles.barCol}>
                  <Text style={[styles.small, { color: ink, fontFamily: font.bodySemiBold }]}>{c || ''}</Text>
                  <View style={[styles.bar, { height: 6 + (c / maxB) * 54, backgroundColor: isPeak ? stickers.peach : stickers.peachSoft, borderColor: isPeak ? ink : 'transparent' }]} />
                  <Text style={[styles.small, { color: isPeak ? ink : ink2, fontFamily: isPeak ? font.bodyBold : font.body }]}>{b.label}</Text>
                </View>
              )
            })}
          </View>
        </FadeUp>
      ) : null}

      {(p.caloriesTotal ?? 0) > 0 ? (
        <FadeUp index={6}>
          <Divider />
          <Text style={eyebrow}>SOLIDS · PER DAY</Text>
          <View style={styles.heroRow}>
            <Text style={[styles.statValue, { color: ink, fontFamily: font.displayBold, fontSize: 30, marginTop: 0 }]}>
              {Math.round((p.caloriesTotal ?? 0) / days).toLocaleString()} kcal
            </Text>
            {(p.caloriesTarget ?? 0) > 0 ? (
              <Text style={[styles.heroSub, { color: ink2, fontFamily: font.body }]}>{`of ${Math.round((p.caloriesTarget ?? 0) / days).toLocaleString()} a day`}</Text>
            ) : null}
          </View>
          {(p.categories ?? []).slice(0, 4).map((c) => (
            <View key={c.label} style={styles.catRow}>
              <View style={[styles.catDot, { backgroundColor: c.color, borderColor: ink }]} />
              <Text style={[styles.line, { color: ink, fontFamily: font.body, flex: 1 }]}>{c.label}</Text>
              <Text style={[styles.line, { color: ink, fontFamily: font.bodySemiBold }]}>{Math.round(c.cals / days).toLocaleString()} kcal</Text>
            </View>
          ))}
        </FadeUp>
      ) : null}

      {avgMin > 0 ? (
        <FadeUp index={5}>
          <Divider />
          <Text style={eyebrow}>BREAST SESSIONS</Text>
          <Text style={[styles.line, { color: ink, fontFamily: font.body }]}>
            <Text style={{ fontFamily: font.bodyBold }}>{`${avgMin} min`}</Text>
            {' on average · '}
            <Text style={{ fontFamily: font.bodyBold }}>{`${Math.round(totalMin / days)} min`}</Text>
            {' a day'}
          </Text>
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
  stats: { flexDirection: 'row', marginTop: 18 },
  stat: { flex: 1, alignItems: 'flex-start', gap: 2 },
  statValue: { fontSize: 22, marginTop: 4 },
  statLabel: { fontSize: 13 },
  divider: { height: StyleSheet.hairlineWidth * 2, marginVertical: 20 },
  split: { flexDirection: 'row', height: 12, borderRadius: 6, borderWidth: 1.5, overflow: 'hidden' },
  splitLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontSize: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '100%', borderRadius: 8, borderWidth: 1.5 },
  line: { fontSize: 15, lineHeight: 22 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  catDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
})
