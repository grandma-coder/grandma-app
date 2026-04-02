import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { colors, borderRadius, shadows } from '../../constants/theme'
import { pillars } from '../../lib/pillars'
import type { Pillar } from '../../types'

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
        const bgColor = colors.pillar[pillar.id] ?? colors.surface
        const isLight = bgColor !== '#141414'

        return (
          <Pressable
            key={pillar.id}
            onPress={() => handlePress(pillar)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: bgColor },
              pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] },
            ]}
          >
            {/* Gradient overlay for depth */}
            <View style={styles.cardOverlay} />

            <View style={styles.cardContent}>
              <View style={[styles.iconCircle, { backgroundColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }]}>
                <Text style={styles.icon}>{pillar.icon}</Text>
              </View>

              <View style={styles.cardBottom}>
                <Text style={[styles.name, !isLight && { color: colors.text }]}>
                  {pillar.name}
                </Text>
                <Text
                  style={[styles.activity, !isLight && { color: colors.textTertiary }]}
                  numberOfLines={1}
                >
                  {lastActivities[pillar.id] || pillar.description}
                </Text>
              </View>
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
    height: 200,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  cardContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 28,
  },
  cardBottom: {},
  name: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0A0A0A',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  activity: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.6)',
    lineHeight: 14,
  },
})
