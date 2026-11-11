/**
 * Welcome screen — sticker collage aesthetic (Apr 2026 redesign)
 *
 * Cream canvas · Fraunces display · decorative stickers
 * "grandma / sees you." headline + Apple/Google auth
 */

import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { authErrorText } from '../../lib/authError'
import { router, useLocalSearchParams } from 'expo-router'
import { useTheme, font, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { GrandmaLogo } from '../../components/ui/GrandmaLogo'
import { SiteBrand, RebusHeadline } from '../../components/ui/SiteBrand'
import { AuthDock } from '../../components/ui/AuthDock'
import { GoogleG } from '../../components/ui/GoogleG'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { AuraField, AURA } from '../../components/ui/diffuse/AuraField'
import { DiffuseOAuthRow, DiffuseTextLink } from '../../components/ui/diffuse/DiffuseActions'
import {
  signInWithApple,
  signInWithGoogle,
  isAppleSignInAvailable,
  isSignInCancelled,
} from '../../lib/auth-providers'
import { setPendingInvite } from '../../lib/pendingInvite'
import { useTranslation } from '../../lib/i18n'

export default function Welcome() {
  const insets = useSafeAreaInsets()
  const { colors, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  // A caregiver invite link opened while signed out lands here as
  // ?invite=<token> (see app/accept-invite.tsx). Stash it so the root layout
  // can resume the accept flow once the user authenticates.
  const params = useLocalSearchParams<{ invite?: string | string[] }>()
  useEffect(() => {
    const raw = Array.isArray(params.invite) ? params.invite[0] : params.invite
    if (raw) setPendingInvite(raw)
  }, [params.invite])

  // ─── Entrance animation ─────────────────────────────────────────────────
  const fadeIn = useRef(new Animated.Value(0)).current
  const slideUp = useRef(new Animated.Value(24)).current

  const actionsIn = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 14, useNativeDriver: true }),
      // buttons land once the headline stickers have popped in
      Animated.spring(actionsIn, { toValue: 1, tension: 70, friction: 12, delay: 900, useNativeDriver: true }),
    ]).start()
  }, [])

  // ─── Auth state ─────────────────────────────────────────────────────────
  const [appleAvailable, setAppleAvailable] = useState(false)
  const [loading, setLoading] = useState<'apple' | 'google' | null>(null)

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable)
  }, [])

  // One sheet at a time: a second tap before the re-render opened a second auth session
  // (Google answers 'locked') or ran Apple twice.
  const busy = useRef(false)

  async function handleApple() {
    if (busy.current) return
    busy.current = true
    try {
      setLoading('apple')
      await signInWithApple()
    } catch (e: unknown) {
      if (!isSignInCancelled(e)) Alert.alert(t('auth_signInError'), authErrorText(e))
    } finally {
      busy.current = false
      setLoading(null)
    }
  }

  async function handleGoogle() {
    if (busy.current) return
    busy.current = true
    try {
      setLoading('google')
      await signInWithGoogle()
    } catch (e: unknown) {
      if (!isSignInCancelled(e)) Alert.alert(t('auth_signInError'), authErrorText(e))
    } finally {
      busy.current = false
      setLoading(null)
    }
  }

  const bg = diffuse ? dt.colors.bg : colors.bg
  const ink = diffuse ? dt.colors.ink : colors.text
  const ink2 = diffuse ? dt.colors.ink2 : colors.textSecondary
  const ink3 = diffuse ? dt.colors.ink3 : colors.textMuted
  const paper = diffuse ? dt.colors.surface : colors.surface
  const paperBorder = diffuse ? dt.colors.line2 : colors.border

  // ─── Diffuse (v3) render — AUTH 01 · Welcome ──────────────────────────────
  // Additive branch; the cream `!diffuse` render below is unchanged. Layout
  // mirrors the AUTH 01 frame: aura field → eye-logo → mono "welcome to" kicker
  // → serif "grandma" + italic "sees you." (pre accent) → subcopy → OAuth rows
  // → footer sign-in link. No fills, no pills, no shadows — hairlines only.
  if (diffuse) {
    const accent = getDiffuseAccent('pre-pregnancy')
    return (
      <AuraField blooms={AURA.welcome}>
        <Animated.View
          style={[
            dStyles.hero,
            { paddingTop: insets.top + 72, opacity: fadeIn, transform: [{ translateY: slideUp }] },
          ]}
        >
          {/* Eye-logo — brand mark */}
          <GrandmaLogo size={78} palette="sunny" outline={dt.colors.ink} motion="sparkle" />

          {/* Mono "welcome to" kicker */}
          <Text style={[dStyles.kicker, { fontFamily: diffuseFont.mono, color: dt.colors.ink3 }]}>
            {t('auth_welcome_intro')}
          </Text>

          {/* Serif wordmark */}
          <Text style={[dStyles.wordmark, { fontFamily: diffuseFont.displayLight, color: dt.colors.ink }]}>
            {t('auth_signUp_heading2')}
          </Text>

          {/* Italic tagline — pre accent */}
          <Text style={[dStyles.tagline, { fontFamily: diffuseFont.italic, color: accent }]}>
            {t('auth_welcome_tagline')}
          </Text>

          {/* Subcopy */}
          <Text style={[dStyles.subcopy, { fontFamily: diffuseFont.body, color: dt.colors.ink2 }]}>
            {t('auth_welcome_body')}
          </Text>
        </Animated.View>

        {/* OAuth rows + footer link */}
        <Animated.View style={[dStyles.actions, { paddingBottom: insets.bottom + 28, opacity: fadeIn }]}>
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
          <View style={dStyles.footer}>
            <Text style={[dStyles.footerText, { fontFamily: diffuseFont.body, color: dt.colors.ink3 }]}>
              {t('auth_hasAccount')}
            </Text>
            <DiffuseTextLink label={t('auth_signIn')} onPress={() => router.push('/(auth)/sign-in')} />
          </View>
        </Animated.View>
      </AuraField>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: bg, paddingTop: insets.top + 12 }]}>
      {/* ── Brand — the site's top bar mark ── */}
      <Animated.View style={[styles.brandRow, { opacity: fadeIn }]}>
        <SiteBrand color={ink} size={34} blink />
      </Animated.View>

      {/* ── Hero — the site's rebus headline + sub ── */}
      <Animated.View style={[styles.hero, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <RebusHeadline text={t('auth_welcome_rebus')} style={[styles.rebus, { color: ink }]} stickerSize={40} delay={350} />
        <Text style={[styles.body, { color: ink2 }]}>{t('auth_welcome_body')}</Text>
      </Animated.View>

      {/* ── Auth buttons ── */}
      <Animated.View
        style={[
          styles.authSection,
          { paddingBottom: insets.bottom + 20, opacity: actionsIn, transform: [{ translateY: actionsIn.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
        ]}
      >
        <AuthDock
          ink={ink}
          paper={bg}
          startLabel={t('auth_startHere')}
          startA11y={t('auth_signUp')}
          appleA11y={t('auth_continueWithApple')}
          googleA11y={t('auth_continueWithGoogle')}
          showApple={appleAvailable}
          loading={loading}
          onApple={handleApple}
          onGoogle={handleGoogle}
          onStart={() => router.push('/(auth)/sign-up')}
          appleIcon={<Ionicons name="logo-apple" size={24} color={ink} />}
          googleIcon={<GoogleG size={22} />}
        />

        <Pressable
          onPress={() => router.push('/(auth)/sign-in')}
          hitSlop={12}
          accessibilityRole="link"
          style={({ pressed }) => [styles.signInRow, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.signInLink, { fontFamily: font.body, color: ink3 }]}>
            {t('auth_hasAccount')}{' '}
            <Text style={{ color: ink, fontFamily: font.bodyBold, textDecorationLine: 'underline' }}>{t('auth_signIn')}</Text>
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },

  brandRow: {
    paddingHorizontal: 24,
    paddingTop: 18,
    alignItems: 'center',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  rebus: {
    fontFamily: font.display,
    fontSize: 34,
    lineHeight: 50,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: font.body,
    fontSize: 17,
    lineHeight: 25,
    marginTop: 18,
    maxWidth: 360,
  },

  // Auth section
  authSection: {
    paddingHorizontal: 20,
    gap: 12,
    alignItems: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  signInRow: {
    paddingVertical: 8,
  },
  signInLink: {
    fontSize: 13,
    marginTop: 6,
  },
})

// ─── Diffuse (v3) styles — AUTH 01 · Welcome ────────────────────────────────
const dStyles = StyleSheet.create({
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 22,
  },
  wordmark: {
    fontSize: 62,
    lineHeight: 62,
    letterSpacing: -1.2,
    marginTop: 10,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 25,
    marginTop: 2,
    textAlign: 'center',
  },
  subcopy: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 240,
    marginTop: 18,
  },
  actions: {
    paddingHorizontal: 32,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 18,
  },
  footerText: {
    fontSize: 12.5,
  },
})
