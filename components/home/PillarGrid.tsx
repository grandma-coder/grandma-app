import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, THEME_COLORS, borderRadius, shadows } from '../../constants/theme'
import { pillars } from '../../lib/pillars'
import type { Pillar } from '../../types'

// Icon mapping to match HTML mockup (Lucide-style via Ionicons)
const PILLAR_ICONS: Record<string, string> = {
  milk: 'happy-outline',       // baby
  food: 'nutrition-outline',   // apple
  nutrition: 'leaf-outline',   // leaf
  vaccines: 'medkit-outline',  // syringe
  clothes: 'shirt-outline',    // shirt
  recipes: 'restaurant-outline', // utensils
  habits: 'heart-outline',
  milestones: 'star-outline',
  medicine: 'medical-outline',
}

interface PillarGridProps {
  lastActivities?: Record<string, string>
}

export function PillarGrid({ lastActivities = {} }: PillarGridProps) {
  function handlePress(pillar: Pillar) {
    router.push(`/pillar/${pillar.id}`)
  }

  return (
    <View style={styles.grid}>
      {pillars.map((pillar) => {
        const bgColor = (colors.pillar as Record<string, string>)[pillar.id] ?? colors.surface
        const isDark = bgColor === '#241845' || bgColor === '#141414'
        const textColor = isDark ? '#FFFFFF' : '#000000'
        const iconName = PILLAR_ICONS[pillar.id] ?? 'help-circle-outline'

        return (
          <Pressable
            key={pillar.id}
            onPress={() => handlePress(pillar)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: bgColor },
              pressed && { transform: [{ scale: 0.96 }], opacity: 0.95 },
            ]}
          >
            {/* Gradient overlay at bottom */}
            <View style={styles.cardGradient} />

            {/* Icon */}
            <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
              <Ionicons name={iconName as any} size={28} color={textColor} />
            </View>

            {/* Text at bottom */}
            <View style={styles.cardBottom}>
              <Text style={[styles.cardTitle, { color: textColor }]}>
                {pillar.name}
              </Text>
              <Text
                style={[styles.cardDesc, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.6)' }]}
                numberOfLines={1}
              >
                {lastActivities[pillar.id] || pillar.description}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  card: {
    width: '47%',
    height: 210,
    borderRadius: borderRadius.lg,
    padding: 22,
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...shadows.card,
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBottom: {
    position: 'relative',
    zIndex: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    lineHeight: 22,
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
})
