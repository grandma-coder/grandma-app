import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useChildStore } from '../../store/useChildStore'

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

export default function Profile() {
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Profile</Text>

      {child ? (
        <View style={styles.card}>
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
                <Ionicons name="calendar-outline" size={16} color="#888" />
                <Text style={styles.infoText}>{child.birthDate}</Text>
              </View>
            ) : null}
            {child.weightKg > 0 ? (
              <View style={styles.infoItem}>
                <Ionicons name="scale-outline" size={16} color="#888" />
                <Text style={styles.infoText}>{child.weightKg} kg</Text>
              </View>
            ) : null}
            {child.heightCm > 0 ? (
              <View style={styles.infoItem}>
                <Ionicons name="resize-outline" size={16} color="#888" />
                <Text style={styles.infoText}>{child.heightCm} cm</Text>
              </View>
            ) : null}
          </View>

          {child.allergies.length > 0 && (
            <View style={styles.allergiesRow}>
              <Ionicons name="warning-outline" size={16} color="#E07000" />
              <Text style={styles.allergiesText}>
                {child.allergies.join(', ')}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => router.push('/onboarding')}
          style={styles.addChildButton}
        >
          <Text style={styles.addChildText}>Add your child's profile</Text>
        </TouchableOpacity>
      )}

      {/* Caregivers — only for parents */}
      {child && child.caregiverRole === 'parent' && (
        <TouchableOpacity
          onPress={() => router.push('/manage-caregivers')}
          style={styles.caregiverButton}
        >
          <Ionicons name="people-outline" size={20} color="#7BAE8E" />
          <Text style={styles.caregiverButtonText}>Manage caregivers</Text>
          <Ionicons name="chevron-forward" size={18} color="#aaa" />
        </TouchableOpacity>
      )}

      {child && child.caregiverRole !== 'parent' && (
        <View style={styles.roleBadge}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#7BAE8E" />
          <Text style={styles.roleBadgeText}>
            You're a {child.caregiverRole} for {child.name}
          </Text>
        </View>
      )}

      {/* Scan History */}
      <Text style={styles.sectionTitle}>SCAN HISTORY</Text>
      {scans.length > 0 ? (
        scans.map(scan => (
          <View key={scan.id} style={styles.scanItem}>
            <Ionicons name="scan-outline" size={18} color="#7BAE8E" />
            <View style={{ flex: 1 }}>
              <Text style={styles.scanLabel}>{scanTypeLabel[scan.scan_type] ?? scan.scan_type}</Text>
              <Text style={styles.scanDate}>
                {new Date(scan.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="camera-outline" size={32} color="#ccc" />
          <Text style={styles.emptyText}>No scans yet</Text>
          <Text style={styles.emptySubtext}>Scan a medicine or food label to see history here</Text>
        </View>
      )}

      {/* Sign out */}
      <TouchableOpacity
        onPress={() => Alert.alert('Sign out', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign out', onPress: signOut, style: 'destructive' },
        ])}
        style={styles.signOutButton}
      >
        <Ionicons name="log-out-outline" size={18} color="#888" />
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F4' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  heading: { fontSize: 26, fontWeight: '600', color: '#1A1A2E', marginBottom: 24 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8E4DC',
    marginBottom: 24,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#E1F5EE', alignItems: 'center', justifyContent: 'center',
  },
  childName: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  childAge: { fontSize: 14, color: '#7BAE8E', fontWeight: '600', marginTop: 2 },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 14, color: '#555' },

  allergiesRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF7ED', borderRadius: 8, padding: 10,
  },
  allergiesText: { fontSize: 13, color: '#E07000', flex: 1 },

  addChildButton: {
    backgroundColor: '#7BAE8E', borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 24,
  },
  addChildText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: '#888',
    letterSpacing: 0.5, marginBottom: 12,
  },
  scanItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E8E4DC', marginBottom: 8,
  },
  scanLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  scanDate: { fontSize: 12, color: '#888', marginTop: 2 },

  emptyState: { alignItems: 'center', padding: 24, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#aaa' },
  emptySubtext: { fontSize: 13, color: '#ccc', textAlign: 'center' },

  caregiverButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E8E4DC', marginBottom: 24,
  },
  caregiverButtonText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A1A2E' },

  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E1F5EE', borderRadius: 12, padding: 14,
    marginBottom: 24,
  },
  roleBadgeText: { fontSize: 14, color: '#15803D' },

  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: '#E8E4DC', borderRadius: 12,
    padding: 16, marginTop: 24,
  },
  signOutText: { color: '#888', fontSize: 15 },
})
