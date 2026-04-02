import { View, Text, StyleSheet } from 'react-native'
import { GlassCard } from '../ui/GlassCard'
import { colors } from '../../constants/theme'

const WISDOM_QUOTES = [
  "Tonight the moon is full. Drink some warm ginger tea and let the swelling in your feet settle with the tide.",
  "Every kick is a little love letter from your baby, dear. Treasure each one.",
  "Rest is not laziness — it's how you build the energy to bring new life into the world.",
  "Your body knows what to do. Trust it the way generations of mothers before you have.",
  "A warm bath and a quiet mind can do more than any worry ever will.",
  "Eat the rainbow, dear. Every color on your plate is a gift to your growing baby.",
  "When the world feels heavy, put your hand on your belly and feel the future moving.",
]

interface GrandmaWisdomProps {
  weekNumber?: number
}

export function GrandmaWisdom({ weekNumber }: GrandmaWisdomProps) {
  const index = (weekNumber ?? new Date().getDay()) % WISDOM_QUOTES.length
  const quote = WISDOM_QUOTES[index]

  return (
    <GlassCard style={styles.container}>
      <Text style={styles.title}>Grandma's Wisdom</Text>
      <Text style={styles.quote}>"{quote}"</Text>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  quote: {
    fontSize: 15,
    fontStyle: 'italic',
    color: colors.textSecondary,
    lineHeight: 22,
  },
})
