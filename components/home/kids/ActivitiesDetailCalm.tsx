/**
 * ActivitiesDetailCalm — the activities pop-up body (site look, calm).
 *
 * Hero = how many activities were logged in the range (kept as a plain count, in every range).
 * Under it: "{active} of {days} days active" with small day dots, then the pillar breakdown as
 * quiet rows (sticker disc, label, count, share, thin bar), then the few most recent entries.
 * Sections only show when they have something true to say; nothing logged → friendly empty state.
 */

import { ScrollView, Text, View, StyleSheet } from 'react-native'
import { clockLabel, hourLabel } from '../../../lib/timeFormat'
import { useTheme, stickers } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import { SiteSticker, type SiteStickerName } from '../../stickers/SiteSticker'
import { FadeUp } from '../../ui/Motion'
import { dateLoc } from '../../../lib/kpLocale'

type PillarId = 'movement' | 'creative' | 'learning' | 'social' | 'care' | 'therapy'

const PILLAR: Record<PillarId, { sticker: SiteStickerName; tone: string }> = {
  movement: { sticker: 'shoe', tone: stickers.greenSoft },
  creative: { sticker: 'flower', tone: stickers.yellowSoft },
  learning: { sticker: 'books', tone: stickers.blueSoft },
  social: { sticker: 'baby2', tone: stickers.pinkSoft },
  care: { sticker: 'heart', tone: stickers.peachSoft },
  therapy: { sticker: 'brain', tone: stickers.lilacSoft },
}
const pillarOf = (id: string) => PILLAR[id as PillarId] ?? PILLAR.social
const labelKey = (id: string) => `actCalm_p_${id in PILLAR ? id : 'social'}` as 'actCalm_p_social'

/** Structural twin of KidsHome's ActivityEntry. */
export interface ActivityCalmEntry {
  id: string
  type: string
  date: string
  startTime?: string
  endTime?: string
  name?: string
}

export interface ActivitiesDetailCalmProps {
  activityCount: number
  activeDays: number
  rangeDays: number
  breakdown: Record<string, number>
  entries: ActivityCalmEntry[]
}

const MAX_RECENT = 5
const MAX_DOTS = 14

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(dateLoc(), { weekday: 'short', month: 'short', day: 'numeric' })
}
function formatTime(start?: string, end?: string): string {
  if (!start) return ''
  const label = clockLabel
  return end ? `${label(start)} – ${label(end)}` : label(start)
}

