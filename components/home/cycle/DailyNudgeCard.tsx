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
import { Heart as HeartLine } from 'lucide-react-native'
import { Heart } from '../../ui/Stickers'
import { PaperCard } from '../../ui/PaperCard'
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../../constants/theme'
import { useIsDiffuse, DiffuseArrow, SoftBloom } from '../../ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../../ui/diffuse/DiffusePrimitives'
import { useTranslation } from '../../../lib/i18n'
import { supabase } from '../../../lib/supabase'
import { getCycleInfo, toDateStr, type CycleConfig } from '../../../lib/cycleLogic'
import { pickCycleNudge, type NudgeContext } from '../../../lib/cycleNudges'
import { detectBBTShift } from '../../../lib/cycleConfidence'

interface Props {
  cycleConfig: CycleConfig
  /** Day the ring is scrubbed to (YYYY-MM-DD). The nudge's phase follows this;
   *  the log-context signals (BBT/LH/mood) stay today-only since those logs
   *  only exist for today. Defaults to today when omitted. */
  selectedDate?: string
}

const PILLAR_LABEL_KEY: Record<string, string> = {
  'fertility': 'cycle_pillar_fertility',
  'nutrition-prep': 'cycle_pillar_nutrition_prep',
  'emotional-readiness': 'cycle_pillar_emotional_readiness',
  'financial-planning': 'cycle_pillar_financial_planning',
  'partner-journey': 'cycle_pillar_partner_journey',
  'health-checkups': 'cycle_pillar_health_checkups',
}

function renderHeadline(s: string, baseColor: string, accentColor: string, displayFont: string, italicFont: string) {
  const m = s.match(/^(.*?)\*(.+?)\*(.*)$/)
  if (!m) {
    return <Text style={{ fontFamily: displayFont, fontSize: 22, color: baseColor, lineHeight: 26 }}>{s}</Text>
  }
  const [, pre, accent, post] = m
  return (
    <Text style={{ fontFamily: displayFont, fontSize: 22, color: baseColor, lineHeight: 26 }}>
      {pre}
      <Text style={{ fontFamily: italicFont, color: accentColor }}>{accent}</Text>
      {post}
    </Text>
  )
}


export function DailyNudgeCard({ cycleConfig, selectedDate }: Props) {
  const { colors, stickers, brand, font, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const ink = isDark ? colors.text : '#141313'
  const accent = isDark ? '#EFA2C2' : brand.prePregnancy
  const diffuseAccent = getDiffuseAccent('pre-pregnancy', dt.isDark)

  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id))
  }, [])

  const today = toDateStr(new Date())
  // Phase follows the scrubbed ring day; falls back to today.
  const info = getCycleInfo(cycleConfig, selectedDate ?? today)

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
    // Reflection nudges deep-link to logging; others open their pillar read.
    if (nudge.logShortcut) {
      router.push('/(tabs)/agenda' as any)
    } else if (nudge.pillarId) {
      router.push(`/pillar/${nudge.pillarId}` as any)
    }
  }

  const fromLabel = nudge.logShortcut
    ? t('cycle_nudge_reflect_from' as any)
    : nudge.pillarId
      ? `${t('cycle_nudge_from' as any)}${PILLAR_LABEL_KEY[nudge.pillarId] ? ` · ${t(PILLAR_LABEL_KEY[nudge.pillarId] as any)}` : ''}`
      : null
  const ctaLabel = nudge.logShortcut
    ? t('cycle_nudge_log_it' as any)
    : nudge.pillarId
      ? t('cycle_nudge_read_more' as any)
      : null

  if (diffuse) {
    // v4 soft-wash — NO card: no border, no radius, no clip. A free feathered
    // bloom bleeds off the upper-left into the page (its transparent falloff
    // extends past the edges, so there's no card silhouette). The copy reads
    // as one calm block; a single trailing arrow is the only tap affordance.
    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={t('cycle_nudge_label' as any)}
        style={({ pressed }) => [styles.wash, { opacity: pressed ? 0.7 : 1 }]}
      >
        {/* Free bloom — a faint whisper feathered off the top-left corner near
            the icon. Kept low-opacity + small so it tints the paper rather than
            painting a muddy gradient across the whole block. */}
        <View pointerEvents="none" style={styles.washBloom}>
          <SoftBloom color={diffuseAccent} cx="18%" cy="26%" opacity={dt.isDark ? 0.12 : 0.15} spread={0.16} radius="42%" />
        </View>

        <View style={styles.washRow}>
          <View style={styles.washIcon}>
            <DiffuseBloomIcon color={diffuseAccent} size={38} intensity={0.5}>
              <HeartLine size={19} color={dt.colors.ink2} strokeWidth={1.6} />
            </DiffuseBloomIcon>
          </View>

          <View style={styles.washBody}>
            {renderHeadline(t(nudge.headlineKey as any), dt.colors.ink, dt.colors.ink3, diffuseFont.display, diffuseFont.italic)}
            <Text style={[styles.washText, { color: dt.colors.ink2, fontFamily: diffuseFont.body }]} numberOfLines={5}>
              {t(nudge.bodyKey as any)}
            </Text>
          </View>

          {ctaLabel ? (
            <View style={styles.washArrow}>
              <DiffuseArrow color={diffuseAccent} size={18} />
            </View>
          ) : null}
        </View>
      </Pressable>
    )
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
          {renderHeadline(t(nudge.headlineKey as any), ink, accent, font.display, font.italic)}
          <Text style={[styles.text, { color: colors.textMuted, fontFamily: font.body }]} numberOfLines={4}>
            {t(nudge.bodyKey as any)}
          </Text>
        </View>

        {nudge.logShortcut ? (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Text style={[styles.from, { color: colors.textMuted, fontFamily: font.bodyBold }]}>
              {t('cycle_nudge_reflect_from' as any)}
            </Text>
            <Text style={[styles.cta, { color: accent, fontFamily: font.bodyBold }]}>
              {t('cycle_nudge_log_it' as any)}
            </Text>
          </View>
        ) : nudge.pillarId ? (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Text style={[styles.from, { color: colors.textMuted, fontFamily: font.bodyBold }]}>
              {t('cycle_nudge_from' as any)}{PILLAR_LABEL_KEY[nudge.pillarId] ? ` · ${t(PILLAR_LABEL_KEY[nudge.pillarId] as any)}` : ''}
            </Text>
            <Text style={[styles.cta, { color: accent, fontFamily: font.bodyBold }]}>
              {t('cycle_nudge_read_more' as any)}
            </Text>
          </View>
        ) : null}
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
  // Diffuse containerless action row
  footerD: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 14, paddingTop: 14, borderTopWidth: 1, gap: 10,
  },
  fromD: { fontSize: 9.5, letterSpacing: 1.4, textTransform: 'uppercase', flexShrink: 1 },
  ctaRowD: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaD: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' },
  // Diffuse soft-wash banner — NO card: no border, no radius, no clip.
  // The bloom bleeds off the edges into the page (washBloom is negative-inset
  // and NOT clipped), so there is no card silhouette.
  wash: { paddingVertical: 20, paddingHorizontal: 4 },
  // Bloom occupies only the top-left region (not the full card) so the radial
  // stays a small corner whisper that feathers into the page.
  washBloom: { position: 'absolute', top: -30, left: -40, width: 220, height: 180 },
  washRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  washIcon: { width: 40, alignItems: 'center', justifyContent: 'center' },
  washBody: { flex: 1, gap: 6 },
  washText: { fontSize: 14, lineHeight: 21 },
  washArrow: { paddingLeft: 6, alignSelf: 'center' },
})
