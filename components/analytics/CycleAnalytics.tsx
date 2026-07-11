/**
 * CycleAnalytics — 2026 sticker-collage rework.
 *
 * Reframed from a numbers grid into a playful "your cycle, alive" view:
 *   1. Oversized phase headline + warm one-liner + today's cycle day
 *   2. PhaseFlowChart — the audience-flow-style fertility curve with the
 *      fertile window shaded and a "you are here" marker
 *   3. Collage of tilted/overlapping stat stickers (avg medallion + chips)
 *      with human microcopy instead of bare numbers
 *   4. Recent cycles as playful pill rows
 *
 * Still wired to the same hooks + CycleDetailSheet tap-throughs as before.
 */

import { useState, useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme, radius, shadows, useDiffuseTheme, diffuseFont, getDiffuseAccent, stickers as stickerPalette } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { Character } from '../characters/Characters'
import { AnalyticsHeader } from './shared/AnalyticsHeader'
import { PeriodSelector, type Period } from './shared/PeriodSelector'
import { PhaseFlowChart } from './shared/PhaseFlowChart'
import { Moon, Burst, Flower, Heart, Drop, Star } from '../ui/Stickers'
import {
  getCycleInfo,
  dailyFertilityCurve,
  toDateStr,
  type CycleConfig,
  type CyclePhase,
} from '../../lib/cycleLogic'
import {
  useCycleHistory,
  useRegularity,
  usePMSStats,
  useFertileWindow,
  useMoodStats,
} from '../../lib/cycleAnalytics'
import { CycleDetailSheet, type CycleDetailType } from './CycleDetailSheets'
import { useTranslation, type TranslationKey } from '../../lib/i18n'

/** Warm phase copy keyed by cycle phase — resolved through t() so it localizes. */
const PHASE_VOICE_KEYS: Record<CyclePhase, { word: TranslationKey; line: TranslationKey }> = {
  menstruation: { word: 'cycleAnalytics_phaseWord_menstruation', line: 'cycleAnalytics_phaseLine_menstruation' },
  follicular: { word: 'cycleAnalytics_phaseWord_follicular', line: 'cycleAnalytics_phaseLine_follicular' },
  ovulation: { word: 'cycleAnalytics_phaseWord_ovulation', line: 'cycleAnalytics_phaseLine_ovulation' },
  luteal: { word: 'cycleAnalytics_phaseWord_luteal', line: 'cycleAnalytics_phaseLine_luteal' },
}

