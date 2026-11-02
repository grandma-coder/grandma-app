/**
 * CycleDetailSheets — tap-through detail for each CycleAnalytics stat tile.
 *
 * One exported `CycleDetailSheet` driven by a `type` prop; each type has its
 * own internal body component that calls the matching cycleAnalytics hook.
 */

import React, { createContext, useContext } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, Dimensions, Modal, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Rect, Line as SvgLine, Text as SvgText } from 'react-native-svg'
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { DetailSheetHeader } from '../ui/DetailSheetHeader'
import { DiffuseSheet, DiffuseMetricTile, DiffuseEmptyState } from '../ui/diffuse/DiffusePrimitives'
import { Body, Display } from '../ui/Typography'
import { useCycleHistory, useRegularity, usePMSStats, useFertileWindow, useMoodStats, useBBTStats, useCervicalMucusStats, useIntercourseStats, type MoodId, type MucusType } from '../../lib/cycleAnalytics'
import type { CyclePhase } from '../../lib/cycleLogic'
import { useUnitsStore } from '../../store/useUnitsStore'
import { cToDisplay, tempLabel } from '../../lib/units'
import { Character } from '../characters/Characters'
import { SymptomBlob, CustomSymptomBlob } from '../calendar/symptomStickers'
import { symptomLabel, resolveSymptomId } from '../../lib/cycleSymptoms'
import { MiniLineChart, BeadedThread } from './shared/MiniCharts'
import { MoodBubbleCluster } from '../charts/SvgCharts'
import { useTranslation } from '../../lib/i18n'

const MONO = 'SpaceMono_400Regular'
const HAIR = StyleSheet.hairlineWidth * 2
const SCREEN_H = Dimensions.get('window').height

export type CycleDetailType =
  | 'cycleLength'
  | 'regularity'
  | 'pms'
  | 'fertile'
  | 'mood'
  | 'bbt'
  | 'mucus'
  | 'intercourse'

interface Props {
  type: CycleDetailType | null
  accent?: string
  onClose: () => void
}

// ─── Live cycle-phase accent context ───────────────────────────────────────
// Presentational only — lets each detail body pick up the accent passed to
// CycleDetailSheet without prop-drilling through every body component.
const AccentContext = createContext<string | null>(null)

function usePhaseAccent(): string {
  const ctx = useContext(AccentContext)
  const dt = useDiffuseTheme()
  return ctx ?? getDiffuseAccent('pre-pregnancy', dt.isDark)
}

// ─── Sheet-close context ───────────────────────────────────────────────────
// Lets a detail body's empty state offer an honest "Got it" CTA that closes
// the sheet, without prop-drilling `onClose` through every body component.
// There's no lightweight route to open a log form from inside the sheet
// (that needs LogSheet+CycleLogForms machinery — sheet-on-sheet, out of
// scope), so the CTA simply dismisses back to the analytics grid.
const SheetCloseContext = createContext<(() => void) | null>(null)

function useSheetClose(): () => void {
  const ctx = useContext(SheetCloseContext)
  return ctx ?? (() => {})
}

