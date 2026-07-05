/**
 * PillarMetrics — inline editorial strip of relevant stats shown above the
 * pillar intro. Renders nothing when no data is available.
 *
 * Style: small caps label · value · separator · value … sits flush left,
 * single line, no card chrome.
 */

import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, getModeColor } from '../../constants/theme'
import type { PillarId } from '../../types'
import { useChildStore } from '../../store/useChildStore'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { useModeStore } from '../../store/useModeStore'
import { useCycleHistory } from '../../lib/cycleAnalytics'
import { getCycleInfo, toDateStr, type CycleConfig } from '../../lib/cycleLogic'
import { usePregnancyTodayLogs } from '../../lib/analyticsData'
import { supabase } from '../../lib/supabase'
import { useTranslation } from '../../lib/i18n'

interface Stat {
  label: string
  value: string
}

interface PillarMetricsProps {
  pillarId: PillarId
}

export default function PillarMetrics({ pillarId }: PillarMetricsProps) {
  const mode = useModeStore((s) => s.mode)
  const { colors, font, isDark } = useTheme()
  const { t } = useTranslation()
  const accent = getModeColor(mode, isDark)
  const stats = useStatsForPillar(pillarId)

  if (stats.length === 0) return null

  return (
    <View style={styles.wrap}>
      {stats.map((s, i) => (
        <View key={i} style={styles.statRow}>
          {i > 0 && (
            <Text
              style={[
                styles.sep,
                { color: colors.textFaint, fontFamily: font.body },
              ]}
            >
              {t('common_dotSeparator')}
            </Text>
          )}
          <Text
            style={[
              styles.value,
              { color: accent, fontFamily: font.display },
            ]}
          >
            {s.value}
          </Text>
          <Text
            style={[
              styles.label,
              { color: colors.textMuted, fontFamily: font.body },
            ]}
          >
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

// ─── Per-pillar stat selection ─────────────────────────────────────────────

function useStatsForPillar(pillarId: PillarId): Stat[] {
  const cycle = useCycleStats(pillarId)
  if (cycle) return cycle
  const preg = usePregnancyStats(pillarId)
  if (preg) return preg
  const kids = useKidsStats(pillarId)
  if (kids) return kids
  return []
}

function useCycleStats(pillarId: PillarId): Stat[] | null {
  const PRE_PREG_IDS = new Set([
    'fertility',
    'nutrition-prep',
    'emotional-readiness',
    'financial-planning',
    'partner-journey',
    'health-checkups',
  ])
  if (!PRE_PREG_IDS.has(pillarId)) return null

  const { data: history } = useCycleHistory()
  const latest = history?.cycles[history.cycles.length - 1]
  if (!latest) return []

  const cfg: CycleConfig = {
    lastPeriodStart: latest.startDate,
    cycleLength: history?.avg ?? 28,
    periodLength: 5,
    lutealPhase: 14,
  }
  const info = getCycleInfo(cfg, toDateStr(new Date()))

  if (pillarId === 'fertility') {
    return [
      { value: String(info.cycleDay), label: 'cycle day' },
      {
        value: String(Math.abs(info.daysUntilOvulation)),
        label: info.daysUntilOvulation > 0 ? 'days to ovulation' : 'days since ovulation',
      },
      { value: `${info.fertileStart}–${info.fertileEnd}`, label: 'fertile window' },
    ]
  }

  return [
    { value: String(info.cycleDay), label: 'cycle day' },
    { value: info.phaseLabel, label: 'phase' },
    { value: String(info.daysUntilPeriod), label: 'days to period' },
  ]
}

function usePregnancyStats(pillarId: PillarId): Stat[] | null {
  const PREG_IDS = new Set([
    'week-by-week',
    'symptoms-relief',
    'birth-planning',
    'breastfeeding-prep',
    'baby-gear',
    'partner-support',
    'postpartum-prep',
    'pregnancy-nutrition',
    'emotional-wellness',
  ])
  if (!PREG_IDS.has(pillarId)) return null

  const [userId, setUserId] = useState<string | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id)
    })
  }, [])
  const week = usePregnancyStore((s) => s.weekNumber)
  const dueDate = usePregnancyStore((s) => s.dueDate)
  const { data: todayLogs } = usePregnancyTodayLogs(userId)

  if (!week && !dueDate) return []

  const daysToGo = (() => {
    if (!dueDate) return null
    const due = new Date(dueDate + 'T00:00:00')
    return Math.max(
      0,
      Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    )
  })()

  if (pillarId === 'pregnancy-nutrition') {
    const water = (todayLogs as any)?.water?.value ?? 0
    return [
      { value: String(week ?? '—'), label: 'week' },
      { value: `${water}`, label: 'water today' },
      ...(daysToGo !== null ? [{ value: String(daysToGo), label: 'days to go' }] : []),
    ]
  }

  if (pillarId === 'symptoms-relief' || pillarId === 'emotional-wellness') {
    const mood = (todayLogs as any)?.mood?.value
    const moodValue = typeof mood === 'string' ? mood : null
    return [
      { value: String(week ?? '—'), label: 'week' },
      ...(moodValue ? [{ value: moodValue, label: 'mood today' }] : []),
      ...(daysToGo !== null ? [{ value: String(daysToGo), label: 'days to go' }] : []),
    ]
  }

  return [
    { value: String(week ?? '—'), label: 'week' },
    ...(daysToGo !== null ? [{ value: String(daysToGo), label: 'days to go' }] : []),
  ]
}

function useKidsStats(pillarId: PillarId): Stat[] | null {
  const KIDS_IDS = new Set([
    'milk',
    'food',
    'nutrition',
    'vaccines',
    'clothes',
    'recipes',
    'habits',
    'medicine',
    'milestones',
  ])
  if (!KIDS_IDS.has(pillarId)) return null

  const activeChild = useChildStore((s) => s.activeChild)
  const children = useChildStore((s) => s.children)
  if (!activeChild) return []

  const ageMonths = (() => {
    if (!activeChild.birthDate) return null
    const d = new Date(activeChild.birthDate)
    if (isNaN(d.getTime())) return null
    const now = new Date()
    return Math.max(
      0,
      (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()),
    )
  })()

  const ageLabel = (() => {
    if (ageMonths === null) return '—'
    if (ageMonths < 24) return `${ageMonths} mo`
    return `${Math.floor(ageMonths / 12)} yr`
  })()

  return [
    { value: activeChild.name, label: 'child' },
    { value: ageLabel, label: 'age' },
    ...(children.length > 1 ? [{ value: String(children.length), label: 'children' }] : []),
  ]
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    marginTop: 4,
    marginBottom: 16,
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
  sep: {
    fontSize: 18,
    marginHorizontal: 2,
  },
})
