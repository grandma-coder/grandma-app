import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Syringe, Check } from 'lucide-react-native'
import { PaperCard } from '../ui/PaperCard'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon, DiffuseEmptyState } from '../ui/diffuse/DiffusePrimitives'
import { useTranslation } from '../../lib/i18n'

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
  const dt = useDiffuseTheme()
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  if (vaccines.length === 0) {
    return (
      <PaperCard
        radius={28}
        padding={20}
        style={styles.container}
        {...(diffuse ? { flat: true, tint: dt.colors.surface, borderColor: dt.colors.line } : {})}
      >
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              diffuse
                ? { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400', letterSpacing: -0.3 }
                : { color: colors.text },
            ]}
          >
            {t('vault_vaccineRecords')}
          </Text>
        </View>
        {diffuse ? (
          <DiffuseEmptyState
            icon={<Syringe size={26} color={dt.colors.ink3} strokeWidth={1.6} />}
            title={t('vault_noVaccinesYet')}
          />
        ) : (
          <View style={styles.empty}>
            <Ionicons name="medical-outline" size={28} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('vault_noVaccinesYet')}</Text>
          </View>
        )}
      </PaperCard>
    )
  }

  return (
    <PaperCard
      radius={28}
      padding={20}
      style={styles.container}
      {...(diffuse ? { flat: true, tint: dt.colors.surface, borderColor: dt.colors.line } : {})}
    >
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            diffuse
              ? { color: dt.colors.ink, fontFamily: diffuseFont.display, fontWeight: '400', letterSpacing: -0.3 }
              : { color: colors.text },
          ]}
        >
          {t('vault_vaccineRecords')}
        </Text>
        <Text
          style={[
            styles.count,
            diffuse
              ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }
              : { color: colors.textMuted },
          ]}
        >
          {t('vault_vaccineRecorded', { count: vaccines.length })}
        </Text>
      </View>

      {vaccines.map((v) => (
        <View key={v.id} style={[styles.row, { borderBottomColor: diffuse ? dt.colors.line : colors.border }]}>
          {diffuse ? (
            <View style={[styles.checkCircleDiffuse, { borderColor: dt.colors.line2 }]}>
              {v.administeredDate ? (
                <Check size={13} color={dt.colors.success} strokeWidth={2.2} />
              ) : (
                <View style={[styles.pendingDot, { backgroundColor: dt.colors.warning }]} />
              )}
            </View>
          ) : (
            <View style={[styles.checkCircle, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}>
              {v.administeredDate ? (
                <Ionicons name="checkmark" size={14} color={colors.success} />
              ) : (
                <View style={[styles.pendingDot, { backgroundColor: colors.warning }]} />
              )}
            </View>
          )}
          <View style={styles.rowContent}>
            <Text
              style={[
                styles.vaccineName,
                diffuse
                  ? { color: dt.colors.ink, fontFamily: diffuseFont.bodySemiBold }
                  : { color: colors.text },
              ]}
            >
              {t('vault_vaccineDose', { name: v.vaccineName, n: v.doseNumber })}
            </Text>
            {v.administeredDate ? (
              <Text
                style={[
                  styles.dateText,
                  diffuse
                    ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.8, textTransform: 'uppercase' }
                    : { color: colors.textMuted },
                ]}
              >
                {t('vault_vaccineGiven', { date: formatDate(v.administeredDate) })}
                {v.provider ? ` · ${v.provider}` : ''}
              </Text>
            ) : v.nextDueDate ? (
              <Text
                style={[
                  styles.dueText,
                  diffuse
                    ? { color: dt.colors.warning, fontFamily: diffuseFont.mono, letterSpacing: 0.8, textTransform: 'uppercase' }
                    : { color: colors.warning },
                ]}
              >
                {t('vault_vaccineDue', { date: formatDate(v.nextDueDate) })}
              </Text>
            ) : (
              <Text
                style={[
                  styles.dateText,
                  diffuse
                    ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.8, textTransform: 'uppercase' }
                    : { color: colors.textMuted },
                ]}
              >
                {t('vault_vaccineNotScheduled')}
              </Text>
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
  checkCircleDiffuse: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 2,
    backgroundColor: 'transparent',
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
