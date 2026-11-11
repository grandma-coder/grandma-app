/**
 * DiaperDetailCalm — the diaper pop-up body (site look, calm).
 *
 * Hero = diapers per day (a one-day range shows the plain count). Stat columns only for the
 * types that happened, a light stacked strip per day (weekly buckets for long ranges) when there
 * are several days of data, and poop colours as small dot rows when logged. Nothing logged →
 * friendly empty state.
 */

import { ScrollView, Text, View, StyleSheet } from 'react-native'
import { useTheme, stickers } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import { SiteSticker, type SiteStickerName } from '../../stickers/SiteSticker'
import { FadeUp } from '../../ui/Motion'

type DayCounts = { pee: number; poop: number; mixed: number }

export interface DiaperDetailCalmProps {
  count: number
  pee: number
  poop: number
  mixed: number
  diaperByDay: Record<string, DayCounts>
  diaperColors: Record<string, number>
  rangeDays?: number
}

const COLOR_META: Record<string, { swatch: string }> = {
  yellow: { swatch: '#FBBF24' },
  green: { swatch: '#4ADE80' },
  brown: { swatch: '#A16207' },
  black: { swatch: '#6B7280' },
  red: { swatch: '#EF4444' },
  orange: { swatch: '#F97316' },
}

const TONE = { pee: stickers.blue, poop: stickers.peach, mixed: stickers.yellow }
const MAX_DAILY_BARS = 14
const MAX_WEEKLY_BARS = 12
const BAR_H = 64
const DAY_MS = 86400000

interface Bucket { label: string; pee: number; poop: number; mixed: number; total: number }

function buildBuckets(byDay: Record<string, DayCounts>): Bucket[] {
  const keys = Object.keys(byDay).filter((k) => !isNaN(new Date(k + 'T00:00:00').getTime())).sort()
  const mk = (label: string, c: DayCounts): Bucket => ({ label, ...c, total: c.pee + c.poop + c.mixed })
  if (keys.length <= MAX_DAILY_BARS) {
    return keys.map((k) => mk(String(new Date(k + 'T00:00:00').getDate()), byDay[k]))
  }
  const t0 = new Date(keys[0] + 'T00:00:00').getTime()
  const weeks = new Map<number, DayCounts>()
  for (const k of keys) {
    const w = Math.floor(Math.round((new Date(k + 'T00:00:00').getTime() - t0) / DAY_MS) / 7)
    const cur = weeks.get(w) ?? { pee: 0, poop: 0, mixed: 0 }
    cur.pee += byDay[k].pee; cur.poop += byDay[k].poop; cur.mixed += byDay[k].mixed
    weeks.set(w, cur)
  }
  return [...weeks.entries()].sort(([a], [b]) => a - b).slice(-MAX_WEEKLY_BARS).map(([w, c]) => mk(`W${w + 1}`, c))
}

