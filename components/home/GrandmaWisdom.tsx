/**
 * GrandmaWisdom — ink-paper quote card (Apr 2026 redesign)
 *
 * Dark ink background, serif italic body, MONO-CAPS header.
 * The "recited, not typed" tone from the design.
 */

import { View, Text, StyleSheet } from 'react-native'
import { useTheme, stickers } from '../../constants/theme'
import { Heart } from '../ui/Stickers'
import { MonoCaps } from '../ui/Typography'

const WISDOM_QUOTES = [
  'Tonight the moon is full. Drink some warm ginger tea and let the swelling in your feet settle with the tide.',
  'Every kick is a little love letter from your baby, dear. Treasure each one.',
  'Rest is not laziness — it\'s how you build the energy to bring new life into the world.',
  'Your body knows what to do. Trust it the way generations of mothers before you have.',
  'A warm bath and a quiet mind can do more than any worry ever will.',
  'Eat the rainbow, dear. Every color on your plate is a gift to your growing baby.',
  'When the world feels heavy, put your hand on your belly and feel the future moving.',
]

interface GrandmaWisdomProps {
  weekNumber?: number
}

export function GrandmaWisdom({ weekNumber }: GrandmaWisdomProps) {
  const { colors, font, isDark } = useTheme()
  const index = (weekNumber ?? new Date().getDay()) % WISDOM_QUOTES.length
  const quote = WISDOM_QUOTES[index]

  const cream = isDark ? colors.text : '#F5EDDC'
  const ink = isDark ? colors.surface : '#141313'

  return (
    <View style={[styles.card, { backgroundColor: ink }]}>
      <View style={styles.headerRow}>
        <MonoCaps color={isDark ? colors.textMuted : 'rgba(245,237,220,0.55)'}>
          Grandma says
        </MonoCaps>
        <View style={styles.stickerWrap}>
          <Heart size={28} fill={stickers.coral} />
        </View>
      </View>
      <Text style={[styles.quote, { fontFamily: font.italic, color: cream }]}>
        “{quote}”
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stickerWrap: {
    transform: [{ rotate: '8deg' }],
  },
  quote: {
    fontSize: 19,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
})
