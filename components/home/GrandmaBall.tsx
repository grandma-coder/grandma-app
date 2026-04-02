import { View, Text, StyleSheet, Pressable } from 'react-native'
import { colors, shadows } from '../../constants/theme'

interface GrandmaBallProps {
  thinking?: boolean
  onPress?: () => void
}

export function GrandmaBall({ thinking = false, onPress }: GrandmaBallProps) {
  return (
    <View style={styles.wrapper}>
      {thinking && (
        <View style={styles.thinkingBadge}>
          <View style={styles.thinkingDot} />
          <Text style={styles.thinkingText}>Thinking...</Text>
        </View>
      )}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.ball,
          pressed && { transform: [{ scale: 0.95 }] },
        ]}
      >
        <View style={styles.innerGlow} />
        <Text style={styles.silhouette}>👵</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  thinkingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  thinkingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  ball: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
  innerGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(245, 199, 84, 0.08)',
  },
  silhouette: {
    fontSize: 52,
  },
})
