/**
 * DailyNudgeCard — full-width nudge on the cycle home.
 *
 * Replaces the legacy yellow WisdomCard with a cream-paper PaperCard.
 * In Slice 1 the picker keys off phase only; Slice 3 makes it log-aware.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Heart } from '../../ui/Stickers'
import { PaperCard } from '../../ui/PaperCard'
import { useTheme } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import type { CyclePhase } from '../../../lib/cycleLogic'
import { pickCycleNudge } from '../../../lib/cycleNudges'

interface Props {
  phase: CyclePhase
}

const PILLAR_LABEL_KEY: Record<string, string> = {
  'fertility': 'cycle_pillar_fertility',
  'nutrition-prep': 'cycle_pillar_nutrition_prep',
  'emotional-readiness': 'cycle_pillar_emotional_readiness',
  'financial-planning': 'cycle_pillar_financial_planning',
  'partner-journey': 'cycle_pillar_partner_journey',
  'health-checkups': 'cycle_pillar_health_checkups',
}

/**
 * Renders the headline with the *…* italic span as Fraunces italic.
 */
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

export function DailyNudgeCard({ phase }: Props) {
  const { colors, stickers, brand, font, radius, isDark } = useTheme()
  const { t } = useTranslation()
  const nudge = pickCycleNudge(phase)
  const ink = isDark ? colors.text : '#141313'
  const accent = isDark ? '#EFA2C2' : brand.prePregnancy

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
              {t('cycle_nudge_from' as any)} · {t(PILLAR_LABEL_KEY[nudge.pillarId] as any)}
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
