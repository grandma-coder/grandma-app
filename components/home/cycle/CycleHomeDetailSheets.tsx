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
import { Heart, Flower } from '../../ui/Stickers'
import { getCycleInfo, type CycleConfig, type CyclePhase } from '../../../lib/cycleLogic'
import { useFertileWindow } from '../../../lib/cycleAnalytics'

export type CycleHomeDetailType = 'cycle' | 'hormones' | 'wisdom' | 'fertile'

interface Props {
  type: CycleHomeDetailType | null
  onClose: () => void
  cycleConfig: CycleConfig
}

const TITLES: Record<CycleHomeDetailType, string> = {
  cycle: 'Your Cycle',
  hormones: 'Hormones',
  wisdom: 'Daily Wisdom',
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
        {type === 'hormones' && <HormonesDetail cycleConfig={cycleConfig} />}
        {type === 'wisdom' && <WisdomDetail cycleConfig={cycleConfig} />}
        {type === 'fertile' && <FertileDetailBody />}
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

// ─── Hormones Detail ──────────────────────────────────────────────────────

function HormonesDetail({ cycleConfig }: { cycleConfig: CycleConfig }) {
  const { colors, stickers, isDark } = useTheme()
  const info = getCycleInfo(cycleConfig)
  const ink = isDark ? colors.text : '#141313'

  const blurbs = [
    {
      color: stickers.coral,
      name: 'LH',
      subtitle: 'Luteinizing Hormone',
      blurb: 'Spikes just before ovulation, triggering the ovary to release the egg. The classic "LH surge" that ovulation kits detect.',
    },
    {
      color: stickers.lilac,
      name: 'E',
      subtitle: 'Estrogen',
      blurb: 'Rises through the follicular phase, peaks before ovulation, and rises again mid-luteal. Shapes mood, energy, and cervical fluid.',
    },
    {
      color: stickers.green,
      name: 'P',
      subtitle: 'Progesterone',
      blurb: 'Rises after ovulation. Keeps the uterine lining stable. Drops sharply before your next period — which is what triggers bleeding.',
    },
  ]

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 4 }}>
        <MonoCaps size={10} color={colors.textMuted}>TODAY'S CONTEXT</MonoCaps>
        <Display size={22} color={ink}>
          {info.phaseLabel} · Day {info.cycleDay}
        </Display>
        <Body size={13} color={colors.textSecondary} style={{ marginTop: 4 }}>
          {hormoneContext(info.phase)}
        </Body>
      </View>

      <View style={{ gap: 12 }}>
        {blurbs.map((b) => (
          <View key={b.name} style={[detailStyles.hormoneRow, { borderColor: colors.border }]}>
            <View style={[detailStyles.colorChip, { backgroundColor: b.color }]} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Display size={18} color={ink}>{b.name}</Display>
                <Body size={12} color={colors.textMuted}>{b.subtitle}</Body>
              </View>
              <Body size={13} color={colors.textSecondary} style={{ marginTop: 4 }}>
                {b.blurb}
              </Body>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

function hormoneContext(phase: CyclePhase): string {
  switch (phase) {
    case 'menstruation': return 'Estrogen and progesterone are at their lowest. Energy and mood often dip — rest is the point.'
    case 'follicular':   return 'Estrogen climbs. You may feel brighter, more sociable, more physically capable.'
    case 'ovulation':    return 'LH surges, estrogen peaks. Libido, confidence, and fertility are all highest right now.'
    case 'luteal':       return 'Progesterone rises after ovulation. Late luteal drops can bring PMS as your body prepares to shed the lining.'
  }
}

// ─── Wisdom Detail ────────────────────────────────────────────────────────

function WisdomDetail({ cycleConfig }: { cycleConfig: CycleConfig }) {
  const { colors, stickers, isDark } = useTheme()
  const info = getCycleInfo(cycleConfig)
  const ink = isDark ? colors.text : '#141313'

  return (
    <View style={{ gap: 18 }}>
      <View style={[detailStyles.quoteCard, { backgroundColor: stickers.yellow }]}>
        <Heart size={22} fill={stickers.pink} />
        <Body size={14} color="rgba(20,19,19,0.85)" style={{ marginTop: 10, fontStyle: 'italic' }}>
          "{PHASE_QUOTE[info.phase]}"
        </Body>
      </View>

      <TipsSection title="ACTIVITIES FOR THIS PHASE" tips={info.activities} />
      <TipsSection title="DAILY TIPS" tips={info.dailyTips} />
    </View>
  )
}

const PHASE_QUOTE: Record<CyclePhase, string> = {
  menstruation: 'Rest well today — your body is working hard, dear.',
  follicular: 'Energy is rising — a good time to plan something new.',
  ovulation: 'Peak bloom, dear. Today is a day for joy.',
  luteal: 'Rest well tonight — tomorrow matters, dear.',
}

// ─── Fertile Detail Body (reuses useFertileWindow hook) ───────────────────

function FertileDetailBody() {
  const { colors, stickers, isDark } = useTheme()
  const { data, isLoading } = useFertileWindow()
  const ink = isDark ? colors.text : '#141313'

  if (isLoading) return <Body size={14} color={colors.textMuted} align="center">Loading…</Body>
  if (!data || !data.current) {
    return (
      <Body size={14} color={colors.textMuted} align="center">
        Log a period start to see your fertile window predictions.
      </Body>
    )
  }

  return (
    <View style={{ gap: 18 }}>
      <View style={[detailStyles.fertileCurrent, { backgroundColor: stickers.pinkSoft, borderColor: colors.border }]}>
        <View style={[detailStyles.fertileChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Flower size={36} petal={stickers.pink} center={stickers.yellow} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <MonoCaps size={10} color={colors.textMuted}>THIS CYCLE</MonoCaps>
          <Display size={20} color={ink}>
            {formatShort(data.current.start)} – {formatShort(data.current.end)}
          </Display>
          <Body size={13} color={colors.textSecondary}>
            {data.current.daysLeft > 0
              ? `${data.current.daysLeft} day${data.current.daysLeft === 1 ? '' : 's'} left`
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

      {data.history.length > 0 && (
        <View style={{ gap: 6 }}>
          <MonoCaps size={10} color={colors.textMuted}>PAST WINDOWS</MonoCaps>
          {data.history.map((w) => (
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
  hormoneRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  colorChip: {
    width: 18,
    height: 18,
    borderRadius: 999,
    marginTop: 4,
  },
  quoteCard: {
    padding: 18,
    borderRadius: 22,
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
