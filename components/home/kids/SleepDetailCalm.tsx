/**
 * SleepDetailCalm — the sleep pop-up body (site look, calm).
 *
 * One hero number (average per night, or last night's total for a one-day range), a single quiet
 * line with the quality read, and a light 7-day bar chart. Sections only show when they have
 * something true to say; nothing logged → friendly empty state.
 *
 * Bars are capped at 24h (a day can't hold more) so one bad entry can't flatten the week, but
 * the label above each bar always shows the true number.
 */

import { ScrollView, Text, View, StyleSheet } from 'react-native'
import { useTheme, stickers } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import { SiteSticker } from '../../stickers/SiteSticker'
import { FadeUp } from '../../ui/Motion'

export interface SleepDetailCalmProps {
  /** Hours slept across the selected range. */
  sleepTotal: number
  /** Target hours across the selected range (per-night target × nights). */
  sleepTarget: number
  /** Per-night target in hours. */
  dailySleepTarget: number
  /** 'Great' | 'Solid' | 'Restless' | 'Poor' | 'No data' */
  sleepQuality: string
  /** Sleeps rated great/good, and sleeps with any rating. Optional for older callers. */
  sleepRestful?: number
  sleepRated?: number
  /** Hours per day for the last 7 days. */
  dailySleep: number[]
  dayLabels: string[]
  /** Nights in the range that have a sleep entry — the average divides by these. */
  sleepDays?: number
  /** Days (= nights) in the selected range. */
  rangeDays?: number
}

const BAR_H = 72
const LABEL_H = 14
const MAX_DAY_HOURS = 24

