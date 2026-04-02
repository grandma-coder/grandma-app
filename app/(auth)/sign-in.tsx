import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { GradientButton } from '../../components/ui/GradientButton'
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons'
import { colors, typography, spacing, borderRadius } from '../../constants/theme'

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
            {
              paddingTop: insets.top + 60,
              paddingBottom: insets.bottom + 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Welcome back,{'\n'}Dear.</Text>
          <Text style={styles.subtitle}>Grandma is ready to help</Text>

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

          {/* Email/Password */}
          <TextInput
            style={styles.input}
            selectionColor={colors.neon.blue}
            placeholder="Email"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            selectionColor={colors.neon.blue}
            placeholder="Password"
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <GradientButton
            title="Sign In"
            onPress={signIn}
            loading={loading}
            style={{ marginTop: spacing.md }}
          />

          <Text
            onPress={() => router.push('/(auth)/sign-up')}
            style={styles.switchLink}
          >
            Don't have an account?{' '}
            <Text style={styles.switchLinkAccent}>Sign up</Text>
          </Text>
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
  title: {
    ...typography.hero,
    fontSize: 40,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    ...typography.bodySecondary,
    marginBottom: 36,
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
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  input: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 40,
    paddingHorizontal: 24,
    height: 72,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  switchLink: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 15,
    color: colors.textSecondary,
  },
  switchLinkAccent: {
    color: colors.accent,
    fontWeight: '600',
  },
})
