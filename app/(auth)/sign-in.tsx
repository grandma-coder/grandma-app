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
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useTheme, stickers } from '../../constants/theme'
import { Burst } from '../../components/ui/Stickers'
import { signInWithApple, signInWithGoogle, isAppleSignInAvailable } from '../../lib/auth-providers'
import { Ionicons } from '@expo/vector-icons'

export default function SignIn() {
  const insets = useSafeAreaInsets()
  const { colors, font, isDark } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [appleAvailable, setAppleAvailable] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'apple' | 'google' | null>(null)

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable)
  }, [])

  async function signIn() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) Alert.alert('Error', error.message)
    setLoading(false)
  }

  async function handleApple() {
    try {
      setOauthLoading('apple')
      await signInWithApple()
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') Alert.alert('Sign-In Error', e.message)
    } finally {
      setOauthLoading(null)
    }
  }

  async function handleGoogle() {
    try {
      setOauthLoading('google')
      await signInWithGoogle()
    } catch (e: any) {
      if (e.message !== 'Google sign-in was cancelled or failed') Alert.alert('Sign-In Error', e.message)
    } finally {
      setOauthLoading(null)
    }
  }

  const bg = isDark ? colors.bg : '#F3ECD9'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'
  const ink2 = isDark ? colors.textSecondary : '#3A3533'
  const ink3 = isDark ? colors.textMuted : '#6E6763'
  const ink4 = isDark ? colors.textFaint : '#A69E93'

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Decorative sticker */}
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
            <View style={[styles.backBtn, { backgroundColor: paper, borderColor: paperBorder }]}>
              <Ionicons name="chevron-back" size={20} color={ink} />
            </View>
          </Pressable>

          {/* Heading */}
          <Text style={[styles.heading, { fontFamily: font.display, color: ink }]}>
            Welcome
          </Text>
          <Text style={[styles.headingItalic, { fontFamily: font.italic, color: ink }]}>
            back, dear.
          </Text>
          <Text style={[styles.sub, { fontFamily: font.body, color: ink3 }]}>
            Grandma's been waiting.
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
                Continue with Apple
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
              Continue with Google
            </Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: paperBorder }]} />
            <Text style={[styles.dividerText, { fontFamily: font.body, color: ink4 }]}>
              or sign in with email
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: paperBorder }]} />
          </View>

          {/* Paper card inputs */}
          <InputField
            label="EMAIL"
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
            label="PASSWORD"
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
          <Text style={[styles.forgot, { fontFamily: font.body, color: ink3 }]}>
            Forgot password?
          </Text>

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
              {loading ? 'Signing in…' : 'Sign in →'}
            </Text>
          </Pressable>

          {/* Switch */}
          <Pressable onPress={() => router.push('/(auth)/sign-up')}>
            <Text style={[styles.switchLink, { fontFamily: font.body, color: ink3 }]}>
              New here?{' '}
              <Text style={{ fontFamily: font.bodySemiBold, color: ink }}>
                Create account
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
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
}: any) {
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
        style={[styles.inputText, { fontFamily: font.display, color: ink }]}
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
    marginTop: 10,
  },
  headingItalic: {
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
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
