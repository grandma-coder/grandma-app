import { View, Text, Pressable, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, brand, stickers, borderRadius, shadows, font } from '../../constants/theme'
import { getWeekData } from '../../lib/pregnancyData'

interface DevelopmentInsightProps {
  weekNumber: number
}

export function DevelopmentInsight({ weekNumber }: DevelopmentInsightProps) {
  const { colors } = useTheme()
  const data = getWeekData(weekNumber)

  return (
    <LinearGradient
      colors={[brand.kids, brand.prePregnancy, stickers.green]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, shadows.card]}
    >
      {/* Decorative blurs */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />
      <View style={styles.decorRing} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.label}>Development Insight</Text>
          <Ionicons name="chatbubble-outline" size={24} color="rgba(0,0,0,0.5)" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Finding Their{'\n'}Voice</Text>

        {/* Body */}
        <Text style={styles.body}>{data.developmentFact}</Text>

        {/* Record lullaby button */}
        <Pressable style={({ pressed }) => [styles.actionButton, pressed && { shadowOffset: { width: 0, height: 2 }, transform: [{ translateY: 2 }] }]}>
          <Ionicons name="mic-outline" size={22} color={brand.prePregnancy} />
          <Text style={[styles.actionText, { color: colors.surface }]}>Record a lullaby</Text>
        </Pressable>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    // blur effect simulated with opacity
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -80,
    left: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  decorRing: {
    position: 'absolute',
    bottom: 40,
    right: 0,
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 16,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  content: {
    padding: 32,
    position: 'relative',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(0,0,0,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: stickers.charcoal,
    letterSpacing: -1,
    lineHeight: 38,
    marginBottom: 16,
    fontFamily: font.display,
  },
  body: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(0,0,0,0.7)',
    lineHeight: 24,
    marginBottom: 28,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 64,
    backgroundColor: stickers.charcoal,
    borderRadius: 999,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: stickers.charcoal,
    shadowColor: stickers.charcoal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
})
