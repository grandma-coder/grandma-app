/**
 * CycleAnalytics — "your cycle, alive" view.
 *
 *   1. Phase headline + warm one-liner + today's cycle day
 *   2. Cycle-length TREND — the analytical read home doesn't show: are my
 *      cycles stable, lengthening, or erratic? (home stays predictive)
 *   3. A uniform grid of tappable stat tiles — length, regularity, fertile,
 *      BBT, cervical mucus, PMS, mood (+ intimacy for TTC) — each with human
 *      microcopy and a tap-through to its CycleDetailSheet
 *   4. Recent cycles as playful pill rows
 *
 * BBT / cervical mucus / intercourse are surfaced from logs that were
 * previously collected but never shown. Intercourse is TTC-only.
 */

import { useState, useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Line as SvgLine, Circle as SvgCircle, Path as SvgPath, Text as SvgText } from 'react-native-svg'

import { useTheme, radius, shadows, useDiffuseTheme, diffuseFont, getDiffuseAccent, stickers as stickerPalette } from '../../constants/theme'
import { useIsDiffuse, useScrollBottomInset } from '../ui/diffuse/DiffuseKit'
import { Character } from '../characters/Characters'
import { AnalyticsHeader } from './shared/AnalyticsHeader'
import { Moon, Burst, Flower, Heart, Drop, Star } from '../ui/Stickers'
import {
  getCycleInfo,
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
  useBBTStats,
  useCervicalMucusStats,
  useIntercourseStats,
  useCycleIntent,
} from '../../lib/cycleAnalytics'
import { useUnitsStore } from '../../store/useUnitsStore'
import { cToDisplay, tempLabel } from '../../lib/units'
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
  const tempUnitPref = useUnitsStore((s) => s.tempUnit)
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const bottomInset = useScrollBottomInset(insets.bottom + 100)
  const [detailType, setDetailType] = useState<CycleDetailType | null>(null)

  const { data: history } = useCycleHistory()
  const { data: regularity } = useRegularity()
  const { data: pms } = usePMSStats()
  const { data: fertile } = useFertileWindow()
  const { data: mood } = useMoodStats()
  const { data: bbt } = useBBTStats()
  const { data: mucus } = useCervicalMucusStats()
  const { data: intercourse } = useIntercourseStats()
  const { data: intent } = useCycleIntent()

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

  // New signals — BBT, cervical mucus, intercourse (surfaced from logs that were
  // previously collected but never shown). Intercourse only surfaces for TTC.
  const isTTC = intent === 'ttc'
  const bbtLatest = bbt?.series.length ? bbt.series[bbt.series.length - 1].temp : null
  const bbtLabel = bbtLatest != null ? `${cToDisplay(bbtLatest, tempUnitPref).toFixed(1)}${tempLabel(tempUnitPref)}` : '—'
  const bbtSub = bbt?.shiftDay
    ? t('cycleAnalytics_bbtSub_shift', { d: bbt.shiftDay })
    : bbtLatest != null
      ? t('cycleAnalytics_bbtSub_tracking')
      : t('cycleAnalytics_bbtSub_log')
  const mucusLabel = mucus && mucus.fertileDays > 0 ? String(mucus.fertileDays) : (mucus?.series.length ? '0' : '—')
  const mucusSub = mucus && mucus.fertileDays > 0
    ? t('cycleAnalytics_mucusSub_fertileDays')
    : mucus?.series.length
      ? t('cycleAnalytics_mucusSub_tracking')
      : t('cycleAnalytics_mucusSub_log')
  const intercourseLabel = intercourse && intercourse.thisCycleCount > 0
    ? `${intercourse.inFertileWindow}/${intercourse.thisCycleCount}`
    : '—'
  const intercourseSub = intercourse && intercourse.thisCycleCount > 0
    ? t('cycleAnalytics_intercourseSub_inWindow')
    : t('cycleAnalytics_intercourseSub_log')

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        <AnalyticsHeader hide />

        {/* ── Hero: kicker · phase word + glyph · warm day line ───────── */}
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Text style={[styles.heroKicker, diffuse ? { color: muted, fontFamily: diffuseFont.mono, letterSpacing: 2 } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
              {t('cycleAnalytics_yourCycleToday')}
            </Text>
            <View pointerEvents="none" style={styles.heroGlyph}>
              {diffuse ? (
                <PhaseGlyph phase={info.phase} color={accent} />
              ) : (
                <PhaseSticker phase={info.phase} stickers={stickers} />
              )}
            </View>
          </View>
          <Text
            style={[styles.heroWord, { color: ink, fontFamily: diffuse ? diffuseFont.display : font.display }]}
            numberOfLines={1}
          >
            {voice.word}
          </Text>
          <Text style={[styles.heroLine, diffuse ? { color: dt.colors.ink2, fontFamily: diffuseFont.italic } : { color: colors.textSecondary, fontFamily: font.italic }]}>
            {t('cycleAnalytics_day_voiceline', { day: info.cycleDay, line: voice.line })}
          </Text>
        </View>

        {/* ── Flowing fertility curve (the "audience flow" hero) ──────── */}
        {/* Cycle-length trend — the analytical read home doesn't show: are my
            cycles stable, lengthening, or erratic? Tap → cycle-length detail. */}
        <Pressable
          onPress={() => setDetailType('cycleLength')}
          accessibilityRole="button"
          accessibilityLabel={t('cycleAnalytics_viewLengthDetail')}
        >
          <View style={[styles.flowCard, diffuse ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, shadowOpacity: 0, elevation: 0 } : { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}>
            <View style={styles.flowHead}>
              <Text style={[styles.cardKicker, diffuse ? { color: muted, fontFamily: diffuseFont.mono, letterSpacing: 2 } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
                {t('cycleAnalytics_lengthTrendTitle')}
              </Text>
              <Text style={[styles.flowFertile, diffuse ? { color: ink, fontFamily: diffuseFont.monoBold, letterSpacing: 0.4, textTransform: 'uppercase', fontSize: 12 } : { color: accent, fontFamily: font.bodySemiBold }]}>
                {history?.avg != null ? t('cycleAnalytics_avgDaysShort', { n: history.avg }) : t('cycleAnalytics_noWindowYet')}
              </Text>
            </View>
            <CycleLengthTrend
              cycles={history?.cycles ?? []}
              avg={history?.avg ?? null}
              color={accent}
            />
          </View>
        </Pressable>

        {/* ── Uniform stat grid — one tappable tile per signal, no random
            tilts so the whole board reads as one system. Intercourse only
            shows for trying-to-conceive users (otherwise noise). ────────── */}
        <View style={styles.grid}>
          <GridTile
            tint={stickers.pinkSoft}
            sticker={<Star size={22} fill={stickers.pink} stroke={colors.text} />}
            diffuseIcon={<Character name="sparkle" size={26} color={stickerPalette.pink} />}
            value={avgLabel === '—' ? '—' : `${avgLabel}${t('cycle_ring_unit_d')}`}
            sub={t('cycleAnalytics_lengthSub')}
            onPress={() => setDetailType('cycleLength')}
          />
          <GridTile
            tint={stickers.lilacSoft}
            sticker={<Moon size={24} fill={stickers.lilac} />}
            diffuseIcon={<Character name="period" size={26} color={stickerPalette.lilac} />}
            value={regularLabel}
            sub={regularSub}
            onPress={() => setDetailType('regularity')}
          />
          <GridTile
            tint={stickers.yellowSoft}
            sticker={<Flower size={24} petal={stickers.pink} center={stickers.yellow} />}
            diffuseIcon={<Character name="ovulation" size={26} color={stickerPalette.pink} />}
            value={fertileLabel}
            sub={fertileSub}
            onPress={() => setDetailType('fertile')}
          />
          <GridTile
            tint={stickers.blueSoft}
            sticker={<Drop size={24} fill={stickers.blue} />}
            diffuseIcon={<Character name="temperature" size={26} color={stickerPalette.blue} />}
            value={bbtLabel}
            sub={bbtSub}
            onPress={() => setDetailType('bbt')}
          />
          <GridTile
            tint={stickers.greenSoft}
            sticker={<Drop size={24} fill={stickers.green} />}
            diffuseIcon={<Character name="water" size={26} color={stickerPalette.green} />}
            value={mucusLabel}
            sub={mucusSub}
            onPress={() => setDetailType('mucus')}
          />
          <GridTile
            tint={stickers.pinkSoft}
            sticker={<Burst size={24} fill={stickers.coral} points={8} />}
            diffuseIcon={<Character name="activity" size={26} color={stickerPalette.coral} />}
            value={pmsLabel}
            sub={pmsSub}
            onPress={() => setDetailType('pms')}
          />
          <GridTile
            tint={stickers.greenSoft}
            sticker={<Heart size={22} fill={stickers.pink} />}
            diffuseIcon={<Character name="mood" size={26} color={stickerPalette.coral} />}
            value={moodLabel}
            sub={moodSub}
            onPress={() => setDetailType('mood')}
          />
          {isTTC && (
            <GridTile
              tint={stickers.pinkSoft}
              sticker={<Heart size={22} fill={stickers.coral} />}
              diffuseIcon={<Character name="heart" size={26} color={stickerPalette.pink} />}
              value={intercourseLabel}
              sub={intercourseSub}
              onPress={() => setDetailType('intercourse')}
            />
          )}
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

/** Cycle-length trend — the last N cycle lengths plotted as beads on a soft
 *  thread against the average baseline. Answers "is my cycle stable?" — the
 *  analytical read that home (predictive) never shows. Beads outside the
 *  ±2-day band pick up the coral "off-rhythm" hue; the current cycle is the
 *  last, hollow bead (still open). */
function CycleLengthTrend({
  cycles, avg, color,
}: {
  cycles: { startDate: string; lengthDays: number | null }[]
  avg: number | null
  color: string
}) {
  const { colors, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const ink = diffuse ? dt.colors.ink : colors.text
  const muted = diffuse ? dt.colors.ink3 : colors.textMuted
  const line = diffuse ? dt.colors.line : colors.borderLight
  const offHue = diffuse ? dt.colors.error : stickers.coral

  const closed = cycles.filter((c) => c.lengthDays != null).slice(-8) as { startDate: string; lengthDays: number }[]

  if (closed.length < 2 || avg == null) {
    return (
      <View style={styles.trendEmpty}>
        <Text style={[styles.trendEmptyText, { color: muted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {closed.length < 2 ? 'Log a few periods to see your rhythm.' : ''}
        </Text>
      </View>
    )
  }

  const W = Dimensions.get('window').width - 40 - 36 // screen − card margins − card padding
  const H = 150
  const padX = 14
  const padTop = 26
  const padBottom = 26
  const values = closed.map((c) => c.lengthDays)
  const lo = Math.min(...values, avg) - 2
  const hi = Math.max(...values, avg) + 2
  const span = Math.max(1, hi - lo)
  const x = (i: number) => padX + (i * (W - padX * 2)) / Math.max(1, closed.length - 1)
  const y = (v: number) => padTop + (1 - (v - lo) / span) * (H - padTop - padBottom)
  const avgY = y(avg)

  const pts = closed.map((c, i) => ({ x: x(i), y: y(c.lengthDays), v: c.lengthDays, i }))
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')

  return (
    <View>
      <Svg width={W} height={H}>
        {/* average baseline */}
        <SvgLine x1={padX} y1={avgY} x2={W - padX} y2={avgY} stroke={line} strokeWidth={1.5} strokeDasharray="3 4" />
        <SvgText x={W - padX} y={avgY - 6} fontSize={9} fontWeight="700" fill={muted} textAnchor="end" fontFamily={diffuse ? diffuseFont.mono : font.bodySemiBold}>
          {`AVG ${avg}`}
        </SvgText>
        {/* thread */}
        <SvgPath d={path} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
        {/* beads + length labels */}
        {pts.map((p) => {
          const off = Math.abs(p.v - avg) > 2
          const last = p.i === pts.length - 1
          const hue = off ? offHue : color
          return (
            <SvgCircle key={p.i} cx={p.x} cy={p.y} r={last ? 6 : 5} fill={last ? (diffuse ? dt.colors.surface : '#FFFEF8') : hue} stroke={hue} strokeWidth={last ? 2 : 0} />
          )
        })}
        {pts.map((p) => (
          <SvgText key={`l${p.i}`} x={p.x} y={p.y - 11} fontSize={10} fontWeight="700" fill={ink} textAnchor="middle" fontFamily={diffuse ? diffuseFont.monoBold : font.bodySemiBold}>
            {String(p.v)}
          </SvgText>
        ))}
      </Svg>
    </View>
  )
}

/** A uniform half-width stat tile: sticker + value + warm sub-line. No tilt —
 *  the grid reads as one calm system. Shares TiltChip's inner layout. */
function GridTile({
  tint, sticker, diffuseIcon, value, sub, onPress,
}: {
  tint: string
  sticker: React.ReactNode
  diffuseIcon?: React.ReactNode
  value: string
  sub: string
  onPress?: () => void
}) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gridTile,
        diffuse
          ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line, opacity: pressed ? 0.88 : 1 }
          : { backgroundColor: tint, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      {diffuse ? diffuseIcon : (
        <View style={[styles.gridTileChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {sticker}
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
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
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroKicker: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  heroGlyph: {
    marginLeft: 10,
  },
  heroWord: {
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  heroLine: {
    fontSize: 16,
    lineHeight: 22,
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
  trendEmpty: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendEmptyText: {
    fontSize: 13,
    textAlign: 'center',
  },

  // Uniform stat grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  gridTile: {
    width: '47%',
    flexGrow: 1,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 74,
    ...shadows.subtle,
  },
  gridTileChip: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Chips
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
