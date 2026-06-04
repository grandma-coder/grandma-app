/**
 * CycleTodaySummaryCard — "today at a glance" for the Cycle home.
 *
 * Mirrors PregnancyHome's TodaySummaryCard pattern: chips are read-only
 * previews of today's cycle_logs and tapping anywhere on the card opens
 * the full CycleTodayDashboardModal with high-level metrics. If the user
 * has zero cycle_logs rows in total, we seed realistic sample data once
 * so the card has something to show.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { toDateStr, type CyclePhase } from '../../../lib/cycleLogic'
import { seedCycleData } from '../../../lib/devSeed'
import { PaperCard } from '../../ui/PaperCard'
import { Display, Body } from '../../ui/Typography'
import { Drop, Heart, Smiley, Sad, Sleepy } from '../../ui/Stickers'
import { SymptomSticker } from '../../calendar/symptomStickers'
import { CycleTodayDashboardModal } from './CycleTodayDashboardModal'
import type { SymptomId } from '../../../lib/cycleSymptoms'

interface Props {
  phase: CyclePhase
}

type Row = { type: string; value: string | null }

const MOOD_META: Record<string, { Sticker: typeof Sad; fill: string; label: string }> = {
  low:   { Sticker: Sad,    fill: '#EE7B6D', label: 'Low' },
  down:  { Sticker: Sad,    fill: '#9DC3E8', label: 'Down' },
  okay:  { Sticker: Sleepy, fill: '#C8B6E8', label: 'Okay' },
  good:  { Sticker: Smiley, fill: '#F5D652', label: 'Good' },
  great: { Sticker: Smiley, fill: '#BDD48C', label: 'Great' },
}

const CM_LABEL: Record<string, string> = {
  dry: 'Dry', sticky: 'Sticky', creamy: 'Creamy', watery: 'Watery', eggwhite: 'Eggwhite',
}

const LH_LABEL: Record<string, string> = {
  negative: 'Neg', faint: 'Faint', positive: 'Pos', peak: 'Peak',
}

export function CycleTodaySummaryCard({ phase }: Props) {
  const { colors, font, stickers, isDark } = useTheme()
  const qc = useQueryClient()
  const ink = isDark ? colors.text : '#141313'
  const paper = isDark ? colors.surface : '#FFFEF8'

  const [userId, setUserId] = useState<string | undefined>()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) =>
      setUserId(session?.user.id),
    )
  }, [])

  const today = toDateStr(new Date())

  const { data: rows = [] } = useQuery({
    queryKey: ['cycleLogs', 'today-summary', userId, today],
    queryFn: async (): Promise<Row[]> => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('cycle_logs')
        .select('type, value')
        .eq('user_id', userId)
        .eq('date', today)
      if (error) throw error
      return (data ?? []) as Row[]
    },
    enabled: !!userId,
  })

  // Auto-seed sample data the very first time (user has never logged anything).
  // Runs at most once per session — re-guarded by a ref so a refetch can't trigger it again.
  const seededRef = useRef(false)
  useEffect(() => {
    if (!userId || seededRef.current) return
    // Flip the ref BEFORE any await so a remount during the async window
    // (tab switch, etc.) can't re-enter and double-seed. The DB count
    // check still gates the actual seedCycleData() call.
    seededRef.current = true
    void (async () => {
      const { count, error } = await supabase
        .from('cycle_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
      if (error || count === null || count > 0) return
      try {
        await seedCycleData()
        await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
      } catch {
        // Silent — seeding is best-effort UI sugar.
      }
    })()
  }, [userId, qc])

  const moodValue = rows.find((r) => r.type === 'mood')?.value ?? null
  const bbtValue = rows.find((r) => r.type === 'basal_temp')?.value ?? null
  const lhValue = rows.find((r) => r.type === 'lh')?.value ?? null
  const cmValue = rows.find((r) => r.type === 'cervical_mucus')?.value ?? null
  const intimacy = rows.find((r) => r.type === 'intercourse')?.value ?? null
  const periodStart = rows.find((r) => r.type === 'period_start')?.value ?? null
  const symptoms = useMemo(
    () => rows.filter((r) => r.type === 'symptom').map((r) => r.value).filter((v): v is string => !!v),
    [rows],
  )

  const moodMeta = moodValue ? MOOD_META[moodValue] : null
  const topSymptom = symptoms[0] as SymptomId | undefined

  const chips: { key: string; icon: React.ReactNode; label: string }[] = [
    {
      key: 'mood',
      icon: moodMeta
        ? <moodMeta.Sticker size={22} fill={moodMeta.fill} />
        : <Smiley size={22} fill={stickers.yellowSoft} />,
      label: moodMeta?.label ?? '—',
    },
    {
      key: 'symptoms',
      icon: topSymptom
        ? <SymptomSticker id={topSymptom} size={18} />
        : <Heart size={22} fill={stickers.pinkSoft} />,
      label: symptoms.length > 0 ? `${symptoms.length}` : '—',
    },
    {
      key: 'bbt',
      icon: <Drop size={22} fill={stickers.blue} />,
      label: bbtValue ? `${bbtValue}°` : '—',
    },
    {
      key: 'lh',
      icon: <Drop size={22} fill={stickers.yellow} />,
      label: lhValue ? (LH_LABEL[lhValue] ?? lhValue) : '—',
    },
    {
      key: 'cm',
      icon: <Drop size={22} fill={stickers.green} />,
      label: cmValue ? (CM_LABEL[cmValue] ?? cmValue) : '—',
    },
    {
      key: 'intimacy',
      icon: <Heart size={22} fill={intimacy ? stickers.pink : stickers.pinkSoft} />,
      label: intimacy ? '✓' : '—',
    },
    {
      key: 'period_start',
      icon: <Drop size={22} fill={periodStart ? stickers.coral : stickers.pinkSoft} />,
      label: periodStart ? (periodStart === 'light' ? 'Lt' : periodStart === 'medium' ? 'Md' : periodStart === 'heavy' ? 'Hv' : '✓') : '—',
    },
  ]

  const completed =
    (moodMeta ? 1 : 0) +
    (bbtValue ? 1 : 0) +
    (lhValue ? 1 : 0) +
    (cmValue ? 1 : 0) +
    (symptoms.length > 0 ? 1 : 0)
  const totalTrackable = 5

  const summaryHint =
    completed === totalTrackable
      ? 'all signals logged today'
      : completed >= 3
        ? `${completed} of ${totalTrackable} signals logged`
        : completed >= 1
          ? `${totalTrackable - completed} signals left for today`
          : 'tap to see today’s signals'

  const phaseAccent = phaseColor(phase, stickers)

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
      >
        <PaperCard tint={paper} radius={24} padding={18}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Display size={22} color={ink}>Today at a glance</Display>
              <Body size={12} color={colors.textMuted} style={{ marginTop: 2, fontFamily: font.italic }}>
                {summaryHint}
              </Body>
            </View>
            <ChevronRight size={20} color={colors.textMuted} strokeWidth={2} />
          </View>

          <View style={styles.chipsRow}>
            {chips.map((c) => (
              <View key={c.key} style={styles.chip}>
                <View style={styles.chipIcon}>{c.icon}</View>
                <Text
                  numberOfLines={1}
                  style={[styles.chipLabel, { color: ink, fontFamily: font.bodySemiBold }]}
                >
                  {c.label}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.progressTrack, { backgroundColor: isDark ? colors.border : 'rgba(20,19,19,0.06)' }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(completed / totalTrackable) * 100}%`,
                  backgroundColor: completed === totalTrackable ? stickers.green : phaseAccent,
                },
              ]}
            />
          </View>
        </PaperCard>
      </Pressable>

      {userId && (
        <CycleTodayDashboardModal
          visible={open}
          onClose={() => setOpen(false)}
          phase={phase}
          userId={userId}
        />
      )}
    </View>
  )
}

function phaseColor(phase: CyclePhase, s: ReturnType<typeof useTheme>['stickers']): string {
  switch (phase) {
    case 'menstruation': return s.coral
    case 'follicular':   return s.green
    case 'ovulation':    return s.peach
    case 'luteal':       return s.lilac
  }
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, marginTop: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(20,19,19,0.04)',
    minWidth: 0,
  },
  chipIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { fontSize: 12, maxWidth: 70 },
  progressTrack: { height: 4, borderRadius: 2, marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
})
