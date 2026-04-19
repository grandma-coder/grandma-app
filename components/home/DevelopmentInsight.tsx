import { View, Text, Pressable, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { colors, THEME_COLORS, borderRadius, shadows } from '../../constants/theme'
import { getWeekData } from '../../lib/pregnancyData'

interface DevelopmentInsightProps {
  weekNumber: number
}

export function DevelopmentInsight({ weekNumber }: DevelopmentInsightProps) {
  const data = getWeekData(weekNumber)

  return (
    <LinearGradient
      colors={[THEME_COLORS.blue, THEME_COLORS.pink, THEME_COLORS.green]}
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
        <Pressable style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}>
          <Ionicons name="mic-outline" size={22} color={THEME_COLORS.pink} />
          <Text style={styles.actionText}>Record a lullaby</Text>
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
    color: '#000000',
    letterSpacing: -1,
    lineHeight: 38,
    marginBottom: 16, fontFamily: 'Fraunces_600SemiBold' },
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
    backgroundColor: '#000000',
    borderRadius: 999,
    paddingHorizontal: 24,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
})
