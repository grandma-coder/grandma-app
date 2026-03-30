import { useEffect, useState } from 'react'
import { View, Text, Pressable, FlatList, Alert, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useChildStore } from '../store/useChildStore'

interface CaregiverRow {
  id: string
  email: string
  role: string
  status: string
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#FAEEDA',
  accepted: '#E1F5EE',
  revoked: '#FECACA',
}

const STATUS_TEXT_COLORS: Record<string, string> = {
  pending: '#B45309',
  accepted: '#15803D',
  revoked: '#DC2626',
}

export default function ManageCaregivers() {
  const child = useChildStore((s) => s.activeChild)
  const [caregivers, setCaregivers] = useState<CaregiverRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!child?.id) return
    supabase
      .from('child_caregivers')
      .select('id, email, role, status, created_at')
      .eq('child_id', child.id)
      .neq('role', 'parent')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCaregivers(data ?? [])
        setLoading(false)
      })
  }, [child?.id])

  async function revoke(id: string) {
    Alert.alert('Revoke access', 'This person will lose access to your child\'s data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          await supabase
            .from('child_caregivers')
            .update({ status: 'revoked' })
            .eq('id', id)
          setCaregivers((prev) => prev.map((c) => c.id === id ? { ...c, status: 'revoked' } : c))
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </Pressable>
        <Text style={styles.title}>Caregivers</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>
        People who can help care for {child?.name ?? 'your child'}
      </Text>

      <Pressable
        onPress={() => router.push('/invite-caregiver')}
        style={styles.inviteButton}
      >
        <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
        <Text style={styles.inviteText}>Invite a caregiver</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator size="large" color="#7BAE8E" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={caregivers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color="#E8E4DC" />
              <Text style={styles.emptyTitle}>No caregivers yet</Text>
              <Text style={styles.emptySubtitle}>Invite a nanny or family member</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.avatar}>
                  <Ionicons name="person-outline" size={20} color="#888" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.email}>{item.email}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <Text style={styles.role}>{item.role}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] ?? '#F5F5F5' }]}>
                      <Text style={[styles.statusText, { color: STATUS_TEXT_COLORS[item.status] ?? '#888' }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              {item.status !== 'revoked' && (
                <Pressable onPress={() => revoke(item.id)} style={styles.revokeButton}>
                  <Ionicons name="close-circle-outline" size={22} color="#DC2626" />
                </Pressable>
              )}
            </View>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F4' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 8,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E8E4DC',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  subtitle: { fontSize: 14, color: '#888', paddingHorizontal: 24, marginBottom: 20 },
  inviteButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#7BAE8E', borderRadius: 16, paddingVertical: 14,
    marginHorizontal: 24, marginBottom: 24,
  },
  inviteText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E8E4DC', marginBottom: 10,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
  },
  email: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  role: { fontSize: 12, color: '#888', textTransform: 'capitalize' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  revokeButton: { padding: 8 },
  emptyState: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#888' },
  emptySubtitle: { fontSize: 13, color: '#ccc' },
})