export function CycleDetailSheet({ type, accent, onClose }: Props) {
  const { t } = useTranslation()
  const { stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const visible = type !== null

  const TITLES: Record<CycleDetailType, string> = {
    cycleLength: t('cycleDetail_titleCycleLength'),
    regularity: t('cycleDetail_titleRegularity'),
    pms: t('cycleDetail_titlePMS'),
    fertile: t('cycleDetail_titleFertile'),
    mood: t('cycleDetail_titleMood'),
    bbt: t('cycleDetail_titleBBT'),
    mucus: t('cycleDetail_titleMucus'),
    intercourse: t('cycleDetail_titleIntercourse'),
  }

  const CHIPS: Record<CycleDetailType, string> = {
    cycleLength: t('cycleDetail_chip_rhythm'),
    regularity: t('cycleDetail_chip_steadiness'),
    pms: t('cycleDetail_chip_symptoms'),
    fertile: t('cycleDetail_chip_window'),
    mood: t('cycleDetail_chip_feeling'),
    bbt: t('cycleDetail_chip_thermal'),
    mucus: t('cycleDetail_chip_signs'),
    intercourse: t('cycleDetail_chip_timing'),
  }

  const title = type ? TITLES[type] : ''

  const bodySwitch = (
    <>
      {type === 'cycleLength' && <CycleLengthDetail />}
      {type === 'regularity' && <RegularityDetail />}
      {type === 'pms' && <PMSDetail />}
      {type === 'fertile' && <FertileDetail />}
      {type === 'mood' && <MoodDetail />}
      {type === 'bbt' && <BBTDetail />}
      {type === 'mucus' && <MucusDetail />}
      {type === 'intercourse' && <IntercourseDetail />}
    </>
  )

  if (diffuse) {
    return (
      <DiffuseSheet visible={visible} title={title} chip={type ? CHIPS[type] : undefined} onClose={onClose}>
        <AccentContext.Provider value={accent ?? null}>
          <SheetCloseContext.Provider value={onClose}>
            {bodySwitch}
          </SheetCloseContext.Provider>
        </AccentContext.Provider>
      </DiffuseSheet>
    )
  }

  return (
    <LightSheet
      visible={visible}
      onClose={onClose}
      title={title}
      sticker={type ? SHEET_STICKER[type] : 'cal'}
      tone={type ? stickers[SHEET_TONE[type]] : stickers.pinkSoft}
    >
      <SheetCloseContext.Provider value={onClose}>
        {bodySwitch}
      </SheetCloseContext.Provider>
    </LightSheet>
  )
}

const SHEET_STICKER: Record<CycleDetailType, SiteStickerName> = {
  cycleLength: 'cal', regularity: 'moon', pms: 'bubble', fertile: 'flower',
  mood: 'face3', bbt: 'thermo', mucus: 'drop', intercourse: 'heart',
}
const SHEET_TONE: Record<CycleDetailType, 'pinkSoft' | 'lilacSoft' | 'peachSoft' | 'yellowSoft' | 'greenSoft' | 'blueSoft'> = {
  cycleLength: 'pinkSoft', regularity: 'lilacSoft', pms: 'peachSoft', fertile: 'yellowSoft',
  mood: 'greenSoft', bbt: 'blueSoft', mucus: 'greenSoft', intercourse: 'pinkSoft',
}

/** Light bottom sheet: bg paper, 2.5px ink top border, 26px top radius, grabber at 25% ink. */
function LightSheet({ visible, onClose, title, sticker, tone, children }: {
  visible: boolean
  onClose: () => void
  title: string
  sticker: SiteStickerName
  tone: string
  children: React.ReactNode
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={{
            maxHeight: SCREEN_H * 0.88,
            backgroundColor: colors.bg,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderTopWidth: 2.5,
            borderColor: colors.text,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 8 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.text, opacity: 0.25 }} />
          </View>
          <View style={{ paddingHorizontal: 20 }}>
            <DetailSheetHeader title={title} sticker={sticker} tone={tone} onClose={onClose} />
          </View>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 28 }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ─── Placeholder bodies (filled in by later tasks) ────────────────────────

function CycleLengthDetail() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const phaseAccent = usePhaseAccent()
  const { t } = useTranslation()
  const closeSheet = useSheetClose()
  const { data, isLoading, error } = useCycleHistory()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || data.avg === null || data.cycles.length === 0) {
    const copy = 'Log your first period to start tracking cycle length.'
    return diffuse ? (
      <DiffuseEmptyState
        icon={<Character name="sparkle" size={40} color={stickers.pink} />}
        title={t('cycleDetail_titleCycleLength')}
        message={copy}
        ctaLabel={t('cycleDetail_emptyCta_gotIt')}
        onCta={closeSheet}
      />
    ) : (
      <EmptyState copy={copy} />
    )
  }

  const last12 = data.cycles
    .filter((c) => c.lengthDays !== null)
    .slice(-12)
  const values = last12.map((c) => c.lengthDays as number)
  const labels = last12.map((_, i) => `C${i + 1}`)

  const recentCycles = [...data.cycles].reverse().slice(0, 6)

  return (
    <View style={{ gap: 18 }}>
      <HeroRow size={40} value={<>{data.avg}</>} unit={t('cycleAnalytics_daysAvg')} note={`Average of your ${data.cycles.filter((c) => c.lengthDays !== null).length} closed cycles (period start to next period start).`} />

      <View style={detailStyles.minMaxRow}>
        <StatChip label={t('cycleDetail_statMin')} value={`${data.min}d`} tint={stickers.blueSoft} />
        <StatChip label={t('cycleDetail_statMax')} value={`${data.max}d`} tint={stickers.pinkSoft} />
        <StatChip label={t('cycleDetail_statCycles')} value={String(values.length)} tint={stickers.yellowSoft} />
      </View>

      <View>
        <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: MONO, letterSpacing: 1.4 }]}>
          {t('cycleDetail_lastNCycles', { n: values.length })}
        </Text>
        {diffuse ? (
          <CycleLengthBars values={values} avg={data.avg} color={phaseAccent} />
        ) : (
          <LightCycleBars values={values} avg={data.avg} fill={stickers.pinkSoft} />
        )}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: MONO, letterSpacing: 1.4 }]}>
          {t('cycleDetail_history')}
        </Text>
        {recentCycles.map((c) => (
          <View
            key={c.startDate}
            style={[detailStyles.historyRow, { borderColor: diffuse ? dt.colors.line : colors.border }]}
          >
            <Body size={13} color={diffuse ? dt.colors.ink : colors.text}>
              {formatRange(c.startDate, c.endDate)}
            </Body>
            <Body size={13} color={diffuse ? dt.colors.ink3 : colors.textSecondary}>
              {c.lengthDays ? `${c.lengthDays}d` : '—'}
            </Body>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Cycle length bars (Diffuse-only, honest chart) ───────────────────────
// GlowAreaLine drew a dramatic smoothed peak/valley curve for what is
// actually a tight cycle-length range (e.g. 27–30 days) — visually
// exaggerating variation, showing no per-cycle values, no axis, and just
// repeating the surface hero chart. This renders one bar per recent cycle
// with the Y-axis zoomed to the actual data range (not 0-based), so a
// steady cycle reads as steady while small deviations stay visible, plus a
// dashed average baseline and a day-value label on every bar.
function CycleLengthBars({ values, avg, color }: { values: number[]; avg: number; color: string }) {
  const dt = useDiffuseTheme()

  if (values.length === 0) return null

  const W = Dimensions.get('window').width - 40 - 36 // screen − sheet margins − sheet padding (matches CycleLengthTrend)
  const H = 150
  const padX = 14
  const padTop = 22
  const padBottom = 24

  const floor = Math.min(...values, avg) - 2
  const ceil = Math.max(...values, avg) + 2
  const span = Math.max(1, ceil - floor)

  const slot = (W - padX * 2) / values.length
  const barWidth = Math.min(28, slot * 0.6)
  const chartBottom = H - padBottom
  const chartTop = padTop
  const yFor = (v: number) => chartTop + (1 - (v - floor) / span) * (chartBottom - chartTop)
  const avgY = yFor(avg)

  return (
    <View>
      <Svg width={W} height={H}>
        {/* dashed average baseline */}
        <SvgLine x1={padX} y1={avgY} x2={W - padX} y2={avgY} stroke={dt.colors.line} strokeWidth={1.5} strokeDasharray="3 4" />
        <SvgText x={W - padX} y={avgY - 6} fontSize={9} fontWeight="700" fill={dt.colors.ink3} textAnchor="end" fontFamily={diffuseFont.mono}>
          {`AVG ${avg}`}
        </SvgText>

        {/* one bar per cycle, zoomed to [floor, ceil] */}
        {values.map((v, i) => {
          const last = i === values.length - 1
          const cx = padX + slot * i + slot / 2
          const barY = yFor(v)
          const barH = Math.max(2, chartBottom - barY)
          return (
            <React.Fragment key={i}>
              <Rect
                x={cx - barWidth / 2}
                y={barY}
                width={barWidth}
                height={barH}
                rx={8}
                fill={color}
                opacity={last ? 1 : 0.55}
              />
              <SvgText
                x={cx}
                y={barY - 8}
                fontSize={10}
                fontWeight="700"
                fill={last ? dt.colors.ink : dt.colors.ink2}
                textAnchor="middle"
                fontFamily={diffuseFont.monoBold}
              >
                {String(v)}
              </SvgText>
            </React.Fragment>
          )
        })}
      </Svg>
    </View>
  )
}

// ─── Cycle length bars (light) ─────────────────────────────────────────────
// Ink-outlined soft bars, one per closed cycle, real day count printed on each.
// Outliers (a skipped period = 80+ days) are capped visually at 1.5x the average
// so the rest stay readable; the label still shows the true number.
function LightCycleBars({ values, avg, fill }: { values: number[]; avg: number; fill: string }) {
  const { colors, font } = useTheme()
  if (values.length === 0) return null
  const cap = Math.max(1, Math.round(avg * 1.5))
  const H = 120
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: H + 20, gap: 6 }}>
        {values.map((v, i) => {
          const capped = v > cap
          const h = Math.max(6, (Math.min(v, cap) / cap) * H)
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text style={{ color: colors.text, fontFamily: font.bodyBold, fontSize: 11, height: 16 }}>{capped ? `${v}↑` : v}</Text>
              <View style={{ width: '100%', maxWidth: 28, height: h, backgroundColor: fill, borderWidth: 1.5, borderColor: colors.text, borderRadius: 8 }} />
            </View>
          )
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
        {values.map((_, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', color: colors.textSecondary, fontFamily: font.body, fontSize: 10 }}>{`C${i + 1}`}</Text>
        ))}
      </View>
      <Text style={{ color: colors.textMuted, fontFamily: font.body, fontSize: 12, lineHeight: 17, marginTop: 8 }}>
        {`Days per cycle, oldest to newest. Your average is ${avg} days.${values.some((v) => v > cap) ? ' Bars stop at 1.5x your average; the number is the real length.' : ''}`}
      </Text>
    </View>
  )
}

// ─── Shared detail helpers ────────────────────────────────────────────────

/** Hero number + unit. Diffuse keeps the original Display markup; light uses
 *  displayBold ink with a quiet note saying what the number is an average of. */
function HeroRow({ size, value, unit, note }: { size: number; value: React.ReactNode; unit: string; note?: string }) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  if (diffuse) {
    return (
      <View style={detailStyles.heroRow}>
        <Display size={size} color={dt.colors.ink}>{value}</Display>
        <Text style={[detailStyles.heroUnit, { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }]}>{unit}</Text>
      </View>
    )
  }
  return (
    <View>
      <View style={detailStyles.heroRow}>
        <Text style={{ color: colors.text, fontFamily: font.displayBold, fontSize: size + 12, lineHeight: size + 18, letterSpacing: -1.5 }}>{value}</Text>
        <Text style={[detailStyles.heroUnit, { color: colors.textSecondary, fontFamily: font.body, flexShrink: 1 }]}>{unit}</Text>
      </View>
      {note ? <Text style={{ color: colors.textMuted, fontFamily: font.body, fontSize: 12, lineHeight: 17, marginTop: 2 }}>{note}</Text> : null}
    </View>
  )
}

function StatChip({ label, value, tint }: { label: string; value: string; tint: string }) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()

  if (diffuse) {
    return <DiffuseMetricTile value={value} label={label} style={{ flex: 1 }} />
  }

  // Light: no coloured box — mono eyebrow over a bold ink number.
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={[detailStyles.statLabel, { color: colors.textMuted, fontFamily: MONO, letterSpacing: 1.2 }]} numberOfLines={1}>{label}</Text>
      <Text style={[detailStyles.statValue, { color: colors.text, fontFamily: font.displayBold, fontSize: 22 }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  )
}

function formatRange(start: string, end: string | null): string {
  const s = formatShort(start)
  if (!end) return `${s} – now`
  return `${s} – ${formatShort(end)}`
}

function formatShort(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const detailStyles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  heroUnit: {
    fontSize: 14,
    paddingBottom: 6,
  },
  minMaxRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 2,
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})

