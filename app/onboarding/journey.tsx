import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useJourneyStore } from '../../store/useJourneyStore'

const JOURNEYS = [
  {
    id: 'pregnancy' as const,
    emoji: '🤰',
    title: "I'm pregnant",
    subtitle: 'Just found out or already tracking',
    color: '#FDE8F0',
    next: '/onboarding/due-date',
  },
  {
    id: 'newborn' as const,
    emoji: '👶',
    title: 'I have a newborn',
    subtitle: '0–12 months old',
    color: '#E1F5EE',
    next: '/onboarding/activities',
  },
  {
    id: 'toddler' as const,
    emoji: '🧒',
    title: 'I have a toddler',
    subtitle: '1–3+ years old',
    color: '#FAEEDA',
    next: '/onboarding/activities',
  },
]

export default function JourneySelect() {
  const setJourney = useJourneyStore((s) => s.setJourney)

  function handleSelect(journey: typeof JOURNEYS[number]) {
    setJourney(journey.id)
    router.push(journey.next as any)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>👵</Text>
        <Text style={styles.title}>Welcome to Grandma</Text>
        <Text style={styles.subtitle}>Tell me where you are in your journey</Text>
      </View>

      <View style={styles.cards}>
        {JOURNEYS.map((j) => (
          <Pressable
            key={j.id}
            onPress={() => handleSelect(j)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: j.color, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{j.title}</Text>
                <Text style={styles.cardSubtitle}>{j.subtitle}</Text>
              </View>
              <Text style={styles.cardEmoji}>{j.emoji}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F4',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
  },
  cards: {
    gap: 16,
  },
  card: {
    borderRadius: 20,
    padding: 24,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardText: {
    flex: 1,
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
  },
  cardEmoji: {
    fontSize: 48,
  },
})
