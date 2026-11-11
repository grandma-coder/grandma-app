/**
 * PillarMetrics — "where you are now" for a pillar: cycle day / phase / days to period, pregnancy
 * week, the child's age… Renders nothing when there is no data.
 *
 * Each item is one whole translated phrase (see lib/pillarMeta), so grammar and plurals are right
 * in every language. Site look: ink-outlined tags that wrap freely. Diffuse: the quiet inline strip,
 * with the "·" kept at the end of the previous phrase so a wrapped line never starts with it.
 */

import { parseLocalDate } from '../../lib/localDate'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import type { PillarId } from '../../types'
import { useChildStore } from '../../store/useChildStore'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { useCycleHistory } from '../../lib/cycleAnalytics'
import { getCycleInfo, getDaysLate, toDateStr, type CycleConfig } from '../../lib/cycleLogic'
import { usePregnancyTodayLogs } from '../../lib/analyticsData'
import { supabase } from '../../lib/supabase'
import { useTranslation, type TranslationKey } from '../../lib/i18n'
import { useCycleSettingsStore } from '../../store/useCycleSettingsStore'
import { findPillar } from '../../lib/pillarCopy'
import { cycleMetaChips, pregnancyMetaChips, childAgeChip } from '../../lib/pillarMeta'

interface PillarMetricsProps {
  pillarId: PillarId
  /** Site look: tag fill behind the ink outline (the pillar's tone). */
  tone?: string
}

export default function PillarMetrics({ pillarId, tone }: PillarMetricsProps) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const chips = usePillarMetaChips(pillarId)

  if (chips.length === 0) return null

  if (diffuse) {
    return (
      <View style={styles.diffuseWrap}>
        {chips.map((c, i) => (
          <Text key={i} style={[styles.diffuseText, { color: dt.colors.ink3, fontFamily: diffuseFont.mono }]}>
            {c}
            {i < chips.length - 1 ? ` ${t('common_dotSeparator')}` : ''}
          </Text>
        ))}
      </View>
    )
  }

  return (
    <View style={styles.wrap}>
      {chips.map((c, i) => (
        <View
          key={i}
          style={[styles.tag, { backgroundColor: tone ?? colors.surface, borderColor: colors.text, transform: [{ rotate: i % 2 === 0 ? '-1.2deg' : '1deg' }] }]}
        >
          <Text style={[styles.tagText, { color: colors.text, fontFamily: font.bodyBold }]}>{c}</Text>
        </View>
      ))}
    </View>
  )
}

// ─── Data ──────────────────────────────────────────────────────────────────

const MOOD_KEYS: Record<string, TranslationKey> = {
  excited: 'preg_mood_excited',
  happy: 'preg_mood_happy',
  okay: 'preg_mood_okay',
  anxious: 'preg_mood_anxious',
  energetic: 'preg_mood_energetic',
  radiant: 'sw1_pa_moodRadiant',
}

/** Every hook runs on every render (Rules of Hooks); `journey` decides which data is used. */
function usePillarMetaChips(pillarId: PillarId): string[] {
  const { t } = useTranslation()
  const journey = findPillar(pillarId)?.journey

  // Cycle
  const { data: history } = useCycleHistory()
  const settings = useCycleSettingsStore()

  // Pregnancy
  const [userId, setUserId] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (journey !== 'pregnancy') return
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id))
  }, [journey])
  const week = usePregnancyStore((s) => s.weekNumber)
  const dueDate = usePregnancyStore((s) => s.dueDate)
  const { data: todayLogs } = usePregnancyTodayLogs(journey === 'pregnancy' ? userId : undefined)

  // Kids
  const activeChild = useChildStore((s) => s.activeChild)
  const [now] = useState(() => Date.now())

  if (journey === 'pre-pregnancy') {
    const latest = history?.cycles[history.cycles.length - 1]
    if (!latest) return []
    // Same config as the cycle home: declared settings win over the measured average and defaults.
    const cfg: CycleConfig = {
      lastPeriodStart: latest.startDate,
      cycleLength: settings.cycleLength ?? history?.avg ?? 28,
      periodLength: settings.periodLength,
      lutealPhase: settings.lutealPhase,
    }
    const today = toDateStr(new Date())
    const info = getCycleInfo(cfg, today)
    // Late: getCycleInfo has wrapped into a new cycle ("Day 3 · period in 26d") — use the home's late logic.
    return cycleMetaChips(t, pillarId, { ...info, daysLate: getDaysLate(cfg, today) })
  }

  if (journey === 'pregnancy') {
    if (!week && !dueDate) return []
    const daysToGo = dueDate
      ? Math.max(0, Math.ceil((new Date(dueDate + 'T00:00:00').getTime() - now) / 86_400_000))
      : null
    const logs = todayLogs as Record<string, { value?: unknown } | undefined> | undefined
    const waterRaw = logs?.water?.value
    const water = waterRaw != null ? parseInt(String(waterRaw), 10) : 0
    const moodRaw = logs?.mood?.value
    const moodKey = typeof moodRaw === 'string' ? MOOD_KEYS[moodRaw.toLowerCase()] : undefined
    return pregnancyMetaChips(t, pillarId, {
      week: week ?? null,
      daysToGo,
      water: Number.isFinite(water) ? water : 0,
      // Unknown mood words are dropped rather than shown untranslated.
      moodLabel: moodKey ? t(moodKey) : null,
    })
  }

  if (journey === 'kids') {
    if (!activeChild) return []
    let ageMonths: number | null = null
    if (activeChild.birthDate) {
      const d = parseLocalDate(activeChild.birthDate)
      if (!isNaN(d.getTime())) {
        const now = new Date()
        ageMonths = Math.max(0, (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()))
      }
    }
    const age = childAgeChip(t, ageMonths)
    return [activeChild.name, ...(age ? [age] : [])].filter(Boolean)
  }

  return []
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, marginBottom: 6 },
  tag: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  tagText: { fontSize: 13, lineHeight: 18 },
  diffuseWrap: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 6, rowGap: 4, marginTop: 4, marginBottom: 16 },
  diffuseText: { fontSize: 12, letterSpacing: 0.4 },
})
