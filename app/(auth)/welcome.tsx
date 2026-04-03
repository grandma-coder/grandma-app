import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { colors, THEME_COLORS, borderRadius, spacing, shadows } from '../../constants/theme'

export default function Welcome() {
  const insets = useSafeAreaInsets()

  return (
    <CosmicBackground>
      <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
        {/* Cosmic Ring Logo */}
        <View style={styles.ringSection}>
          {/* Nebula glow */}
          <View style={styles.nebulaGlow} />

          {/* Ring with 28 dots */}
          <View style={styles.ringWrapper}>
            {Array.from({ length: 28 }).map((_, i) => {
              const angle = (i / 28) * 2 * Math.PI - Math.PI / 2
              const x = Math.cos(angle) * 60
              const y = Math.sin(angle) * 60
              const phaseColors = ['#FF8AD8', '#FF8AD8', '#FF8AD8', '#FF8AD8', '#FF8AD8',
                '#F4FD50', '#F4FD50', '#F4FD50', '#F4FD50', '#F4FD50', '#F4FD50', '#F4FD50',
                '#A2FF86', '#A2FF86', '#A2FF86', '#A2FF86',
                '#B983FF', '#B983FF', '#B983FF', '#B983FF', '#B983FF', '#B983FF', '#B983FF', '#B983FF', '#B983FF', '#B983FF', '#B983FF', '#B983FF']
              return (
                <View
                  key={i}
                  style={[styles.ringDot, {
                    backgroundColor: phaseColors[i],
                    left: 70 + x - 3,
                    top: 70 + y - 3,
                    opacity: 0.7,
                  }]}
                />
              )
            })}
            {/* Center moon */}
            <View style={styles.ringCenter}>
              <Ionicons name="moon-outline" size={28} color="rgba(255,255,255,0.4)" />
            </View>
          </View>
        </View>

        {/* Brand */}
        <Text style={styles.brand}>grandma.app</Text>

        {/* Hero */}
        <Text style={styles.heroTitle}>Welcome, Dear One.</Text>
        <Text style={styles.heroSubtitle}>
          Let Grandma guide you through every step of your journey — from trying to conceive, through pregnancy, and into parenthood.
        </Text>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* CTA */}
        <View style={[styles.cta, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable
            onPress={() => router.push('/(auth)/sign-up')}
            style={({ pressed }) => [styles.ctaButton, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <LinearGradient
              colors={['#EC4899', '#A855F7', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Begin Your Journey</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => router.push('/(auth)/sign-in')}>
            <Text style={styles.signInLink}>
              Already a member? <Text style={styles.signInBold}>Sign in</Text>
            </Text>
          </Pressable>

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
    alignItems: 'center',
  },

  // Cosmic ring
  ringSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  nebulaGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#B983FF',
    opacity: 0.08,
  },
  ringWrapper: {
    width: 140,
    height: 140,
    position: 'relative',
  },
  ringDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Brand
  brand: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
    marginBottom: 40,
  },

  // Hero
  heroTitle: {
    fontSize: 44,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 48,
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },

  // CTA
  cta: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  ctaButton: {
    width: '100%',
    maxWidth: 320,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
  },
  ctaGradient: {
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  signInLink: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  signInBold: {
    color: colors.text,
    fontWeight: '600',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(255,255,255,0.2)',
  },

  termsText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 24,
  },
  termsLink: {
    textDecorationLine: 'underline',
    color: 'rgba(255,255,255,0.5)',
  },
})
