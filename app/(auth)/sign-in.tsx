/**
 * Sign In — paper card form (Apr 2026 redesign)
 *
 * Cream canvas · Fraunces display · paper-card inputs
 */

import { useEffect, useState } from 'react'
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
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useTheme, stickers, font, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { Burst } from '../../components/ui/Stickers'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { AuraField, AURA } from '../../components/ui/diffuse/AuraField'
import { DiffuseOAuthRow, DiffuseSolidCTA, DiffuseTextLink } from '../../components/ui/diffuse/DiffuseActions'
import { DiffuseField, DiffuseFieldLabel, DiffuseDivider } from '../../components/ui/diffuse/DiffuseField'
import { signInWithApple, signInWithGoogle, isAppleSignInAvailable } from '../../lib/auth-providers'
import { setPendingInvite } from '../../lib/pendingInvite'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from '../../lib/i18n'

export default function SignIn() {
  const insets = useSafeAreaInsets()
  const { colors, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [appleAvailable, setAppleAvailable] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'apple' | 'google' | null>(null)

  // Preserve a caregiver invite token through sign-in (see lib/pendingInvite).
  const params = useLocalSearchParams<{ invite?: string | string[] }>()
  useEffect(() => {
    const raw = Array.isArray(params.invite) ? params.invite[0] : params.invite
    if (raw) setPendingInvite(raw)
  }, [params.invite])

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable)
  }, [])

  async function signIn() {
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      Alert.alert(t('auth_missingInfo'), t('auth_missingEmailPassword'))
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert(t('auth_invalidEmail'), t('auth_invalidEmailMsg'))
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })
      if (error) Alert.alert(t('auth_signInFailed'), error.message)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error'
      Alert.alert(t('auth_signInFailed'), msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleApple() {
    try {
      setOauthLoading('apple')
      await signInWithApple()
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') Alert.alert(t('auth_signInError'), e.message)
    } finally {
      setOauthLoading(null)
    }
  }

  async function handleGoogle() {
    try {
      setOauthLoading('google')
      await signInWithGoogle()
    } catch (e: any) {
      if (e.message !== 'Google sign-in was cancelled or failed') Alert.alert(t('auth_signInError'), e.message)
    } finally {
      setOauthLoading(null)
    }
  }

  // ─── Diffuse (v3) render — AUTH 02 · Sign in ──────────────────────────────
  // Additive branch; the cream `!diffuse` render below is unchanged. Layout
  // mirrors the AUTH 02 frame: aura field → back button → serif "Welcome" +
  // italic "back, dear." (pre accent) → subcopy → OAuth rows → "or with email"
  // divider → bare-underline email + password fields → italic "Forgot password?"
  // → containerless "SIGN IN" CTA → footer "New here? Create account". No fills,
  // no pills, no shadows — hairlines + mono/serif type only.
  if (diffuse) {
    const accent = getDiffuseAccent('pre-pregnancy')
    return (
      <AuraField blooms={AURA.signin}>
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
              {t('auth_welcome')}
            </Text>
            <Text style={[dStyles.headingItalic, { fontFamily: diffuseFont.italic, color: accent }]}>
              {t('auth_welcome_back')}
            </Text>
            <Text style={[dStyles.sub, { fontFamily: diffuseFont.body, color: dt.colors.ink2 }]}>
              {t('auth_welcome_waiting')}
            </Text>

            {/* Social auth */}
            <View style={dStyles.oauthGroup}>
              {appleAvailable && (
                <DiffuseOAuthRow
                  label={t('auth_continueWithApple')}
                  onPress={handleApple}
                  icon={<Ionicons name="logo-apple" size={17} color={dt.colors.ink} />}
                />
              )}
              <DiffuseOAuthRow
                label={t('auth_continueWithGoogle')}
                onPress={handleGoogle}
                icon={<Ionicons name="logo-google" size={17} color={dt.colors.ink} />}
              />
            </View>

            {/* Divider */}
            <DiffuseDivider label={t('auth_orSignInEmail')} />

            {/* Email */}
            <DiffuseFieldLabel>{t('auth_emailLabel')}</DiffuseFieldLabel>
            <DiffuseField
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Password */}
            <View style={dStyles.fieldGap}>
              <DiffuseFieldLabel>{t('auth_passwordLabel')}</DiffuseFieldLabel>
              <DiffuseField value={password} onChangeText={setPassword} secureTextEntry />
            </View>

            {/* Forgot */}
            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              hitSlop={8}
              style={dStyles.forgotWrap}
            >
              <Text style={[dStyles.forgot, { fontFamily: diffuseFont.italic, color: dt.colors.ink3 }]}>
                {t('auth_forgotPassword')}
              </Text>
            </Pressable>

            {/* CTA */}
            <View style={dStyles.ctaWrap}>
              <DiffuseSolidCTA
                label={loading ? t('auth_signingIn') : t('auth_signIn')}
                onPress={signIn}
                disabled={loading}
              />
            </View>

            {/* Switch */}
            <View style={dStyles.footer}>
              <Text style={[dStyles.footerText, { fontFamily: diffuseFont.body, color: dt.colors.ink3 }]}>
                {t('auth_newHere')}
              </Text>
              <DiffuseTextLink label={t('auth_createAccount')} onPress={() => router.push('/(auth)/sign-up')} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </AuraField>
    )
  }

  const bg = colors.bg
  const paper = colors.surface
  const paperBorder = colors.border
  const ink = colors.text
  const ink2 = isDark ? colors.textSecondary : '#3A3533'
  const ink3 = isDark ? colors.textMuted : '#6E6763'
  const ink4 = isDark ? colors.textFaint : '#A69E93'

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Decorative sticker — collage art */}
      <View style={styles.stickerTR}>
        <Burst size={80} fill={isDark ? stickers.yellow : '#F5D652'} />
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
            <View style={[styles.backBtn, {
              backgroundColor: paper,
              borderColor: paperBorder,
            }]}>
              <Ionicons name="chevron-back" size={20} color={ink} />
            </View>
          </Pressable>

          {/* Heading */}
          <Text style={[styles.heading, { fontFamily: font.display, color: ink }]}>
            {t('auth_welcome')}
          </Text>
          <Text style={[styles.headingItalic, { fontFamily: font.italic, color: ink }]}>
            {t('auth_welcome_back')}
          </Text>
          <Text style={[styles.sub, { fontFamily: font.body, color: ink3 }]}>
            {t('auth_welcome_waiting')}
          </Text>

          {/* Social auth */}
          {appleAvailable && (
            <Pressable
              onPress={handleApple}
              disabled={oauthLoading !== null}
              style={({ pressed }) => [
                styles.socialBtn,
                { backgroundColor: ink, opacity: pressed ? 0.88 : oauthLoading === 'apple' ? 0.6 : 1 },
              ]}
            >
              <Ionicons name="logo-apple" size={18} color={bg} />
              <Text style={[styles.socialBtnText, { fontFamily: font.bodyMedium, color: bg }]}>
                {t('auth_continueWithApple')}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleGoogle}
            disabled={oauthLoading !== null}
            style={({ pressed }) => [
              styles.socialBtn,
              {
                backgroundColor: paper,
                borderWidth: 1,
                borderColor: paperBorder,
                opacity: pressed ? 0.88 : oauthLoading === 'google' ? 0.6 : 1,
              },
            ]}
          >
            <Ionicons name="logo-google" size={18} color={ink} />
            <Text style={[styles.socialBtnText, { fontFamily: font.bodyMedium, color: ink }]}>
              {t('auth_continueWithGoogle')}
            </Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: paperBorder }]} />
            <Text style={[styles.dividerText, { fontFamily: font.body, color: ink4 }]}>
              {t('auth_orSignInEmail')}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: paperBorder }]} />
          </View>

          {/* Paper card inputs */}
          <InputField
            label={t('auth_emailLabel')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            paper={paper}
            paperBorder={paperBorder}
            ink={ink}
            ink4={ink4}
            font={font}
          />
          <InputField
            label={t('auth_passwordLabel')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            paper={paper}
            paperBorder={paperBorder}
            ink={ink}
            ink4={ink4}
            font={font}
          />

          {/* Forgot */}
          <Pressable
            onPress={() => router.push('/(auth)/forgot-password')}
            hitSlop={8}
          >
            <Text style={[styles.forgot, { fontFamily: font.body, color: ink3 }]}>
              {t('auth_forgotPassword')}
            </Text>
          </Pressable>

          {/* CTA */}
          <Pressable
            onPress={signIn}
            disabled={loading}
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
              {loading ? t('auth_signingIn') : t('auth_signInArrow')}
            </Text>
          </Pressable>

          {/* Switch */}
          <Pressable onPress={() => router.push('/(auth)/sign-up')}>
            <Text style={[styles.switchLink, { fontFamily: font.body, color: ink3 }]}>
              {t('auth_newHere')}{' '}
              <Text style={{ fontFamily: font.bodySemiBold, color: ink }}>
                {t('auth_createAccount')}
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

interface InputFieldProps {
  label: string
  value: string
  onChangeText: (v: string) => void
  secureTextEntry?: boolean
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  paper: string
  paperBorder: string
  ink: string
  ink4: string
  font: { display: string; body: string; bodyMedium: string; bodySemiBold: string }
}

function InputField({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  paper,
  paperBorder,
  ink,
  ink4,
  font,
}: InputFieldProps) {
  return (
    <View style={[styles.inputCard, { backgroundColor: paper, borderColor: paperBorder }]}>
      <Text style={[styles.inputLabel, { fontFamily: font.bodySemiBold, color: ink4 }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[styles.inputText, { fontFamily: font.body, color: ink }]}
        selectionColor={ink}
        placeholderTextColor={ink4}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },

  stickerTR: {
    position: 'absolute',
    top: 80,
    right: 10,
    transform: [{ rotate: '14deg' }],
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
    letterSpacing: -1,
    marginTop: 10, fontFamily: font.display },
  headingItalic: {
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -0.5,
    marginBottom: 8, fontFamily: font.display },
  sub: {
    fontSize: 15,
    marginBottom: 28,
  },

  socialBtn: {
    height: 58,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  socialBtnText: {
    fontSize: 16,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },

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

  forgot: {
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 24,
  },

  cta: {
    height: 58,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ctaText: { fontSize: 16 },

  switchLink: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
})

// ─── Diffuse (v3) styles — AUTH 02 · Sign in ────────────────────────────────
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
    marginBottom: 24,
  },
  oauthGroup: {
    marginBottom: 4,
  },
  fieldGap: {
    marginTop: 20,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 12,
    marginBottom: 26,
  },
  forgot: {
    fontSize: 15,
  },
  ctaWrap: {
    marginTop: 4,
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
