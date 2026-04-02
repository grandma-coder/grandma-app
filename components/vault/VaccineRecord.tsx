import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors, borderRadius } from '../../constants/theme'

export interface VaccineEntry {
  id: string
  vaccineName: string
  doseNumber: number
  administeredDate?: string
  nextDueDate?: string
  provider?: string
}

interface VaccineRecordProps {
  vaccines: VaccineEntry[]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function VaccineRecord({ vaccines }: VaccineRecordProps) {
  if (vaccines.length === 0) {
    return (
      <GlassCard style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Vaccine Records</Text>
        </View>
        <View style={styles.empty}>
          <Ionicons name="medical-outline" size={28} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No vaccines recorded yet</Text>
        </View>
      </GlassCard>
    )
  }

  return (
    <GlassCard style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vaccine Records</Text>
        <Text style={styles.count}>{vaccines.length} recorded</Text>
      </View>

      {vaccines.map((v) => (
        <View key={v.id} style={styles.row}>
          <View style={styles.checkCircle}>
            {v.administeredDate ? (
              <Ionicons name="checkmark" size={14} color={colors.success} />
            ) : (
              <View style={styles.pendingDot} />
            )}
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.vaccineName}>
              {v.vaccineName} — Dose {v.doseNumber}
            </Text>
            {v.administeredDate ? (
              <Text style={styles.dateText}>
                Given: {formatDate(v.administeredDate)}
                {v.provider ? ` · ${v.provider}` : ''}
              </Text>
            ) : v.nextDueDate ? (
              <Text style={styles.dueText}>
                Due: {formatDate(v.nextDueDate)}
              </Text>
            ) : (
              <Text style={styles.dateText}>Not yet scheduled</Text>
            )}
          </View>
        </View>
      ))}
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  count: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  rowContent: {
    flex: 1,
  },
  vaccineName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  dueText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textTertiary,
  },
})
