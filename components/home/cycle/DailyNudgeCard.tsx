/**
 * DailyNudgeCard — full-width nudge on the cycle home (Slice 3, log-aware).
 *
 * Now reads today's BBT/LH/CM/mood logs + the 10-day BBT trend to choose
 * the right template via predicate matching in lib/cycleNudges.ts.
 */

import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Heart } from '../../ui/Stickers'
import { PaperCard } from '../../ui/PaperCard'
import { useTheme } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import { supabase } from '../../../lib/supabase'
import { getCycleInfo, toDateStr, type CycleConfig } from '../../../lib/cycleLogic'
import { pickCycleNudge, type NudgeContext } from '../../../lib/cycleNudges'
import { detectBBTShift } from '../../../lib/cycleConfidence'

interface Props {
  cycleConfig: CycleConfig
}

const PILLAR_LABEL_KEY: Record<string, string> = {
  'fertility': 'cycle_pillar_fertility',
  'nutrition-prep': 'cycle_pillar_nutrition_prep',
  'emotional-readiness': 'cycle_pillar_emotional_readiness',
  'financial-planning': 'cycle_pillar_financial_planning',
  'partner-journey': 'cycle_pillar_partner_journey',
  'health-checkups': 'cycle_pillar_health_checkups',
}

function renderHeadline(s: string, baseColor: string, accentColor: string, font: ReturnType<typeof useTheme>['font']) {
  const m = s.match(/^(.*?)\*(.+?)\*(.*)$/)
  if (!m) {
    return <Text style={{ fontFamily: font.display, fontSize: 22, color: baseColor, lineHeight: 26 }}>{s}</Text>
  }
  const [, pre, accent, post] = m
  return (
    <Text style={{ fontFamily: font.display, fontSize: 22, color: baseColor, lineHeight: 26 }}>
      {pre}
      <Text style={{ fontFamily: font.italic, color: accentColor }}>{accent}</Text>
      {post}
    </Text>
  )
}


export function DailyNudgeCard({ cycleConfig }: Props) {
  const { colors, stickers, brand, font, radius, isDark } = useTheme()
  const { t } = useTranslation()
  const ink = isDark ? colors.text : '#141313'
  const accent = isDark ? '#EFA2C2' : brand.prePregnancy

  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id))
  }, [])

  const info = getCycleInfo(cycleConfig)
  const today = toDateStr(new Date())

  const { data: todayRows = [] } = useQuery({
    queryKey: ['cycleLogs', 'nudge', userId, today],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('cycle_logs')
        .select('type, value')
        .eq('user_id', userId)
        .eq('date', today)
        .in('type', ['basal_temp', 'lh', 'cervical_mucus', 'mood'])
      if (error) throw error
      return data ?? []
    },
    enabled: !!userId,
  })

  const { data: bbtTrend = [] } = useQuery({
    queryKey: ['cycleLogs', 'bbt-trend', userId, today],
    queryFn: async () => {
      if (!userId) return []
      const startD = new Date()
      startD.setDate(startD.getDate() - 10)
      const { data, error } = await supabase
        .from('cycle_logs')
        .select('value, date')
        .eq('user_id', userId)
        .eq('type', 'basal_temp')
        .gte('date', toDateStr(startD))
        .order('date', { ascending: true })
      if (error) throw error
      return (data ?? [])
        .map((r) => parseFloat(r.value ?? ''))
        .filter((n) => Number.isFinite(n))
    },
    enabled: !!userId,
  })

  const ctx: NudgeContext = useMemo(() => ({
    phase: info.phase,
    cycleDay: info.cycleDay,
    hasBBTToday: todayRows.some((r) => r.type === 'basal_temp'),
    hasLHToday: todayRows.some((r) => r.type === 'lh'),
    hasCMToday: todayRows.some((r) => r.type === 'cervical_mucus'),
    moodToday: todayRows.find((r) => r.type === 'mood')?.value ?? null,
    daysLate: info.cycleDay > info.cycleLength ? info.cycleDay - info.cycleLength : 0,
    bbtShiftConfirmed: detectBBTShift(bbtTrend),
  }), [info.phase, info.cycleDay, info.cycleLength, todayRows, bbtTrend])

  const nudge = pickCycleNudge(ctx)

  function handlePress() {
    if (nudge.pillarId) router.push(`/pillar/${nudge.pillarId}` as any)
  }

  return (
    <Pressable onPress={handlePress} accessibilityRole="button" accessibilityLabel={t('cycle_nudge_label' as any)}>
      <PaperCard radius={radius.lg} padding={16} style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={[styles.label, { color: colors.textMuted, fontFamily: font.bodyBold }]}>
            {t('cycle_nudge_label' as any)}
          </Text>
          <View style={[styles.stickerChip, { backgroundColor: stickers.pinkSoft, borderColor: ink }]}>
            <Heart size={18} fill={stickers.pink} />
          </View>
        </View>

        <View style={styles.body}>
          {renderHeadline(t(nudge.headlineKey as any), ink, accent, font)}
          <Text style={[styles.text, { color: colors.textMuted, fontFamily: font.body }]} numberOfLines={4}>
            {t(nudge.bodyKey as any)}
          </Text>
        </View>

        {nudge.pillarId && (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Text style={[styles.from, { color: colors.textMuted, fontFamily: font.bodyBold }]}>
              {t('cycle_nudge_from' as any)}{PILLAR_LABEL_KEY[nudge.pillarId] ? ` · ${t(PILLAR_LABEL_KEY[nudge.pillarId] as any)}` : ''}
            </Text>
            <Text style={[styles.cta, { color: accent, fontFamily: font.bodyBold }]}>
              {t('cycle_nudge_read_more' as any)}
            </Text>
          </View>
        )}
      </PaperCard>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  stickerChip: {
    width: 32, height: 32, borderRadius: 999, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { gap: 6, marginTop: 2 },
  text: { fontSize: 13, lineHeight: 19 },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, paddingTop: 10, borderTopWidth: 1,
  },
  from: { fontSize: 10, letterSpacing: 1.3, textTransform: 'uppercase' },
  cta: { fontSize: 11, letterSpacing: 0.3 },
})
