// components/home/pregnancy/DailyMessageCard.tsx
import { useState } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Display, MonoCaps } from '../../ui/Typography'
import { CardSticker } from './CardSticker'
import { useTheme } from '../../../constants/theme'
import { useDailyMessage } from '../../../lib/dailyMessage/useDailyMessage'
import { DailyMessageModal } from './DailyMessageModal'
import { QuietPill } from '../../ui/QuietPill'

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
            <QuietPill
              label="Answer"
              onPress={() => setOpen(true)}
              accessibilityLabel="Answer"
            />
          </View>
        )}
      </Pressable>

      {isAnswered ? (
        <QuietPill
          label="View all cards"
          onPress={() => router.push('/my-cards')}
          accessibilityLabel="View all cards"
          style={{ alignSelf: 'flex-start', marginTop: 16 }}
        />
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
  answeredRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginTop: 14 },
})
