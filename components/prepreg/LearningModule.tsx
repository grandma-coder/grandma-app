import { View, Text, Pressable, StyleSheet } from 'react-native'
import { GlassCard } from '../ui/GlassCard'
import { colors, borderRadius } from '../../constants/theme'
import type { LearningModule as LearningModuleType } from '../../lib/prepregnancyData'

interface LearningModuleProps {
  module: LearningModuleType
  onPress?: () => void
}

export function LearningModule({ module, onPress }: LearningModuleProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
      <GlassCard style={styles.container}>
        <View style={styles.row}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>{module.icon}</Text>
          </View>
          <View style={styles.content}>
            <Text style={styles.title}>{module.title}</Text>
            <Text style={styles.description} numberOfLines={2}>{module.description}</Text>
            <Text style={styles.lessons}>{module.lessons} lessons</Text>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: 4,
  },
  lessons: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
  },
})
