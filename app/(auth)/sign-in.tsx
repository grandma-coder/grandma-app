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
import { authErrorText } from '../../lib/authError'
import { supabase } from '../../lib/supabase'
import { useTheme, font, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { SiteSticker } from '../../components/stickers/SiteSticker'
import { ActionDisc, EyeAction, ACTION_TONES } from '../../components/ui/AuthDock'
import { GoogleG } from '../../components/ui/GoogleG'
import { HandDrawnBox, HandRule } from '../../components/ui/HandDrawn'
import { InkBackButton } from '../../components/ui/InkBackButton'
import { Stagger, StickerEnter } from '../../components/ui/Motion'
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
      if (error) Alert.alert(t('auth_signInFailed'), authErrorText(error))
    } catch (e) {
      Alert.alert(t('auth_signInFailed'), authErrorText(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleApple() {
    try {
      setOauthLoading('apple')
      await signInWithApple()
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') Alert.alert(t('auth_signInError'), authErrorText(e))
    } finally {
      setOauthLoading(null)
    }
  }

  async function handleGoogle() {
    try {
      setOauthLoading('google')
      await signInWithGoogle()
    } catch (e: any) {
      if (e.message !== 'Google sign-in was cancelled or failed') Alert.alert(t('auth_signInError'), authErrorText(e))
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
  const paperBorder = colors.text
  const ink = colors.text
  const ink2 = isDark ? colors.textSecondary : '#3A3533'
  const ink3 = isDark ? colors.textMuted : '#6E6763'
  const ink4 = isDark ? colors.textFaint : '#A69E93'

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Decorative sticker — collage art */}
      <StickerEnter delay={450} tilt={12} seed={7} style={[styles.stickerTR, { top: insets.top + 14 }]}>
        <SiteSticker name="eye" size={48} cut />
      </StickerEnter>

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
          <Stagger delay={80}>
          {/* Back button */}
          <InkBackButton ink={ink} paper={paper} />

          {/* Heading */}
          <Text style={[styles.heading, { fontFamily: font.display, color: ink }]}>
            {t('auth_welcome')}
          </Text>
          <Text style={[styles.headingItalic, { fontFamily: font.display, color: ink }]}>
            {t('auth_welcome_back')}
          </Text>
          <Text style={[styles.sub, { fontFamily: font.body, color: ink3 }]}>
            {t('auth_welcome_waiting')}
          </Text>

          {/* Social auth — the same discs as the welcome dock */}
          <View style={styles.discRow}>
            {appleAvailable && (
              <ActionDisc index={0} delay={200} size={58} fill="#FFFFFF" ink={ink} label="Apple"
                a11y={t('auth_continueWithApple')} onPress={handleApple}
                disabled={oauthLoading !== null} loading={oauthLoading === 'apple'}>
                <Ionicons name="logo-apple" size={24} color={ink} />
              </ActionDisc>
            )}
            <ActionDisc index={1} delay={200} size={58} fill="#FFFFFF" ink={ink} label="Google"
              a11y={t('auth_continueWithGoogle')} onPress={handleGoogle}
              disabled={oauthLoading !== null} loading={oauthLoading === 'google'}>
              <GoogleG size={22} />
            </ActionDisc>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <HandRule color={paperBorder} />
            <Text style={[styles.dividerText, { fontFamily: font.body, color: ink4 }]}>
              {t('auth_orSignInEmail')}
            </Text>
            <HandRule color={paperBorder} />
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

          {/* CTA — the pink eye disc is the primary action */}
          <View style={styles.eyeRow}>
            <EyeAction label={loading ? t('auth_signingIn') : t('auth_signIn')} onPress={signIn} ink={ink} loading={loading} sticker="house" fill={ACTION_TONES.yellow} />
          </View>

          {/* Switch */}
          <Pressable onPress={() => router.push('/(auth)/sign-up')}>
            <Text style={[styles.switchLink, { fontFamily: font.body, color: ink3 }]}>
              {t('auth_newHere')}{' '}
              <Text style={{ fontFamily: font.bodySemiBold, color: ink }}>
                {t('auth_createAccount')}
              </Text>
            </Text>
          </Pressable>
          </Stagger>
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
  const { t } = useTranslation()
  return (
    <HandDrawnBox style={styles.inputCard} fill={paper} stroke={paperBorder} radius={14} seed={'field1'}>
      <Text style={[styles.inputLabel, { fontFamily: 'SpaceMono_400Regular', letterSpacing: 1.4, color: ink4 }]}>
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
        placeholder={secureTextEntry ? '••••••••' : t('auth_emailPlaceholder')}
        placeholderTextColor={ink4}
      />
    </HandDrawnBox>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },

  stickerTR: {
    position: 'absolute',
    right: 26,
    transform: [{ rotate: '12deg' }],
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
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  heading: {
    fontSize: 32, lineHeight: 40, letterSpacing: 0.2, textTransform: 'uppercase',
    marginTop: 10, fontFamily: font.display },
  headingItalic: {
    fontSize: 32, lineHeight: 40, letterSpacing: 0.2, textTransform: 'uppercase',
    marginBottom: 8, fontFamily: font.display },
  sub: {
    fontSize: 15,
    marginBottom: 28,
  },

  discRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    marginTop: 4,
    marginBottom: 6,
  },
  eyeRow: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
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
    borderRadius: 14,
    padding: 14,
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
    letterSpacing: 0,
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
