import { View, Text, Pressable, StyleSheet } from 'react-native'
import { PaperCard } from '../ui/PaperCard'
import { useTheme } from '../../constants/theme'
import type { LearningModule as LearningModuleType } from '../../lib/prepregnancyData'

interface LearningModuleProps {
  module: LearningModuleType
  onPress?: () => void
}

export function LearningModule({ module, onPress }: LearningModuleProps) {
  const { colors } = useTheme()
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
      <PaperCard radius={28} padding={20} style={styles.container}>
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryTint }]}>
            <Text style={styles.icon}>{module.icon}</Text>
          </View>
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>{module.title}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>{module.description}</Text>
            <Text style={[styles.lessons, { color: colors.accent }]}>{module.lessons} lessons</Text>
          </View>
        </View>
      </PaperCard>
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
    marginBottom: 3,
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  lessons: {
    fontSize: 11,
    fontWeight: '600',
  },
})