export function ActivitiesDetailCalm(p: ActivitiesDetailCalmProps) {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  const ink = colors.text
  const ink2 = colors.textSecondary
  const days = Math.max(1, p.rangeDays)
  const oneDay = days === 1

  const ranked = Object.entries(p.breakdown).filter(([, c]) => c > 0).sort(([, a], [, b]) => b - a)
  const rankedTotal = ranked.reduce((a, [, c]) => a + c, 0)
  const total = p.activityCount > 0 ? p.activityCount : rankedTotal
  const maxCount = Math.max(1, ...ranked.map(([, c]) => c))
  const avgPerActiveDay = p.activeDays > 0 ? Math.round((total / p.activeDays) * 10) / 10 : 0

  const recent = [...p.entries]
    .sort((a, b) => (a.date === b.date ? (b.startTime ?? '').localeCompare(a.startTime ?? '') : b.date.localeCompare(a.date)))
    .slice(0, MAX_RECENT)

  const eyebrow = [styles.eyebrow, { color: ink2 }]
  const Divider = () => <View style={[styles.divider, { backgroundColor: colors.border }]} />

  // ── Empty ──
  if (total === 0) {
    return (
      <View style={styles.empty} testID="activities-empty">
        <SiteSticker name="shoe" size={56} cut />
        <Text style={[styles.emptyTitle, { color: ink, fontFamily: font.display }]}>{t('actCalm_emptyTitle')}</Text>
        <Text style={[styles.line, { color: ink2, fontFamily: font.body, textAlign: 'center' }]}>{t('actCalm_emptyHint')}</Text>
      </View>
    )
  }

  const showDays = !oneDay && p.activeDays > 0
  const showDots = showDays && days <= MAX_DOTS
  let i = 0
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
      <FadeUp index={i++}>
        <Text style={eyebrow}>{t('actCalm_activities')}</Text>
        <View style={styles.heroRow}>
          <Text style={[styles.hero, { color: ink, fontFamily: font.displayBold }]} testID="activities-hero">
            {total}
          </Text>
          {showDays ? (
            <Text style={[styles.heroSub, { color: ink2, fontFamily: font.body }]}>
              {t('kidsTile_activeDays', { a: Math.min(p.activeDays, days), d: days })}
            </Text>
          ) : null}
        </View>
        {showDots ? (
          <View style={styles.dots} testID="activities-dots">
            {Array.from({ length: days }, (_, d) => (
              <View
                key={d}
                style={[styles.dot, d < p.activeDays
                  ? { backgroundColor: stickers.greenSoft, borderColor: ink }
                  : { backgroundColor: 'transparent', borderColor: colors.border }]}
              />
            ))}
          </View>
        ) : null}
        {showDays && avgPerActiveDay > 0 ? (
          <Text style={[styles.small, { color: ink2, fontFamily: font.body, marginTop: 10 }]}>
            {t('kids_home_activities_modal_per_active_day', { avg: avgPerActiveDay })}
          </Text>
        ) : null}
      </FadeUp>

      {ranked.length > 0 ? (
        <FadeUp index={i++}>
          <Divider />
          <Text style={eyebrow}>{t('actCalm_byKind')}</Text>
          <View style={styles.rows}>
            {ranked.map(([id, count]) => {
              const m = pillarOf(id)
              const share = Math.round((count / Math.max(1, rankedTotal)) * 100)
              return (
                <View key={id} style={styles.row} testID={`pillar-${id}`}>
                  <View style={[styles.disc, { backgroundColor: m.tone, borderColor: ink }]}>
                    <SiteSticker name={m.sticker} size={26} />
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <View style={styles.rowBetween}>
                      <Text style={[styles.line, { color: ink, fontFamily: font.bodySemiBold }]}>{t(labelKey(id))}</Text>
                      <Text style={[styles.line, { color: ink, fontFamily: font.bodyBold }]}>
                        {count.toLocaleString()}
                        <Text style={{ color: ink2, fontFamily: font.body }}>{`  ${share}%`}</Text>
                      </Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: colors.border }]}>
                      <View style={[styles.fill, { width: `${(count / maxCount) * 100}%`, backgroundColor: m.tone, borderColor: ink }]} />
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        </FadeUp>
      ) : null}

      {recent.length > 0 ? (
        <FadeUp index={i++}>
          <Divider />
          <Text style={eyebrow}>{t('actCalm_recent')}</Text>
          <View style={{ gap: 12 }}>
            {recent.map((e) => {
              const m = pillarOf(e.type)
              const time = formatTime(e.startTime, e.endTime)
              return (
                <View key={e.id} style={styles.recentRow}>
                  <SiteSticker name={m.sticker} size={22} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.line, { color: ink, fontFamily: font.bodySemiBold }]} numberOfLines={1}>
                      {e.name || t(labelKey(e.type))}
                    </Text>
                    <Text style={[styles.small, { color: ink2, fontFamily: font.body }]}>
                      {formatDate(e.date)}{time ? ` · ${time}` : ''}
                    </Text>
                  </View>
                </View>
              )
            })}
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
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
  small: { fontSize: 12 },
  line: { fontSize: 15, lineHeight: 22 },
  divider: { height: StyleSheet.hairlineWidth * 2, marginVertical: 20 },
  rows: { gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  disc: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, borderWidth: 1 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 22, textTransform: 'uppercase', letterSpacing: 0.3 },
})