function RegularityDetail() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const closeSheet = useSheetClose()
  const { data, isLoading, error } = useRegularity()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || data.percent === null) {
    const copy = 'We need at least 3 complete cycles to measure regularity.'
    return diffuse ? (
      <DiffuseEmptyState
        icon={<Character name="period" size={40} color={stickers.lilac} />}
        title={t('cycleDetail_titleRegularity')}
        message={copy}
        ctaLabel={t('cycleDetail_emptyCta_gotIt')}
        onCta={closeSheet}
      />
    ) : (
      <EmptyState copy={copy} />
    )
  }

  return (
    <View style={{ gap: 18 }}>
      <HeroRow size={56} value={<>{data.percent}%</>} unit={t('cycleDetail_regular')} note="Share of your closed cycles that landed within 2 days of your average length." />

      <View style={{ gap: 6 }}>
        <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: MONO, letterSpacing: 1.4 }]}>
          {t('cycleDetail_legend')}
        </Text>
        <View style={regStyles.legendRow}>
          <LegendDot color={stickers.green} text="≤ 2 days off avg" />
          <LegendDot color={stickers.yellow} text="≤ 4 days off avg" />
          <LegendDot color={stickers.coral} text="> 4 days off avg" />
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: MONO, letterSpacing: 1.4 }]}>
          {t('cycleDetail_perCycleDeviation')}
        </Text>
        {data.deviations.slice(-10).map((d) => {
          const dotColor =
            d.delta <= 2 ? stickers.green : d.delta <= 4 ? stickers.yellow : stickers.coral
          return (
            <View
              key={d.cycleIdx}
              style={[detailStyles.historyRow, { borderColor: diffuse ? dt.colors.line : colors.border }]}
            >
              <View style={regStyles.rowLeft}>
                <View style={[regStyles.dot, { backgroundColor: dotColor }, !diffuse && { borderWidth: 1.5, borderColor: colors.text }]} />
                <Body size={13} color={diffuse ? dt.colors.ink : colors.text}>{t('cycleDetail_cycleN', { n: d.cycleIdx })}</Body>
              </View>
              <Body size={13} color={diffuse ? dt.colors.ink3 : colors.textSecondary}>
                {`${d.lengthDays}d · ${d.delta === 0 ? t('cycleDetail_onAvg') : `±${d.delta}d`}`}
              </Body>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function LegendDot({ color, text }: { color: string; text: string }) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <View style={regStyles.legendItem}>
      <View style={[regStyles.dot, { backgroundColor: color }, !diffuse && { borderWidth: 1.5, borderColor: colors.text }]} />
      <Text style={{ fontSize: diffuse ? 10 : 12, color: diffuse ? dt.colors.ink3 : colors.textSecondary, fontFamily: diffuse ? diffuseFont.mono : font.body, letterSpacing: diffuse ? 0.6 : 0, textTransform: diffuse ? 'uppercase' : 'none' }}>{text}</Text>
    </View>
  )
}

const regStyles = StyleSheet.create({
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
})

/** Human phase label lookup — used by the PMS headline + "mostly {phase}" caption. */
function usePhaseWord(): (phase: CyclePhase) => string {
  const { t } = useTranslation()
  return (phase: CyclePhase) => {
    switch (phase) {
      case 'menstruation': return t('cycleDetail_phase_menstruation')
      case 'follicular': return t('cycleDetail_phase_follicular')
      case 'ovulation': return t('cycleDetail_phase_ovulation')
      case 'luteal': return t('cycleDetail_phase_luteal')
    }
  }
}

function PMSDetail() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const phaseAccent = usePhaseAccent()
  const { t } = useTranslation()
  const phaseWord = usePhaseWord()
  const closeSheet = useSheetClose()
  const { data, isLoading, error } = usePMSStats()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || (data.avgDays === null && data.topSymptoms.length === 0)) {
    const copy = 'Log symptoms on the Agenda tab to start tracking PMS trends.'
    return diffuse ? (
      <DiffuseEmptyState
        icon={<Character name="activity" size={40} color={stickers.coral} />}
        title={t('cycleDetail_titlePMS')}
        message={copy}
        ctaLabel={t('cycleDetail_emptyCta_gotIt')}
        onCta={closeSheet}
      />
    ) : (
      <EmptyState copy={copy} />
    )
  }

  const maxCount = data.topSymptoms[0]?.count ?? 1

  // Warm headline: only surfaced in Diffuse when there's a dominant phase to
  // report. Falls back to a gentle nudge when there isn't enough data yet
  // (e.g. < 2 cycles logged, or no taggable symptom occurrences).
  const headline = data.overallDominantPhase
    ? data.avgDaysBeforePeriod
      ? t('cycleDetail_pmsHeadline', {
          phase: phaseWord(data.overallDominantPhase),
          min: data.avgDaysBeforePeriod.min,
          max: data.avgDaysBeforePeriod.max,
        })
      : t('cycleDetail_pmsHeadlineNoWindow', { phase: phaseWord(data.overallDominantPhase) })
    : diffuse
      ? t('cycleDetail_pmsHeadlineEmpty')
      : null

  return (
    <View style={{ gap: 18 }}>
      {data.avgDays !== null && (
        <HeroRow size={40} value={<>{data.avgDays}</>} unit={t('cycleDetail_daysOfSymptomsPerCycle')} note="Average per closed cycle. The counts below are totals across every cycle you logged." />
      )}

      {headline && (
        <Text style={[pmsStyles.headline, diffuse ? { color: dt.colors.ink2, fontFamily: diffuseFont.italic } : { color: colors.textSecondary, fontFamily: font.body, fontStyle: 'normal' }]}>
          {headline}
        </Text>
      )}

      <View style={{ gap: 8 }}>
        <Text style={[detailStyles.sectionLabel, { marginBottom: 0 }, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: MONO, letterSpacing: 1.4 }]}>
          {t('cycleDetail_topSymptoms')}
        </Text>
        {!diffuse && (
          <>
            <Text style={{ color: colors.textMuted, fontFamily: font.body, fontSize: 12, lineHeight: 17 }}>
              Times each symptom was logged, in total. The strip shows which phase of the cycle it landed in.
            </Text>
            <View style={regStyles.legendRow}>
              {PHASE_ORDER.map((ph) => (
                <LegendDot key={ph} color={PHASE_HUE(stickers)[ph]} text={phaseWord(ph)} />
              ))}
            </View>
          </>
        )}
        {data.topSymptoms.length === 0 ? (
          <Body size={13} color={colors.textMuted}>{t('preg_analytics_no_symptoms')}</Body>
        ) : (
          data.topSymptoms.map((s) => {
            const pct = (s.count / maxCount) * 100
            // Resolve the stored value (id, canonical label, or seed label) to a
            // SymptomId. null → a genuine free-text 'Other' symptom.
            const resolvedId = resolveSymptomId(s.name)
            const label = resolvedId ? symptomLabel(resolvedId) : s.name
            const hasPhaseData = s.dominantPhase !== null
            return (
              <View key={s.name} style={pmsStyles.symptomRow}>
                <View style={pmsStyles.symptomLeft}>
                  {diffuse ? (
                    resolvedId ? (
                      <SymptomBlob id={resolvedId} size={40} />
                    ) : (
                      <CustomSymptomBlob size={40} />
                    )
                  ) : (
                    <SiteSticker name="bubble" size={32} cut />
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Body size={14} color={diffuse ? dt.colors.ink : colors.text}>{label}</Body>
                    {hasPhaseData && (
                      <Text style={[pmsStyles.mostlyCaption, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: MONO, letterSpacing: 1 }]}>
                        {t('cycleDetail_pmsMostly', { phase: phaseWord(s.dominantPhase as CyclePhase) })}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={pmsStyles.symptomRight}>
                  {hasPhaseData ? (
                    <PhaseStrip phaseCounts={s.phaseCounts} />
                  ) : (
                    <View style={[pmsStyles.bar, { width: `${pct}%`, backgroundColor: diffuse ? phaseAccent : stickers.peachSoft }, !diffuse && { borderWidth: 1.5, borderColor: colors.text }]} />
                  )}
                  <Body size={13} color={diffuse ? dt.colors.ink3 : colors.text}>{diffuse ? s.count : `${s.count}×`}</Body>
                </View>
              </View>
            )
          })
        )}
      </View>
    </View>
  )
}

// ─── Phase strip (Diffuse-only) ────────────────────────────────────────────
// A thin 4-segment bar showing WHEN a symptom clustered across the cycle —
// one segment per phase, width ∝ occurrence count, zero-count phases
// collapse entirely. The dominant segment reads at full opacity; the rest
// are dimmed so the eye lands on the phase that matters.
const PHASE_ORDER: CyclePhase[] = ['menstruation', 'follicular', 'ovulation', 'luteal']

const PHASE_HUE = (stickers: ReturnType<typeof useTheme>['stickers']): Record<CyclePhase, string> => ({
  menstruation: stickers.coral,
  follicular: stickers.green,
  ovulation: stickers.pink,
  luteal: stickers.lilac,
})

function PhaseStrip({ phaseCounts, height = 8 }: { phaseCounts: Record<CyclePhase, number>; height?: number }) {
  const { stickers, colors } = useTheme()
  const diffuse = useIsDiffuse()
  const hueForPhase = PHASE_HUE(stickers)
  const total = PHASE_ORDER.reduce((sum, p) => sum + phaseCounts[p], 0)
  if (total === 0) return null

  const maxCount = Math.max(...PHASE_ORDER.map((p) => phaseCounts[p]))

  return (
    <View style={[pmsStyles.phaseStrip, { height, borderRadius: height / 2 }, !diffuse && { height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: colors.text }]}>
      {PHASE_ORDER.map((phase) => {
        const count = phaseCounts[phase]
        if (count === 0) return null
        return (
          <View
            key={phase}
            style={{
              flex: count,
              minWidth: 4,
              height: '100%',
              backgroundColor: hueForPhase[phase],
              opacity: count === maxCount ? 1 : 0.5,
            }}
          />
        )
      })}
    </View>
  )
}

const pmsStyles = StyleSheet.create({
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
  },
  symptomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  symptomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 130,
  },
  chip: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    height: 8,
    borderRadius: 4,
    flex: 1,
    maxWidth: 80,
  },
  headline: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  mostlyCaption: {
    fontSize: 9,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  phaseStrip: {
    flexDirection: 'row',
    overflow: 'hidden',
    flex: 1,
    maxWidth: 80,
  },
})

