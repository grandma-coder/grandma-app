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
      {pillars.map((pillar) => (
        <Pressable
          key={pillar.id}
          onPress={() => handlePress(pillar)}
          style={({ pressed }) => [
            styles.card,
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: pillar.color + '20' }]}>
            <Text style={styles.icon}>{pillar.icon}</Text>
          </View>
          <Text style={styles.name}>{pillar.name}</Text>
          <Text style={styles.activity} numberOfLines={1}>
            {lastActivities[pillar.id] || pillar.description}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  icon: {
    fontSize: 22,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  activity: {
    fontSize: 11,
    color: colors.textTertiary,
    lineHeight: 15,
  },
})
