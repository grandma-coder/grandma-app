import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CosmicBackground } from '../components/ui/CosmicBackground'
import { GlassCard } from '../components/ui/GlassCard'
import { GradientButton } from '../components/ui/GradientButton'
import { colors, typography, spacing } from '../constants/theme'

export default function AirTagSetup() {
  const insets = useSafeAreaInsets()

  return (
    <CosmicBackground>
      <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Ionicons name="bluetooth" size={40} color={colors.accent} />
          </View>
          <Text style={styles.title}>Connect AirTag</Text>
          <Text style={styles.subtitle}>
            Track your child's location in real time by connecting an Apple AirTag to grandma.app.
          </Text>
        </View>

        <View style={styles.steps}>
          <GlassCard style={styles.step}>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Attach the AirTag</Text>
                <Text style={styles.stepText}>
                  Place an AirTag in your child's bag, stroller, or clothing.
                </Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard style={styles.step}>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Pair via Find My</Text>
                <Text style={styles.stepText}>
                  Ensure the AirTag is paired with your Apple ID in the Find My app.
                </Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard style={styles.step}>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Enable in grandma.app</Text>
                <Text style={styles.stepText}>
                  We'll request location permissions to show your child's position on the home screen.
                </Text>
              </View>
            </View>
          </GlassCard>
        </View>

        <View style={styles.bottom}>
          <GradientButton
            title="Enable Location Tracking"
            onPress={() => {
              // TODO: Request permissions + native AirTag integration
              router.back()
            }}
          />
          <Text style={styles.note}>
            Requires iOS 14.5+ and an Apple AirTag. Location data is stored securely and only visible to you.
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
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-end',
  },
  hero: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    ...typography.heading,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  steps: {
    gap: 10,
  },
  step: {
    // no extra padding needed
  },
  stepRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textOnAccent,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  stepText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  bottom: {
    marginTop: 'auto',
    gap: 12,
  },
  note: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
})
