import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useModeStore } from '../../store/useModeStore'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { THEME_COLORS, spacing, borderRadius } from '../../constants/theme'
import type { JourneyMode } from '../../types'

const JOURNEYS: {
  id: JourneyMode
  journey: 'pregnancy' | 'newborn'
  icon: string
  iconColor: string
  iconBg: string
  title: string
  subtitle: string
  next: string
}[] = [
  {
    id: 'pre-pregnancy',
    journey: 'newborn',
    icon: '✨',
    iconColor: THEME_COLORS.pink,
    iconBg: 'rgba(255,138,216,0.15)',
    title: 'I want to be pregnant',
    subtitle: 'Prepare, learn, and start your journey to parenthood.',
    next: '/onboarding/parent-name',
  },
  {
    id: 'pregnancy',
    journey: 'pregnancy',
    icon: '🤰',
    iconColor: THEME_COLORS.purple,
    iconBg: 'rgba(185,131,255,0.15)',
    title: "I'm pregnant",
    subtitle: 'Guided wisdom for each trimester of your growth.',
    next: '/onboarding/parent-name',
  },
  {
    id: 'kids',
    journey: 'newborn',
    icon: '👶',
    iconColor: THEME_COLORS.blue,
    iconBg: 'rgba(77,150,255,0.15)',
    title: 'I have kids',
    subtitle: "Nurturing insights for your little one's milestones.",
    next: '/onboarding/activities',
  },
]

export default function JourneySelect() {
  const setJourney = useJourneyStore((s) => s.setJourney)
  const setMode = useModeStore((s) => s.setMode)
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
              style={({ pressed }) => [
                styles.card,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }], backgroundColor: 'rgba(255,255,255,0.08)' },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: j.iconBg }]}>
                <Text style={styles.icon}>{j.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{j.title}</Text>
                <Text style={styles.cardSubtitle}>{j.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
            </Pressable>
          ))}
        </View>

        {/* Bottom section */}
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.basicsTitle}>The Basics</Text>
          <Text style={styles.basicsSubtitle}>
            We'll collect a few details next to personalize your experience.
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
  question: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.5,
    marginBottom: 36,
  },
  cards: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 26,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
  },
  bottom: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  basicsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  basicsSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    lineHeight: 18,
  },
})
