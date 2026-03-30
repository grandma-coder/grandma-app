import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Pillar } from '../../types'
import { pillars } from '../../lib/pillars'
import TipCard from '../../components/pillar/TipCard'

export default function PillarDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const pillar = pillars.find((p) => p.id === id) as Pillar | undefined

  if (!pillar) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Pillar not found</Text>
      </View>
    )
  }

  function handleSuggestion(suggestion: string) {
    router.push({
      pathname: '/(tabs)/chat',
      params: { suggestion, pillarId: pillar!.id },
    })
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: pillar.color }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <Text style={styles.icon}>{pillar.icon}</Text>
        <Text style={styles.name}>{pillar.name}</Text>
        <Text style={styles.description}>{pillar.description}</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tips */}
        <Text style={styles.sectionTitle}>Tips</Text>
        {pillar.tips.map((tip, index) => (
          <TipCard key={index} label={tip.label} text={tip.text} />
        ))}

        {/* Suggestions */}
        <Text style={styles.sectionTitle}>Ask Grandma</Text>
        <View style={styles.chipsContainer}>
          {pillar.suggestions.map((suggestion, index) => (
            <Pressable
              key={index}
              onPress={() => handleSuggestion(suggestion)}
              style={({ pressed }) => [
                styles.chip,
                { borderColor: pillar.color, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.chipText}>{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFound: {
    fontSize: 16,
    color: '#6B7280',
  },

  /* Header */
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 48,
    marginBottom: 8,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 20,
  },

  /* Body */
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 12,
  },

  /* Suggestion chips */
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
  },
})
