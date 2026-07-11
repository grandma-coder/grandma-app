// components/home/pregnancy/DailyMessageModal.tsx
import { useEffect, useState } from 'react'
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { stickers, font, radius } from '../../../constants/theme'
import { useDailyMessage } from '../../../lib/dailyMessage/useDailyMessage'
import { matchCard } from '../../../lib/dailyMessage/matcher'
import { DailyMessageDeck } from './DailyMessageDeck'
import { AffirmationShareModal } from './AffirmationShareModal'
import type { DailyCard } from '../../../lib/dailyMessage/types'

interface Props { visible: boolean; onClose: () => void }

export function DailyMessageModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets()
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
  const accent = stickers.lilac

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.fill, { backgroundColor: phase === 'question' ? accent : stickers.charcoal, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={onClose} style={styles.close} hitSlop={12}>
          <X size={22} color={stickers.charcoal} strokeWidth={2.2} />
        </Pressable>

        {phase === 'question' ? (
          <ScrollView contentContainerStyle={styles.qBody}>
            <Text style={styles.qEyebrow}>DAILY MESSAGE</Text>
            <Text style={styles.qPrompt}>{todayQuestion.prompt}</Text>
            <View style={{ gap: 12, marginTop: 24 }}>
              {todayQuestion.options.map((o, i) => (
                <Pressable key={o.label} disabled={isSaving} onPress={() => pick(i)} style={styles.option}>
                  <Text style={styles.optionText}>{o.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingTop: 24 }}>
            <DailyMessageDeck cards={deck} />
            <View style={styles.actions}>
              <Pressable onPress={() => setShareCard(deck[0])} style={styles.action}>
                <Text style={styles.actionText}>Share</Text>
              </Pressable>
              <Pressable onPress={onClose} style={styles.action}>
                <Text style={styles.actionText}>Done</Text>
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
  close: { alignSelf: 'flex-end', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  qBody: { paddingTop: 16, paddingBottom: 40 },
  qEyebrow: { fontFamily: font.bodySemiBold, fontSize: 11, letterSpacing: 2, color: stickers.charcoal, opacity: 0.7 },
  qPrompt: { fontFamily: font.display, fontSize: 30, lineHeight: 36, color: stickers.charcoal, marginTop: 10 },
  option: { backgroundColor: 'rgba(42,38,36,0.08)', borderRadius: radius.md, paddingVertical: 18, paddingHorizontal: 20 },
  optionText: { fontFamily: font.bodySemiBold, fontSize: 17, color: stickers.charcoal },
  actions: { flexDirection: 'row', gap: 16, justifyContent: 'center', paddingVertical: 20 },
  action: { paddingVertical: 12, paddingHorizontal: 28, borderRadius: radius.full, backgroundColor: stickers.yellow },
  actionText: { fontFamily: font.bodySemiBold, fontSize: 15, color: stickers.charcoal },
})
