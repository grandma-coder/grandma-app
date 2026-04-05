/**
 * A4 — Welcome + Auth Screen
 *
 * Animated GRANDMA wordmark, taglines, Apple + Google OAuth.
 * Auth state changes trigger route guard in _layout.tsx automatically.
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
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, brand } from '../../constants/theme'
import {
  signInWithApple,
  signInWithGoogle,
  isAppleSignInAvailable,
} from '../../lib/auth-providers'

export default function Welcome() {
  const insets = useSafeAreaInsets()
  const { colors, fontSize, fontWeight, radius, spacing } = useTheme()

  // ─── Animated logo ──────────────────────────────────────────────────────
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.8)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  // ─── Background pulse ───────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: false,
        }),
      ])
    ).start()
  }, [])

  const bgOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  })

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
      // Route guard in _layout.tsx handles navigation
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign-In Error', e.message)
      }
    } finally {
      setLoading(null)
    }
  }

  async function handleGoogle() {
    try {
      setLoading('google')
      await signInWithGoogle()
      // Route guard in _layout.tsx handles navigation
    } catch (e: any) {
      if (e.message !== 'Google sign-in was cancelled or failed') {
        Alert.alert('Sign-In Error', e.message)
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Animated gradient background */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]}>
        <LinearGradient
          colors={[brand.primaryDark, colors.bg, brand.primaryTint]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={[styles.container, { paddingTop: insets.top + 80 }]}>
        {/* Animated GRANDMA wordmark */}
        <Animated.Text
          style={[
            styles.wordmark,
            {
              color: colors.primary,
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          GRANDMA
        </Animated.Text>

        {/* Tagline 1 */}
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          Your favorite parents tracker and community builder
        </Text>

        {/* Tagline 2 */}
        <Text style={[styles.taglineItalic, { color: colors.textMuted }]}>
          Your support system for the most beautiful journey of your life.
        </Text>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Auth buttons */}
        <View style={[styles.authSection, { paddingBottom: insets.bottom + 24 }]}>
          {/* Apple Sign In */}
          {appleAvailable && (
            <Pressable
              onPress={handleApple}
              disabled={loading !== null}
              style={({ pressed }) => [
                styles.authButton,
                styles.appleButton,
                { borderRadius: radius.lg },
                pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
                loading === 'apple' && { opacity: 0.6 },
              ]}
            >
              {loading === 'apple' ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                  <Text style={styles.appleText}>Continue with Apple</Text>
                </>
              )}
            </Pressable>
          )}

          {/* Google Sign In */}
          <Pressable
            onPress={handleGoogle}
            disabled={loading !== null}
            style={({ pressed }) => [
              styles.authButton,
              styles.googleButton,
              { borderRadius: radius.lg, borderColor: colors.border },
              pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
              loading === 'google' && { opacity: 0.6 },
            ]}
          >
            {loading === 'google' ? (
              <ActivityIndicator color="#1A1A2E" />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color="#1A1A2E" />
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {/* Terms */}
          <Text style={[styles.terms, { color: colors.textMuted }]}>
            By continuing, you agree to Grandma's{' '}
            <Text style={{ color: colors.textSecondary, textDecorationLine: 'underline' }}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text style={{ color: colors.textSecondary, textDecorationLine: 'underline' }}>
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  // Wordmark
  wordmark: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 6,
    marginBottom: 24,
  },

  // Taglines
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  taglineItalic: {
    fontSize: 14,
    fontWeight: '400',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },

  // Auth section
  authSection: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  authButton: {
    width: '100%',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  // Apple
  appleButton: {
    backgroundColor: '#000000',
  },
  appleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Google
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
  },
  googleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
  },

  // Terms
  terms: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    marginTop: 8,
  },
})
