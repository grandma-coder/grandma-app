import { useState } from 'react'
import { View, Text, TextInput, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { useChildStore } from '../store/useChildStore'
import { colors, THEME_COLORS, borderRadius, shadows } from '../constants/theme'

const ROLES = [
  { id: 'nanny', label: 'Nanny', icon: 'person-outline' as const },
  { id: 'family', label: 'Family', icon: 'people-outline' as const },
]

export default function InviteCaregiver() {
  const insets = useSafeAreaInsets()
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
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      {/* Close button top-right */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={22} color={colors.textTertiary} />
        </Pressable>
      </View>

      {!inviteLink ? (
        <>
          {/* Title */}
          <Text style={styles.title}>
            Invite a{'\n'}
            <Text style={{ color: THEME_COLORS.yellow }}>caregiver</Text>
          </Text>
          <Text style={styles.subtitle}>
            They'll get access to {child?.name ?? "Rio"}'s profile and your personalized parenting wisdom guide.
          </Text>

          {/* Email input */}
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              selectionColor={colors.neon.blue}
              placeholder="nanny@email.com"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={styles.inputIconBox}>
              <Ionicons name="mail-outline" size={20} color={colors.textTertiary} />
            </View>
          </View>

          {/* Role selection */}
          <Text style={styles.label}>Select Relationship Role</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => {
              const isActive = role === r.id
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setRole(r.id)}
                  style={[
                    styles.roleChip,
                    isActive && styles.roleChipActive,
                  ]}
                >
                  <Ionicons
                    name={r.icon}
                    size={28}
                    color={isActive ? THEME_COLORS.yellow : colors.textTertiary}
                  />
                  <Text style={[styles.roleLabel, isActive && styles.roleLabelActive]}>
                    {r.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {/* Send button */}
          <Pressable
            onPress={handleInvite}
            disabled={loading}
            style={[styles.sendButton, loading && { opacity: 0.6 }]}
          >
            {loading ? (
              <ActivityIndicator color={colors.textOnAccent} />
            ) : (
              <View style={styles.sendButtonInner}>
                <Text style={styles.sendText}>Send Invite</Text>
                <Ionicons name="send" size={18} color="#1A1030" />
              </View>
            )}
          </Pressable>

          {/* Footer */}
          <Text style={styles.footerText}>Secured by Parental System V.2</Text>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 12,
    textTransform: 'uppercase',
    lineHeight: 50,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textTertiary,
    marginBottom: 32,
    lineHeight: 22,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textTertiary,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
    fontFamily: undefined, // mono style handled by letterSpacing
  },
  inputWrapper: {
    position: 'relative' as const,
    marginBottom: 28,
  },
  input: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 24,
    paddingRight: 56,
    height: 80,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  inputIconBox: {
    position: 'absolute' as const,
    right: 24,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  roleChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 128,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 2,
    borderColor: colors.border,
  },
  roleChipActive: {
    borderColor: THEME_COLORS.yellow,
    backgroundColor: 'rgba(244, 253, 80, 0.06)',
    ...shadows.glow,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  roleLabelActive: {
    color: THEME_COLORS.yellow,
  },
  sendButton: {
    backgroundColor: THEME_COLORS.yellow,
    borderRadius: borderRadius['2xl'],
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.glow,
  },
  sendButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sendText: {
    color: '#1A1030',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 24,
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 20,
    marginBottom: 24,
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    color: colors.textTertiary,
  },
  doneButton: {
    paddingVertical: 12,
  },
  doneText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
})
