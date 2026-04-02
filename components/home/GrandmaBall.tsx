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
        <View style={styles.innerRing}>
          <View style={styles.innerCore}>
            <Text style={styles.silhouette}>👵</Text>
          </View>
        </View>
        {/* Active badge */}
        <View style={styles.activeBadge}>
          <Text style={styles.sparkle}>✨</Text>
        </View>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  thinkingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neon.green,
  },
  thinkingText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ball: {
    width: 160,
    height: 160,
    borderRadius: 80,
    padding: 4,
    backgroundColor: colors.neon.blue,
    ...shadows.glowBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRing: {
    width: '100%',
    height: '100%',
    borderRadius: 78,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  innerCore: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  silhouette: {
    fontSize: 56,
  },
  activeBadge: {
    position: 'absolute',
    bottom: -2,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neon.pink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.background,
  },
  sparkle: {
    fontSize: 18,
  },
})
