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
import { Flower } from '../../ui/Stickers'
import { getCycleInfo, toDateStr, type CycleConfig } from '../../../lib/cycleLogic'
import { useCycleHistory } from '../../../lib/cycleAnalytics'
export type CycleHomeDetailType = 'cycle' | 'fertile'

interface Props {
  type: CycleHomeDetailType | null
  onClose: () => void
  cycleConfig: CycleConfig
}

const TITLES: Record<CycleHomeDetailType, string> = {
  cycle: 'Your Cycle',
  fertile: 'Fertile Window',
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
        {type === 'fertile' && <FertileDetailBody cycleConfig={cycleConfig} />}
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

// ─── Fertile Detail Body — synchronous render from cycleConfig ───────────
//
// Past-windows list is optional and populated from useCycleHistory when it
// arrives. The current window is always computed synchronously from the
// cycleConfig the parent already derived — no "Loading…" state.

function FertileDetailBody({ cycleConfig }: { cycleConfig: CycleConfig }) {
  const { colors, stickers, isDark } = useTheme()
  const { data: history } = useCycleHistory()
  const ink = isDark ? colors.text : '#141313'

  const info = getCycleInfo(cycleConfig, toDateStr(new Date()))
  const startIso = formatFromCycleDay(cycleConfig.lastPeriodStart!, info.fertileStart - 1)
  const endIso = formatFromCycleDay(cycleConfig.lastPeriodStart!, info.fertileEnd - 1)
  const todayD = new Date(toDateStr(new Date()) + 'T00:00:00')
  const endD = new Date(endIso + 'T00:00:00')
  const daysLeft = Math.max(0, Math.round((endD.getTime() - todayD.getTime()) / 86400000))

  const pastWindows = history
    ? history.cycles
        .slice(-4, -1)
        .filter((c) => c.lengthDays !== null)
        .map((c) => ({
          start: formatFromCycleDay(c.startDate, (c.lengthDays as number) - 14 - 5 - 1),
          end: formatFromCycleDay(c.startDate, (c.lengthDays as number) - 14 + 1 - 1),
          cycleIdx: history.cycles.indexOf(c) + 1,
        }))
    : []

  return (
    <View style={{ gap: 18 }}>
      <View style={[detailStyles.fertileCurrent, { backgroundColor: stickers.pinkSoft, borderColor: colors.border }]}>
        <View style={[detailStyles.fertileChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Flower size={36} petal={stickers.pink} center={stickers.yellow} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <MonoCaps size={10} color={colors.textMuted}>THIS CYCLE</MonoCaps>
          <Display size={20} color={ink}>
            {formatShort(startIso)} – {formatShort(endIso)}
          </Display>
          <Body size={13} color={colors.textSecondary}>
            {daysLeft > 0
              ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
              : 'Window closed'}
          </Body>
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <MonoCaps size={10} color={colors.textMuted}>CONCEPTION PROBABILITY</MonoCaps>
        <Body size={13} color={colors.textSecondary}>
          PEAK is the 1-2 days right before ovulation. HIGH is the 4-day lead-up. Sperm can survive up to 5 days, so logging a few days before ovulation still counts.
        </Body>
      </View>

      {pastWindows.length > 0 && (
        <View style={{ gap: 6 }}>
          <MonoCaps size={10} color={colors.textMuted}>PAST WINDOWS</MonoCaps>
          {pastWindows.map((w) => (
            <View key={w.cycleIdx} style={[detailStyles.historyRow, { borderColor: colors.borderLight }]}>
              <Body size={13} color={ink}>Cycle {w.cycleIdx}</Body>
              <Body size={13} color={colors.textSecondary}>
                {formatShort(w.start)} – {formatShort(w.end)}
              </Body>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function formatFromCycleDay(cycleStart: string, dayOffset: number): string {
  const d = new Date(cycleStart + 'T00:00:00')
  d.setDate(d.getDate() + dayOffset)
  return toDateStr(d)
}

function formatShort(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
  fertileCurrent: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
  },
  fertileChip: {
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})