function FertileDetail() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const closeSheet = useSheetClose()
  const { data, isLoading, error } = useFertileWindow()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || !data.current) {
    const copy = 'Log your last period to see your fertile window predictions.'
    return diffuse ? (
      <DiffuseEmptyState
        icon={<Character name="ovulation" size={40} color={stickers.pink} />}
        title={t('cycleDetail_titleFertile')}
        message={copy}
        ctaLabel={t('cycleDetail_emptyCta_gotIt')}
        onCta={closeSheet}
      />
    ) : (
      <EmptyState copy={copy} />
    )
  }

  const daysLeft = data.current.daysLeft
  const daysLeftText = daysLeft === 1
    ? t('cycleDetail_oneDayLeft')
    : t('cycleDetail_nDaysLeft', { n: daysLeft })

  return (
    <View style={{ gap: 18 }}>
      <View style={[fertStyles.currentCard, diffuse ? { backgroundColor: 'transparent', borderColor: dt.colors.line } : { backgroundColor: stickers.yellowSoft, borderColor: colors.text, borderWidth: 1.5, borderRadius: 18 }]}>
        {diffuse ? (
          <Character name="ovulation" size={40} color={stickers.pink} />
        ) : (
          <SiteSticker name="flower" size={52} cut />
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: MONO, letterSpacing: 1.4 }]}>
            {t('cycleDetail_thisCycle')}
          </Text>
          <Display size={22} color={diffuse ? dt.colors.ink : colors.text}>
            {`${formatShort(data.current.start)} – ${formatShort(data.current.end)}`}
          </Display>
          <Body size={13} color={diffuse ? dt.colors.ink3 : colors.textSecondary}>
            {daysLeft > 0 ? daysLeftText : t('cycleDetail_windowClosed')}
          </Body>
        </View>
      </View>

      {data.history.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: MONO, letterSpacing: 1.4 }]}>
            {t('cycleDetail_pastWindows')}
          </Text>
          {data.history.map((w) => (
            <View
              key={w.cycleIdx}
              style={[detailStyles.historyRow, { borderColor: diffuse ? dt.colors.line : colors.border }]}
            >
              <Body size={13} color={diffuse ? dt.colors.ink : colors.text}>{t('cycleDetail_cycleN', { n: w.cycleIdx })}</Body>
              <Body size={13} color={diffuse ? dt.colors.ink3 : colors.textSecondary}>
                {`${formatShort(w.start)} – ${formatShort(w.end)}`}
              </Body>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const fertStyles = StyleSheet.create({
  currentCard: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
  },
  currentChip: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

const MOOD_STICKER: Record<MoodId, SiteStickerName> = {
  great: 'face4', energetic: 'star', good: 'face3', okay: 'face2', low: 'face1',
}

const MOOD_LABELS: Record<MoodId, string> = {
  great: 'Great',
  energetic: 'Energetic',
  good: 'Good',
  okay: 'Okay',
  low: 'Low',
}

function MoodDetail() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const closeSheet = useSheetClose()
  const { data, isLoading, error } = useMoodStats()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || data.avgScore === null) {
    const copy = 'Log your mood on the Agenda tab to see mood trends.'
    return diffuse ? (
      <DiffuseEmptyState
        icon={<Character name="mood" size={40} color={stickers.coral} />}
        title={t('cycleDetail_titleMood')}
        message={copy}
        ctaLabel={t('cycleDetail_emptyCta_gotIt')}
        onCta={closeSheet}
      />
    ) : (
      <EmptyState copy={copy} />
    )
  }

  const maxCount = Math.max(1, ...data.distribution.map((d) => d.count))

  return (
    <View style={{ gap: 18 }}>
      <HeroRow size={40} value={<>{data.avgScore}</>} unit={t('cycleDetail_fiveAvg')} note="Average of the last 30 days of mood logs, where 5 is great. The counts below are totals, all time." />

      <View style={{ gap: 8 }}>
        <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: MONO, letterSpacing: 1.4 }]}>
          {t('cycleDetail_distribution')}
        </Text>
        {diffuse ? (
          // Standardized mood viz — the same blob-cluster (labeled circles + %)
          // used by Pregnancy + Kids mood sheets, via the shared MoodBubbleCluster.
          <MoodBubbleCluster items={data.distribution} />
        ) : (
          data.distribution.map((row) => {
            const pct = (row.count / maxCount) * 100
            return (
              <View key={row.mood} style={moodStyles.row}>
                <SiteSticker name={MOOD_STICKER[row.mood]} size={30} cut />
                <Body size={13} color={colors.text} style={{ width: 74 }}>
                  {MOOD_LABELS[row.mood]}
                </Body>
                <View style={[moodStyles.barTrack, { backgroundColor: colors.borderLight }]}>
                  {row.count > 0 && (
                    <View style={[moodStyles.barFill, { width: `${Math.max(pct, 6)}%`, backgroundColor: stickers.greenSoft, borderWidth: 1.5, borderColor: colors.text }]} />
                  )}
                </View>
                <Body size={13} color={colors.text} style={{ width: 34, textAlign: 'right' }}>
                  {row.count}×
                </Body>
              </View>
            )
          })
        )}
      </View>

      {data.recent.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: MONO, letterSpacing: 1.4 }]}>
            {t('cycleDetail_lastNEntries', { n: data.recent.length })}
          </Text>
          {data.recent.map((r, i) => (
            <View
              key={`${r.date}-${i}`}
              style={[detailStyles.historyRow, { borderColor: diffuse ? dt.colors.line : colors.border }]}
            >
              <Body size={13} color={diffuse ? dt.colors.ink : colors.text}>{formatShort(r.date)}</Body>
              <Body size={13} color={diffuse ? dt.colors.ink3 : colors.textSecondary}>{MOOD_LABELS[r.mood]}</Body>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const moodStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    borderRadius: 5,
  },
})

