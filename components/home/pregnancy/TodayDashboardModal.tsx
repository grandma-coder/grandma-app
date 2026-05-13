/**
 * TodayDashboardModal — full daily dashboard for the pregnancy home.
 *
 * Read-only view of today's logged metrics with mini-charts and
 * weekly context. Tapping a metric tile is non-interactive — logging
 * lives in the Today's Routines chips on the home screen.
 */

import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import Svg, { Path as SvgPath, Circle as SvgCircle } from 'react-native-svg'
import { useTheme } from '../../../constants/theme'
import { toDateStr } from '../../../lib/cycleLogic'
import { LogSheet } from '../../calendar/LogSheet'
import { Display, MonoCaps, Body } from '../../ui/Typography'
import { PaperCard } from '../../ui/PaperCard'
import {
  MoodFace, LogWeight, LogWater, LogSleep, LogKicks, LogNutrition, LogExercise,
} from '../../stickers/RewardStickers'
import { moodFaceVariant, moodFaceFill } from '../../../lib/moodFace'
import { supabase } from '../../../lib/supabase'
import type { TodayLogEntry } from '../../../lib/analyticsData'

interface Props {
  visible: boolean
  onClose: () => void
  todayLogs: Record<string, TodayLogEntry>
  weekNumber: number
  userId: string
}

interface Point { date: string; value: number }

const MOOD_LABELS: Record<string, string> = {
  excited: 'Excited', happy: 'Happy', okay: 'Okay',
  anxious: 'Anxious', nauseous: 'Nauseous', energetic: 'Energetic', sad: 'Sad',
}

