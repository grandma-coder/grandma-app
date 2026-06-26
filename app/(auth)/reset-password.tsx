/**
 * Reset Password — handles the PASSWORD_RECOVERY deep-link.
 *
 * Flow: user taps the recovery link in their email → Supabase establishes a
 * temporary session and fires PASSWORD_RECOVERY → the root layout routes here.
 * The user sets a new password (updateUser), then we sign out so they log in
 * fresh with the new credentials. Matches forgot-password's paper-card design.
 */

import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Alert,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useTheme, stickers } from '../../constants/theme'
import { Heart } from '../../components/ui/Stickers'
import { useTranslation } from '../../lib/i18n'

const MIN_PASSWORD_LENGTH = 8

export default function ResetPassword() {
  const insets = useSafeAreaInsets()
  const { colors, font, isDark } = useTheme()
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleUpdate() {
    if (password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert(t('auth_passwordTooShort'), t('auth_passwordTooShortN', { n: MIN_PASSWORD_LENGTH }))
      return
    }
    if (password !== confirm) {
      Alert.alert(t('auth_passwordsNoMatch'), t('auth_passwordsNoMatchMsg'))
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        Alert.alert(t('auth_couldntUpdatePassword'), error.message)
        return
      }
      // Sign out so the user logs in fresh with the new password. The root
      // auth listener clears recoveryMode on SIGNED_OUT and the route guard
      // sends them to welcome; we nudge to sign-in for a clear next step.
      await supabase.auth.signOut()
      Alert.alert(t('auth_passwordUpdated'), t('auth_passwordUpdatedMsg'), [
        { text: 'OK', onPress: () => router.replace('/(auth)/sign-in') },
      ])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error'
      Alert.alert(t('auth_couldntUpdatePassword'), msg)
    } finally {
      setLoading(false)
    }
  }

  const bg = colors.bg
  const paper = colors.surface
  const paperBorder = colors.border
  const ink = colors.text
  const ink3 = colors.textMuted
  const ink4 = colors.textFaint

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <View style={styles.stickerTR}>
        <Heart size={56} fill={isDark ? stickers.pink : '#F2B2C7'} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.heading, { fontFamily: font.display, color: ink }]}>{t('auth_reset_heading')}</Text>
          <Text style={[styles.headingItalic, { fontFamily: font.italic, color: ink }]}>{t('auth_reset_heading2')}</Text>
          <Text style={[styles.sub, { fontFamily: font.body, color: ink3 }]}>
            {t('auth_reset_subtitle')}
          </Text>

          <View style={[styles.inputCard, { backgroundColor: paper, borderColor: paperBorder }]}>
            <Text style={[styles.inputLabel, { fontFamily: font.bodySemiBold, color: ink4 }]}>
              {t('auth_newPasswordLabel')}
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.inputText, { fontFamily: font.body, color: ink }]}
              selectionColor={ink}
              placeholder="••••••••"
              placeholderTextColor={ink4}
              accessibilityLabel="New password"
            />
          </View>

          <View style={[styles.inputCard, { backgroundColor: paper, borderColor: paperBorder }]}>
            <Text style={[styles.inputLabel, { fontFamily: font.bodySemiBold, color: ink4 }]}>
              {t('auth_confirmPasswordLabel')}
            </Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.inputText, { fontFamily: font.body, color: ink }]}
              selectionColor={ink}
              placeholder="••••••••"
              placeholderTextColor={ink4}
              accessibilityLabel="Confirm new password"
            />
          </View>

          <Pressable
            onPress={handleUpdate}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Update password"
            accessibilityState={{ busy: loading }}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: ink,
                opacity: pressed ? 0.88 : loading ? 0.6 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={[styles.ctaText, { fontFamily: font.bodyMedium, color: bg }]}>
              {loading ? t('auth_updating') : t('auth_updatePassword')}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  stickerTR: { position: 'absolute', top: 90, right: 20, transform: [{ rotate: '14deg' }], zIndex: 0 },
  container: { flexGrow: 1, paddingHorizontal: 24, zIndex: 1 },
  heading: { fontSize: 40, lineHeight: 42, letterSpacing: -1, marginTop: 10 },
  headingItalic: { fontSize: 40, lineHeight: 42, letterSpacing: -0.5, marginBottom: 8 },
  sub: { fontSize: 15, marginBottom: 28, lineHeight: 22 },
  inputCard: { borderRadius: 20, padding: 14, borderWidth: 1, marginBottom: 16 },
  inputLabel: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  inputText: { fontSize: 18, letterSpacing: -0.3 },
  cta: { height: 58, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 16 },
  ctaText: { fontSize: 16 },
})
