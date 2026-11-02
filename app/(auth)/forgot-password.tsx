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
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { SiteSticker } from '../../components/stickers/SiteSticker'
import { PillButton } from '../../components/ui/PillButton'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { AuraField, AURA } from '../../components/ui/diffuse/AuraField'
import { DiffuseSolidCTA, DiffuseTextLink } from '../../components/ui/diffuse/DiffuseActions'
import { DiffuseField, DiffuseFieldLabel } from '../../components/ui/diffuse/DiffuseField'
import { useTranslation } from '../../lib/i18n'

export default function ForgotPassword() {
  const insets = useSafeAreaInsets()
  const { colors, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
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

  // ─── Diffuse (v3) render — AUTH 04 · Forgot password ──────────────────────
  // Additive branch; the cream `!diffuse` render below is unchanged. Layout
  // mirrors the AUTH 04 frame: aura field → back button → serif "Forgot" +
  // italic "password?" (pre accent) → subcopy → bare-underline email field →
  // containerless "SEND RESET LINK" CTA → footer "Remembered it? Sign in".
  // The post-send `sent` state swaps the prompt subcopy for the confirmation
  // line and drops the field/CTA, leaving a "Back to sign in" text link.
  // No fills, no pills, no shadows — hairlines + mono/serif type only.
  if (diffuse) {
    const accent = getDiffuseAccent('pre-pregnancy')
    return (
      <AuraField blooms={AURA.forgot}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={[
              dStyles.container,
              { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back button */}
            <Pressable onPress={() => router.back()} hitSlop={12} style={dStyles.back}>
              <Ionicons name="chevron-back" size={22} color={dt.colors.ink} />
            </Pressable>

            {/* Heading */}
            <Text style={[dStyles.heading, { fontFamily: diffuseFont.display, color: dt.colors.ink }]}>
              {t('auth_forgot_heading')}
            </Text>
            <Text style={[dStyles.headingItalic, { fontFamily: diffuseFont.italic, color: accent }]}>
              {t('auth_forgot_heading2')}
            </Text>
            <Text style={[dStyles.sub, { fontFamily: diffuseFont.body, color: dt.colors.ink2 }]}>
              {sent ? t('auth_forgot_sent') : t('auth_forgot_prompt')}
            </Text>

            {!sent && (
              <>
                {/* Email */}
                <View style={dStyles.firstField}>
                  <DiffuseFieldLabel>{t('auth_emailLabel')}</DiffuseFieldLabel>
                  <DiffuseField
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* CTA */}
                <View style={dStyles.ctaWrap}>
                  <DiffuseSolidCTA
                    label={loading ? t('auth_sending') : t('auth_sendResetLink')}
                    onPress={handleReset}
                    disabled={loading}
                  />
                </View>
              </>
            )}

            {/* Switch */}
            {sent ? (
              <View style={dStyles.ctaWrap}>
                <DiffuseTextLink
                  label={t('auth_backToSignIn')}
                  onPress={() => router.replace('/(auth)/sign-in')}
                />
              </View>
            ) : (
              <View style={dStyles.footer}>
                <Text style={[dStyles.footerText, { fontFamily: diffuseFont.body, color: dt.colors.ink3 }]}>
                  {t('auth_hasAccount')}
                </Text>
                <DiffuseTextLink label={t('auth_signIn')} onPress={() => router.replace('/(auth)/sign-in')} />
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </AuraField>
    )
  }

  const bg = colors.bg
  const paper = colors.surface
  const paperBorder = colors.text
  const ink = colors.text
  const ink3 = colors.textMuted
  const ink4 = colors.textFaint

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <View style={[styles.stickerTR, { top: insets.top + 14 }]}>
        <SiteSticker name="lock" size={48} cut />
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
          <Text style={[styles.headingItalic, { fontFamily: font.display, color: ink }]}>{t('auth_forgot_heading2')}</Text>
          <Text style={[styles.sub, { fontFamily: font.body, color: ink3 }]}>
            {sent ? t('auth_forgot_sent') : t('auth_forgot_prompt')}
          </Text>

          {!sent && (
            <>
              <View style={[styles.inputCard, { backgroundColor: paper, borderColor: paperBorder }]}>
                <Text style={[styles.inputLabel, { fontFamily: 'SpaceMono_400Regular', letterSpacing: 1.4, color: colors.textMuted }]}>
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

              <PillButton
                label={loading ? t('auth_sending') : t('auth_sendResetLink')}
                onPress={handleReset}
                variant="ink"
                disabled={loading}
              />
            </>
          )}

          {sent && (
            <PillButton
              label={t('auth_backToSignIn')}
              onPress={() => router.replace('/(auth)/sign-in')}
              variant="ink"
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  stickerTR: { position: 'absolute', right: 26, transform: [{ rotate: '12deg' }], zIndex: 0 },
  container: { flexGrow: 1, paddingHorizontal: 24, zIndex: 1 },
  backBtn: { width: 44, height: 44, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  heading: { fontSize: 32, lineHeight: 36, letterSpacing: 0.2, textTransform: 'uppercase', marginTop: 10 },
  headingItalic: { fontSize: 32, lineHeight: 36, letterSpacing: 0.2, textTransform: 'uppercase', marginBottom: 8 },
  sub: { fontSize: 15, marginBottom: 28, lineHeight: 22 },
  inputCard: { borderRadius: 14, padding: 14, borderWidth: 1.5, marginBottom: 16 },
  inputLabel: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  inputText: { fontSize: 18, letterSpacing: 0 },
  cta: { height: 58, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  ctaText: { fontSize: 16 },
})

// ─── Diffuse (v3) styles — AUTH 04 · Forgot password ────────────────────────
const dStyles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  back: {
    width: 38,
    height: 38,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 6,
  },
  heading: {
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -0.6,
    marginTop: 8,
  },
  headingItalic: {
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  sub: {
    fontSize: 14.5,
    lineHeight: 21,
    marginBottom: 28,
  },
  firstField: {
    marginTop: 4,
  },
  ctaWrap: {
    marginTop: 32,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 20,
  },
  footerText: {
    fontSize: 12.5,
  },
})
