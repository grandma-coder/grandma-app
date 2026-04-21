/**
 * WisdomCard — yellow mini-card on the cycle home screen.
 * Heart sticker top-left, "Today's wisdom" Fraunces heading, quote body.
 * Quote rotates based on phase.
 */

import { View, StyleSheet } from 'react-native'
import { useTheme } from '../../../constants/theme'
import { Display, DisplayItalic, Body } from '../../ui/Typography'
import { Heart } from '../../ui/Stickers'

type Phase = 'menstruation' | 'follicular' | 'ovulation' | 'luteal'

interface Props {
  phase: Phase
}

const QUOTES: Record<Phase, string> = {
  menstruation: 'Rest well today — your body is working hard, dear.',
  follicular: 'Energy is rising — a good time to plan something new.',
  ovulation: 'Peak bloom, dear. Today is a day for joy.',
  luteal: 'Rest well tonight — tomorrow matters, dear.',
}

export function WisdomCard({ phase }: Props) {
  const { stickers } = useTheme()
  const quote = QUOTES[phase]

  return (
    <View style={[styles.card, { backgroundColor: stickers.yellow }]}>
      <Heart size={28} fill={stickers.pink} />
      <View style={styles.titleRow}>
        <Display size={20} color="#141313">Today's</Display>
        <DisplayItalic size={18} color="#141313"> wisdom</DisplayItalic>
      </View>
      <Body size={12} color="rgba(20,19,19,0.7)" style={{ marginTop: 6 }}>
        "{quote}"
      </Body>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    gap: 6,
    minHeight: 160,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginTop: 8,
  },
})
