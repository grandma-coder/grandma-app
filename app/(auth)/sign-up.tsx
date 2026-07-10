/**
 * Sign Up — paper card form (Apr 2026 redesign)
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
import { useTheme, stickers, font, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { Squishy, Heart } from '../../components/ui/Stickers'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { AuraField, AURA } from '../../components/ui/diffuse/AuraField'
import { DiffuseSolidCTA, DiffuseTextLink } from '../../components/ui/diffuse/DiffuseActions'
import { DiffuseField, DiffuseFieldLabel } from '../../components/ui/diffuse/DiffuseField'
import { useSavedToast } from '../../components/ui/SavedToast'
import { useTranslation } from '../../lib/i18n'

export default function SignUp() {
  const insets = useSafeAreaInsets()
  const { colors, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const toast = useSavedToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signUp() {
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      Alert.alert(t('auth_missingInfo'), t('auth_missingEmailPasswordSignUp'))
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert(t('auth_invalidEmail'), t('auth_invalidEmailMsg'))
      return
    }
    if (password.length < 6) {
      Alert.alert(t('auth_passwordTooShort'), t('auth_passwordTooShortMsg'))
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({ email: trimmedEmail, password })
      if (error) {
        Alert.alert(t('auth_signUpFailed'), error.message)
        return
      }
      toast.show({
        title: t('auth_welcomeAboard'),
        message: t('auth_confirmEmail'),
        autoDismiss: 3200,
      })
      // Wait for the toast to finish before swapping screens (which would
      // unmount the toast provider host and dismiss the message early).
      setTimeout(() => router.replace('/(auth)/sign-in'), 3200)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error'
      Alert.alert(t('auth_signUpFailed'), msg)
    } finally {
      setLoading(false)
    }
  }

  // ─── Diffuse (v3) render — AUTH 03 · Sign up ──────────────────────────────
  // Additive branch; the cream `!diffuse` render below is unchanged. Layout
  // mirrors the AUTH 03 frame: aura field → back button → serif "What should
  // grandma" + italic "call you?" accent → subcopy → bare-underline email +
  // password fields → containerless "CONTINUE" CTA → footer "Already have an
  // account? Sign in" → small mono terms line. No fills, no pills, no shadows —
  // hairlines + mono/serif type only.
  if (diffuse) {
    return (
      <AuraField blooms={AURA.signup}>
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
              {t('auth_signUp_heading1')}
            </Text>
            <Text style={[dStyles.heading, { fontFamily: diffuseFont.display, color: dt.colors.ink }]}>
              {t('auth_signUp_heading2')}
            </Text>
            <Text style={[dStyles.headingItalic, { fontFamily: diffuseFont.italic, color: dt.colors.ink }]}>
              {t('auth_signUp_heading3')}
            </Text>
            <Text style={[dStyles.sub, { fontFamily: diffuseFont.body, color: dt.colors.ink2 }]}>
              {t('auth_signUp_subtitle')}
            </Text>

            {/* Email */}
            <View style={dStyles.firstField}>
              <DiffuseFieldLabel>{t('auth_emailLabel')}</DiffuseFieldLabel>
              <DiffuseField
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder={t('auth_emailPlaceholder')}
              />
            </View>

            {/* Password */}
            <View style={dStyles.fieldGap}>
              <DiffuseFieldLabel>{t('auth_passwordLabel')}</DiffuseFieldLabel>
              <DiffuseField
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder={t('auth_passwordPlaceholder')}
              />
            </View>

            {/* CTA */}
            <View style={dStyles.ctaWrap}>
              <DiffuseSolidCTA
                label={loading ? t('auth_creating') : t('auth_continue')}
                onPress={signUp}
                disabled={loading}
              />
            </View>

            {/* Switch */}
            <View style={dStyles.footer}>
              <Text style={[dStyles.footerText, { fontFamily: diffuseFont.body, color: dt.colors.ink3 }]}>
                {t('auth_hasAccount')}
              </Text>
              <DiffuseTextLink label={t('auth_signIn')} onPress={() => router.push('/(auth)/sign-in')} />
            </View>

            {/* Terms */}
            <Text style={[dStyles.terms, { fontFamily: diffuseFont.mono, color: dt.colors.ink4 }]}>
              {t('auth_termsPrefix')}{' '}{t('auth_termsOfSerenity')}{' '}{t('auth_termsAnd')}{' '}
              {t('privacy_privacyPolicy')}
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </AuraField>
    )
  }

  const bg = colors.bg
  const paper = colors.surface
  const paperBorder = colors.border
  const ink = colors.text
  const ink3 = isDark ? colors.textMuted : '#6E6763'
  const ink4 = isDark ? colors.textFaint : '#A69E93'

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Decorative stickers — collage art */}
      <View style={[styles.stickerTR, { transform: [{ rotate: '-8deg' }] }]}>
        <Squishy w={110} h={70} fill={isDark ? stickers.yellow : '#F5D652'} />
      </View>
      <View style={[styles.stickerTR2, { transform: [{ rotate: '16deg' }] }]}>
        <Heart size={40} fill={isDark ? stickers.pink : '#F2B2C7'} />
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
          {/* Back button */}
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <View style={[styles.backBtn, { backgroundColor: paper, borderColor: paperBorder }]}>
              <Ionicons name="chevron-back" size={20} color={ink} />
            </View>
          </Pressable>

          {/* Heading */}
          <Text style={[styles.heading, { fontFamily: font.display, color: ink }]}>
            {t('auth_signUp_heading1')}
          </Text>
          <Text style={[styles.heading, { fontFamily: font.display, color: ink }]}>
            {t('auth_signUp_heading2')}
          </Text>
          <Text style={[styles.headingItalic, { fontFamily: font.italic, color: ink }]}>
            {t('auth_signUp_heading3')}
          </Text>
          <Text style={[styles.sub, { fontFamily: font.body, color: ink3 }]}>
            {t('auth_signUp_subtitle')}
          </Text>

          {/* Paper card inputs */}
          <View style={[styles.inputCard, { backgroundColor: paper, borderColor: paperBorder }]}>
            <Text style={[styles.inputLabel, { fontFamily: font.bodySemiBold, color: ink4 }]}>
              {t('auth_emailLabel')}
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.inputText, { fontFamily: font.body, color: ink }]}
              selectionColor={ink}
              placeholder={t('auth_emailPlaceholder')}
              placeholderTextColor={ink4}
            />
          </View>

          <View style={[styles.inputCard, { backgroundColor: paper, borderColor: paperBorder }]}>
            <Text style={[styles.inputLabel, { fontFamily: font.bodySemiBold, color: ink4 }]}>
              {t('auth_passwordLabel')}
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={[styles.inputText, { fontFamily: font.body, color: ink }]}
              selectionColor={ink}
              placeholder={t('auth_passwordPlaceholder')}
              placeholderTextColor={ink4}
            />
          </View>

          {/* CTA */}
          <Pressable
            onPress={signUp}
            disabled={loading}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: ink },
              {
                opacity: pressed ? 0.88 : loading ? 0.6 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={[styles.ctaText, { fontFamily: font.bodyMedium, color: bg }]}>
              {loading ? t('auth_creating') : t('auth_continue')}
            </Text>
          </Pressable>

          {/* Switch */}
          <Pressable onPress={() => router.push('/(auth)/sign-in')}>
            <Text style={[styles.switchLink, { fontFamily: font.body, color: ink3 }]}>
              {t('auth_hasAccount')}{' '}
              <Text style={{ fontFamily: font.bodySemiBold, color: ink }}>{t('auth_signIn')}</Text>
            </Text>
          </Pressable>

          {/* Terms */}
          <Text style={[styles.terms, { fontFamily: font.body, color: ink4 }]}>
            {t('auth_termsPrefix')}{' '}
            <Text style={{ textDecorationLine: 'underline' }}>{t('auth_termsOfSerenity')}</Text>
            {' '}{t('auth_termsAnd')}{' '}
            <Text style={{ textDecorationLine: 'underline' }}>{t('privacy_privacyPolicy')}</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },

  stickerTR: {
    position: 'absolute',
    top: 80,
    right: 20,
    zIndex: 0,
  },
  stickerTR2: {
    position: 'absolute',
    top: 130,
    right: 70,
    zIndex: 0,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    zIndex: 1,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  heading: {
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1, fontFamily: font.display },
  headingItalic: {
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -0.5,
    marginBottom: 10, fontFamily: font.display },
  sub: {
    fontSize: 15,
    marginBottom: 28,
  },

  inputCard: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputText: {
    fontSize: 18,
    letterSpacing: -0.3,
  },

  cta: {
    height: 58,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  ctaText: { fontSize: 16 },

  switchLink: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 16,
  },

  terms: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
})

// ─── Diffuse (v3) styles — AUTH 03 · Sign up ────────────────────────────────
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
  fieldGap: {
    marginTop: 20,
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
  terms: {
    fontSize: 9.5,
    letterSpacing: 0.4,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 20,
  },
})