// ─── BBT (thermal shift) ───────────────────────────────────────────────────

function BBTDetail() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const phaseAccent = usePhaseAccent()
  const { t } = useTranslation()
  const closeSheet = useSheetClose()
  const { data, isLoading, error } = useBBTStats()
  // BBT stored canonical °C; convert for display (B4).
  const tempUnit = useUnitsStore((s) => s.tempUnit)
  const tempU = (c: number) => cToDisplay(c, tempUnit)
  const degLabel = tempLabel(tempUnit)

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || data.series.length < 2) {
    return diffuse ? (
      <DiffuseEmptyState
        icon={<Character name="temperature" size={40} color={stickers.blue} />}
        title={t('cycleDetail_titleBBT')}
        message={t('cycleDetail_bbtEmpty')}
        ctaLabel={t('cycleDetail_emptyCta_gotIt')}
        onCta={closeSheet}
      />
    ) : (
      <EmptyState copy={t('cycleDetail_bbtEmpty')} />
    )
  }

  const temps = data.series.map((s) => tempU(s.temp))
  const labels = data.series.map((s) => `${s.cycleDay}`)
  const latest = data.series[data.series.length - 1].temp

  return (
    <View style={{ gap: 18 }}>
      <HeroRow size={40} value={<>{tempU(latest).toFixed(1)}{degLabel}</>} unit={t('cycleDetail_bbtLatest')} />

      <View style={detailStyles.minMaxRow}>
        <StatChip
          label={t('cycleDetail_bbtShift')}
          value={data.shiftDay ? t('cycleAnalytics_dayNumber', { currentDay: data.shiftDay }) : '—'}
          tint={stickers.pinkSoft}
        />
        <StatChip label={t('cycleDetail_bbtCoverline')} value={data.coverline ? `${tempU(data.coverline).toFixed(1)}${degLabel}` : '—'} tint={stickers.blueSoft} />
        <StatChip label={t('cycleDetail_bbtReadings')} value={String(data.series.length)} tint={stickers.yellowSoft} />
      </View>

      <View>
        <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: MONO, letterSpacing: 1.4 }]}>
          {t('cycleDetail_bbtThisCycle')}
        </Text>
        {diffuse ? (
          <BeadedThread data={temps} color={phaseAccent} accent={phaseAccent} labels={labels} showValues />
        ) : (
          <MiniLineChart data={temps} labels={labels} color={stickers.pink} unit={degLabel} />
        )}
      </View>

      <Body size={12} color={diffuse ? dt.colors.ink3 : colors.textMuted}>
        {data.shiftDay ? t('cycleDetail_bbtShiftHint') : t('cycleDetail_bbtNoShiftHint')}
      </Body>
    </View>
  )
}

