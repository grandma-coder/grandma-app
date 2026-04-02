import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors } from '../../constants/theme'

interface PartnerDashboardProps {
  weekNumber: number
  partnerName?: string
}

const PARTNER_TIPS: Record<number, string> = {
  1: "Be patient and supportive — she may not even know yet.",
  8: "Morning sickness is tough. Offer ginger tea and crackers without being asked.",
  12: "The first trimester exhaustion is real. Take on extra household tasks.",
  16: "Go to ultrasound appointments together. It makes a world of difference.",
  20: "Halfway there! Plan a babymoon — a last trip before the baby arrives.",
  24: "Start reading about labor and birth. She needs you to be prepared too.",
  28: "Help set up the nursery. Your involvement shows you're ready.",
  32: "Practice the hospital drive route. Know where to park.",
  36: "Pack your hospital bag too. You'll need snacks, a charger, and a change of clothes.",
  40: "Be her rock. She's about to do the most incredible thing. Tell her she's amazing.",
}

function getPartnerTip(week: number): string {
  const keys = Object.keys(PARTNER_TIPS).map(Number).sort((a, b) => a - b)
  let tip = PARTNER_TIPS[keys[0]]
  for (const k of keys) {
    if (week >= k) tip = PARTNER_TIPS[k]
    else break
  }
  return tip
}

export function PartnerDashboard({ weekNumber, partnerName }: PartnerDashboardProps) {
  const tip = getPartnerTip(weekNumber)

  return (
    <GlassCard>
      <View style={styles.header}>
        <Ionicons name="heart" size={20} color={colors.accent} />
        <Text style={styles.title}>
          {partnerName ? `For ${partnerName}` : 'Partner\'s Corner'}
        </Text>
      </View>

      <Text style={styles.weekLabel}>WEEK {weekNumber} TIP</Text>
      <Text style={styles.tip}>{tip}</Text>

      <View style={styles.actionRow}>
        <View style={styles.actionItem}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.actionText}>Shared appointments</Text>
        </View>
        <View style={styles.actionItem}>
          <Ionicons name="book-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.actionText}>Partner's guide</Text>
        </View>
      </View>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  weekLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  tip: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
})
