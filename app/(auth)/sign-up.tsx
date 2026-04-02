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

export default function SignUp() {
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signUp() {
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('Success', 'Check your email to confirm your account!')
      router.replace('/(auth)/sign-in')
    }
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
          <Text style={styles.title}>Begin Your{'\n'}Journey.</Text>
          <Text style={styles.subtitle}>
            Create your account and meet Grandma
          </Text>

          {/* Social Auth */}
          <View style={styles.socialSection}>
            <SocialAuthButtons />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign up with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email/Password */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password (min 6 characters)"
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <GradientButton
            title="Create Account"
            onPress={signUp}
            loading={loading}
            style={{ marginTop: spacing.md }}
          />

          <Text
            onPress={() => router.back()}
            style={styles.switchLink}
          >
            Already have an account?{' '}
            <Text style={styles.switchLinkAccent}>Sign in</Text>
          </Text>

          <Text style={styles.termsText}>
            By creating an account, you agree to Grandma's{' '}
            <Text style={styles.termsLink}>Terms of Serenity</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
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
    borderRadius: borderRadius.md,
    padding: 16,
    fontSize: 16,
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
  termsText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 24,
  },
  termsLink: {
    textDecorationLine: 'underline',
    color: colors.textSecondary,
  },
})
