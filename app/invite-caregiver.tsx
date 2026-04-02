import { useState } from 'react'
import { View, Text, TextInput, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useChildStore } from '../store/useChildStore'
import { colors } from '../constants/theme'

const ROLES = [
  { id: 'nanny', label: 'Nanny', icon: '👩‍🍼' },
  { id: 'family', label: 'Family', icon: '👨‍👩‍👦' },
]

export default function InviteCaregiver() {
  const child = useChildStore((s) => s.activeChild)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('nanny')
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  async function handleInvite() {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address')
      return
    }
    if (!child?.id) return

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('invite-caregiver', {
        body: {
          childId: child.id,
          email: email.trim().toLowerCase(),
          role,
        },
      })

      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)

      const link = `grandma-app://invite/${data.inviteToken}`
      setInviteLink(link)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    if (!inviteLink) return
    await Clipboard.setStringAsync(inviteLink)
    Alert.alert('Copied!', 'Share this link with the caregiver')
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.textTertiary} />
        </Pressable>
      </View>

      {!inviteLink ? (
        <>
          <Text style={styles.title}>Invite a caregiver</Text>
          <Text style={styles.subtitle}>
            They'll get access to {child?.name ?? "your child"}'s profile
          </Text>

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="nanny@email.com"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>ROLE</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => setRole(r.id)}
                style={[styles.roleChip, role === r.id && styles.roleChipActive]}
              >
                <Text style={styles.roleIcon}>{r.icon}</Text>
                <Text style={[styles.roleLabel, role === r.id && styles.roleLabelActive]}>
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleInvite}
            disabled={loading}
            style={[styles.sendButton, loading && { opacity: 0.6 }]}
          >
            {loading ? (
              <ActivityIndicator color={colors.textOnAccent} />
            ) : (
              <Text style={styles.sendText}>Send invite</Text>
            )}
          </Pressable>
        </>
      ) : (
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.title}>Invite sent!</Text>
          <Text style={styles.subtitle}>
            Share this link with {email}
          </Text>

          <Pressable onPress={copyLink} style={styles.linkCard}>
            <Text style={styles.linkText} numberOfLines={2}>{inviteLink}</Text>
            <Ionicons name="copy-outline" size={20} color={colors.accent} />
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.doneButton}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, paddingTop: 60 },
  header: { alignItems: 'flex-end', marginBottom: 16 },
  closeButton: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 26, fontWeight: '900', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.textTertiary, marginBottom: 28, lineHeight: 22 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textTertiary, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 40,
    paddingHorizontal: 24, height: 80, fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 24,
  },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  roleChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 128, borderRadius: 40, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
  },
  roleChipActive: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  roleIcon: { fontSize: 20 },
  roleLabel: { fontSize: 14, fontWeight: '600', color: colors.textTertiary },
  roleLabelActive: { color: colors.accent },
  sendButton: {
    backgroundColor: colors.accent, borderRadius: 48, height: 96, justifyContent: 'center', alignItems: 'center',
  },
  sendText: { color: colors.textOnAccent, fontSize: 16, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  successContainer: { alignItems: 'center', paddingTop: 40 },
  successEmoji: { fontSize: 48, marginBottom: 16 },
  linkCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%',
    backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginTop: 20, marginBottom: 24,
  },
  linkText: { flex: 1, fontSize: 13, color: colors.textTertiary },
  doneButton: { paddingVertical: 12 },
  doneText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
})