export function SleepDetailCalm(p: SleepDetailCalmProps) {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  const ink = colors.text
  const ink2 = colors.textSecondary
  const nights = Math.max(1, Math.round(p.rangeDays ?? 1))
  const oneNight = nights === 1
  const r1 = (n: number) => Math.round(n * 10) / 10
  const target = p.dailySleepTarget > 0 ? p.dailySleepTarget : 0

  const eyebrow = [styles.eyebrow, { color: ink2 }]
  const Divider = () => <View style={[styles.divider, { backgroundColor: colors.border }]} />

  // ── Empty ──
  if (!(p.sleepTotal > 0)) {
    return (
      <View style={styles.empty} testID="sleep-empty">
        <SiteSticker name="moon" size={56} cut />
        <Text style={[styles.emptyTitle, { color: ink, fontFamily: font.display }]}>{t('sleepCalm_emptyTitle')}</Text>
        <Text style={[styles.line, { color: ink2, fontFamily: font.body, textAlign: 'center' }]}>{t('sleepCalm_emptyHint')}</Text>
      </View>
    )
  }

  const hero = oneNight ? p.sleepTotal : p.sleepTotal / Math.max(1, p.sleepDays ?? nights)

  const series = p.dailySleep
  const hasBars = series.some((h) => h > 0)
  // Scale to the biggest day or the target, never past 24h.
  const scale = Math.max(1, Math.min(MAX_DAY_HOURS, Math.max(target, ...series)))
  const rangeWiderThanChart = nights > 7

  let i = 0
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
      <FadeUp index={i++}>
        <Text style={eyebrow}>{oneNight ? t('kidsTile_sleepNight') : t('kidsTile_sleepAvg')}</Text>
        <View style={styles.heroRow}>
          <Text style={[styles.hero, { color: ink, fontFamily: font.displayBold }]} testID="sleep-hero">
            {`${r1(hero).toFixed(1)}h`}
          </Text>
          {target > 0 ? (
            <Text style={[styles.heroSub, { color: ink2, fontFamily: font.body }]}>{t('kidsTile_ofNight', { h: target })}</Text>
          ) : null}
        </View>
        {!oneNight ? (
          <Text style={[styles.small, { color: ink2, fontFamily: font.body, marginTop: 4 }]}>
            {t('sleepCalm_total', { total: r1(p.sleepTotal), n: nights })}
          </Text>
        ) : null}
      </FadeUp>

      {/* What was logged, not a grade: the old line rated the child's sleep (Great…Poor) with advice
          and a pediatrician nudge. */}
      {(p.sleepRated ?? 0) > 0 ? (
        <FadeUp index={i++}>
          <Divider />
          <View style={styles.qualityRow}>
            <SiteSticker name="moon" size={26} />
            <Text style={[styles.line, { color: ink, fontFamily: font.body, flex: 1 }]} testID="sleep-quality">
              {t('sleepCalm_ratedRestful', { good: p.sleepRestful ?? 0, total: p.sleepRated ?? 0 })}
            </Text>
          </View>
        </FadeUp>
      ) : null}

      {hasBars ? (
        <FadeUp index={i++}>
          <Divider />
          <Text style={eyebrow}>{t('kids_home_sleep_modal_past7')}</Text>
          <View style={styles.chart}>
            {target > 0 ? (
              <View
                testID="sleep-target-line"
                style={[styles.targetLine, { top: LABEL_H + 4 + BAR_H * (1 - Math.min(target, scale) / scale), backgroundColor: ink }]}
              />
            ) : null}
            {series.map((hrs, idx) => {
              const met = target > 0 && hrs >= target
              const h = hrs > 0 ? Math.max(4, (Math.min(hrs, MAX_DAY_HOURS) / scale) * BAR_H) : 3
              const fill = hrs <= 0 ? colors.border : target > 0 && !met ? stickers.peachSoft : stickers.blueSoft
              return (
                <View key={idx} style={styles.barCol}>
                  <Text style={[styles.small, { color: ink, fontFamily: font.bodySemiBold, height: LABEL_H }]} numberOfLines={1}>
                    {hrs > 0 ? `${r1(hrs)}` : ''}
                  </Text>
                  <View style={{ height: BAR_H, justifyContent: 'flex-end', width: '100%' }}>
                    <View style={[styles.bar, { height: h, backgroundColor: fill, borderColor: hrs > 0 ? ink : 'transparent' }]} />
                  </View>
                  <Text style={[styles.small, { color: ink2, fontFamily: font.body }]} numberOfLines={1}>
                    {(p.dayLabels[idx] ?? '').slice(0, 3)}
                  </Text>
                </View>
              )
            })}
          </View>
          {target > 0 ? (
            <View style={styles.legend}>
              <View style={[styles.swatch, { backgroundColor: stickers.blueSoft, borderColor: ink }]} />
              <Text style={[styles.small, { color: ink2, fontFamily: font.body }]}>{t('sleepCalm_met')}</Text>
              <View style={[styles.swatch, { backgroundColor: stickers.peachSoft, borderColor: ink, marginLeft: 8 }]} />
              <Text style={[styles.small, { color: ink2, fontFamily: font.body }]}>{t('sleepCalm_short')}</Text>
              <Text style={[styles.small, { color: ink2, fontFamily: font.body, marginLeft: 8 }]}>{`· ${t('sleepCalm_target', { n: target })}`}</Text>
            </View>
          ) : null}
          {rangeWiderThanChart ? (
            <Text style={[styles.small, { color: ink2, fontFamily: font.body, marginTop: 8 }]}>{t('kids_home_sleep_modal_chart_note')}</Text>
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
  small: { fontSize: 12 },
  line: { fontSize: 15, lineHeight: 22 },
  divider: { height: StyleSheet.hairlineWidth * 2, marginVertical: 20 },
  qualityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4, position: 'relative' },
  targetLine: { position: 'absolute', left: 0, right: 0, height: 1, opacity: 0.45 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '100%', borderRadius: 8, borderWidth: 1.5 },
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 12 },
  swatch: { width: 10, height: 10, borderRadius: 3, borderWidth: 1 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 22, textTransform: 'uppercase', letterSpacing: 0.3 },
})
