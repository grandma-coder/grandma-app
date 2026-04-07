/**
 * Account & Security — email, password, linked accounts, sessions.
 */

import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet, Switch,
} from 'react-native'
import { router } from 'expo-router'
import {
  ArrowLeft, Mail, Lock, Key, Smartphone, Shield, LogOut, Trash2, Eye, EyeOff, ChevronRight,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { supabase } from '../../lib/supabase'

export default function AccountScreen() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()

  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setEmail(session.user.email ?? '')
    })
  }, [])

  async function handleChangeEmail() {
    if (!email.trim() || !email.includes('@')) return Alert.alert('Invalid email')
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() })
      if (error) throw error
      Alert.alert('Verification Sent', 'Check your new email for a confirmation link.')
    } catch (e: any) { Alert.alert('Error', e.message) }
    finally { setSaving(false) }
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) return Alert.alert('Too short', 'Password must be at least 6 characters.')
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setNewPassword('')
      Alert.alert('Password Updated', 'Your password has been changed.')
    } catch (e: any) { Alert.alert('Error', e.message) }
    finally { setSaving(false) }
  }

  async function handleSignOutAll() {
    Alert.alert('Sign Out Everywhere', 'This will sign you out of all devices.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out All',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut({ scope: 'global' })
          router.replace('/(auth)/welcome')
        },
      },
    ])
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, all children data, care circle, memories, and health records. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I understand, delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Contact Support', 'For security, please email support@grandma.app with your account email to request deletion.')
          },
        },
      ]
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Account & Security</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Email */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>EMAIL</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <View style={styles.inputRow}>
            <Mail size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.inputText, { color: colors.text }]}
            />
          </View>
          <Pressable onPress={handleChangeEmail} disabled={saving}
            style={[styles.actionBtn, { backgroundColor: colors.primaryTint, borderRadius: radius.lg }]}
          >
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Update Email</Text>
          </Pressable>
        </View>

        {/* Password */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PASSWORD</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <View style={styles.inputRow}>
            <Lock size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              style={[styles.inputText, { color: colors.text }]}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} color={colors.textMuted} /> : <Eye size={18} color={colors.textMuted} />}
            </Pressable>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>Minimum 6 characters</Text>
          <Pressable onPress={handleChangePassword} disabled={saving || newPassword.length < 6}
            style={[styles.actionBtn, { backgroundColor: colors.primaryTint, borderRadius: radius.lg, opacity: newPassword.length < 6 ? 0.5 : 1 }]}
          >
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Change Password</Text>
          </Pressable>
        </View>

        {/* Sessions */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SESSIONS</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <Pressable onPress={handleSignOutAll} style={styles.row}>
            <View style={styles.rowLeft}>
              <Smartphone size={18} color={brand.accent} strokeWidth={2} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Sign Out All Devices</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Danger zone */}
        <Text style={[styles.sectionLabel, { color: brand.error }]}>DANGER ZONE</Text>
        <Pressable onPress={handleDeleteAccount}
          style={[styles.dangerBtn, { backgroundColor: brand.error + '08', borderColor: brand.error + '20', borderRadius: radius.xl }]}
        >
          <Trash2 size={18} color={brand.error} strokeWidth={2} />
          <Text style={[styles.dangerText, { color: brand.error }]}>Delete Account</Text>
        </Pressable>
        <Text style={[styles.dangerHint, { color: colors.textMuted }]}>
          This permanently deletes your account, all children profiles, care circle members, memories, and health records.
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  headerBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 20, marginBottom: 8, paddingLeft: 4 },
  card: { padding: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)', paddingBottom: 12 },
  inputText: { flex: 1, fontSize: 15, fontWeight: '500' },
  hint: { fontSize: 12, fontWeight: '500' },
  actionBtn: { alignItems: 'center', paddingVertical: 12 },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderWidth: 1 },
  dangerText: { fontSize: 15, fontWeight: '700' },
  dangerHint: { fontSize: 12, fontWeight: '500', textAlign: 'center', marginTop: 8, lineHeight: 18, paddingHorizontal: 20 },
})