export function DiaperDetailCalm(p: DiaperDetailCalmProps) {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  const ink = colors.text
  const ink2 = colors.textSecondary
  const days = Math.max(1, p.rangeDays ?? 1)
  const oneDay = days === 1
  const r1 = (n: number) => Math.round(n * 10) / 10
  const total = p.pee + p.poop + p.mixed
  const count = p.count > 0 ? p.count : total

  const eyebrow = [styles.eyebrow, { color: ink2 }]
  const Divider = () => <View style={[styles.divider, { backgroundColor: colors.border }]} />

  // ── Empty ──
  if (count === 0) {
    return (
      <View style={styles.empty} testID="diaper-empty">
        <SiteSticker name="diaper" size={56} cut />
        <Text style={[styles.emptyTitle, { color: ink, fontFamily: font.display }]}>{t('diaperCalm_emptyTitle')}</Text>
        <Text style={[styles.line, { color: ink2, fontFamily: font.body, textAlign: 'center' }]}>{t('diaperCalm_emptyHint')}</Text>
      </View>
    )
  }

  const types: { key: 'pee' | 'poop' | 'mixed'; sticker: SiteStickerName; n: number; label: string }[] = [
    { key: 'pee', sticker: 'pee', n: p.pee, label: t('kids_home_diaper_pee') },
    { key: 'poop', sticker: 'poop', n: p.poop, label: t('kids_home_diaper_poop') },
    { key: 'mixed', sticker: 'diaper', n: p.mixed, label: t('kids_home_diaper_mixed') },
  ]
  const shown = types.filter((x) => x.n > 0)

  const buckets = buildBuckets(p.diaperByDay)
  const showStrip = buckets.length >= 2
  const bucketMax = Math.max(1, ...buckets.map((b) => b.total))

  const colorEntries = Object.entries(p.diaperColors).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
  const colorTotal = colorEntries.reduce((a, [, n]) => a + n, 0)

  let i = 0
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
      <FadeUp index={i++}>
        <Text style={eyebrow}>{oneDay ? t('diaperCalm_diapers') : t('diaperCalm_perDay')}</Text>
        <View style={styles.heroRow}>
          <Text style={[styles.hero, { color: ink, fontFamily: font.displayBold }]} testID="diaper-hero">
            {oneDay ? count : r1(count / days)}
          </Text>
          {!oneDay ? (
            <Text style={[styles.heroSub, { color: ink2, fontFamily: font.body }]}>
              {count === 1 ? t('diaperCalm_one') : t('diaperCalm_n', { n: count })}
            </Text>
          ) : null}
        </View>
        <View style={styles.stats}>
          {shown.map((x) => (
            <View key={x.key} style={styles.stat} testID={`diaper-stat-${x.key}`}>
              <SiteSticker name={x.sticker} size={26} />
              <Text style={[styles.statValue, { color: ink, fontFamily: font.displayBold }]}>{x.n}</Text>
              <Text style={[styles.statLabel, { color: ink2, fontFamily: font.body }]}>
                {`${x.label} · ${Math.round((x.n / Math.max(1, total)) * 100)}%`}
              </Text>
            </View>
          ))}
        </View>
      </FadeUp>

      {showStrip ? (
        <FadeUp index={i++}>
          <Divider />
          <Text style={eyebrow}>{t('kids_home_diaper_trend_label')}</Text>
          <View style={styles.bars} testID="diaper-strip">
            {buckets.map((b, idx) => {
              const h = b.total > 0 ? Math.max(6, (b.total / bucketMax) * BAR_H) : 3
              return (
                <View key={idx} style={styles.barCol}>
                  <Text style={[styles.small, { color: ink, fontFamily: font.bodySemiBold, height: 14 }]}>{b.total || ''}</Text>
                  <View style={{ height: BAR_H, justifyContent: 'flex-end', width: '100%' }}>
                    <View style={[styles.bar, { height: h, backgroundColor: b.total > 0 ? 'transparent' : colors.border }]}>
                      {b.mixed > 0 ? <View style={{ flex: b.mixed, backgroundColor: TONE.mixed }} /> : null}
                      {b.poop > 0 ? <View style={{ flex: b.poop, backgroundColor: TONE.poop }} /> : null}
                      {b.pee > 0 ? <View style={{ flex: b.pee, backgroundColor: TONE.pee }} /> : null}
                    </View>
                  </View>
                  <Text style={[styles.small, { color: ink2, fontFamily: font.body }]} numberOfLines={1}>{b.label}</Text>
                </View>
              )
            })}
          </View>
          <View style={styles.legend}>
            {shown.map((x) => (
              <View key={x.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: TONE[x.key] }]} />
                <Text style={[styles.small, { color: ink2, fontFamily: font.body }]}>{x.label}</Text>
              </View>
            ))}
          </View>
        </FadeUp>
      ) : null}

      {colorEntries.length > 0 ? (
        <FadeUp index={i++}>
          <Divider />
          <Text style={eyebrow}>{`${t('kids_home_diaper_stool_color')} · ${t('diaperCalm_logged', { n: colorTotal })}`}</Text>
          <View style={styles.colors} testID="diaper-colors">
            {colorEntries.map(([color, n]) => (
              <View key={color} style={styles.colorItem}>
                <View style={[styles.colorDot, { backgroundColor: COLOR_META[color]?.swatch ?? '#888', borderColor: ink }]} />
                <Text style={[styles.line, { color: ink, fontFamily: font.bodySemiBold }]}>
                  {COLOR_META[color] ? t(`diaperCalm_c_${color}` as 'diaperCalm_c_yellow') : color.charAt(0).toUpperCase() + color.slice(1)}
                </Text>
                <Text style={[styles.line, { color: ink2, fontFamily: font.body }]}>{n}</Text>
              </View>
            ))}
          </View>
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
  stats: { flexDirection: 'row', marginTop: 18, gap: 8 },
  stat: { flex: 1, alignItems: 'flex-start', gap: 2 },
  statValue: { fontSize: 22, marginTop: 4 },
  statLabel: { fontSize: 13 },
  small: { fontSize: 12 },
  line: { fontSize: 15, lineHeight: 22 },
  divider: { height: StyleSheet.hairlineWidth * 2, marginVertical: 20 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 4 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '100%', borderRadius: 6, overflow: 'hidden', flexDirection: 'column' },
  legend: { flexDirection: 'row', gap: 14, marginTop: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 8 },
  colorItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  colorDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 22, textTransform: 'uppercase', letterSpacing: 0.3 },
})
