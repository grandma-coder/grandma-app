/**
 * CycleHomeDetailSheets — tap-through detail sheets for the 4 home cards
 * (YourCycleCard, HormonesCard, WisdomCard, FertileWindowStrip).
 *
 * Reuses the LogSheet shell for consistency with analytics detail sheets.
 */

import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useTheme } from '../../../constants/theme'
import { LogSheet } from '../../calendar/LogSheet'
import { Display, MonoCaps, Body } from '../../ui/Typography'
import { getCycleInfo, type CycleConfig } from '../../../lib/cycleLogic'
export type CycleHomeDetailType = 'cycle'

interface Props {
  type: CycleHomeDetailType | null
  onClose: () => void
  cycleConfig: CycleConfig
}

const TITLES: Record<CycleHomeDetailType, string> = {
  cycle: 'Your Cycle',
}

export function CycleHomeDetailSheet({ type, onClose, cycleConfig }: Props) {
  const visible = type !== null
  const title = type ? TITLES[type] : ''

  return (
    <LogSheet visible={visible} title={title} onClose={onClose}>
      <ScrollView
        style={{ maxHeight: 560 }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {type === 'cycle' && <CycleDetail cycleConfig={cycleConfig} />}
      </ScrollView>
    </LogSheet>
  )
}

// ─── Cycle Detail ─────────────────────────────────────────────────────────

function CycleDetail({ cycleConfig }: { cycleConfig: CycleConfig }) {
  const { colors, stickers, font, isDark } = useTheme()
  const info = getCycleInfo(cycleConfig)
  const ink = isDark ? colors.text : '#141313'

  const nextPeriodLabel = info.nextPeriodDate
    ? new Date(info.nextPeriodDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—'
  const ovDateLabel = info.ovulationDate
    ? new Date(info.ovulationDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—'

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 4 }}>
        <MonoCaps size={10} color={colors.textMuted}>TODAY</MonoCaps>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <Display size={32} color={ink}>{info.phaseLabel}</Display>
          <Body size={14} color={colors.textMuted}>· Day {info.cycleDay}</Body>
        </View>
        <Body size={14} color={colors.textSecondary} style={{ marginTop: 4 }}>
          {info.phaseDescription}
        </Body>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatChip label="NEXT PERIOD" value={nextPeriodLabel} tint={stickers.pinkSoft} />
        <StatChip label="OVULATION" value={ovDateLabel} tint={stickers.greenSoft} />
      </View>

      <TipsSection title="TIPS FOR TODAY" tips={info.dailyTips} />
      <TipsSection title="NUTRITION" tips={info.nutritionTips} />
    </View>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────

function StatChip({ label, value, tint }: { label: string; value: string; tint: string }) {
  const { colors, font, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  return (
    <View style={[detailStyles.statChip, { backgroundColor: tint, borderColor: colors.border }]}>
      <Text style={[detailStyles.statLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>{label}</Text>
      <Text style={[detailStyles.statValue, { color: ink, fontFamily: font.display }]}>{value}</Text>
    </View>
  )
}

function TipsSection({ title, tips }: { title: string; tips: string[] }) {
  const { colors, font, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  if (tips.length === 0) return null
  return (
    <View style={{ gap: 8 }}>
      <Text style={[detailStyles.sectionLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
        {title}
      </Text>
      {tips.map((t, i) => (
        <View key={i} style={detailStyles.tipRow}>
          <Text style={[detailStyles.bullet, { color: colors.textMuted }]}>•</Text>
          <Body size={13} color={colors.textSecondary} style={{ flex: 1 }}>
            {t}
          </Body>
        </View>
      ))}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  body: {
    paddingBottom: 16,
    gap: 16,
  },
})

const detailStyles = StyleSheet.create({
  statChip: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 2,
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 20,
  },
})
