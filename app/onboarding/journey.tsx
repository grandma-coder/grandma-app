import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useJourneyStore } from '../../store/useJourneyStore'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { GlassCard } from '../../components/ui/GlassCard'
import { colors, typography, spacing } from '../../constants/theme'
import type { JourneyMode } from '../../types'

const JOURNEYS: {
  id: JourneyMode
  journey: 'pregnancy' | 'newborn' | 'newborn'
  icon: string
  title: string
  subtitle: string
  next: string
}[] = [
  {
    id: 'pre-pregnancy',
    journey: 'newborn',
    icon: '✨',
    title: 'I want to be pregnant',
    subtitle: 'Prepare, learn, and start your journey to parenthood.',
    next: '/onboarding/parent-name',
  },
  {
    id: 'pregnancy',
    journey: 'pregnancy',
    icon: '🤰',
    title: "I'm pregnant",
    subtitle: 'Guided wisdom for each trimester of your growth.',
    next: '/onboarding/parent-name',
  },
  {
    id: 'kids',
    journey: 'newborn',
    icon: '👶',
    title: 'I have kids',
    subtitle: "Nurturing insights for your little one's milestones.",
    next: '/onboarding/activities',
  },
]

export default function JourneySelect() {
  const { setJourney, setMode } = useJourneyStore()
  const insets = useSafeAreaInsets()

  function handleSelect(item: (typeof JOURNEYS)[number]) {
    setMode(item.id)
    setJourney(item.journey)
    router.push(item.next as any)
  }

  return (
    <CosmicBackground>
      <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
        <Text style={styles.question}>
          Are you expecting or is your{'\n'}little one already here?
        </Text>

        <View style={styles.cards}>
          {JOURNEYS.map((j) => (
            <Pressable
              key={j.id}
              onPress={() => handleSelect(j)}
              style={({ pressed }) => [pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            >
              <GlassCard variant="elevated">
                <View style={styles.cardInner}>
                  <View style={styles.iconCircle}>
                    <Text style={styles.icon}>{j.icon}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{j.title}</Text>
                  <Text style={styles.cardSubtitle}>{j.subtitle}</Text>
                </View>
              </GlassCard>
            </Pressable>
          ))}
        </View>

        {/* Bottom section */}
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.basics}>
            <Text style={styles.basicsTitle}>The Basics</Text>
            <Text style={styles.basicsSubtitle}>
              We'll collect a few details next to personalize your experience.
            </Text>
          </View>
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
  question: {
    ...typography.heading,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 36,
  },
  cards: {
    gap: 16,
  },
  cardInner: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  icon: {
    fontSize: 32,
  },
  cardTitle: {
    ...typography.subtitle,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
  },
  cardSubtitle: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
  bottom: {
    marginTop: 'auto',
  },
  basics: {
    alignItems: 'center',
  },
  basicsTitle: {
    ...typography.subtitle,
    marginBottom: 6,
  },
  basicsSubtitle: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
})