async function fetchHistory(userId: string, logType: string, days = 7): Promise<Point[]> {
  const since = new Date()
  since.setDate(since.getDate() - days + 1)
  const from = toDateStr(since)
  const { data } = await supabase
    .from('pregnancy_logs')
    .select('log_date, value')
    .eq('user_id', userId)
    .eq('log_type', logType)
    .gte('log_date', from)
    .order('log_date', { ascending: true })
  if (!data) return []
  return data
    .map((r) => ({ date: r.log_date as string, value: parseFloat(r.value ?? '0') }))
    .filter((r) => !isNaN(r.value))
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

export function TodayDashboardModal({ visible, onClose, todayLogs, weekNumber, userId }: Props) {
  const { colors, font, stickers, isDark } = useTheme()
  const [weightHist, setWeightHist] = useState<Point[]>([])
  const [waterHist, setWaterHist] = useState<Point[]>([])
  const [sleepHist, setSleepHist] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!visible) return
    setLoading(true)
    Promise.all([
      fetchHistory(userId, 'weight'),
      fetchHistory(userId, 'water'),
      fetchHistory(userId, 'sleep'),
    ]).then(([w, h, s]) => {
      setWeightHist(w)
      setWaterHist(h)
      setSleepHist(s)
      setLoading(false)
    })
  }, [visible, userId])

  const weightVal = todayLogs['weight']?.value ? parseFloat(todayLogs['weight'].value) : null
  const waterVal = todayLogs['water']?.value ? parseInt(todayLogs['water'].value, 10) : 0
  const sleepVal = todayLogs['sleep']?.value ? parseFloat(todayLogs['sleep'].value) : null
  const kicksVal = todayLogs['kick_count']?.value ? parseInt(todayLogs['kick_count'].value, 10) : null
  const moodKey = (todayLogs['mood']?.notes ?? todayLogs['mood']?.value ?? null) as string | null
  const nutritionVal = todayLogs['nutrition']?.value ? parseInt(todayLogs['nutrition'].value, 10) : 0
  const nutritionTotalCals: number = (() => {
    const raw = todayLogs['nutrition']?.notes
    if (!raw) return 0
    try {
      const parsed = JSON.parse(raw) as { totalCals?: number }
      return typeof parsed.totalCals === 'number' ? parsed.totalCals : 0
    } catch { return 0 }
  })()
  const exerciseLogged = !!todayLogs['exercise']

  const ink = isDark ? colors.text : '#141313'
  const muted = colors.textMuted

  return (
    <LogSheet
      visible={visible}
      title="Today's dashboard"
      onClose={onClose}
      chip={`Week ${weekNumber}`}
      chipColor={stickers.lilac}
    >
      <View style={{ gap: 14 }}>
        {/* Mood — full-width hero tile */}
        <PaperCard tint={stickers.yellowSoft} radius={20} padding={18} flat>
          <View style={styles.tileHeader}>
            <MonoCaps size={10} color={muted}>MOOD</MonoCaps>
          </View>
          <View style={styles.moodRow}>
            <MoodFace
              size={56}
              variant={moodKey ? moodFaceVariant(moodKey) : 'okay'}
              fill={moodKey ? moodFaceFill(moodKey) : stickers.yellow}
            />
            <View style={{ flex: 1 }}>
              <Display size={28} color={ink}>
                {moodKey ? (MOOD_LABELS[moodKey] ?? moodKey) : 'Not logged yet'}
              </Display>
              <Body size={12} color={muted} style={{ marginTop: 2, fontFamily: font.italic }}>
                {moodKey ? 'How you felt today' : 'Tap + Mood above to log'}
              </Body>
            </View>
          </View>
        </PaperCard>

        {/* Hydration — full-width with 8 droplets */}
        <PaperCard tint={stickers.blueSoft} radius={20} padding={18} flat>
          <View style={styles.tileHeader}>
            <LogWater size={20} />
            <MonoCaps size={10} color={muted}>HYDRATION</MonoCaps>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <Display size={32} color={ink}>{waterVal}</Display>
            <Body size={14} color={muted} style={{ fontFamily: font.italic }}>/ 8 glasses</Body>
          </View>
          <View style={styles.dropletRow}>
            {Array.from({ length: 8 }, (_, i) => (
              <Droplet key={i} filled={i < waterVal} fill={stickers.blue} muted={isDark ? colors.border : 'rgba(20,19,19,0.18)'} ink={ink} />
            ))}
          </View>
        </PaperCard>

        {/* 2-col grid: Sleep + Meals */}
        <View style={styles.twoCol}>
          <PaperCard tint={stickers.lilacSoft} radius={20} padding={16} flat style={styles.colTile}>
            <View style={styles.tileHeader}>
              <LogSleep size={18} />
              <MonoCaps size={10} color={muted}>SLEEP</MonoCaps>
            </View>
            <Display size={28} color={ink} style={{ marginTop: 4 }}>
              {sleepVal !== null ? `${sleepVal.toFixed(1)}h` : '—'}
            </Display>
            <Body size={11} color={muted} style={{ marginTop: 2, fontFamily: font.italic }}>
              {sleepVal !== null
                ? sleepVal >= 7 ? 'Restful night' : 'Could use more'
                : 'Not logged'}
            </Body>
            {sleepVal !== null && (
              <View style={[styles.tileBar, { backgroundColor: 'rgba(20,19,19,0.08)' }]}>
                <View style={[styles.tileBarFill, {
                  width: `${Math.min(100, (sleepVal / 9) * 100)}%`,
                  backgroundColor: stickers.lilac,
                }]} />
              </View>
            )}
          </PaperCard>

          <PaperCard tint={stickers.peachSoft} radius={20} padding={16} flat style={styles.colTile}>
            <View style={styles.tileHeader}>
              <LogNutrition size={18} />
              <MonoCaps size={10} color={muted}>MEALS</MonoCaps>
            </View>
            <Display size={28} color={ink} style={{ marginTop: 4 }}>{nutritionVal}/3</Display>
            <Body size={11} color={muted} style={{ marginTop: 2, fontFamily: font.italic }}>
              {nutritionTotalCals > 0 ? `~${nutritionTotalCals} kcal` : 'Not logged'}
            </Body>
            <View style={[styles.tileBar, { backgroundColor: 'rgba(20,19,19,0.08)' }]}>
              <View style={[styles.tileBarFill, {
                width: `${Math.min(100, (nutritionVal / 3) * 100)}%`,
                backgroundColor: stickers.peach,
              }]} />
            </View>
          </PaperCard>
        </View>

        {/* 2-col grid: Exercise + (Kicks if T3 / else Weight today) */}
        <View style={styles.twoCol}>
          <PaperCard tint={stickers.pinkSoft} radius={20} padding={16} flat style={styles.colTile}>
            <View style={styles.tileHeader}>
              <LogExercise size={18} />
              <MonoCaps size={10} color={muted}>EXERCISE</MonoCaps>
            </View>
            <Display size={28} color={ink} style={{ marginTop: 4 }}>
              {exerciseLogged ? '✓' : '—'}
            </Display>
            <Body size={11} color={muted} style={{ marginTop: 2, fontFamily: font.italic }}>
              {exerciseLogged ? 'Done today' : 'Not logged'}
            </Body>
          </PaperCard>

          {weekNumber >= 28 ? (
            <PaperCard tint={stickers.greenSoft} radius={20} padding={16} flat style={styles.colTile}>
              <View style={styles.tileHeader}>
                <LogKicks size={18} />
                <MonoCaps size={10} color={muted}>KICKS</MonoCaps>
              </View>
              <Display size={28} color={ink} style={{ marginTop: 4 }}>
                {kicksVal !== null ? String(kicksVal) : '—'}
              </Display>
              <Body size={11} color={muted} style={{ marginTop: 2, fontFamily: font.italic }}>
                {kicksVal !== null ? 'Sessions today' : 'Not logged'}
              </Body>
            </PaperCard>
          ) : (
            <PaperCard tint={stickers.greenSoft} radius={20} padding={16} flat style={styles.colTile}>
              <View style={styles.tileHeader}>
                <LogWeight size={18} />
                <MonoCaps size={10} color={muted}>WEIGHT</MonoCaps>
              </View>
              <Display size={28} color={ink} style={{ marginTop: 4 }}>
                {weightVal !== null ? `${weightVal.toFixed(1)}` : '—'}
                {weightVal !== null && (
                  <Text style={{ fontSize: 14, color: muted, fontFamily: font.italic }}> kg</Text>
                )}
              </Display>
              <Body size={11} color={muted} style={{ marginTop: 2, fontFamily: font.italic }}>
                {weightVal !== null ? 'Logged today' : 'Not logged'}
              </Body>
            </PaperCard>
          )}
        </View>

        {/* 7-day weight sparkline */}
        <PaperCard tint={isDark ? colors.surface : '#FFFEF8'} radius={20} padding={18} flat>
          <View style={styles.tileHeader}>
            <LogWeight size={18} />
            <MonoCaps size={10} color={muted}>WEIGHT · LAST 7 DAYS</MonoCaps>
          </View>
          {loading ? (
            <View style={{ height: 100, justifyContent: 'center' }}>
              <ActivityIndicator color={muted} />
            </View>
          ) : weightHist.filter((h) => h.value > 0).length >= 2 ? (
            <Sparkline points={fillDays(weightHist).values} color={stickers.lilac} ink={ink} />
          ) : (
            <Body size={12} color={muted} style={{ marginTop: 8, fontFamily: font.italic }}>
              Log weight on at least 2 days to see a trend.
            </Body>
          )}
        </PaperCard>

        {/* 7-day hydration bars */}
        <PaperCard tint={isDark ? colors.surface : '#FFFEF8'} radius={20} padding={18} flat>
          <View style={styles.tileHeader}>
            <LogWater size={18} />
            <MonoCaps size={10} color={muted}>HYDRATION · LAST 7 DAYS</MonoCaps>
          </View>
          {loading ? (
            <View style={{ height: 80, justifyContent: 'center' }}>
              <ActivityIndicator color={muted} />
            </View>
          ) : (
            <BarSeries
              values={fillDays(waterHist).values}
              labels={fillDays(waterHist).labels}
              max={8}
              color={stickers.blue}
              ink={ink}
              muted={muted}
            />
          )}
        </PaperCard>
      </View>
    </LogSheet>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Droplet({ filled, fill, muted, ink }: { filled: boolean; fill: string; muted: string; ink: string }) {
  return (
    <Svg width={20} height={26} viewBox="0 0 20 26">
      <SvgPath
        d="M10 2 C5.5 9 2.5 14 2.5 18 C2.5 22.4 5.9 25.5 10 25.5 C14.1 25.5 17.5 22.4 17.5 18 C17.5 14 14.5 9 10 2 Z"
        fill={filled ? fill : 'none'}
        stroke={filled ? ink : muted}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Sparkline({ points, color, ink }: { points: number[]; color: string; ink: string }) {
  const W = 280
  const H = 90
  const PAD = 6
  const min = Math.min(...points.filter((p) => p > 0))
  const max = Math.max(...points)
  const range = Math.max(0.5, max - min)
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

function BarSeries({
  values, labels, max, color, ink, muted,
}: { values: number[]; labels: string[]; max: number; color: string; ink: string; muted: string }) {
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 70 }}>
        {values.map((v, i) => {
          const pct = Math.max(0.02, Math.min(1, v / max))
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={{
                width: '100%',
                height: `${pct * 100}%`,
                backgroundColor: v > 0 ? color : 'rgba(20,19,19,0.06)',
                borderRadius: 6,
                borderWidth: 1,
                borderColor: v > 0 ? ink : 'transparent',
              }} />
            </View>
          )
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        {labels.map((l, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: muted }}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  dropletRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  twoCol: { flexDirection: 'row', gap: 10 },
  colTile: { flex: 1 },
  tileBar: { height: 4, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  tileBarFill: { height: '100%', borderRadius: 2 },
})
