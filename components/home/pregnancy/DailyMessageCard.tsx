// components/home/pregnancy/DailyMessageCard.tsx
import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { ArrowRight, ArrowUpRight } from 'lucide-react-native'
import { PaperCard } from '../../ui/PaperCard'
import { Display, MonoCaps } from '../../ui/Typography'
import { CardSticker } from './CardSticker'
import { useTheme, font } from '../../../constants/theme'
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
            <View style={styles.answeredRow}>
              <CardSticker color={todayCard.color} size={44} />
              <Display size={18} style={styles.flex} numberOfLines={3}>{todayCard.text}</Display>
            </View>
          ) : (
            <>
              <Display size={23} style={styles.prompt}>{todayQuestion.prompt}</Display>
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
  flex: { flex: 1 },
  prompt: { marginTop: 10 },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16 },
  answer: { fontFamily: font.bodySemiBold, fontSize: 15, letterSpacing: -0.2 },
  answeredRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginTop: 14 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16 },
  link: { fontFamily: font.bodyMedium, fontSize: 12.5, letterSpacing: 0.2 },
})
