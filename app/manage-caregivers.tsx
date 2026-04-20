import { useEffect, useState } from 'react'
import { View, Text, Pressable, FlatList, Alert, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useChildStore } from '../store/useChildStore'
import { colors } from '../constants/theme'
import { BrandedLoader } from '../components/ui/BrandedLoader'

interface CaregiverRow {
  id: string
  email: string
  role: string
  status: string
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'rgba(253, 186, 116, 0.15)',
  accepted: colors.accentMuted,
  revoked: 'rgba(248, 113, 113, 0.15)',
}

const STATUS_TEXT_COLORS: Record<string, string> = {
  pending: colors.warning,
  accepted: colors.success,
  revoked: colors.error,
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
          <Ionicons name="arrow-back" size={24} color={colors.text} />
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
        <Ionicons name="person-add-outline" size={20} color={colors.textOnAccent} />
        <Text style={styles.inviteText}>Invite a caregiver</Text>
      </Pressable>

      {loading ? (
        <View style={{ marginTop: 40 }}>
          <BrandedLoader logoSize={72} />
        </View>
      ) : (
        <FlatList
          data={caregivers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color={colors.border} />
              <Text style={styles.emptyTitle}>No caregivers yet</Text>
              <Text style={styles.emptySubtitle}>Invite a nanny or family member</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.avatar}>
                  <Ionicons name="person-outline" size={20} color={colors.textTertiary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.email}>{item.email}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <Text style={styles.role}>{item.role}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] ?? colors.surfaceLight }]}>
                      <Text style={[styles.statusText, { color: STATUS_TEXT_COLORS[item.status] ?? colors.textTertiary }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              {item.status !== 'revoked' && (
                <Pressable onPress={() => revoke(item.id)} style={styles.revokeButton}>
                  <Ionicons name="close-circle-outline" size={22} color={colors.error} />
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
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 8,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textTertiary, paddingHorizontal: 24, marginBottom: 20 },
  inviteButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 14,
    marginHorizontal: 24, marginBottom: 24,
  },
  inviteText: { color: colors.textOnAccent, fontSize: 15, fontWeight: '600' },
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginBottom: 10,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
  },
  email: { fontSize: 14, fontWeight: '600', color: colors.text },
  role: { fontSize: 12, color: colors.textTertiary, textTransform: 'capitalize' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  revokeButton: { padding: 8 },
  emptyState: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textTertiary },
  emptySubtitle: { fontSize: 13, color: colors.textTertiary },
})
