import { View, Text, Pressable, StyleSheet } from 'react-native'
import { GlassCard } from '../ui/GlassCard'
import { colors, borderRadius } from '../../constants/theme'
import type { BirthType } from '../../lib/birthData'

interface BirthTypeCardProps {
  birthType: BirthType
  onPress?: () => void
}

export function BirthTypeCard({ birthType, onPress }: BirthTypeCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
      <GlassCard style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>{birthType.icon}</Text>
          </View>
          <Text style={styles.title}>{birthType.title}</Text>
        </View>
        <Text style={styles.description}>{birthType.description}</Text>
        <Text style={styles.learnMore}>Learn more →</Text>
      </GlassCard>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  learnMore: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
})
