/**
 * FertilitySignalsCard — 4 signal tiles + 7-day BBT sparkline.
 *
 * Tiles: BBT 🌡️ · LH 🧪 · CM 💧 · Sex 💞
 * Tile states:
 *   - logged & on-track:  green-soft fill
 *   - peak / positive:    coral fill, white text
 *   - needs logging today: raised fill, dim icon, "+ log"
 *   - empty (first run):  all dim + first-run prompt overlay
 *
 * Tapping a tile opens the matching CycleLogForms sheet via LogSheet.
 */

import { useMemo, useState, useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { toDateStr } from '../../../lib/cycleLogic'
import { PaperCard } from '../../ui/PaperCard'
import { PillButton } from '../../ui/PillButton'
import { LogSheet } from '../../calendar/LogSheet'
import { BbtForm, LhForm, CmForm, IntercourseForm } from '../../calendar/CycleLogForms'

type Tile = 'bbt' | 'lh' | 'cm' | 'intercourse'
type RecentLog = { date: string; type: string; value: string | null }

const DAYS_BACK = 7

export function FertilitySignalsCard() {
  const { colors, stickers, font, radius, isDark } = useTheme()
  const qc = useQueryClient()
  const ink = isDark ? colors.text : '#141313'
  const [openSheet, setOpenSheet] = useState<Tile | null>(null)

  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id))
  }, [])

  const today = toDateStr(new Date())
  const startD = new Date()
  startD.setDate(startD.getDate() - (DAYS_BACK - 1))
  const startISO = toDateStr(startD)

  const { data: recent = [] } = useQuery({
    queryKey: ['cycleLogs', 'signals', userId, startISO, today],
    queryFn: async (): Promise<RecentLog[]> => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('cycle_logs')
        .select('date, type, value')
        .eq('user_id', userId)
        .in('type', ['basal_temp', 'lh', 'cervical_mucus', 'intercourse'])
        .gte('date', startISO)
        .lte('date', today)
        .order('date', { ascending: true })
      if (error) throw error
      return (data ?? []) as RecentLog[]
    },
    enabled: !!userId,
    staleTime: 0,
  })

  const todayByType = useMemo(() => {
    const map: Record<Tile, string | null> = { bbt: null, lh: null, cm: null, intercourse: null }
    for (const r of recent) {
      if (r.date !== today) continue
      if (r.type === 'basal_temp') map.bbt = r.value
      else if (r.type === 'lh') map.lh = r.value
      else if (r.type === 'cervical_mucus') map.cm = r.value
      else if (r.type === 'intercourse') map.intercourse = r.value
    }
    return map
  }, [recent, today])

  const bbtSeries = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const r of recent) {
      if (r.type !== 'basal_temp' || !r.value) continue
      const n = parseFloat(r.value)
      if (Number.isFinite(n)) byDate.set(r.date, n)
    }
    const out: { date: string; v: number | null }[] = []
    const d = new Date(startISO + 'T00:00:00')
    for (let i = 0; i < DAYS_BACK; i++) {
      const ds = toDateStr(d)
      out.push({ date: ds, v: byDate.get(ds) ?? null })
      d.setDate(d.getDate() + 1)
    }
    return out
  }, [recent, startISO])

  const filledCount = Object.values(todayByType).filter((v) => v != null).length
  const isEmpty = recent.length === 0 && filledCount === 0
  const isPeakToday = todayByType.lh === 'peak' || todayByType.cm === 'eggwhite'

  const headline = isEmpty
    ? 'Start tracking'
    : isPeakToday
    ? 'Peak today'
    : `${filledCount} of 4 logged`

  const tiles: { key: Tile; label: string; sticker: string; value: string | null }[] = [
    { key: 'bbt',         label: 'BBT', sticker: '🌡️', value: todayByType.bbt ? `${todayByType.bbt}°` : null },
    { key: 'lh',          label: 'LH',  sticker: '🧪', value: todayByType.lh },
    { key: 'cm',          label: 'CM',  sticker: '💧', value: todayByType.cm },
    { key: 'intercourse', label: 'Sex', sticker: '💞', value: todayByType.intercourse ? 'Logged' : null },
  ]

  function tileBg(t: typeof tiles[number]): string {
    if (t.key === 'lh' && t.value === 'peak') return stickers.coral
    if (t.key === 'cm' && t.value === 'eggwhite') return stickers.greenSoft
    if (t.value) return stickers.greenSoft
    return colors.surfaceRaised
  }

  function onSaved() {
    setOpenSheet(null)
    void qc.invalidateQueries({ queryKey: ['cycleLogs'] })
  }

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
      <PaperCard radius={radius.lg} padding={14}>
        <View style={styles.head}>
          <View>
            <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>
              FERTILITY SIGNALS
            </Text>
            <Text style={[styles.headline, { color: ink, fontFamily: font.display }]}>
              {headline}
            </Text>
          </View>
          <View style={[styles.sticker, { backgroundColor: stickers.pinkSoft, borderColor: ink }]}>
            <Text style={{ fontSize: 18 }}>{isPeakToday ? '✨' : '🌡️'}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          {tiles.map((t) => {
            const filled = t.value != null
            const peak = (t.key === 'lh' && t.value === 'peak') || (t.key === 'cm' && t.value === 'eggwhite')
            return (
              <Pressable
                key={t.key}
                onPress={() => setOpenSheet(t.key)}
                style={[
                  styles.tile,
                  {
                    backgroundColor: tileBg(t),
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 18, opacity: filled ? 1 : 0.55 }}>{t.sticker}</Text>
                <Text style={[styles.tileKey, { color: peak ? '#fff' : colors.textMuted, fontFamily: font.bodyBold }]}>
                  {t.label}
                </Text>
                <Text
                  style={[
                    styles.tileV,
                    {
                      color: peak ? '#fff' : filled ? ink : colors.textMuted,
                      fontFamily: filled ? font.display : font.body,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {filled ? (t.value as string) : '+ log'}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {!isEmpty && (
          <View style={[styles.spark, { borderTopColor: colors.border }]}>
            {bbtSeries.map((s, i) => {
              const vals = bbtSeries.map((b) => b.v).filter((v): v is number => v != null)
              const min = vals.length ? Math.min(...vals) : 36.0
              const max = vals.length ? Math.max(...vals) : 37.0
              const range = Math.max(0.3, max - min)
              const h = s.v == null ? 4 : 6 + ((s.v - min) / range) * 28
              const isToday = i === DAYS_BACK - 1
              return (
                <View
                  key={s.date}
                  style={{
                    flex: 1,
                    height: h,
                    backgroundColor: isToday ? stickers.coral : stickers.pink,
                    borderRadius: 3,
                    borderWidth: 1,
                    borderColor: ink,
                    ...(isToday ? { shadowColor: ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 1, height: 1 } } : null),
                  }}
                />
              )
            })}
          </View>
        )}

        {isEmpty && (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: ink, fontFamily: font.display }]}>
              Logging today takes 30s
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textMuted, fontFamily: font.body }]}>
              Morning temp + a quick check tells us when your fertile window actually peaks — better than calendar guesses.
            </Text>
            <PillButton
              label="Log first signal"
              variant="accent"
              accentColor={stickers.pink}
              onPress={() => setOpenSheet('bbt')}
            />
          </View>
        )}
      </PaperCard>

      <LogSheet visible={openSheet === 'bbt'} title="BBT" onClose={() => setOpenSheet(null)}>
        <BbtForm date={today} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={openSheet === 'lh'} title="LH test" onClose={() => setOpenSheet(null)}>
        <LhForm date={today} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={openSheet === 'cm'} title="Cervical fluid" onClose={() => setOpenSheet(null)}>
        <CmForm date={today} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={openSheet === 'intercourse'} title="Intimacy" onClose={() => setOpenSheet(null)}>
        <IntercourseForm date={today} onSaved={onSaved} />
      </LogSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  label: { fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase' },
  headline: { fontSize: 20, lineHeight: 24, marginTop: 2 },
  sticker: {
    width: 36, height: 36, borderRadius: 999, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  grid: { flexDirection: 'row', gap: 6 },
  tile: {
    flex: 1,
    borderWidth: 1, borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 2,
  },
  tileKey: { fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 },
  tileV: { fontSize: 13, lineHeight: 16 },
  spark: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 3,
    marginTop: 14, paddingTop: 12, height: 44,
    borderTopWidth: 1,
  },
  empty: { marginTop: 14, gap: 8, alignItems: 'center' },
  emptyTitle: { fontSize: 18 },
  emptyBody: { fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 8 },
})
