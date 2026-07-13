// components/home/pregnancy/DailyMessageCard.tsx
import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { ArrowRight, ArrowUpRight } from 'lucide-react-native'
import { PaperCard } from '../../ui/PaperCard'
import { MonoCaps } from '../../ui/Typography'
import { CardSticker } from './CardSticker'
import { useTheme, font, radius } from '../../../constants/theme'
import { useDailyMessage } from '../../../lib/dailyMessage/useDailyMessage'
import { DailyMessageModal } from './DailyMessageModal'

export function DailyMessageCard() {
  const { colors } = useTheme()
  const { todayQuestion, todayCard, isAnswered, collection } = useDailyMessage()
  const [open, setOpen] = useState(false)
  if (!todayQuestion) return null

  return (
    <>
      <Pressable onPress={() => setOpen(true)}>
        <PaperCard>
          <MonoCaps color={colors.textMuted}>
            DAILY MESSAGE{isAnswered ? `  ·  ${collection.length} CARD${collection.length === 1 ? '' : 'S'}` : ''}
          </MonoCaps>

          {isAnswered && todayCard ? (
            // Answered: paper surface, small sticker accent, ink serif on paper.
            <View style={styles.answeredRow}>
              <CardSticker color={todayCard.color} size={44} />
              <Text style={[styles.miniText, { color: colors.text }]} numberOfLines={3}>{todayCard.text}</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.prompt, { color: colors.text }]}>{todayQuestion.prompt}</Text>
              <View style={styles.answerRow}>
                <Text style={[styles.answer, { color: colors.text }]}>Answer</Text>
                <ArrowRight size={16} color={colors.text} strokeWidth={2} />
              </View>
            </>
          )}

          {isAnswered ? (
            <Pressable onPress={() => router.push('/my-cards')} hitSlop={8} style={styles.linkRow}>
              <Text style={[styles.link, { color: colors.textMuted }]}>View all cards</Text>
              <ArrowUpRight size={13} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          ) : null}
        </PaperCard>
      </Pressable>
      <DailyMessageModal visible={open} onClose={() => setOpen(false)} />
    </>
  )
}

const styles = StyleSheet.create({
  prompt: { fontFamily: font.display, fontSize: 23, lineHeight: 29, letterSpacing: -0.3, marginTop: 10 },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16 },
  answer: { fontFamily: font.bodySemiBold, fontSize: 15, letterSpacing: -0.2 },
  answeredRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginTop: 14 },
  miniText: { flex: 1, fontFamily: font.display, fontSize: 18, lineHeight: 25, letterSpacing: -0.2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16 },
  link: { fontFamily: font.bodyMedium, fontSize: 12.5, letterSpacing: 0.2 },
})
