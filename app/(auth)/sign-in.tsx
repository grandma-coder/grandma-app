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
import { ArrowLeft } from 'lucide-react-native'
import { supabase } from '../../lib/supabase'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons'
import { THEME_COLORS, spacing } from '../../constants/theme'

export default function SignIn() {
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signIn() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) Alert.alert('Error', error.message)
    setLoading(false)
  }

  return (
    <CosmicBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <ArrowLeft size={22} color="rgba(255,255,255,0.7)" strokeWidth={2} />
          </Pressable>

          <Text style={[styles.title, { marginTop: 32 }]}>Welcome back,{'\n'}Dear.</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey</Text>

          {/* Social Auth */}
          <View style={styles.socialSection}>
            <SocialAuthButtons />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign in with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Inputs */}
          <TextInput
            style={styles.input}
            selectionColor={THEME_COLORS.yellow}
            placeholder="Email address"
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            selectionColor={THEME_COLORS.yellow}
            placeholder="Password"
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* CTA */}
          <Pressable
            onPress={signIn}
            disabled={loading}
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && { transform: [{ scale: 0.98 }] },
              loading && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.ctaText}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.push('/(auth)/sign-up')}>
            <Text style={styles.switchLink}>
              New here? <Text style={styles.switchBold}>Create account</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing['2xl'],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    lineHeight: 40,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 32,
  },
  socialSection: {
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 36,
    paddingHorizontal: 28,
    height: 72,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  ctaButton: {
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME_COLORS.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: THEME_COLORS.yellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1030',
    letterSpacing: 0.5,
  },
  switchLink: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  },
  switchBold: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
})
