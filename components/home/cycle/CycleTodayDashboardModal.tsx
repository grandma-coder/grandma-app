/**
 * CycleTodayDashboardModal — full daily dashboard for the Cycle home.
 *
 * Read-only view of today's logged cycle signals with mini-charts and
 * a 7-day BBT trend. Mirrors the pregnancy TodayDashboardModal layout,
 * adapted to cycle_logs (mood, basal_temp, lh, cervical_mucus,
 * intercourse, symptom, period_start). Logging itself lives in the
 * chips / forms elsewhere — this view is summary only.
 */

import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import Svg, { Path as SvgPath, Circle as SvgCircle } from 'react-native-svg'
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { Character } from '../../characters/Characters'
import { toDateStr, type CyclePhase } from '../../../lib/cycleLogic'
import { LogSheet } from '../../calendar/LogSheet'
import { Display, MonoCaps, Body } from '../../ui/Typography'
import { PaperCard } from '../../ui/PaperCard'
import { Drop, Heart, Smiley, Sad, Sleepy } from '../../ui/Stickers'
import { Thermometer as ThermometerLine, Droplet as DropletLine, Heart as HeartLine } from 'lucide-react-native'
import { SymptomSticker } from '../../calendar/symptomStickers'
import { symptomLabel } from '../../../lib/cycleSymptoms'
import type { SymptomId } from '../../../lib/cycleSymptoms'
import { supabase } from '../../../lib/supabase'
import { useTranslation } from '../../../lib/i18n'

interface Props {
  visible: boolean
  onClose: () => void
  phase: CyclePhase
  userId: string
}

interface Point { date: string; value: number }
type Row = { type: string; value: string | null }

const MOOD_META: Record<string, { Sticker: typeof Sad; fill: string }> = {
  low:   { Sticker: Sad,    fill: '#EE7B6D' },
  down:  { Sticker: Sad,    fill: '#9DC3E8' },
  okay:  { Sticker: Sleepy, fill: '#C8B6E8' },
  good:  { Sticker: Smiley, fill: '#F5D652' },
  great: { Sticker: Smiley, fill: '#BDD48C' },
}

function phaseLabel(phase: CyclePhase): string {
  switch (phase) {
    case 'menstruation': return 'Menstruation'
    case 'follicular':   return 'Follicular'
    case 'ovulation':    return 'Ovulation'
    case 'luteal':       return 'Luteal'
  }
}

function phaseColor(phase: CyclePhase, s: ReturnType<typeof useTheme>['stickers']): string {
  switch (phase) {
    case 'menstruation': return s.coral
    case 'follicular':   return s.green
    case 'ovulation':    return s.peach
    case 'luteal':       return s.lilac
  }
}

async function fetchTodayRows(userId: string, date: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from('cycle_logs')
    .select('type, value')
    .eq('user_id', userId)
    .eq('date', date)
  if (error || !data) return []
  return data as Row[]
}

async function fetchBbtHistory(userId: string, days = 7): Promise<Point[]> {
  const since = new Date()
  since.setDate(since.getDate() - days + 1)
  const from = toDateStr(since)
  const { data } = await supabase
    .from('cycle_logs')
    .select('date, value')
    .eq('user_id', userId)
    .eq('type', 'basal_temp')
    .gte('date', from)
    .order('date', { ascending: true })
  if (!data) return []
  return data
    .map((r) => ({ date: r.date as string, value: parseFloat((r.value as string) ?? '0') }))
    .filter((r) => !isNaN(r.value) && r.value > 0)
}

function fillDays(history: Point[], days = 7): { values: number[]; labels: string[] } {
  const values: number[] = []
  const labels: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = toDateStr(d)
    const match = history.find((h) => h.date === dateStr)
    values.push(match ? match.value : 0)
    labels.push(d.toLocaleDateString('en-US', { weekday: 'narrow' }))
  }
  return { values, labels }
}

