/**
 * Account & Security — cream-paper redesign.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  View, TextInput, Pressable, ScrollView, Alert, StyleSheet, Text, Switch,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import {
  Mail, Lock, Eye, EyeOff, ChevronRight, KeyRound, LogOut, Trash2, ShieldCheck,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../../components/ui/diffuse/DiffusePrimitives'
import { useTranslation } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import { signOut } from '../../lib/signOut'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Display, DisplayItalic, MonoCaps, Body } from '../../components/ui/Typography'
import { useSavedToast } from '../../components/ui/SavedToast'
import { Heart, Star, Moon, Cross, Sparkle } from '../../components/ui/Stickers'
import { useAppLockStore } from '../../store/useAppLockStore'
import { hasPin, clearPin, isBiometricAvailable } from '../../lib/appLock'

export default function AccountScreen() {
  const { colors, font, stickers, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const toast = useSavedToast()
  const { t } = useTranslation()

  const paper = diffuse ? dt.colors.surface : colors.surface
  const paperBorder = diffuse ? dt.colors.line : colors.border
  const dangerLabel = diffuse ? dt.colors.error : stickers.coralInk

  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  // App-lock (WS2d)
  const lockEnabled = useAppLockStore((s) => s.enabled)
  const biometricEnabled = useAppLockStore((s) => s.biometricEnabled)
  const setLockEnabled = useAppLockStore((s) => s.setEnabled)
  const setBiometricEnabled = useAppLockStore((s) => s.setBiometricEnabled)
  const [pinSet, setPinSet] = useState(false)
  const [biometricAvail, setBiometricAvail] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setEmail(session.user.email ?? '')
    })
    isBiometricAvailable().then(setBiometricAvail)
  }, [])

  // Re-read PIN state when returning from the set-PIN screen.
  useFocusEffect(useCallback(() => { hasPin().then(setPinSet) }, []))

  function handleToggleLock(next: boolean) {
    if (next) {
      // Enabling requires a PIN — send them to set one; the set screen flips
      // `enabled` on success.
      router.push('/lock?mode=set')
    } else {
      Alert.alert(t('account_lockDisableTitle'), t('account_lockDisableBody'), [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: t('account_lockDisableConfirm'), style: 'destructive',
          onPress: async () => {
            await clearPin()
            setLockEnabled(false)
            setPinSet(false)
            toast.show({ title: t('account_lockDisabledTitle'), message: t('account_lockDisabledBody') })
          },
        },
      ])
    }
  }

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
    Alert.alert(t('account_signOutEverywhereTitle'), t('account_signOutEverywhereMsg'), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: t('account_signOutAll'),
        style: 'destructive',
        onPress: async () => {
          await signOut('global')
        },
      },
    ])
  }

  async function handleDeleteAccount() {
    Alert.alert(
      t('account_deleteTitle'),
      t('account_deleteMsg'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: t('account_deleteConfirmBtn'),
          style: 'destructive',
          onPress: async () => {
            setSaving(true)
            try {
              const { error } = await supabase.functions.invoke('delete-account')
              if (error) throw error
              // Account is gone — clear the local session and return to auth.
              // signOut handles store resets + navigation to the welcome screen.
              await signOut('global')
            } catch (e: any) {
              setSaving(false)
              Alert.alert(t('common_error'), e.message ?? t('account_deleteFailedMsg'))
            }
          },
        },
      ]
    )
  }

  function SectionLabel({ children, sticker, diffuseIcon, color }: { children: React.ReactNode; sticker: React.ReactNode; diffuseIcon?: React.ReactNode; color?: string }) {
    if (diffuse) {
      return (
        <View style={styles.sectionLabel}>
          {diffuseIcon ? (
            <DiffuseBloomIcon color={color ?? dt.colors.ink} size={22} intensity={0.4}>{diffuseIcon}</DiffuseBloomIcon>
          ) : null}
          <MonoCaps color={color ?? dt.colors.ink3} style={{ letterSpacing: 2 }}>{children}</MonoCaps>
        </View>
      )
    }
    return (
      <View style={styles.sectionLabel}>
        <View style={styles.sectionSticker}>{sticker}</View>
        <MonoCaps color={color ?? colors.textMuted} style={{ letterSpacing: 1.5 }}>{children}</MonoCaps>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader title="" />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Big Fraunces title */}
        <View style={styles.titleBlock}>
          <Display size={32} color={diffuse ? dt.colors.ink : colors.text}>{t('account_title')}</Display>
          <DisplayItalic size={18} color={diffuse ? dt.colors.ink3 : stickers.coral} style={{ marginTop: 6 }}>
            {t('account_subtitle')}
          </DisplayItalic>
        </View>

        {/* Email */}
        <SectionLabel
          sticker={<Heart size={20} fill={stickers.pink} />}
          diffuseIcon={<Mail size={12} color={dt.colors.ink3} strokeWidth={1.5} />}
        >{t('account_sectionEmail')}</SectionLabel>
        <View style={[styles.card, diffuse && styles.cardFlat, { backgroundColor: paper, borderColor: paperBorder }]}>
          <View style={[styles.inputRow, { borderBottomColor: paperBorder }]}>
            <Mail size={18} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={diffuse ? 1.5 : 2} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('account_emailPlaceholder')}
              placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.inputText, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.body : font.body }]}
            />
          </View>
          <Pressable
            onPress={handleChangeEmail}
            disabled={saving}
            style={({ pressed }) => [
              styles.actionPill,
              diffuse
                ? {
                    backgroundColor: 'transparent',
                    borderColor: dt.colors.line2,
                    opacity: saving ? 0.5 : pressed ? 0.6 : 1,
                  }
                : {
                    backgroundColor: stickers.lilacSoft,
                    borderColor: paperBorder,
                    opacity: saving ? 0.6 : 1,
                    transform: [{ translateY: pressed ? 1 : 0 }],
                  },
            ]}
          >
            {diffuse ? null : <Sparkle size={20} fill={stickers.yellow} />}
            <Text style={[styles.actionPillText, diffuse
              ? { color: dt.colors.ink, fontFamily: diffuseFont.mono, letterSpacing: 2, textTransform: 'uppercase', fontSize: 12 }
              : { color: colors.text, fontFamily: font.bodySemiBold }]}>
              {saving ? t('account_saving') : t('account_updateEmail')}
            </Text>
          </Pressable>
        </View>

        {/* Password */}
        <SectionLabel
          sticker={<Star size={20} fill={stickers.yellow} />}
          diffuseIcon={<KeyRound size={12} color={dt.colors.ink3} strokeWidth={1.5} />}
        >{t('account_sectionPassword')}</SectionLabel>
        <View style={[styles.card, diffuse && styles.cardFlat, { backgroundColor: paper, borderColor: paperBorder }]}>
          <View style={[styles.inputRow, { borderBottomColor: paperBorder }]}>
            <Lock size={18} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={diffuse ? 1.5 : 2} />
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('account_newPasswordPlaceholder')}
              placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
              secureTextEntry={!showPassword}
              style={[styles.inputText, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.body : font.body }]}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              {showPassword
                ? <EyeOff size={18} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={diffuse ? 1.5 : 2} />
                : <Eye size={18} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={diffuse ? 1.5 : 2} />}
            </Pressable>
          </View>
          <Body size={12} color={diffuse ? dt.colors.ink3 : colors.textMuted}>{t('account_minChars')}</Body>
          <Pressable
            onPress={handleChangePassword}
            disabled={saving || newPassword.length < 6}
            style={({ pressed }) => [
              styles.actionPill,
              diffuse
                ? {
                    backgroundColor: 'transparent',
                    borderColor: dt.colors.line2,
                    opacity: (saving || newPassword.length < 6) ? 0.4 : pressed ? 0.6 : 1,
                  }
                : {
                    backgroundColor: stickers.lilacSoft,
                    borderColor: paperBorder,
                    opacity: (saving || newPassword.length < 6) ? 0.5 : 1,
                    transform: [{ translateY: pressed ? 1 : 0 }],
                  },
            ]}
          >
            {diffuse ? null : <Sparkle size={20} fill={stickers.yellow} />}
            <Text style={[styles.actionPillText, diffuse
              ? { color: dt.colors.ink, fontFamily: diffuseFont.mono, letterSpacing: 2, textTransform: 'uppercase', fontSize: 12 }
              : { color: colors.text, fontFamily: font.bodySemiBold }]}>
              {saving ? t('account_saving') : t('account_changePassword')}
            </Text>
          </Pressable>
        </View>

        {/* App Lock (WS2d) */}
        <SectionLabel
          sticker={<Cross size={20} fill={stickers.blue} />}
          diffuseIcon={<ShieldCheck size={12} color={dt.colors.ink3} strokeWidth={1.5} />}
        >{t('account_sectionAppLock')}</SectionLabel>
        <View style={[styles.card, diffuse && styles.cardFlat, { backgroundColor: paper, borderColor: paperBorder }]}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>
                {t('account_appLockLabel')}
              </Text>
              <Text style={[styles.toggleDesc, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                {t('account_appLockDesc')}
              </Text>
            </View>
            <Switch
              value={lockEnabled && pinSet}
              onValueChange={handleToggleLock}
              trackColor={{ false: diffuse ? dt.colors.line2 : colors.borderStrong, true: diffuse ? dt.colors.ink : stickers.blue }}
              thumbColor={diffuse ? dt.colors.surface : '#FFFFFF'}
              ios_backgroundColor={diffuse ? dt.colors.line2 : colors.borderStrong}
            />
          </View>

          {lockEnabled && pinSet && (
            <>
              <View style={[styles.divider, { backgroundColor: paperBorder }]} />
              <Pressable onPress={() => router.push('/lock?mode=set')} style={styles.linkRow}>
                <Text style={[styles.toggleLabel, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                  {t('account_changePin')}
                </Text>
                <ChevronRight size={16} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={diffuse ? 1.5 : 2} />
              </Pressable>

              {biometricAvail && (
                <>
                  <View style={[styles.divider, { backgroundColor: paperBorder }]} />
                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.toggleLabel, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>
                        {t('account_biometricLabel')}
                      </Text>
                      <Text style={[styles.toggleDesc, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
                        {t('account_biometricDesc')}
                      </Text>
                    </View>
                    <Switch
                      value={biometricEnabled}
                      onValueChange={setBiometricEnabled}
                      trackColor={{ false: diffuse ? dt.colors.line2 : colors.borderStrong, true: diffuse ? dt.colors.ink : stickers.blue }}
                      thumbColor={diffuse ? dt.colors.surface : '#FFFFFF'}
                      ios_backgroundColor={diffuse ? dt.colors.line2 : colors.borderStrong}
                    />
                  </View>
                </>
              )}
            </>
          )}
        </View>

        {/* Sessions */}
        <SectionLabel
          sticker={<Moon size={20} fill={stickers.lilac} />}
          diffuseIcon={<LogOut size={12} color={dt.colors.ink3} strokeWidth={1.5} />}
        >{t('account_sectionSessions')}</SectionLabel>
        <View style={[styles.card, diffuse && styles.cardFlat, { backgroundColor: paper, borderColor: paperBorder }]}>
          <Pressable onPress={handleSignOutAll} style={styles.row}>
            <View style={styles.rowLeft}>
              {diffuse ? (
                <DiffuseBloomIcon color={dt.colors.ink} size={32} intensity={0.4}>
                  <LogOut size={15} color={dt.colors.ink} strokeWidth={1.5} />
                </DiffuseBloomIcon>
              ) : (
                <Moon size={32} fill={stickers.lilac} />
              )}
              <Text style={[styles.rowLabel, diffuse
                ? { color: dt.colors.ink, fontFamily: diffuseFont.body }
                : { color: colors.text, fontFamily: font.bodySemiBold }]}>{t('account_signOutAllDevices')}</Text>
            </View>
            <ChevronRight size={18} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={diffuse ? 1.5 : 2} />
          </Pressable>
        </View>

        {/* Danger zone */}
        <SectionLabel
          sticker={<Cross size={20} fill={stickers.coral} />}
          diffuseIcon={<Trash2 size={12} color={dt.colors.error} strokeWidth={1.5} />}
          color={dangerLabel}
        >
          {t('account_sectionDanger')}
        </SectionLabel>
        <Pressable
          onPress={handleDeleteAccount}
          style={({ pressed }) => [
            styles.dangerBtn,
            diffuse
              ? {
                  backgroundColor: 'transparent',
                  borderColor: dt.colors.error,
                  opacity: pressed ? 0.6 : 1,
                }
              : {
                  backgroundColor: stickers.peachSoft,
                  borderColor: stickers.coral,
                  transform: [{ translateY: pressed ? 1 : 0 }],
                },
          ]}
        >
          {diffuse ? (
            <Trash2 size={16} color={dt.colors.error} strokeWidth={1.5} />
          ) : (
            <Cross size={28} fill={stickers.coral} />
          )}
          <Text style={[styles.dangerTextBtn, diffuse
            ? { color: dt.colors.error, fontFamily: diffuseFont.mono, letterSpacing: 2, textTransform: 'uppercase', fontSize: 12 }
            : { color: colors.text, fontFamily: font.bodySemiBold }]}>{t('account_deleteAccount')}</Text>
        </Pressable>
        <Text style={[styles.dangerHint, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.body : font.body }]}>
          {t('account_deleteHint')}
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
  cardFlat: {
    borderRadius: 20,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleLabel: { fontSize: 15 },
  toggleDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { height: 1, marginHorizontal: -18 },
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
