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
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useTheme, font, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { Burst, Blob, Heart, Flower } from '../../components/ui/Stickers'
import { GrandmaLogo } from '../../components/ui/GrandmaLogo'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import {
  signInWithApple,
  signInWithGoogle,
  isAppleSignInAvailable,
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

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 14, useNativeDriver: true }),
    ]).start()
  }, [])

  // ─── Auth state ─────────────────────────────────────────────────────────
  const [appleAvailable, setAppleAvailable] = useState(false)
  const [loading, setLoading] = useState<'apple' | 'google' | null>(null)

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable)
  }, [])

  async function handleApple() {
    try {
      setLoading('apple')
      await signInWithApple()
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      if (err.code !== 'ERR_REQUEST_CANCELED') Alert.alert(t('auth_signInError'), err.message ?? t('error_tryAgain'))
    } finally {
      setLoading(null)
    }
  }

  async function handleGoogle() {
    try {
      setLoading('google')
      await signInWithGoogle()
    } catch (e: unknown) {
      const err = e as { message?: string }
      if (err.message !== 'Google sign-in was cancelled or failed') Alert.alert(t('auth_signInError'), err.message ?? t('error_tryAgain'))
    } finally {
      setLoading(null)
    }
  }

  const bg = diffuse ? dt.colors.bg : colors.bg
  const ink = diffuse ? dt.colors.ink : colors.text
  const ink2 = diffuse ? dt.colors.ink2 : colors.textSecondary
  const ink3 = diffuse ? dt.colors.ink3 : colors.textMuted
  const paper = diffuse ? dt.colors.surface : colors.surface
  const paperBorder = diffuse ? dt.colors.line2 : colors.border

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* ── Decorative stickers (positioned absolutely) — collage art; hidden under Diffuse ── */}
      {!diffuse && (
        <>
          <View style={[styles.stickerTL, { transform: [{ rotate: '-18deg' }] }]}>
            <Blob size={110} fill={stickers.yellow} variant={1} />
          </View>
          <View style={[styles.stickerTR, { transform: [{ rotate: '24deg' }] }]}>
            <Burst size={90} fill={stickers.pink} />
          </View>
          <View style={[styles.stickerMidL, { transform: [{ rotate: '-8deg' }] }]}>
            <Flower
              size={80}
              petal={stickers.lilac}
              center={stickers.yellow}
            />
          </View>
          <View style={styles.stickerMidR}>
            <Heart size={70} fill={stickers.blue} />
          </View>
        </>
      )}

      {/* ── Content ── */}
      <Animated.View
        style={[
          styles.content,
          { paddingTop: insets.top + 220, opacity: fadeIn, transform: [{ translateY: slideUp }] },
        ]}
      >
        {/* Heart-eye logo — brand mark, kept as-is */}
        <View style={{ marginBottom: 18 }}>
          <GrandmaLogo
            size={104}
            palette="sunny"
            outline={ink}
            motion="sparkle"
          />
        </View>

        {/* Italic welcome line */}
        <Text style={[styles.welcomeLine, { fontFamily: diffuse ? diffuseFont.italic : font.italic, color: ink3 }]}>
          {t('auth_welcome_intro')}
        </Text>

        {/* Main wordmark */}
        <Text style={[styles.wordmark, { fontFamily: diffuse ? diffuseFont.display : font.display, color: ink }]}>
          {t('auth_signUp_heading2')}
        </Text>

        {/* Italic tagline — mode-agnostic pre-login; ink under Diffuse, no accent */}
        <Text style={[styles.seesYou, { fontFamily: diffuse ? diffuseFont.italic : font.italic, color: diffuse ? dt.colors.ink2 : stickers.coral }]}>
          {t('auth_welcome_tagline')}
        </Text>

        {/* Body */}
        <Text style={[styles.body, { fontFamily: diffuse ? diffuseFont.body : font.body, color: ink2 }]}>
          {t('auth_welcome_body')}
        </Text>
      </Animated.View>

      {/* ── Auth buttons ── */}
      <Animated.View
        style={[
          styles.authSection,
          { paddingBottom: insets.bottom + 24, opacity: fadeIn },
        ]}
      >
        {appleAvailable && (
          <Pressable
            onPress={handleApple}
            disabled={loading !== null}
            style={({ pressed }) => [
              styles.authBtn,
              diffuse
                ? {
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: dt.colors.line2,
                    opacity: pressed ? 0.6 : loading === 'apple' ? 0.5 : 1,
                  }
                : { backgroundColor: ink, opacity: pressed ? 0.88 : loading === 'apple' ? 0.6 : 1 },
            ]}
          >
            {loading === 'apple' ? (
              <ActivityIndicator color={diffuse ? dt.colors.ink : bg} />
            ) : (
              <>
                <Ionicons name="logo-apple" size={18} color={diffuse ? dt.colors.ink : bg} />
                <Text style={[styles.authBtnText, diffuse
                  ? { fontFamily: diffuseFont.mono, color: dt.colors.ink, letterSpacing: 1.6, textTransform: 'uppercase', fontSize: 13 }
                  : { fontFamily: font.bodyMedium, color: bg }]}>
                  {t('auth_continueWithApple')}
                </Text>
              </>
            )}
          </Pressable>
        )}

        <Pressable
          onPress={handleGoogle}
          disabled={loading !== null}
          style={({ pressed }) => [
            styles.authBtn,
            diffuse
              ? {
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: dt.colors.line2,
                  opacity: pressed ? 0.6 : loading === 'google' ? 0.5 : 1,
                }
              : {
                  backgroundColor: paper,
                  borderWidth: 1,
                  borderColor: paperBorder,
                  opacity: pressed ? 0.88 : loading === 'google' ? 0.6 : 1,
                },
          ]}
        >
          {loading === 'google' ? (
            <ActivityIndicator color={ink} />
          ) : (
            <>
              <Ionicons name="logo-google" size={18} color={ink} />
              <Text style={[styles.authBtnText, diffuse
                ? { fontFamily: diffuseFont.mono, color: dt.colors.ink, letterSpacing: 1.6, textTransform: 'uppercase', fontSize: 13 }
                : { fontFamily: font.bodyMedium, color: ink }]}>
                {t('auth_continueWithGoogle')}
              </Text>
            </>
          )}
        </Pressable>

        <Text style={[styles.signInLink, { fontFamily: diffuse ? diffuseFont.body : font.body, color: ink3 }]}>
          {t('auth_hasAccount')}{' '}
          <Text
            onPress={() => router.push('/(auth)/sign-in')}
            style={{ color: ink, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }}
          >
            {t('auth_signIn')}
          </Text>
        </Text>
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

  // Sticker positions
  stickerTL: {
    position: 'absolute',
    top: 72,
    left: -20,
  },
  stickerTR: {
    position: 'absolute',
    top: 100,
    right: -10,
  },
  stickerMidL: {
    position: 'absolute',
    top: 250,
    left: 30,
  },
  stickerMidR: {
    position: 'absolute',
    top: 220,
    right: 24,
  },

  // Text content
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    textAlign: 'left',
  },
  welcomeLine: {
    fontSize: 18,
    marginBottom: 6,
  },
  wordmark: {
    fontSize: 68,
    fontWeight: '700',
    lineHeight: 64,
    letterSpacing: -2, fontFamily: font.display },
  seesYou: {
    fontSize: 32,
    marginTop: 4,
    marginBottom: 16, fontFamily: font.display },
  body: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 280,
  },

  // Auth section
  authSection: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    gap: 10,
    alignItems: 'center',
  },
  authBtn: {
    width: '100%',
    height: 58,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  authBtnText: {
    fontSize: 16,
    fontWeight: '500',
  },
  signInLink: {
    fontSize: 13,
    marginTop: 6,
  },
})
