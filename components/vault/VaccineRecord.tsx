import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PaperCard } from '../ui/PaperCard'
import { useTheme } from '../../constants/theme'

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
  const { colors } = useTheme()
  if (vaccines.length === 0) {
    return (
      <PaperCard radius={28} padding={20} style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Vaccine Records</Text>
        </View>
        <View style={styles.empty}>
          <Ionicons name="medical-outline" size={28} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No vaccines recorded yet</Text>
        </View>
      </PaperCard>
    )
  }

  return (
    <PaperCard radius={28} padding={20} style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Vaccine Records</Text>
        <Text style={[styles.count, { color: colors.textMuted }]}>{vaccines.length} recorded</Text>
      </View>

      {vaccines.map((v) => (
        <View key={v.id} style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={[styles.checkCircle, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}>
            {v.administeredDate ? (
              <Ionicons name="checkmark" size={14} color={colors.success} />
            ) : (
              <View style={[styles.pendingDot, { backgroundColor: colors.warning }]} />
            )}
          </View>
          <View style={styles.rowContent}>
            <Text style={[styles.vaccineName, { color: colors.text }]}>
              {v.vaccineName} — Dose {v.doseNumber}
            </Text>
            {v.administeredDate ? (
              <Text style={[styles.dateText, { color: colors.textMuted }]}>
                Given: {formatDate(v.administeredDate)}
                {v.provider ? ` · ${v.provider}` : ''}
              </Text>
            ) : v.nextDueDate ? (
              <Text style={[styles.dueText, { color: colors.warning }]}>
                Due: {formatDate(v.nextDueDate)}
              </Text>
            ) : (
              <Text style={[styles.dateText, { color: colors.textMuted }]}>Not yet scheduled</Text>
            )}
          </View>
        </View>
      ))}
    </PaperCard>
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
  },
  count: {
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 2,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowContent: {
    flex: 1,
  },
  vaccineName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
  },
  dueText: {
    fontSize: 12,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },
})
