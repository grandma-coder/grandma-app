import { View, Text, Pressable, StyleSheet } from 'react-native'
import { GlassCard } from '../ui/GlassCard'
import { Emoji } from '../ui/Emoji'
import { colors, borderRadius } from '../../constants/theme'

const MOMENTS = [
  {
    icon: '🌟',
    title: 'Stardust Stretching',
    description: 'Gentle movements to ease lower back tension as your center of gravity shifts with the moon.',
  },
  {
    icon: '🌙',
    title: 'Deep Sleep Ritual',
    description: 'Listen to the "Arctic Calm" soundscape to lower cortisol levels before your midnight rest.',
  },
]

export function MomentsOfCare() {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Moments of Care</Text>
      <Text style={styles.sectionSubtitle}>Nurturing you while you nurture life</Text>

      {MOMENTS.map((moment, i) => (
        <Pressable key={i} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
          <GlassCard style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.iconCircle}>
                <Emoji style={styles.icon}>{moment.icon}</Emoji>
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{moment.title}</Text>
                <Text style={styles.cardDescription}>{moment.description}</Text>
              </View>
            </View>
          </GlassCard>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
})
