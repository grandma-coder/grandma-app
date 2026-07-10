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
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../../ui/diffuse/DiffusePrimitives'
import { supabase } from '../../../lib/supabase'
import { toDateStr, getCycleInfo, type CyclePhase, type CycleConfig } from '../../../lib/cycleLogic'
import { useCycleHistory } from '../../../lib/cycleAnalytics'
import { PaperCard } from '../../ui/PaperCard'
import { Drop, Heart, Pill, Sparkle } from '../../ui/Stickers'
import { Thermometer as ThermometerLine, Sparkles as SparklesLine, Droplet as DropletLine, Heart as HeartLine } from 'lucide-react-native'
import { PillButton } from '../../ui/PillButton'
import { LogSheet } from '../../calendar/LogSheet'
import { BbtForm, LhForm, CmForm, IntercourseForm } from '../../calendar/CycleLogForms'
import { useTranslation } from '../../../lib/i18n'

type Tile = 'bbt' | 'lh' | 'cm' | 'intercourse'
type RecentLog = { date: string; type: string; value: string | null }

const DAYS_BACK = 7

/** Diffuse: thin Lucide line glyph per signal tile (bbt/lh/cm/intercourse). */
function TileGlyph({ tile, color }: { tile: Tile; color: string }) {
  const p = { size: 17, color, strokeWidth: 1.6 as const }
  switch (tile) {
    case 'bbt':         return <ThermometerLine {...p} />
    case 'lh':          return <SparklesLine {...p} />
    case 'cm':          return <DropletLine {...p} />
    case 'intercourse': return <HeartLine {...p} />
  }
}

/** Bloom hue per signal tile — used behind the diffuse glyph. */
function tileHue(tile: Tile, stickers: ReturnType<typeof useTheme>['stickers']): string {
  switch (tile) {
    case 'bbt':         return stickers.blue
    case 'lh':          return stickers.peach
    case 'cm':          return stickers.lilac
    case 'intercourse': return stickers.pink
  }
}

