/**
 * Account & Security — cream-paper redesign.
 */

import { useState, useEffect } from 'react'
import {
  View, TextInput, Pressable, ScrollView, Alert, StyleSheet, Text,
} from 'react-native'
import { router } from 'expo-router'
import {
  Mail, Lock, Eye, EyeOff, ChevronRight,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, DisplayItalic, MonoCaps, Body } from '../../components/ui/Typography'
import { useSavedToast } from '../../components/ui/SavedToast'
import { Heart, Star, Moon, Cross, Sparkle } from '../../components/ui/Stickers'

export default function AccountScreen() {
  const { colors, font, stickers, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const toast = useSavedToast()

  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const dangerLabel = isDark ? '#F29082' : '#B43E2E'

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
      toast.show({ title: 'Verification Sent', message: 'Check your new email for a confirmation link.', autoDismiss: 0 })
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
      toast.show({ title: 'Password Updated', message: 'Your password has been changed.' })
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

  function SectionLabel({ children, sticker, color }: { children: React.ReactNode; sticker: React.ReactNode; color?: string }) {
    return (
      <View style={styles.sectionLabel}>
        <View style={styles.sectionSticker}>{sticker}</View>
        <MonoCaps color={color ?? colors.textMuted} style={{ letterSpacing: 1.5 }}>{children}</MonoCaps>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title="" />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Big Fraunces title */}
        <View style={styles.titleBlock}>
          <Display size={32} color={colors.text}>Account & Security</Display>
          <DisplayItalic size={18} color={stickers.coral} style={{ marginTop: 6 }}>
            your sign-in, your call
          </DisplayItalic>
        </View>

        {/* Email */}
        <SectionLabel sticker={<Heart size={20} fill={stickers.pink} />}>Email</SectionLabel>
        <View style={[styles.card, { backgroundColor: paper, borderColor: paperBorder }]}>
          <View style={[styles.inputRow, { borderBottomColor: paperBorder }]}>
            <Mail size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.inputText, { color: colors.text, fontFamily: font.body }]}
            />
          </View>
          <Pressable
            onPress={handleChangeEmail}
            disabled={saving}
            style={({ pressed }) => [
              styles.actionPill,
              {
                backgroundColor: stickers.lilacSoft,
                borderColor: paperBorder,
                opacity: saving ? 0.6 : 1,
                transform: [{ translateY: pressed ? 1 : 0 }],
              },
            ]}
          >
            <Sparkle size={20} fill={stickers.yellow} />
            <Text style={[styles.actionPillText, { color: colors.text, fontFamily: font.bodySemiBold }]}>
              {saving ? 'Saving…' : 'Update Email'}
            </Text>
          </Pressable>
        </View>

        {/* Password */}
        <SectionLabel sticker={<Star size={20} fill={stickers.yellow} />}>Password</SectionLabel>
        <View style={[styles.card, { backgroundColor: paper, borderColor: paperBorder }]}>
          <View style={[styles.inputRow, { borderBottomColor: paperBorder }]}>
            <Lock size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              style={[styles.inputText, { color: colors.text, fontFamily: font.body }]}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} color={colors.textMuted} /> : <Eye size={18} color={colors.textMuted} />}
            </Pressable>
          </View>
          <Body size={12} color={colors.textMuted}>Minimum 6 characters</Body>
          <Pressable
            onPress={handleChangePassword}
            disabled={saving || newPassword.length < 6}
            style={({ pressed }) => [
              styles.actionPill,
              {
                backgroundColor: stickers.lilacSoft,
                borderColor: paperBorder,
                opacity: (saving || newPassword.length < 6) ? 0.5 : 1,
                transform: [{ translateY: pressed ? 1 : 0 }],
              },
            ]}
          >
            <Sparkle size={20} fill={stickers.yellow} />
            <Text style={[styles.actionPillText, { color: colors.text, fontFamily: font.bodySemiBold }]}>
              {saving ? 'Saving…' : 'Change Password'}
            </Text>
          </Pressable>
        </View>

        {/* Sessions */}
        <SectionLabel sticker={<Moon size={20} fill={stickers.lilac} />}>Sessions</SectionLabel>
        <View style={[styles.card, { backgroundColor: paper, borderColor: paperBorder }]}>
          <Pressable onPress={handleSignOutAll} style={styles.row}>
            <View style={styles.rowLeft}>
              <Moon size={32} fill={stickers.lilac} />
              <Text style={[styles.rowLabel, { color: colors.text, fontFamily: font.bodySemiBold }]}>Sign Out All Devices</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Danger zone */}
        <SectionLabel sticker={<Cross size={20} fill={stickers.coral} />} color={dangerLabel}>
          Danger Zone
        </SectionLabel>
        <Pressable
          onPress={handleDeleteAccount}
          style={({ pressed }) => [
            styles.dangerBtn,
            {
              backgroundColor: stickers.peachSoft,
              borderColor: stickers.coral,
              transform: [{ translateY: pressed ? 1 : 0 }],
            },
          ]}
        >
          <Cross size={28} fill={stickers.coral} />
          <Text style={[styles.dangerTextBtn, { color: colors.text, fontFamily: font.bodySemiBold }]}>Delete Account</Text>
        </Pressable>
        <Text style={[styles.dangerHint, { color: colors.textMuted, fontFamily: font.body }]}>
          This permanently deletes your account, all children profiles, care circle members, memories, and health records.
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  card: {
    padding: 18,
    gap: 12,
    marginTop: 8,
    borderRadius: 28,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  inputText: { flex: 1, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 0 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { fontSize: 15 },
  titleBlock: { marginTop: 4, marginBottom: 18, paddingHorizontal: 4 },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 4,
  },
  sectionSticker: { width: 22, alignItems: 'center', justifyContent: 'center' },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderWidth: 1,
    borderRadius: 999,
  },
  actionPillText: { fontSize: 15, letterSpacing: 0.1 },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderRadius: 999,
    marginTop: 8,
  },
  dangerTextBtn: { fontSize: 15 },
  dangerHint: { fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18, paddingHorizontal: 20 },
})
