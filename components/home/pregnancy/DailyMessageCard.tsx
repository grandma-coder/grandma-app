// components/home/pregnancy/DailyMessageCard.tsx
import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
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
    <View>
      <Pressable onPress={() => setOpen(true)}>
        <MonoCaps color={colors.textMuted}>
          DAILY MESSAGE{isAnswered ? `  ·  ${collection.length} CARD${collection.length === 1 ? '' : 'S'}` : ''}
        </MonoCaps>

        {isAnswered && todayCard ? (
          <View style={styles.answeredRow}>
            <CardSticker color={todayCard.color} size={44} mode={todayCard.mode} />
            <Display size={18} style={styles.flex} numberOfLines={3}>{todayCard.text}</Display>
          </View>
        ) : (
          <View style={styles.promptRow}>
            <Display size={23} style={styles.promptFlex}>{todayQuestion.prompt}</Display>
            {/* Answer sits as a small pill beside the question (bottom-aligned,
                next to the "?") rather than on its own line below — removes the
                empty gap under the prompt. */}
            <View style={[styles.answerPill, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={[styles.pillText, { color: colors.text }]}>Answer</Text>
            </View>
          </View>
        )}
      </Pressable>

      {isAnswered ? (
        <Pressable
          onPress={() => router.push('/my-cards')}
          style={({ pressed }) => [styles.pill, { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.pillText, { color: colors.text }]}>View all cards</Text>
        </Pressable>
      ) : null}

      <DailyMessageModal visible={open} onClose={() => setOpen(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  prompt: { marginTop: 10 },
  // Prompt (flexes) + Answer pill on one row, pill aligned to the bottom so it
  // sits beside the end of the question.
  promptRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 10 },
  promptFlex: { flex: 1 },
  answerPill: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
  answeredRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginTop: 14 },
  pill: { alignSelf: 'flex-start', marginTop: 16, borderWidth: 1, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16 },
  pillText: { fontFamily: font.bodySemiBold, fontSize: 13, letterSpacing: -0.1 },
})