export function CycleAnalytics() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [period, setPeriod] = useState<Period>('month')
  const [detailType, setDetailType] = useState<CycleDetailType | null>(null)

  const { data: history } = useCycleHistory()
  const { data: regularity } = useRegularity()
  const { data: pms } = usePMSStats()
  const { data: fertile } = useFertileWindow()
  const { data: mood } = useMoodStats()

  // Live cycle config — same derivation CycleHome uses.
  const cycleConfig: CycleConfig = useMemo(() => {
    const latest = history?.cycles[history.cycles.length - 1]
    const avgLen = history?.avg ?? 28
    if (latest) {
      return { lastPeriodStart: latest.startDate, cycleLength: avgLen, periodLength: 5, lutealPhase: 14 }
    }
    const d = new Date()
    d.setDate(d.getDate() - 10)
    return { lastPeriodStart: toDateStr(d), cycleLength: 28, periodLength: 5, lutealPhase: 14 }
  }, [history])

  const hasData = (history?.cycles.length ?? 0) > 0
  const info = useMemo(() => getCycleInfo(cycleConfig, toDateStr(new Date())), [cycleConfig])
  const curve = useMemo(
    () => dailyFertilityCurve(cycleConfig.cycleLength, cycleConfig.lutealPhase),
    [cycleConfig.cycleLength, cycleConfig.lutealPhase],
  )
  const voice = {
    word: t(PHASE_VOICE_KEYS[info.phase].word),
    line: t(PHASE_VOICE_KEYS[info.phase].line),
  }

  // Phase accent drives the whole screen's color story.
  const PHASE_ACCENT: Record<CyclePhase, string> = {
    menstruation: stickers.coral,
    follicular: stickers.green,
    ovulation: stickers.pink,
    luteal: stickers.lilac,
  }
  // Under diffuse the whole screen shares the one cycle accent (calm, not per-phase hues).
  const accent = diffuse ? getDiffuseAccent('pre-pregnancy', dt.isDark) : PHASE_ACCENT[info.phase]
  const ink = diffuse ? dt.colors.ink : colors.text
  const muted = diffuse ? dt.colors.ink3 : colors.textMuted

  const avgLabel = history?.avg != null ? String(history.avg) : '—'
  const regularLabel =
    regularity?.percent != null ? `${regularity.percent}%` : '—'
  const pmsLabel = pms?.avgDays != null ? String(pms.avgDays) : '—'
  const moodLabel = mood?.avgScore != null ? String(mood.avgScore) : '—'
  const fertileLabel = formatFertile(fertile?.current)

  // Warm sub-copy for each chip — turns the number into a little read.
  const regularSub =
    regularity?.percent == null
      ? t('cycleAnalytics_regularSub_rhythm')
      : regularity.percent >= 80
        ? t('cycleAnalytics_regularSub_steady')
        : regularity.percent >= 50
          ? t('cycleAnalytics_regularSub_mostly')
          : t('cycleAnalytics_regularSub_unpredictable')
  const pmsSub = pms?.avgDays == null ? t('cycleAnalytics_pmsSub_none') : t('cycleAnalytics_pmsSub_symptomDays')
  const moodSub = mood?.avgScore == null ? t('cycleAnalytics_moodSub_log') : t('cycleAnalytics_moodSub_avg')
  const fertileSub =
    info.daysUntilOvulation > 0
      ? t('cycleAnalytics_fertileSub_opensIn', { d: info.daysUntilOvulation })
      : info.isFertile
        ? t('cycleAnalytics_fertileSub_open')
        : t('cycleAnalytics_fertileSub_passed')

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <AnalyticsHeader hide />

        {/* ── Hero: oversized phase word + warm line + today ──────────── */}
        <View style={styles.hero}>
          <Text style={[styles.heroKicker, diffuse ? { color: muted, fontFamily: diffuseFont.mono, letterSpacing: 2 } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
            {t('cycleAnalytics_yourCycleToday')}
          </Text>
          <View style={styles.heroWordRow}>
            <Text
              style={[styles.heroWord, { color: ink, fontFamily: diffuse ? diffuseFont.display : font.display }]}
              adjustsFontSizeToFit
              numberOfLines={1}
              minimumFontScale={0.7}
            >
              {voice.word}
            </Text>
            <View pointerEvents="none" style={styles.heroSticker}>
              {diffuse ? (
                <PhaseGlyph phase={info.phase} color={accent} />
              ) : (
                <PhaseSticker phase={info.phase} stickers={stickers} />
              )}
            </View>
          </View>
          <Text style={[styles.heroLine, diffuse ? { color: dt.colors.ink2, fontFamily: diffuseFont.italic } : { color: colors.textSecondary, fontFamily: font.italic }]}>
            {t('cycleAnalytics_day_voiceline', { day: info.cycleDay, line: voice.line })}
          </Text>
        </View>

        <PeriodSelector value={period} onChange={setPeriod} showCustom={false} />

        {/* ── Flowing fertility curve (the "audience flow" hero) ──────── */}
        <Pressable
          onPress={() => setDetailType('fertile')}
          accessibilityRole="button"
          accessibilityLabel={t('cycleAnalytics_viewFertileDetail')}
        >
          <View style={[styles.flowCard, diffuse ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, shadowOpacity: 0, elevation: 0 } : { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}>
            <View style={styles.flowHead}>
              <Text style={[styles.cardKicker, diffuse ? { color: muted, fontFamily: diffuseFont.mono, letterSpacing: 2 } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
                {t('cycleAnalytics_fertileFlow')}
              </Text>
              <Text style={[styles.flowFertile, diffuse ? { color: ink, fontFamily: diffuseFont.monoBold, letterSpacing: 0.4, textTransform: 'uppercase', fontSize: 12 } : { color: accent, fontFamily: font.bodySemiBold }]}>
                {fertileLabel === '—' ? t('cycleAnalytics_noWindowYet') : fertileLabel}
              </Text>
            </View>
            <PhaseFlowChart
              curve={curve}
              fertileStart={info.fertileStart}
              fertileEnd={info.fertileEnd}
              ovulationDay={info.ovulationDay}
              cycleDay={info.cycleDay}
              color={accent}
              height={150}
            />
          </View>
        </Pressable>

        {/* ── Stat collage: avg medallion + tilted chips ─────────────── */}
        <View style={styles.collage}>
          {/* Big circular average medallion */}
          <Pressable
            style={styles.medallionWrap}
            onPress={() => setDetailType('cycleLength')}
            accessibilityRole="button"
            accessibilityLabel={t('cycleAnalytics_viewLengthDetail')}
          >
            <View style={[styles.medallion, diffuse ? { backgroundColor: 'transparent', borderColor: dt.colors.line2, ...({ shadowOpacity: 0, elevation: 0 }) } : { backgroundColor: stickers.pinkSoft, borderColor: colors.borderStrong }]}>
              {diffuse ? null : (
                <View pointerEvents="none" style={styles.medallionStar}>
                  <Star size={26} fill={stickers.pink} stroke={colors.text} />
                </View>
              )}
              <Text style={[styles.medallionNum, { color: ink, fontFamily: diffuse ? diffuseFont.display : font.display }]}>
                {avgLabel}
              </Text>
              <Text style={[styles.medallionUnit, diffuse ? { color: muted, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 } : { color: colors.textSecondary, fontFamily: font.bodyMedium }]}>
                {t('cycleAnalytics_daysAvg')}
              </Text>
              <Text style={[styles.medallionSub, diffuse ? { color: muted, fontFamily: diffuseFont.mono, fontSize: 8.5, letterSpacing: 0.6, textTransform: 'uppercase' } : { color: colors.textMuted, fontFamily: font.body }]}>
                {t('cycleAnalytics_lastNCycles', { n: history?.cycles.filter((c) => c.lengthDays != null).length ?? 0 })}
              </Text>
            </View>
          </Pressable>

          {/* Right column: two tilted chips */}
          <View style={styles.chipCol}>
            <TiltChip
              tilt={2.5}
              tint={stickers.yellowSoft}
              sticker={<Flower size={24} petal={stickers.pink} center={stickers.yellow} />}
              diffuseIcon={<Character name="ovulation" size={26} color={stickerPalette.pink} />}
              diffuseHue={stickerPalette.pink}
              value={fertileLabel}
              sub={fertileSub}
              onPress={() => setDetailType('fertile')}
            />
            <TiltChip
              tilt={-3}
              tint={stickers.greenSoft}
              sticker={<Heart size={22} fill={stickers.pink} />}
              diffuseIcon={<Character name="mood" size={26} color={stickerPalette.coral} />}
              diffuseHue={stickerPalette.coral}
              value={moodLabel}
              sub={moodSub}
              onPress={() => setDetailType('mood')}
            />
          </View>
        </View>

        {/* Bottom row: two more tilted chips, overlapping rhythm */}
        <View style={styles.collageBottom}>
          <TiltChip
            tilt={-2}
            wide
            tint={stickers.lilacSoft}
            sticker={<Moon size={24} fill={stickers.lilac} />}
            diffuseIcon={<Character name="period" size={26} color={stickerPalette.lilac} />}
            diffuseHue={stickerPalette.lilac}
            value={regularLabel}
            sub={regularSub}
            onPress={() => setDetailType('regularity')}
          />
          <TiltChip
            tilt={3}
            wide
            tint={stickers.pinkSoft}
            sticker={<Burst size={24} fill={stickers.coral} points={8} />}
            diffuseIcon={<Character name="activity" size={26} color={stickerPalette.coral} />}
            diffuseHue={stickerPalette.coral}
            value={pmsLabel}
            sub={pmsSub}
            onPress={() => setDetailType('pms')}
          />
        </View>

        <RecentCyclesCard cycles={history?.cycles ?? []} />

        {!hasData && (
          <Text style={[styles.seedHint, diffuse ? { color: muted, fontFamily: diffuseFont.body } : { color: colors.textMuted, fontFamily: font.body }]}>
            {t('cycleAnalytics_seed_hint')}
          </Text>
        )}
      </ScrollView>

      <CycleDetailSheet type={detailType} onClose={() => setDetailType(null)} />
    </View>
  )
}

/** A small tilted pastel chip: sticker + value + warm sub-line.
 *  Under Diffuse the filled sticker is replaced by a thin Lucide glyph over a
 *  soft bloom (`diffuseIcon` + `diffuseHue`), matching the v4 icon system. */
function TiltChip({
  tilt, tint, sticker, diffuseIcon, diffuseHue, value, sub, onPress, wide,
}: {
  tilt: number
  tint: string
  sticker: React.ReactNode
  diffuseIcon?: React.ReactNode
  diffuseHue?: string
  value: string
  sub: string
  onPress?: () => void
  wide?: boolean
}) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        wide && styles.chipWide,
        diffuse
          ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, opacity: pressed ? 0.88 : 1, ...({ shadowOpacity: 0, elevation: 0 }) }
          : {
              backgroundColor: tint,
              borderColor: colors.border,
              transform: [{ rotate: `${tilt}deg` }],
              opacity: pressed ? 0.88 : 1,
            },
      ]}
    >
      {diffuse ? (
        diffuseIcon
      ) : (
        <View style={[styles.chipChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {sticker}
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.chipValue, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display }]}
          numberOfLines={1}
        >
          {value}
        </Text>
        <Text
          style={[styles.chipSub, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.4, textTransform: 'uppercase', fontSize: 9.5 } : { color: colors.textMuted, fontFamily: font.body }]}
          numberOfLines={2}
        >
          {sub}
        </Text>
      </View>
    </Pressable>
  )
}

