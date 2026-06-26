/**
 * Forgot Password — paper card form, matches sign-in design.
 * Sends a Supabase recovery email; user resets via the email link.
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
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useTheme, stickers } from '../../constants/theme'
import { Heart } from '../../components/ui/Stickers'
import { useTranslation } from '../../lib/i18n'

export default function ForgotPassword() {
  const insets = useSafeAreaInsets()
  const { colors, font, isDark } = useTheme()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleReset() {
    const trimmed = email.trim()
    if (!trimmed) {
      Alert.alert(t('auth_missingInfo'), t('auth_missingEmailOnly'))
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert(t('auth_invalidEmail'), t('auth_invalidEmailMsg'))
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: 'grandma-app://auth/reset',
      })
      if (error) {
        Alert.alert(t('auth_couldntSendReset'), error.message)
        return
      }
      setSent(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error'
      Alert.alert(t('auth_couldntSendReset'), msg)
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
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
            <View style={[styles.backBtn, { backgroundColor: paper, borderColor: paperBorder }]}>
              <Ionicons name="chevron-back" size={20} color={ink} />
            </View>
          </Pressable>

          <Text style={[styles.heading, { fontFamily: font.display, color: ink }]}>{t('auth_forgot_heading')}</Text>
          <Text style={[styles.headingItalic, { fontFamily: font.italic, color: ink }]}>{t('auth_forgot_heading2')}</Text>
          <Text style={[styles.sub, { fontFamily: font.body, color: ink3 }]}>
            {sent ? t('auth_forgot_sent') : t('auth_forgot_prompt')}
          </Text>

          {!sent && (
            <>
              <View style={[styles.inputCard, { backgroundColor: paper, borderColor: paperBorder }]}>
                <Text style={[styles.inputLabel, { fontFamily: font.bodySemiBold, color: ink4 }]}>
                  {t('auth_emailLabel')}
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.inputText, { fontFamily: font.body, color: ink }]}
                  selectionColor={ink}
                  placeholder="your@email.com"
                  placeholderTextColor={ink4}
                  accessibilityLabel="Email address"
                />
              </View>

              <Pressable
                onPress={handleReset}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Send reset link"
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
                  {loading ? t('auth_sending') : t('auth_sendResetLink')}
                </Text>
              </Pressable>
            </>
          )}

          {sent && (
            <Pressable
              onPress={() => router.replace('/(auth)/sign-in')}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: ink,
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Text style={[styles.ctaText, { fontFamily: font.bodyMedium, color: bg }]}>
                {t('auth_backToSignIn')}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  stickerTR: { position: 'absolute', top: 90, right: 20, transform: [{ rotate: '14deg' }], zIndex: 0 },
  container: { flexGrow: 1, paddingHorizontal: 24, zIndex: 1 },
  backBtn: { width: 44, height: 44, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  heading: { fontSize: 40, lineHeight: 42, letterSpacing: -1, marginTop: 10 },
  headingItalic: { fontSize: 40, lineHeight: 42, letterSpacing: -0.5, marginBottom: 8 },
  sub: { fontSize: 15, marginBottom: 28, lineHeight: 22 },
  inputCard: { borderRadius: 20, padding: 14, borderWidth: 1, marginBottom: 16 },
  inputLabel: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  inputText: { fontSize: 18, letterSpacing: -0.3 },
  cta: { height: 58, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  ctaText: { fontSize: 16 },
})