export function CycleTodayDashboardModal({ visible, onClose, phase, userId }: Props) {
  const { colors, font, stickers, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const [rows, setRows] = useState<Row[]>([])
  const [bbtHist, setBbtHist] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)

  const CM_LABEL: Record<string, string> = {
    dry: t('cycleDash_cm_dry'), sticky: t('cycleDash_cm_sticky'), creamy: t('cycleDash_cm_creamy'),
    watery: t('cycleDash_cm_watery'), eggwhite: t('cycleDash_cm_eggwhite'),
  }
  const LH_LABEL: Record<string, string> = {
    negative: t('cycleDash_lh_negative'), faint: t('cycleDash_lh_faint'),
    positive: t('cycleDash_lh_positive'), peak: t('cycleDash_lh_peak'),
  }
  const PERIOD_LABEL: Record<string, string> = {
    light: t('cycleDash_period_light'), medium: t('cycleDash_period_medium'), heavy: t('cycleDash_period_heavy'),
  }
  const MOOD_LABEL: Record<string, string> = {
    low: t('cycleDash_mood_low'), down: t('cycleDash_mood_down'), okay: t('cycleDash_mood_okay'),
    good: t('cycleDash_mood_good'), great: t('cycleDash_mood_great'),
  }

  const today = toDateStr(new Date())

  useEffect(() => {
    if (!visible) return
    setLoading(true)
    Promise.all([
      fetchTodayRows(userId, today),
      fetchBbtHistory(userId),
    ]).then(([r, b]) => {
      setRows(r)
      setBbtHist(b)
      setLoading(false)
    })
  }, [visible, userId, today])

  const moodValue = rows.find((r) => r.type === 'mood')?.value ?? null
  const bbtValue = rows.find((r) => r.type === 'basal_temp')?.value ?? null
  const lhValue = rows.find((r) => r.type === 'lh')?.value ?? null
  const cmValue = rows.find((r) => r.type === 'cervical_mucus')?.value ?? null
  const intimacy = rows.find((r) => r.type === 'intercourse')?.value ?? null
  const periodStart = rows.find((r) => r.type === 'period_start')?.value ?? null
  const symptoms = rows
    .filter((r) => r.type === 'symptom')
    .map((r) => r.value)
    .filter((v): v is string => !!v)

  const moodMeta = moodValue ? MOOD_META[moodValue] : null
  const accent = diffuse ? getDiffuseAccent('pre-pregnancy', dt.isDark) : phaseColor(phase, stickers)

  const ink = diffuse ? dt.colors.ink : colors.text
  const muted = diffuse ? dt.colors.ink3 : colors.textMuted
  // Under diffuse, tiles are plain paper (no color wash); tint=undefined.
  const tileTint = (c: string) => (diffuse ? undefined : c)

  return (
    <LogSheet
      visible={visible}
      title={t('cycleDash_today')}
      onClose={onClose}
      chip={phaseLabel(phase)}
      chipColor={accent}
    >
      <View style={{ gap: 14 }}>
        {/* Mood — full-width hero tile */}
        <PaperCard tint={tileTint(stickers.yellowSoft)} radius={20} padding={18} flat>
          <View style={styles.tileHeader}>
            <MonoCaps size={10} color={muted}>{t('cycleDash_mood')}</MonoCaps>
          </View>
          <View style={styles.moodRow}>
            {diffuse ? (
              <Character name="mood" size={48} color={moodMeta?.fill ?? stickers.yellow} />
            ) : moodMeta ? (
              <moodMeta.Sticker size={48} fill={moodMeta.fill} />
            ) : (
              <Smiley size={48} fill={stickers.yellow} />
            )}
            <View style={{ flex: 1 }}>
              <Display size={28} color={ink}>
                {moodValue ? (MOOD_LABEL[moodValue] ?? moodValue) : t('cycleDash_notLoggedYet')}
              </Display>
              <Body size={12} color={muted} style={{ marginTop: 2, fontFamily: diffuse ? diffuseFont.italic : font.italic }}>
                {moodMeta ? t('cycleDash_howYouFelt') : t('cycleDash_tapChipToLog')}
              </Body>
            </View>
          </View>
        </PaperCard>

        {/* Fertility signals — 3-col grid: BBT / LH / CM */}
        <View style={styles.twoCol}>
          <PaperCard tint={tileTint(stickers.blueSoft)} radius={20} padding={16} flat style={styles.colTile}>
            <View style={styles.tileHeader}>
              {diffuse ? <Character name="temperature" size={18} color={stickers.blue} /> : <Drop size={16} fill={stickers.blue} />}
              <MonoCaps size={10} color={muted}>{t('cycleDash_bbt')}</MonoCaps>
            </View>
            <Display size={24} color={ink} style={{ marginTop: 4 }}>
              {bbtValue ? `${bbtValue}°` : '—'}
            </Display>
            <Body size={11} color={muted} style={{ marginTop: 2, fontFamily: diffuse ? diffuseFont.italic : font.italic }}>
              {bbtValue ? t('cycleDash_basalTemp') : t('cycleDash_notLogged')}
            </Body>
          </PaperCard>

          <PaperCard tint={tileTint(stickers.yellowSoft)} radius={20} padding={16} flat style={styles.colTile}>
            <View style={styles.tileHeader}>
              {diffuse ? <Character name="water" size={18} color={stickers.yellow} /> : <Drop size={16} fill={stickers.yellow} />}
              <MonoCaps size={10} color={muted}>{t('cycleDash_lh')}</MonoCaps>
            </View>
            <Display size={24} color={ink} style={{ marginTop: 4 }}>
              {lhValue ? (LH_LABEL[lhValue] ?? lhValue) : '—'}
            </Display>
            <Body size={11} color={muted} style={{ marginTop: 2, fontFamily: diffuse ? diffuseFont.italic : font.italic }}>
              {lhValue ? t('cycleDash_ovulationTest') : t('cycleDash_notLogged')}
            </Body>
          </PaperCard>

          <PaperCard tint={tileTint(stickers.greenSoft)} radius={20} padding={16} flat style={styles.colTile}>
            <View style={styles.tileHeader}>
              {diffuse ? <Character name="water" size={18} color={stickers.green} /> : <Drop size={16} fill={stickers.green} />}
              <MonoCaps size={10} color={muted}>{t('cycleDash_cm')}</MonoCaps>
            </View>
            <Display size={24} color={ink} style={{ marginTop: 4 }}>
              {cmValue ? (CM_LABEL[cmValue] ?? cmValue) : '—'}
            </Display>
            <Body size={11} color={muted} style={{ marginTop: 2, fontFamily: diffuse ? diffuseFont.italic : font.italic }}>
              {cmValue ? t('cycleDash_cervicalMucus') : t('cycleDash_notLogged')}
            </Body>
          </PaperCard>
        </View>

        {/* 2-col grid: Intimacy + Period */}
        <View style={styles.twoCol}>
          <PaperCard tint={tileTint(stickers.pinkSoft)} radius={20} padding={16} flat style={styles.colTile}>
            <View style={styles.tileHeader}>
              {diffuse ? <Character name="heart" size={18} color={stickers.pink} /> : <Heart size={16} fill={intimacy ? stickers.pink : stickers.pinkSoft} />}
              <MonoCaps size={10} color={muted}>{t('cycleDash_intimacy')}</MonoCaps>
            </View>
            <Display size={28} color={ink} style={{ marginTop: 4 }}>
              {intimacy ? '✓' : '—'}
            </Display>
            <Body size={11} color={muted} style={{ marginTop: 2, fontFamily: diffuse ? diffuseFont.italic : font.italic }}>
              {intimacy ? t('cycleDash_loggedToday') : t('cycleDash_notLogged')}
            </Body>
          </PaperCard>

          <PaperCard tint={tileTint(stickers.peachSoft)} radius={20} padding={16} flat style={styles.colTile}>
            <View style={styles.tileHeader}>
              {diffuse ? <Character name="period" size={18} color={stickers.coral} /> : <Drop size={16} fill={periodStart ? stickers.coral : stickers.pinkSoft} />}
              <MonoCaps size={10} color={muted}>{t('cycleDash_period')}</MonoCaps>
            </View>
            <Display size={28} color={ink} style={{ marginTop: 4 }}>
              {periodStart ? (PERIOD_LABEL[periodStart] ?? '✓') : '—'}
            </Display>
            <Body size={11} color={muted} style={{ marginTop: 2, fontFamily: diffuse ? diffuseFont.italic : font.italic }}>
              {periodStart ? t('cycleDash_flowToday') : t('cycleDash_notLogged')}
            </Body>
          </PaperCard>
        </View>

        {/* Symptoms — full-width chip list */}
        <PaperCard tint={tileTint(stickers.lilacSoft)} radius={20} padding={18} flat>
          <View style={styles.tileHeader}>
            <MonoCaps size={10} color={muted}>{t('cycleDash_symptoms')}</MonoCaps>
          </View>
          {symptoms.length > 0 ? (
            <View style={styles.symptomWrap}>
              {symptoms.map((id) => (
                <View
                  key={id}
                  style={[styles.symptomChip, diffuse ? { backgroundColor: 'transparent', borderColor: dt.colors.line2 } : { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <SymptomSticker id={id as SymptomId} size={16} />
                  <Text style={diffuse
                    ? { fontSize: 11, fontFamily: diffuseFont.mono, letterSpacing: 0.4, textTransform: 'uppercase', color: dt.colors.ink2 }
                    : { fontSize: 12, fontFamily: font.bodySemiBold, color: ink }}>
                    {symptomLabel(id as SymptomId)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Body size={12} color={muted} style={{ marginTop: 8, fontFamily: diffuse ? diffuseFont.italic : font.italic }}>
              {t('cycleDash_noSymptoms')}
            </Body>
          )}
        </PaperCard>

        {/* 7-day BBT sparkline */}
        <PaperCard tint={diffuse ? undefined : colors.surface} radius={20} padding={18} flat>
          <View style={styles.tileHeader}>
            {diffuse ? <Character name="temperature" size={18} color={stickers.blue} /> : <Drop size={16} fill={stickers.blue} />}
            <MonoCaps size={10} color={muted}>{t('cycleDash_bbtLast7')}</MonoCaps>
          </View>
          {loading ? (
            <View style={{ height: 100, justifyContent: 'center' }}>
              <ActivityIndicator color={muted} />
            </View>
          ) : bbtHist.length >= 2 ? (
            <Sparkline points={fillDays(bbtHist).values} color={accent} ink={ink} />
          ) : (
            <Body size={12} color={muted} style={{ marginTop: 8, fontFamily: diffuse ? diffuseFont.italic : font.italic }}>
              {t('cycleDash_bbtNeedMore')}
            </Body>
          )}
        </PaperCard>
      </View>
    </LogSheet>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Sparkline({ points, color, ink }: { points: number[]; color: string; ink: string }) {
  const W = 280
  const H = 90
  const PAD = 6
  const positive = points.filter((p) => p > 0)
  const min = positive.length ? Math.min(...positive) : 0
  const max = Math.max(...points)
  const range = Math.max(0.2, max - min)
  const xs = points.map((_, i) => PAD + (i * (W - PAD * 2)) / (points.length - 1))
  const ys = points.map((v) => v === 0 ? H - PAD : H - PAD - ((v - min) / range) * (H - PAD * 2))
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ')

  return (
    <View style={{ marginTop: 10, alignItems: 'center' }}>
      <Svg width={W} height={H}>
        <SvgPath d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {xs.map((x, i) => points[i] > 0 ? (
          <SvgCircle key={i} cx={x} cy={ys[i]} r={3} fill={color} stroke={ink} strokeWidth={1} />
        ) : null)}
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  twoCol: { flexDirection: 'row', gap: 10 },
  colTile: { flex: 1 },
  symptomWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  symptomChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1,
  },
})
