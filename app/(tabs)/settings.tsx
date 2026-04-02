import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useChildStore } from '../../store/useChildStore'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { GlassCard } from '../../components/ui/GlassCard'
import { colors, typography, spacing, borderRadius } from '../../constants/theme'

interface ScanEntry {
  id: string
  scan_type: string
  created_at: string
}

function getAge(birthDate: string): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const now = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (months < 1) return 'Newborn'
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} old`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem > 0 ? `${years}y ${rem}m old` : `${years} year${years > 1 ? 's' : ''} old`
}

const scanTypeLabel: Record<string, string> = {
  medicine: 'Medicine scan',
  food: 'Food scan',
  nutrition: 'Nutrition check',
  general: 'General scan',
}

export default function Settings() {
  const insets = useSafeAreaInsets()
  const child = useChildStore((s) => s.activeChild)
  const clearChildren = useChildStore((s) => s.clearChildren)
  const [scans, setScans] = useState<ScanEntry[]>([])

  useEffect(() => {
    if (!child?.id) return
    supabase
      .from('scan_history')
      .select('id, scan_type, created_at')
      .eq('child_id', child.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setScans(data)
      })
  }, [child?.id])

  async function signOut() {
    await supabase.auth.signOut()
    clearChildren()
  }

  return (
    <CosmicBackground>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
      >
        <Text style={styles.heading}>Settings</Text>

        {child ? (
          <GlassCard>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Text style={{ fontSize: 28 }}>👶</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.childName}>{child.name}</Text>
                {child.birthDate ? (
                  <Text style={styles.childAge}>{getAge(child.birthDate)}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.infoGrid}>
              {child.birthDate ? (
                <View style={styles.infoItem}>
                  <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{child.birthDate}</Text>
                </View>
              ) : null}
              {child.weightKg > 0 ? (
                <View style={styles.infoItem}>
                  <Ionicons name="scale-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{child.weightKg} kg</Text>
                </View>
              ) : null}
              {child.heightCm > 0 ? (
                <View style={styles.infoItem}>
                  <Ionicons name="resize-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{child.heightCm} cm</Text>
                </View>
              ) : null}
            </View>

            {child.allergies.length > 0 && (
              <View style={styles.allergiesRow}>
                <Ionicons name="warning-outline" size={16} color={colors.warning} />
                <Text style={styles.allergiesText}>
                  {child.allergies.join(', ')}
                </Text>
              </View>
            )}
          </GlassCard>
        ) : (
          <Pressable
            onPress={() => router.push('/onboarding/journey')}
            style={styles.addChildButton}
          >
            <Text style={styles.addChildText}>Add your child's profile</Text>
          </Pressable>
        )}

        {/* Caregivers — parents only */}
        {child && child.caregiverRole === 'parent' && (
          <Pressable
            onPress={() => router.push('/manage-caregivers')}
            style={styles.menuItem}
          >
            <Ionicons name="people-outline" size={20} color={colors.accent} />
            <Text style={styles.menuItemText}>Manage caregivers</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        )}

        {child && child.caregiverRole !== 'parent' && (
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
            <Text style={styles.roleBadgeText}>
              You're a {child.caregiverRole} for {child.name}
            </Text>
          </View>
        )}

        {/* Scan History */}
        <Text style={styles.sectionTitle}>SCAN HISTORY</Text>
        {scans.length > 0 ? (
          scans.map((scan) => (
            <View key={scan.id} style={styles.scanItem}>
              <Ionicons name="scan-outline" size={18} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.scanLabel}>
                  {scanTypeLabel[scan.scan_type] ?? scan.scan_type}
                </Text>
                <Text style={styles.scanDate}>
                  {new Date(scan.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="camera-outline" size={32} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No scans yet</Text>
            <Text style={styles.emptySubtext}>
              Scan a medicine or food label to see history here
            </Text>
          </View>
        )}

        {/* Sign out */}
        <Pressable
          onPress={() =>
            Alert.alert('Sign out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', onPress: signOut, style: 'destructive' },
            ])
          }
          style={styles.signOutButton}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing['2xl'],
  },
  heading: {
    ...typography.heading,
    marginBottom: 24,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  childAge: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  allergiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 8,
    padding: 10,
  },
  allergiesText: {
    fontSize: 13,
    color: colors.warning,
    flex: 1,
  },
  addChildButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  addChildText: {
    color: colors.textOnAccent,
    fontSize: 16,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 16,
    marginBottom: 24,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderRadius: borderRadius.md,
    padding: 14,
    marginTop: 16,
    marginBottom: 24,
  },
  roleBadgeText: {
    fontSize: 14,
    color: colors.success,
  },
  sectionTitle: {
    ...typography.label,
    marginBottom: 12,
    marginTop: 8,
  },
  scanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  scanLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  scanDate: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 16,
    marginTop: 24,
  },
  signOutText: {
    color: colors.error,
    fontSize: 15,
  },
})
