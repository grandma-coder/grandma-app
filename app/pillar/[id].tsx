import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Pillar } from '../../types'
import { pillars } from '../../lib/pillars'
import TipCard from '../../components/pillar/TipCard'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { colors, typography, spacing, borderRadius } from '../../constants/theme'

export default function PillarDetail() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const pillar = pillars.find((p) => p.id === id) as Pillar | undefined

  if (!pillar) {
    return (
      <CosmicBackground>
        <View style={styles.center}>
          <Text style={styles.notFound}>Pillar not found</Text>
        </View>
      </CosmicBackground>
    )
  }

  function handleSuggestion(suggestion: string) {
    router.push({
      pathname: '/(tabs)/library',
      params: { suggestion, pillarId: pillar!.id },
    })
  }

  return (
    <CosmicBackground>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <View style={[styles.iconCircle, { backgroundColor: pillar.color + '25' }]}>
          <Text style={styles.icon}>{pillar.icon}</Text>
        </View>
        <Text style={styles.name}>{pillar.name}</Text>
        <Text style={styles.description}>{pillar.description}</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Tips */}
        <Text style={styles.sectionTitle}>Tips</Text>
        {pillar.tips.map((tip, index) => (
          <TipCard key={index} label={tip.label} text={tip.text} />
        ))}

        {/* Suggestions */}
        <Text style={styles.sectionTitle}>Ask Guru Grandma</Text>
        <View style={styles.chipsContainer}>
          {pillar.suggestions.map((suggestion, index) => (
            <Pressable
              key={index}
              onPress={() => handleSuggestion(suggestion)}
              style={({ pressed }) => [
                styles.chip,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.chipText}>{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFound: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 32,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceGlass,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
})