export function FertilitySignalsCard() {
  const { colors, stickers, font, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const diffuseAccent = getDiffuseAccent('pre-pregnancy', dt.isDark)
  const { t } = useTranslation()
  const qc = useQueryClient()
  const ink = isDark ? colors.text : '#141313'
  const [openSheet, setOpenSheet] = useState<Tile | null>(null)

  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id))
  }, [])

  const today = toDateStr(new Date())
  const { data: history } = useCycleHistory()
  const cycleConfig: CycleConfig = (() => {
    const latest = history?.cycles[history.cycles.length - 1]
    const avgLen = history?.avg ?? 28
    if (latest) return { lastPeriodStart: latest.startDate, cycleLength: avgLen, periodLength: 5, lutealPhase: 14 }
    const d = new Date(); d.setDate(d.getDate() - 10)
    return { lastPeriodStart: toDateStr(d), cycleLength: 28, periodLength: 5, lutealPhase: 14 }
  })()
  const phase = getCycleInfo(cycleConfig, today).phase as CyclePhase
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
    ? t('cycleSignals_startTracking')
    : isPeakToday
    ? t('cycleSignals_peakToday')
    : t('cycleSignals_filledCount', { count: filledCount })

  const tiles: { key: Tile; label: string; value: string | null }[] = [
    { key: 'bbt',         label: 'BBT', value: todayByType.bbt ? `${todayByType.bbt}°` : null },
    { key: 'lh',          label: 'LH',  value: todayByType.lh },
    { key: 'cm',          label: 'CM',  value: todayByType.cm },
    { key: 'intercourse', label: 'Sex', value: todayByType.intercourse ? 'Logged' : null },
  ]

  function renderTileSticker(key: Tile, peak: boolean, faded: boolean) {
    const fill = peak ? '#fff' : faded ? stickers.lilacSoft : undefined
    const size = 20
    switch (key) {
      case 'bbt':         return <Pill size={size} fill={fill ?? stickers.coral} />
      case 'lh':          return <Sparkle size={size} fill={fill ?? stickers.yellow} />
      case 'cm':          return <Drop size={size} fill={fill ?? stickers.blue} />
      case 'intercourse': return <Heart size={size} fill={fill ?? stickers.pink} />
    }
  }

  function tileBg(tile: typeof tiles[number]): string {
    if (tile.key === 'lh' && tile.value === 'peak') return stickers.coral
    if (tile.key === 'cm' && tile.value === 'eggwhite') return stickers.greenSoft
    if (tile.value) return stickers.greenSoft
    return colors.surfaceRaised
  }

  function onSaved() {
    setOpenSheet(null)
    void qc.invalidateQueries({ queryKey: ['cycleLogs'] })
  }

  const logSheets = (
    <>
      <LogSheet visible={openSheet === 'bbt'} title="BBT" onClose={() => setOpenSheet(null)}>
        <BbtForm date={today} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={openSheet === 'lh'} title="LH test" onClose={() => setOpenSheet(null)}>
        <LhForm date={today} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={openSheet === 'cm'} title="Cervical fluid" onClose={() => setOpenSheet(null)}>
        <CmForm date={today} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={openSheet === 'intercourse'} title="Intimacy" onClose={() => setOpenSheet(null)}>
        <IntercourseForm date={today} phase={phase} onSaved={onSaved} />
      </LogSheet>
    </>
  )

  // ── Diffuse variant: hairline tiles + bloom glyphs, thin sparkline ─────────
  if (diffuse) {
    const dCol = dt.colors
    return (
      <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
        <PaperCard tint={undefined} radius={radius.lg} padding={16} style={{ borderColor: dCol.line }}>
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: dCol.ink3 }}>
                {t('cycleSignals_title')}
              </Text>
              <Text style={{ fontFamily: diffuseFont.displayMedium, fontSize: 22, letterSpacing: -0.4, color: dCol.ink, marginTop: 3 }}>
                {headline}
              </Text>
            </View>
          </View>

          <View style={styles.grid}>
            {tiles.map((tile) => {
              const filled = tile.value != null
              const peak = (tile.key === 'lh' && tile.value === 'peak') || (tile.key === 'cm' && tile.value === 'eggwhite')
              return (
                <Pressable
                  key={tile.key}
                  onPress={() => setOpenSheet(tile.key)}
                  style={({ pressed }) => [
                    styles.tile,
                    { backgroundColor: dCol.surface, borderColor: peak ? dCol.hairline : dCol.line, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <DiffuseBloomIcon color={peak ? diffuseAccent : tileHue(tile.key, stickers)} size={34} intensity={filled ? 0.5 : 0.32}>
                    <TileGlyph tile={tile.key} color={dCol.ink3} />
                  </DiffuseBloomIcon>
                  <Text style={{ fontFamily: diffuseFont.mono, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: dCol.ink3, marginTop: 4 }}>
                    {tile.label}
                  </Text>
                  <Text
                    style={{ fontFamily: filled ? diffuseFont.monoBold : diffuseFont.mono, fontSize: 12, letterSpacing: 0.3, color: filled ? dCol.ink : dCol.ink4, marginTop: 1 }}
                    numberOfLines={1}
                  >
                    {filled ? (tile.value as string) : t('cycleSignals_logTile')}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {!isEmpty && (
            <View style={[styles.spark, { borderTopColor: dCol.line2 }]}>
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
                      backgroundColor: s.v == null ? dCol.line : (isToday ? diffuseAccent : dCol.ink3),
                      borderRadius: 999,
                    }}
                  />
                )
              })}
            </View>
          )}

          {isEmpty && (
            <View style={styles.empty}>
              <Text style={{ fontFamily: diffuseFont.displayMedium, fontSize: 18, color: dCol.ink, textAlign: 'center' }}>
                {t('cycleSignals_logging30s')}
              </Text>
              <Text style={{ fontFamily: diffuseFont.body, fontSize: 12, lineHeight: 18, color: dCol.ink3, textAlign: 'center', paddingHorizontal: 8 }}>
                {t('cycleSignals_emptyBody')}
              </Text>
              <PillButton
                label={t('cycleSignals_logFirstSignal')}
                variant="paper"
                onPress={() => setOpenSheet('bbt')}
              />
            </View>
          )}
        </PaperCard>
        {logSheets}
      </View>
    )
  }

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
      <PaperCard radius={radius.lg} padding={14}>
        <View style={styles.head}>
          <View>
            <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>
              {t('cycleSignals_title')}
            </Text>
            <Text style={[styles.headline, { color: ink, fontFamily: font.display }]}>
              {headline}
            </Text>
          </View>
          <View style={[styles.sticker, { backgroundColor: stickers.pinkSoft, borderColor: ink }]}>
            {isPeakToday
              ? <Sparkle size={20} fill={stickers.yellow} />
              : <Heart size={20} fill={stickers.pink} />}
          </View>
        </View>

        <View style={styles.grid}>
          {tiles.map((tile) => {
            const filled = tile.value != null
            const peak = (tile.key === 'lh' && tile.value === 'peak') || (tile.key === 'cm' && tile.value === 'eggwhite')
            return (
              <Pressable
                key={tile.key}
                onPress={() => setOpenSheet(tile.key)}
                style={[
                  styles.tile,
                  {
                    backgroundColor: tileBg(tile),
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={{ opacity: filled ? 1 : 0.55, marginBottom: 2 }}>
                  {renderTileSticker(tile.key, peak, !filled)}
                </View>
                <Text style={[styles.tileKey, { color: peak ? '#fff' : colors.textMuted, fontFamily: font.bodyBold }]}>
                  {tile.label}
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
                  {filled ? (tile.value as string) : t('cycleSignals_logTile')}
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
              {t('cycleSignals_logging30s')}
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textMuted, fontFamily: font.body }]}>
              {t('cycleSignals_emptyBody')}
            </Text>
            <PillButton
              label={t('cycleSignals_logFirstSignal')}
              variant="accent"
              accentColor={stickers.pink}
              onPress={() => setOpenSheet('bbt')}
            />
          </View>
        )}
      </PaperCard>

      <LogSheet visible={openSheet === 'bbt'} title="BBT" onClose={() => setOpenSheet(null)}>
        <BbtForm date={today} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={openSheet === 'lh'} title="LH test" onClose={() => setOpenSheet(null)}>
        <LhForm date={today} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={openSheet === 'cm'} title="Cervical fluid" onClose={() => setOpenSheet(null)}>
        <CmForm date={today} phase={phase} onSaved={onSaved} />
      </LogSheet>
      <LogSheet visible={openSheet === 'intercourse'} title="Intimacy" onClose={() => setOpenSheet(null)}>
        <IntercourseForm date={today} phase={phase} onSaved={onSaved} />
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