/** Phase-specific decorative sticker for the hero. */
function PhaseSticker({ phase, stickers }: { phase: CyclePhase; stickers: ReturnType<typeof useTheme>['stickers'] }) {
  switch (phase) {
    case 'menstruation':
      return <Drop size={46} fill={stickers.coral} />
    case 'follicular':
      return <Star size={46} fill={stickers.green} />
    case 'ovulation':
      return <Flower size={48} petal={stickers.pink} center={stickers.yellow} />
    case 'luteal':
    default:
      return <Moon size={46} fill={stickers.lilac} />
  }
}

/** Diffuse: the hero phase glyph as a thin Lucide line icon (over a bloom). */
function PhaseGlyph({ phase, color }: { phase: CyclePhase; color: string }) {
  switch (phase) {
    case 'menstruation': return <Character name="period" size={28} color={color} />
    case 'follicular':   return <Character name="sparkle" size={28} color={color} />
    case 'ovulation':    return <Character name="ovulation" size={28} color={color} />
    case 'luteal':
    default:             return <Character name="night" size={28} color={color} />
  }
}

function RecentCyclesCard({
  cycles,
}: {
  cycles: { startDate: string; endDate: string | null; lengthDays: number | null }[]
}) {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const rcInk = diffuse ? dt.colors.ink : colors.text
  const rcMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const { t } = useTranslation()
  const closed = cycles.filter((c) => c.lengthDays !== null).slice(-5).reverse()
  const open = cycles.find((c) => c.lengthDays === null)

  const today = new Date()
  const formatRange = (start: string, end: string | null) => {
    const s = new Date(start + 'T00:00:00')
    if (!end) return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · current'
    const e = new Date(end + 'T00:00:00')
    const sStr = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const eStr = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${sStr} – ${eStr}`
  }

  const currentDay = open
    ? Math.max(1, Math.floor((today.getTime() - new Date(open.startDate + 'T00:00:00').getTime()) / 86400000) + 1)
    : null

  return (
    <View style={[styles.recentCard, diffuse ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line } : { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {diffuse ? null : (
        <View pointerEvents="none" style={styles.recentBlob}>
          <Drop size={48} fill={stickers.pinkSoft} stroke={colors.text} />
        </View>
      )}

      <Text style={[styles.recentTitle, diffuse ? { color: rcMuted, fontFamily: diffuseFont.mono, letterSpacing: 2 } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
        {t('cycleAnalytics_recentCycles')}
      </Text>

      {open && currentDay !== null ? (
        <View style={[styles.recentOpenRow, diffuse ? { backgroundColor: 'transparent', borderColor: dt.colors.line2 } : { backgroundColor: stickers.pinkSoft, borderColor: colors.borderLight }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: rcInk, fontFamily: diffuse ? diffuseFont.display : font.display, fontSize: 18, letterSpacing: -0.3 }}>
              {t('cycleAnalytics_dayNumber', { currentDay })}
            </Text>
            <Text style={{ color: rcMuted, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium, fontSize: diffuse ? 10 : 12, marginTop: 2, letterSpacing: diffuse ? 0.8 : 0, textTransform: diffuse ? 'uppercase' : 'none' }}>
              {t('cycleAnalytics_startedDate', { date: formatRange(open.startDate, null) })}
            </Text>
          </View>
          <View
            style={diffuse ? {
              paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
              backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.hairline,
            } : {
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: stickers.pink,
              borderWidth: 1,
              borderColor: colors.borderStrong,
            }}
          >
            {/* Fixed dark ink: stickers.pink is a light pink in BOTH themes, so a
                theme-flipping token would go invisible in dark. Ink-on-sticker is an
                allowed fixed-value case (DESIGN_SYSTEM §0). */}
            <Text style={diffuse
              ? { color: dt.colors.ink, fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }
              : { color: '#141313', fontFamily: font.bodySemiBold, fontSize: 11, letterSpacing: 0.4 }}>
              {t('cycleAnalytics_current')}
            </Text>
          </View>
        </View>
      ) : null}

      {closed.length > 0 ? (
        <View style={{ gap: 10, marginTop: open ? 12 : 4 }}>
          {closed.map((c, i) => (
            <View key={c.startDate + i} style={styles.recentRow}>
              <View
                style={diffuse ? {
                  width: 30, height: 30, borderRadius: 999,
                  backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2,
                  alignItems: 'center', justifyContent: 'center',
                } : {
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  backgroundColor: stickers.pinkSoft,
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ rotate: i % 2 === 0 ? '-4deg' : '4deg' }],
                }}
              >
                <Text style={{ color: rcInk, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold, fontSize: diffuse ? 10 : 11 }}>
                  {t('cycleAnalytics_cycle_n', { n: closed.length - i })}
                </Text>
              </View>
              <Text style={{ flex: 1, color: rcMuted, fontFamily: diffuse ? diffuseFont.body : font.bodyMedium, fontSize: 13 }}>
                {formatRange(c.startDate, c.endDate)}
              </Text>
              <Text style={{ color: rcInk, fontFamily: diffuse ? diffuseFont.monoBold : font.bodySemiBold, fontSize: 13 }}>
                {c.lengthDays}{t('cycle_ring_unit_d')}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ marginTop: 8, color: rcMuted, fontFamily: diffuse ? diffuseFont.body : font.bodyMedium, fontSize: 13, lineHeight: 19 }}>
          {t('cycleAnalytics_log_cycles_hint')}
        </Text>
      )}
    </View>
  )
}

function formatFertile(current: { start: string; end: string } | null | undefined): string {
  if (!current) return '—'
  const s = new Date(current.start + 'T00:00:00')
  const e = new Date(current.end + 'T00:00:00')
  const sMonth = s.toLocaleDateString('en-US', { month: 'short' })
  const eMonth = e.toLocaleDateString('en-US', { month: 'short' })
  if (sMonth === eMonth) {
    return `${sMonth} ${s.getDate()}–${e.getDate()}`
  }
  return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}`
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingTop: 0 },

  // Hero
  hero: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 8,
  },
  heroKicker: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  heroWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroWord: {
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -1,
  },
  heroSticker: {
    marginLeft: 10,
    transform: [{ rotate: '-10deg' }],
  },
  heroLine: {
    fontSize: 17,
    marginTop: 4,
  },

  // Flow card
  flowCard: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: radius.lg,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.cardPop,
  },
  flowHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardKicker: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  flowFertile: {
    fontSize: 13,
    letterSpacing: -0.2,
  },

  // Collage
  collage: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  medallionWrap: {
    width: 150,
  },
  medallion: {
    width: 150,
    height: 150,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    overflow: 'hidden',
    ...shadows.subtle,
  },
  medallionStar: {
    position: 'absolute',
    top: 16,
    right: 24,
    transform: [{ rotate: '12deg' }],
    opacity: 0.9,
  },
  medallionNum: {
    fontSize: 52,
    lineHeight: 54,
    letterSpacing: -1,
  },
  medallionUnit: {
    fontSize: 14,
    marginTop: -2,
  },
  medallionSub: {
    fontSize: 11,
    marginTop: 4,
  },
  chipCol: {
    flex: 1,
    gap: 12,
    justifyContent: 'space-between',
  },
  collageBottom: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },

  // Chips
  chip: {
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 69,
    ...shadows.subtle,
  },
  chipWide: {
    flex: 1,
  },
  chipChip: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipValue: {
    fontSize: 19,
    lineHeight: 23,
  },
  chipSub: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 1,
  },

  // Recent
  recentCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: radius.lg,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  recentBlob: {
    position: 'absolute',
    top: 10,
    right: 12,
    opacity: 0.55,
  },
  recentTitle: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  recentOpenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  seedHint: {
    marginHorizontal: 24,
    marginTop: 14,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
})
