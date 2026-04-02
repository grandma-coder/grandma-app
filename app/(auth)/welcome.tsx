import { View, Text, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { GradientButton } from '../../components/ui/GradientButton'
import { colors, typography, spacing } from '../../constants/theme'

export default function Welcome() {
  const insets = useSafeAreaInsets()

  return (
    <CosmicBackground>
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        {/* Header: Sign-in link */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>👵</Text>
            </View>
            <Text style={styles.logoText}>grandma.app</Text>
          </View>
          <Text
            onPress={() => router.push('/(auth)/sign-in')}
            style={styles.signInLink}
          >
            Already a member?{'\n'}
            <Text style={styles.signInLinkBold}>Sign in</Text>
          </Text>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            Welcome,{'\n'}Dear One.
          </Text>
          <Text style={styles.heroSubtitle}>
            Let's prepare your space. Tell Grandma{'\n'}
            AI a bit about your family journey.
          </Text>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* CTA */}
        <View style={[styles.cta, { paddingBottom: insets.bottom + 24 }]}>
          <GradientButton
            title="Begin Your Journey"
            onPress={() => router.push('/(auth)/sign-up')}
          />

          <Text style={styles.termsText}>
            By continuing, you agree to Grandma's{' '}
            <Text style={styles.termsLink}>Terms of Serenity</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
        </View>
      </View>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 22,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  signInLink: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
    lineHeight: 18,
  },
  signInLinkBold: {
    color: colors.accent,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  hero: {
    marginTop: 60,
  },
  heroTitle: {
    ...typography.hero,
    fontSize: 42,
    lineHeight: 50,
    marginBottom: 16,
  },
  heroSubtitle: {
    ...typography.bodySecondary,
    lineHeight: 22,
  },
  cta: {
    gap: 16,
  },
  termsText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    textDecorationLine: 'underline',
    color: colors.textSecondary,
  },
})