// ─── Cervical mucus ─────────────────────────────────────────────────────────

const MUCUS_LABELS: Record<MucusType, string> = {
  dry: 'Dry', sticky: 'Sticky', creamy: 'Creamy', watery: 'Watery', eggwhite: 'Egg-white',
}

function MucusDetail() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const phaseAccent = usePhaseAccent()
  const { t } = useTranslation()
  const closeSheet = useSheetClose()
  const { data, isLoading, error } = useCervicalMucusStats()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || data.series.length === 0) {
    return diffuse ? (
      <DiffuseEmptyState
        icon={<Character name="water" size={40} color={stickers.green} />}
        title={t('cycleDetail_titleMucus')}
        message={t('cycleDetail_mucusEmpty')}
        ctaLabel={t('cycleDetail_emptyCta_gotIt')}
        onCta={closeSheet}
      />
    ) : (
      <EmptyState copy={t('cycleDetail_mucusEmpty')} />
    )
  }

  const fertileHue = diffuse ? phaseAccent : stickers.pink

  return (
    <View style={{ gap: 18 }}>
      <View style={detailStyles.minMaxRow}>
        <StatChip label={t('cycleDetail_mucusFertileDays')} value={String(data.fertileDays)} tint={stickers.pinkSoft} />
        <StatChip label={t('cycleDetail_mucusPeak')} value={data.peakDay ? t('cycleAnalytics_dayNumber', { currentDay: data.peakDay }) : '—'} tint={stickers.greenSoft} />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: MONO, letterSpacing: 1.4 }]}>
          {t('cycleDetail_mucusThisCycle')}
        </Text>
        {data.series.map((s, i) => {
          const fertile = s.type === 'eggwhite' || s.type === 'watery'
          return (
            <View key={`${s.date}-${i}`} style={[detailStyles.historyRow, { borderColor: diffuse ? dt.colors.line : colors.border }]}>
              <View style={mucusStyles.left}>
                <View style={[mucusStyles.dot, { backgroundColor: fertile ? fertileHue : (diffuse ? dt.colors.line2 : stickers.blueSoft) }, !diffuse && { borderWidth: 1.5, borderColor: colors.text }]} />
                <Body size={13} color={diffuse ? dt.colors.ink : colors.text}>{t('cycleAnalytics_dayNumber', { currentDay: s.cycleDay })}</Body>
              </View>
              <Body size={13} color={diffuse ? (fertile ? fertileHue : dt.colors.ink3) : colors.text}>
                {MUCUS_LABELS[s.type]}
              </Body>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const mucusStyles = StyleSheet.create({
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
})

// ─── Intercourse (TTC timing) ───────────────────────────────────────────────

function IntercourseDetail() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const phaseAccent = usePhaseAccent()
  const { t } = useTranslation()
  const closeSheet = useSheetClose()
  const { data, isLoading, error } = useIntercourseStats()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || data.thisCycleCount === 0) {
    return diffuse ? (
      <DiffuseEmptyState
        icon={<Character name="heart" size={40} color={stickers.pink} />}
        title={t('cycleDetail_titleIntercourse')}
        message={t('cycleDetail_intercourseEmpty')}
        ctaLabel={t('cycleDetail_emptyCta_gotIt')}
        onCta={closeSheet}
      />
    ) : (
      <EmptyState copy={t('cycleDetail_intercourseEmpty')} />
    )
  }

  return (
    <View style={{ gap: 18 }}>
      <View style={detailStyles.minMaxRow}>
        <StatChip label={t('cycleDetail_intercourseThisCycle')} value={String(data.thisCycleCount)} tint={stickers.pinkSoft} />
        <StatChip label={t('cycleDetail_intercourseFertile')} value={String(data.inFertileWindow)} tint={stickers.greenSoft} />
      </View>

      <Body size={13} color={diffuse ? dt.colors.ink3 : colors.textSecondary}>
        {data.inFertileWindow > 0
          ? t('cycleDetail_intercourseInWindowHint', { n: data.inFertileWindow })
          : t('cycleDetail_intercourseNoWindowHint')}
      </Body>

      <View style={{ gap: 6 }}>
        <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: MONO, letterSpacing: 1.4 }]}>
          {t('cycleDetail_recent')}
        </Text>
        {data.recent.map((r, i) => (
          <View key={`${r.date}-${i}`} style={[detailStyles.historyRow, { borderColor: diffuse ? dt.colors.line : colors.border }]}>
            <View style={mucusStyles.left}>
              <View style={[mucusStyles.dot, { backgroundColor: r.inFertile ? (diffuse ? phaseAccent : stickers.pink) : (diffuse ? dt.colors.line2 : stickers.blueSoft) }, !diffuse && { borderWidth: 1.5, borderColor: colors.text }]} />
              <Body size={13} color={diffuse ? dt.colors.ink : colors.text}>{formatShort(r.date)}</Body>
            </View>
            <Body size={13} color={diffuse ? dt.colors.ink3 : colors.textSecondary}>
              {r.inFertile ? t('cycleDetail_intercourseFertileTag') : (r.protectedSex ? t('cycleDetail_intercourseProtected') : t('cycleDetail_intercourseUnprotected'))}
            </Body>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Shared UI helpers ────────────────────────────────────────────────────

function Loading() {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <View style={styles.center}>
      <ActivityIndicator color={diffuse ? dt.colors.ink3 : colors.primary} />
    </View>
  )
}

export function EmptyState({ copy }: { copy: string }) {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <View style={styles.center}>
      <Body size={14} color={diffuse ? dt.colors.ink3 : colors.textMuted} align="center">{copy}</Body>
    </View>
  )
}

export function ErrorState() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <View style={styles.center}>
      <Body size={14} color={diffuse ? dt.colors.ink3 : colors.textMuted} align="center">
        {t('common_couldntLoad')}
      </Body>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  body: {
    paddingBottom: 8,
    gap: 16,
  },
  center: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
