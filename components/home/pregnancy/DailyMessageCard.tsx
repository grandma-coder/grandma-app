// components/home/pregnancy/DailyMessageCard.tsx
import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { ArrowRight, ArrowUpRight } from 'lucide-react-native'
import { PaperCard } from '../../ui/PaperCard'
import { useTheme, font, radius } from '../../../constants/theme'
import { useDailyMessage } from '../../../lib/dailyMessage/useDailyMessage'
import { cardTint, cardHairline } from '../../../lib/dailyMessage/cardTint'
import { DailyMessageModal } from './DailyMessageModal'

export function DailyMessageCard() {
  const { colors } = useTheme()
  const { todayQuestion, todayCard, isAnswered, collection } = useDailyMessage()
  const [open, setOpen] = useState(false)
  if (!todayQuestion) return null

  const tint = todayCard ? cardTint(todayCard.color) : null

  return (
    <>
      <Pressable onPress={() => setOpen(true)}>
        <PaperCard>
          <Text style={[styles.eyebrow, { color: colors.textMuted }]}>
            DAILY MESSAGE{isAnswered ? `  ·  ${collection.length} CARD${collection.length === 1 ? '' : 'S'}` : ''}
          </Text>

          {isAnswered && todayCard && tint ? (
            <View style={[styles.mini, { backgroundColor: tint.soft, borderColor: cardHairline(todayCard.color) }]}>
              <Text style={[styles.miniText, { color: tint.ink }]}>{todayCard.text}</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.prompt, { color: colors.text }]}>{todayQuestion.prompt}</Text>
              <View style={styles.answerRow}>
                <Text style={[styles.answer, { color: colors.text }]}>Answer</Text>
                <ArrowRight size={17} color={colors.text} strokeWidth={2} />
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
  eyebrow: { fontFamily: font.bodyMedium, fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase' },
  prompt: { fontFamily: font.display, fontSize: 23, lineHeight: 29, marginTop: 10 },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16 },
  answer: { fontFamily: font.italic, fontSize: 19 },
  // Soft tint wash + hairline colored edge + ink serif italic — the cream idiom.
  mini: { marginTop: 12, borderRadius: radius.lg, borderWidth: 1, paddingVertical: 20, paddingHorizontal: 18 },
  miniText: { fontFamily: font.italic, fontSize: 20, lineHeight: 26 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16 },
  link: { fontFamily: font.bodyMedium, fontSize: 12.5, letterSpacing: 0.2 },
})
