/**
 * FertileWindowModal — bottom sheet for the FertileWindowCard.
 *
 * Sections:
 *   1. Peak in <N> days countdown
 *   2. 7-day forecast with color legend
 *   3. Log a signal today — 3 quick-log buttons (BBT / LH / CM)
 *   4. Confidence placeholder (Slice 3 wires the math)
 *   5. Past windows (last 3 cycles)
 *
 * The modal uses the LogSheet shell for consistency.
 */

import { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { getCycleInfo, dailyFertilityCurve, toDateStr, type CycleConfig, type CyclePhase } from '../../../lib/cycleLogic'
import { useCycleHistory } from '../../../lib/cycleAnalytics'
import { LogSheet } from '../../calendar/LogSheet'
import { PillButton } from '../../ui/PillButton'
import { BbtForm, LhForm, CmForm } from '../../calendar/CycleLogForms'
import { useTranslation } from '../../../lib/i18n'
import { supabase } from '../../../lib/supabase'
import { computeFertileConfidence, detectBBTShift } from '../../../lib/cycleConfidence'

interface Props {
  visible: boolean
  onClose: () => void
  cycleConfig: CycleConfig
}

export function FertileWindowModal({ visible, onClose, cycleConfig }: Props) {
  const { colors, stickers, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const diffuseAccent = getDiffuseAccent('pre-pregnancy', dt.isDark)
  const { t } = useTranslation()
  const ink = isDark ? colors.text : '#141313'
  // Calm accent-tinted forecast-pill fill by % bucket under Diffuse.
  function pillBucket(pct: number): { bg: string; fg: string } {
    if (pct >= 60) return { bg: diffuseAccent + '2E', fg: dt.colors.ink }
    if (pct >= 30) return { bg: diffuseAccent + '1C', fg: dt.colors.ink }
    if (pct >= 15) return { bg: diffuseAccent + '10', fg: dt.colors.ink2 }
    return { bg: 'transparent', fg: dt.colors.ink3 }
  }
  const [openLog, setOpenLog] = useState<'bbt' | 'lh' | 'cm' | null>(null)
  const today = toDateStr(new Date())

  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id))
  }, [])

  const info = getCycleInfo(cycleConfig)
  const curve = useMemo(
    () => dailyFertilityCurve(cycleConfig.cycleLength, cycleConfig.lutealPhase),
    [cycleConfig.cycleLength, cycleConfig.lutealPhase],
  )
  const daysToPeak = Math.max(0, info.daysUntilOvulation)
  const ovDateLabel = info.ovulationDate
    ? new Date(info.ovulationDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : '—'

  const { data: history } = useCycleHistory()

  const start7d = toDateStr((() => { const d = new Date(); d.setDate(d.getDate() - 6); return d })())
  const start3d = toDateStr((() => { const d = new Date(); d.setDate(d.getDate() - 2); return d })())
  const start10d = toDateStr((() => { const d = new Date(); d.setDate(d.getDate() - 9); return d })())

  const { data: bbt7d = [] } = useQuery({
    queryKey: ['cycleLogs', 'conf-bbt7', userId, today],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('cycle_logs').select('value, date')
        .eq('user_id', userId).eq('type', 'basal_temp')
        .gte('date', start7d).lte('date', today)
      if (error) throw error
      return (data ?? []).map((r) => parseFloat(r.value ?? '')).filter((n) => Number.isFinite(n))
    },
    enabled: !!userId,
  })

  const { data: lh3d = [] } = useQuery({
    queryKey: ['cycleLogs', 'conf-lh3', userId, today],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('cycle_logs').select('value, date')
        .eq('user_id', userId).eq('type', 'lh')
        .gte('date', start3d).lte('date', today)
      if (error) throw error
      return data ?? []
    },
    enabled: !!userId,
  })

  const { data: bbt10d = [] } = useQuery({
    queryKey: ['cycleLogs', 'conf-bbt10', userId, today],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('cycle_logs').select('value, date')
        .eq('user_id', userId).eq('type', 'basal_temp')
        .gte('date', start10d).lte('date', today)
        .order('date', { ascending: true })
      if (error) throw error
      return (data ?? []).map((r) => parseFloat(r.value ?? '')).filter((n) => Number.isFinite(n))
    },
    enabled: !!userId,
  })

  const conf = computeFertileConfidence({
    cycleCount: history?.cycles.length ?? 0,
    bbtCount7d: bbt7d.length,
    lhCount3d: lh3d.length,
    shiftConfirmed: detectBBTShift(bbt10d),
  })

  const pastWindows = useMemo(() => {
    const cycles = history?.cycles ?? []
    return cycles
      .slice(-3)
      .reverse()
      .map((c, idx) => {
        const len = c.lengthDays ?? info.cycleLength
        return {
          label: `Cycle ${cycles.length - idx}`,
          range: `${formatShort(c.startDate)} – ${formatShort(addDaysISO(c.startDate, len - 1))}`,
        }
      })
  }, [history, info.cycleLength])

  const fc = useMemo(() => {
    const out: { pct: number; weekday: string }[] = []
    const todayD = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(todayD)
      d.setDate(d.getDate() + i)
      const wd = d.toLocaleDateString('en-US', { weekday: 'short' })
      const day = ((info.cycleDay - 1 + i) % info.cycleLength) + 1
      out.push({ pct: curve[day - 1] ?? 0, weekday: wd })
    }
    return out
  }, [curve, info.cycleDay, info.cycleLength])

  return (
    <LogSheet visible={visible} title="Fertile Window" onClose={onClose}>
      <ScrollView style={{ maxHeight: 600 }} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.label, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 2 } : { color: colors.textMuted, fontFamily: font.bodyBold }]}>{t('fertileModal_peak_in')}</Text>
          <View style={[styles.countdown, diffuse ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line } : { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.big, diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.displayLight } : { color: stickers.coral, fontFamily: font.displayBold }]}>
              {daysToPeak}<Text style={diffuse ? { fontSize: 12, color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase' } : { fontSize: 13, color: colors.textMuted, fontFamily: font.body }}>{t('fertileModal_days_suffix')}</Text>
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 0.4 } : { color: ink, fontFamily: font.bodyBold, fontSize: 13 }}>{ovDateLabel}</Text>
              <Text style={diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 2 } : { color: colors.textMuted, fontFamily: font.body, fontSize: 11 }}>{t('fertileModal_projected_ovulation')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 2 } : { color: colors.textMuted, fontFamily: font.bodyBold }]}>{t('fertileModal_7day_forecast')}</Text>
          <View style={[styles.forecast, diffuse ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line } : { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.pills}>
              {fc.map((f, i) => {
                const isToday = i === 0
                const b = diffuse ? pillBucket(f.pct) : null
                const bg = diffuse ? b!.bg : (f.pct >= 60 ? stickers.coral : f.pct >= 30 ? stickers.pink : f.pct >= 15 ? stickers.pinkSoft : colors.surfaceRaised)
                const fg = diffuse ? b!.fg : (f.pct >= 60 ? '#fff' : ink)
                const bc = diffuse ? (isToday ? dt.colors.hairline : dt.colors.line) : (isToday ? ink : colors.border)
                return (
                  <View
                    key={i}
                    style={[
                      styles.pill,
                      { backgroundColor: bg, borderColor: bc, borderWidth: isToday ? (diffuse ? 1.5 : 2) : 1 },
                    ]}
                  >
                    <Text style={{ color: fg, fontFamily: diffuse ? diffuseFont.monoBold : font.displayBold, fontSize: 13 }}>{f.pct}</Text>
                    <Text style={{ color: fg, fontFamily: diffuse ? diffuseFont.mono : font.body, fontSize: 8, marginTop: 2, opacity: diffuse ? 1 : 0.85, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {f.weekday.slice(0, 3)}
                    </Text>
                  </View>
                )
              })}
            </View>
            <View style={[styles.legend, { borderTopColor: diffuse ? dt.colors.line2 : colors.border }]}>
              <LegendItem color={diffuse ? 'transparent' : colors.surfaceRaised} label="Low" />
              <LegendItem color={diffuse ? diffuseAccent + '18' : stickers.pinkSoft} label="Mid" />
              <LegendItem color={diffuse ? diffuseAccent + '2E' : stickers.pink} label="High" />
              <LegendItem color={diffuse ? diffuseAccent + '55' : stickers.coral} label="Peak" />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 2 } : { color: colors.textMuted, fontFamily: font.bodyBold }]}>{t('fertileModal_log_signal_today')}</Text>
          <View style={styles.qlog}>
            <PillButton label="BBT" variant="paper" onPress={() => setOpenLog('bbt')} style={{ flex: 1 }} />
            <PillButton label="LH"  variant="paper" onPress={() => setOpenLog('lh')}  style={{ flex: 1 }} />
            <PillButton label="CM"  variant="paper" onPress={() => setOpenLog('cm')}  style={{ flex: 1 }} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 2 } : { color: colors.textMuted, fontFamily: font.bodyBold }]}>{t('fertileModal_confidence')}</Text>
          <View style={[styles.conf, diffuse ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line } : { backgroundColor: stickers.greenSoft, borderColor: colors.border }]}>
            <View style={[styles.confBadge, diffuse ? { borderColor: dt.colors.line2, backgroundColor: 'transparent', shadowOpacity: 0 } : { borderColor: ink, backgroundColor: colors.surface }]}>
              <Text style={diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.monoBold, fontSize: 13 } : { color: stickers.coral, fontFamily: font.displayBold, fontSize: 14 }}>{conf.pct}%</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.bodySemiBold, fontSize: 13 } : { color: ink, fontFamily: font.bodyBold, fontSize: 13 }}>
                {conf.pct >= 92 ? 'Calendar + BBT + LH' : conf.pct >= 80 ? 'Calendar + BBT' : 'Calendar-based estimate'}
              </Text>
              <Text style={diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.body, fontSize: 11, marginTop: 3, lineHeight: 16 } : { color: colors.textMuted, fontFamily: font.body, fontSize: 11, marginTop: 3 }}>
                {t(conf.explainerKey as any)}
              </Text>
            </View>
          </View>
        </View>

        {pastWindows.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.label, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 2 } : { color: colors.textMuted, fontFamily: font.bodyBold }]}>{t('cycleDetail_pastWindows')}</Text>
            <View style={[styles.history, diffuse ? { backgroundColor: dt.colors.surface, borderColor: dt.colors.line } : { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {pastWindows.map((w, i) => (
                <View
                  key={i}
                  style={[styles.histRow, { borderBottomColor: diffuse ? dt.colors.line : colors.border, borderBottomWidth: i === pastWindows.length - 1 ? 0 : (diffuse ? StyleSheet.hairlineWidth : 1) }]}
                >
                  <Text style={diffuse ? { color: dt.colors.ink, fontFamily: diffuseFont.body, fontSize: 13 } : { color: ink, fontFamily: font.bodyBold, fontSize: 13 }}>{w.label}</Text>
                  <Text style={diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 0.4 } : { color: colors.textMuted, fontFamily: font.body, fontSize: 11 }}>{w.range}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ marginTop: 8 }}>
          <PillButton label="Open full fertility log" variant={diffuse ? 'paper' : 'accent'} accentColor={diffuse ? undefined : stickers.pink} onPress={onClose} />
        </View>
      </ScrollView>

      <LogSheet visible={openLog === 'bbt'} title="BBT" onClose={() => setOpenLog(null)}>
        <BbtForm date={today} phase={info.phase as CyclePhase} onSaved={() => setOpenLog(null)} />
      </LogSheet>
      <LogSheet visible={openLog === 'lh'} title="LH" onClose={() => setOpenLog(null)}>
        <LhForm date={today} phase={info.phase as CyclePhase} onSaved={() => setOpenLog(null)} />
      </LogSheet>
      <LogSheet visible={openLog === 'cm'} title="CM" onClose={() => setOpenLog(null)}>
        <CmForm date={today} phase={info.phase as CyclePhase} onSaved={() => setOpenLog(null)} />
      </LogSheet>
    </LogSheet>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <View style={styles.legendItem}>
      <View style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: color, borderWidth: diffuse ? StyleSheet.hairlineWidth : 1, borderColor: diffuse ? dt.colors.line2 : '#141313' }} />
      <Text style={diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, fontSize: 9, letterSpacing: 1.1, textTransform: 'uppercase' } : { color: colors.textMuted, fontFamily: font.bodyBold, fontSize: 9, letterSpacing: 1.1, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  )
}

function formatShort(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

const styles = StyleSheet.create({
  body: { gap: 14, paddingBottom: 8 },
  section: { gap: 6 },
  label: { fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase' },
  countdown: {
    borderRadius: 18, borderWidth: 1, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  big: { fontSize: 38, lineHeight: 40 },
  forecast: { borderRadius: 18, borderWidth: 1, padding: 12 },
  pills: { flexDirection: 'row', gap: 4 },
  pill: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12 },
  legend: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 10, paddingTop: 8, borderTopWidth: 1,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qlog: { flexDirection: 'row', gap: 6 },
  conf: {
    borderRadius: 18, borderWidth: 1, padding: 12,
    flexDirection: 'row', gap: 12, alignItems: 'center',
  },
  confBadge: {
    width: 48, height: 48, borderRadius: 999, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#141313', shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 },
  },
  history: { borderRadius: 18, borderWidth: 1 },
  histRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11,
  },
})
