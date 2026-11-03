// components/home/pregnancy/DailyMessageModal.tsx
import { useEffect, useState } from 'react'
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X, ArrowRight } from 'lucide-react-native'
import { useTheme, useDiffuseTheme, font, diffuseFont, radius, getModeColorSoft } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { Display, MonoCaps } from '../../ui/Typography'
import { PillButton } from '../../ui/PillButton'
import { InkBackButton } from '../../ui/InkBackButton'
import { SiteChoice } from '../../ui/SiteChoice'
import { FadeUp } from '../../ui/Motion'
import { useDailyMessage } from '../../../lib/dailyMessage/useDailyMessage'
import { matchCard } from '../../../lib/dailyMessage/matcher'
import { DailyMessageDeck } from './DailyMessageDeck'
import { AffirmationShareModal } from './AffirmationShareModal'
import type { DailyCard } from '../../../lib/dailyMessage/types'

interface Props { visible: boolean; onClose: () => void }

export function DailyMessageModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const theme = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  // Under Diffuse the full-screen sheet must use the v3 cream (lighter) so it
  // matches every other sheet; otherwise it looked like a different tone.
  const colors = diffuse
    ? { ...theme.colors, bg: dt.colors.bg, surface: dt.colors.surface, surfaceRaised: dt.colors.surfaceRaised, border: dt.colors.line, text: dt.colors.ink, textMuted: dt.colors.ink3 }
    : theme.colors
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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.fill, { backgroundColor: colors.bg, paddingTop: insets.top + 12 }]}>
        {diffuse ? (
          <Pressable onPress={onClose} style={[styles.close, { borderColor: colors.border }]} hitSlop={12}>
            <X size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
        ) : (
          <InkBackButton onPress={onClose} ink={colors.text} paper={colors.surface} icon="close" label="Close" style={{ alignSelf: 'flex-end', marginBottom: 0 }} />
        )}

        {phase === 'question' ? (
          <ScrollView contentContainerStyle={styles.qBody} showsVerticalScrollIndicator={false}>
            {diffuse ? (
              <MonoCaps color={colors.textMuted}>DAILY MESSAGE</MonoCaps>
            ) : (
              <Text style={[styles.eyebrow, { color: colors.textMuted }]}>DAILY MESSAGE</Text>
            )}
            {diffuse ? (
              <Display size={30} style={styles.qPrompt}>{todayQuestion.prompt}</Display>
            ) : (
              <Text style={[styles.qPromptLight, { color: colors.text, fontFamily: theme.font.display }]}>{todayQuestion.prompt}</Text>
            )}
            <View style={{ gap: 10, marginTop: 28 }}>
              {todayQuestion.options.map((o, i) => diffuse ? (
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
              ) : (
                <FadeUp key={o.label} index={i}>
                  <SiteChoice
                    label={o.label}
                    selected={false}
                    onPress={() => { if (!isSaving) pick(i) }}
                    tone={getModeColorSoft('pregnancy')}
                    align="start"
                    tick={false}
                    style={{ opacity: isSaving ? 0.5 : 1 }}
                  />
                </FadeUp>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingTop: 20 }}>
            <View style={{ alignItems: 'center', marginBottom: 4 }}>
              {diffuse ? (
                <MonoCaps color={colors.textMuted}>TODAY'S MESSAGE</MonoCaps>
              ) : (
                <Text style={[styles.eyebrow, { color: colors.textMuted }]}>TODAY'S MESSAGE</Text>
              )}
            </View>
            <DailyMessageDeck cards={deck} />
            <View style={styles.actions}>
              <View style={{ flex: 1 }}>
                <PillButton label="Share" variant="paper" onPress={() => setShareCard(deck[0])} />
              </View>
              <View style={{ flex: 1 }}>
                <PillButton label="Done" variant="ink" onPress={onClose} />
              </View>
            </View>
          </View>
        )}
      </View>

      <AffirmationShareModal
        visible={!!shareCard}
        phrase={shareCard?.text ?? ''}
        mode={shareCard?.mode === 'pre-pregnancy' ? 'prePreg' : 'pregnancy'}
        onClose={() => setShareCard(null)}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: 24 },
  close: { alignSelf: 'flex-end', width: 38, height: 38, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qBody: { paddingTop: 20, paddingBottom: 40 },
  eyebrow: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  qPromptLight: { fontSize: 28, lineHeight: 35, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 12 },
  qPrompt: { lineHeight: 37, letterSpacing: -0.5, marginTop: 12 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: radius.md, paddingVertical: 18, paddingHorizontal: 20 },
  optionText: { fontFamily: font.bodySemiBold, fontSize: 16, letterSpacing: -0.2 },
  actions: { flexDirection: 'row', gap: 12, justifyContent: 'center', paddingVertical: 20 },
})
