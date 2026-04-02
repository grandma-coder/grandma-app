import { View, Text, Pressable, StyleSheet, Share } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, borderRadius, shadows } from '../../constants/theme'

export interface EmergencyCardData {
  bloodType?: string
  allergies?: string[]
  medicalConditions?: string[]
  primaryContactName?: string
  primaryContactPhone?: string
  pediatricianName?: string
  pediatricianPhone?: string
}

interface EmergencyCardProps {
  data: EmergencyCardData
  childName: string
  onEdit?: () => void
}

export function EmergencyCard({ data, childName, onEdit }: EmergencyCardProps) {
  async function handleBroadcast() {
    const lines = [
      `EMERGENCY CARD — ${childName}`,
      data.bloodType ? `Blood Type: ${data.bloodType}` : null,
      data.allergies?.length ? `Allergies: ${data.allergies.join(', ')}` : null,
      data.medicalConditions?.length ? `Conditions: ${data.medicalConditions.join(', ')}` : null,
      data.primaryContactName ? `Contact: ${data.primaryContactName} ${data.primaryContactPhone ?? ''}` : null,
      data.pediatricianName ? `Pediatrician: ${data.pediatricianName} ${data.pediatricianPhone ?? ''}` : null,
    ].filter(Boolean)

    await Share.share({ message: lines.join('\n') })
  }

  const isEmpty = !data.bloodType && !data.allergies?.length && !data.primaryContactName

  return (
    <LinearGradient
      colors={['#1A2540', '#141829']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, shadows.card]}
    >
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={22} color={colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Emergency Card</Text>
          <Text style={styles.subtitle}>CRUCIAL MEDICAL PROFILE</Text>
        </View>
        {onEdit && (
          <Pressable onPress={onEdit} style={styles.editBtn}>
            <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {isEmpty ? (
        <Text style={styles.emptyText}>
          Tap edit to add blood type, allergies, and emergency contacts.
        </Text>
      ) : (
        <>
          {/* Broadcast button */}
          <Pressable onPress={handleBroadcast} style={styles.broadcastBtn}>
            <Ionicons name="share-outline" size={16} color={colors.accent} />
            <Text style={styles.broadcastText}>Broadcast to EMS</Text>
          </Pressable>

          {/* Blood type */}
          {data.bloodType && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>BLOOD TYPE</Text>
              <Text style={styles.fieldValueLarge}>{data.bloodType}</Text>
            </View>
          )}

          {/* Allergies */}
          {data.allergies && data.allergies.length > 0 && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>KNOWN ALLERGIES</Text>
              <View style={styles.tagRow}>
                {data.allergies.map((a, i) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Primary contact */}
          {data.primaryContactName && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>PRIMARY CONTACT</Text>
              <Text style={styles.fieldValue}>{data.primaryContactName}</Text>
              {data.primaryContactPhone && (
                <Text style={styles.fieldPhone}>{data.primaryContactPhone}</Text>
              )}
            </View>
          )}
        </>
      )}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 199, 84, 0.15)',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 1,
    marginTop: 2,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textTertiary,
    lineHeight: 18,
  },
  broadcastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.accentMuted,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    marginBottom: 16,
  },
  broadcastText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  fieldValueLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  fieldPhone: {
    fontSize: 14,
    color: colors.accent,
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tag: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
})
