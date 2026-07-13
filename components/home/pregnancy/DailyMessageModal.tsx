// components/home/pregnancy/DailyMessageModal.tsx
import { useEffect, useState } from 'react'
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X, ArrowRight } from 'lucide-react-native'
import { useTheme, getModeColor, font, radius } from '../../../constants/theme'
import { useDailyMessage } from '../../../lib/dailyMessage/useDailyMessage'
import { matchCard } from '../../../lib/dailyMessage/matcher'
import { DailyMessageDeck } from './DailyMessageDeck'
import { AffirmationShareModal } from './AffirmationShareModal'
import type { DailyCard } from '../../../lib/dailyMessage/types'

interface Props { visible: boolean; onClose: () => void }

export function DailyMessageModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const { colors, isDark } = useTheme()
  const { todayQuestion, todayCard, isAnswered, answer, isSaving } = useDailyMessage()
  const [phase, setPhase] = useState<'question' | 'reveal'>('question')
  const [deck, setDeck] = useState<DailyCard[]>([])
  const [shareCard, setShareCard] = useState<DailyCard | null>(null)

  // If already answered when opened, jump straight to the saved card.
  useEffect(() => {
    if (!visible) { setPhase('question'); setDeck([]); return }
    if (isAnswered && todayCard) { buildDeck(todayCard); setPhase('reveal') }
  }, [visible, isAnswered, todayCard])

  function buildDeck(top: DailyCard) {
    // top card + 2 decorative peek cards from the same tags, excluding the top.
    const p1 = matchCard(top.tags, top.mode, { exclude: [top.id] })
    const p2 = matchCard(top.tags, top.mode, { exclude: [top.id, p1.id] })
    setDeck([top, p1, p2])
  }

  async function pick(optionIndex: number) {
    try {
      const card = await answer(optionIndex)
      buildDeck(card)
      setPhase('reveal')
    } catch {
      Alert.alert('Something went wrong', 'We couldn\'t save your message. Please try again.')
    }
  }

  if (!todayQuestion) return null
  const accent = getModeColor('preg', isDark) // lavender — used only as a hairline / eyebrow touch

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.fill, { backgroundColor: colors.bg, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={onClose} style={[styles.close, { borderColor: colors.border }]} hitSlop={12}>
          <X size={20} color={colors.text} strokeWidth={2} />
        </Pressable>

        {phase === 'question' ? (
          <ScrollView contentContainerStyle={styles.qBody} showsVerticalScrollIndicator={false}>
            <Text style={[styles.qEyebrow, { color: accent }]}>DAILY MESSAGE</Text>
            <Text style={[styles.qPrompt, { color: colors.text }]}>{todayQuestion.prompt}</Text>
            <View style={{ gap: 10, marginTop: 28 }}>
              {todayQuestion.options.map((o, i) => (
                <Pressable
                  key={o.label}
                  disabled={isSaving}
                  onPress={() => pick(i)}
                  style={({ pressed }) => [
                    styles.option,
                    { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceRaised : colors.surface, opacity: isSaving ? 0.5 : 1 },
                  ]}
                >
                  <Text style={[styles.optionText, { color: colors.text }]}>{o.label}</Text>
                  <ArrowRight size={16} color={colors.textMuted} strokeWidth={2} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingTop: 20 }}>
            <Text style={[styles.revealEyebrow, { color: colors.textMuted }]}>TODAY'S MESSAGE</Text>
            <DailyMessageDeck cards={deck} />
            <View style={styles.actions}>
              <Pressable onPress={() => setShareCard(deck[0])} style={[styles.action, { borderColor: colors.border }]}>
                <Text style={[styles.actionText, { color: colors.text }]}>Share</Text>
              </Pressable>
              <Pressable onPress={onClose} style={[styles.action, styles.actionFilled, { backgroundColor: colors.text }]}>
                <Text style={[styles.actionText, { color: colors.bg }]}>Done</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <AffirmationShareModal
        visible={!!shareCard}
        phrase={shareCard?.text ?? ''}
        mode="pregnancy"
        onClose={() => setShareCard(null)}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: 24 },
  close: { alignSelf: 'flex-end', width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qBody: { paddingTop: 20, paddingBottom: 40 },
  qEyebrow: { fontFamily: font.bodyMedium, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  qPrompt: { fontFamily: font.display, fontSize: 32, lineHeight: 39, marginTop: 12 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: radius.md, paddingVertical: 18, paddingHorizontal: 20 },
  optionText: { fontFamily: font.display, fontSize: 19 },
  revealEyebrow: { fontFamily: font.bodyMedium, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 12, justifyContent: 'center', paddingVertical: 20 },
  action: { flex: 1, alignItems: 'center', paddingVertical: 15, borderRadius: radius.full, borderWidth: 1 },
  actionFilled: { borderWidth: 0 },
  actionText: { fontFamily: font.bodySemiBold, fontSize: 15 },
})
