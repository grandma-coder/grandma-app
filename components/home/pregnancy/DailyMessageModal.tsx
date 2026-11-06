// components/home/pregnancy/DailyMessageModal.tsx
import { useQueuedModal } from '../../../lib/useQueuedModal'
import { useEffect, useState } from 'react'
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X, ArrowRight } from 'lucide-react-native'
import { useTranslation } from '../../../lib/i18n'
import { useTheme, useDiffuseTheme, font, diffuseFont, radius, getModeColorSoft } from '../../../constants/theme'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { Display, MonoCaps } from '../../ui/Typography'
import { PillButton } from '../../ui/PillButton'
import { InkBackButton } from '../../ui/InkBackButton'
import { SiteChoice } from '../../ui/SiteChoice'
import { FadeUp } from '../../ui/Motion'
import { useDailyMessage } from '../../../lib/dailyMessage/useDailyMessage'
import { matchCard } from '../../../lib/dailyMessage/matcher'
import { localizeCard } from '../../../lib/dailyMessage/localize'
import { dailyDisplayFace } from '../../../lib/dailyMessage/typeface'
import { useModeStore } from '../../../store/useModeStore'
import { DailyMessageDeck } from './DailyMessageDeck'
import { AffirmationShareModal } from './AffirmationShareModal'
import type { DailyCard } from '../../../lib/dailyMessage/types'

interface Props { visible: boolean; onClose: () => void }

export function DailyMessageModal({ visible, onClose }: Props) {
  const { t, language } = useTranslation()
  const mode = useModeStore((s) => s.mode)
  const insets = useSafeAreaInsets()
  const theme = useTheme()
  const diffuse = useIsDiffuse()
  const modalVisible = useQueuedModal(visible)
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
  const [picked, setPicked] = useState<number | null>(null)

  // If already answered when opened, jump straight to the saved card. Only
  // (re)build when the top card actually changes — the post-answer cache
  // update must not reshuffle the peeks or replay the reveal.
  useEffect(() => {
    if (!visible) { setPhase('question'); setDeck([]); setPicked(null); return }
    if (isAnswered && todayCard) { showDeck(todayCard); setPhase('reveal') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isAnswered, todayCard])

  // top card + 2 decorative peek cards from the same tags, excluding the top.
  // A no-op when that top card is already showing (the answer resolves AND the
  // cache updates — only the first one builds the deck).
  function showDeck(top: DailyCard) {
    setDeck((d) => {
      if (d[0]?.id === top.id) return d
      const p1 = matchCard(top.tags, top.mode, { exclude: [top.id] })
      const p2 = matchCard(top.tags, top.mode, { exclude: [top.id, p1.id] })
      return [top, localizeCard(p1, language), localizeCard(p2, language)]
    })
  }

  async function pick(optionIndex: number) {
    if (isSaving || picked !== null) return
    setPicked(optionIndex)
    try {
      const card = await answer(optionIndex)
      showDeck(card)
      setPhase('reveal')
    } catch {
      setPicked(null)
      Alert.alert(t('sw1_common_somethingWrong'), t('sw1_daily_saveFail'))
    }
  }

  if (!todayQuestion) return null
  const promptFace = dailyDisplayFace(todayQuestion.prompt)
  const promptSize = todayQuestion.prompt.length > 70 ? 24 : 28
  const tone = getModeColorSoft(mode === 'pregnancy' ? 'pregnancy' : 'pre-pregnancy')

  return (
    <Modal visible={modalVisible} animationType={diffuse ? 'slide' : 'fade'} onRequestClose={onClose}>
      <View style={[styles.fill, { backgroundColor: colors.bg, paddingTop: insets.top + 12 }]}>
        {diffuse ? (
          <Pressable onPress={onClose} style={[styles.close, { borderColor: colors.border }]} hitSlop={12}>
            <X size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
        ) : (
          <InkBackButton onPress={onClose} ink={colors.text} paper={colors.surface} icon="close" label={t('common_close')} style={{ alignSelf: 'flex-end', marginBottom: 0 }} />
        )}

        {phase === 'question' ? (
          <ScrollView contentContainerStyle={styles.qBody} showsVerticalScrollIndicator={false}>
            {diffuse ? (
              <MonoCaps color={colors.textMuted}>{t('sw1_daily_eyebrow')}</MonoCaps>
            ) : (
              <FadeUp>
                <Text style={[styles.eyebrow, { color: colors.textMuted, fontFamily: theme.font.bodySemiBold }]}>{t('sw1_daily_eyebrow')}</Text>
              </FadeUp>
            )}
            {diffuse ? (
              <Display size={30} style={styles.qPrompt}>{todayQuestion.prompt}</Display>
            ) : (
              <FadeUp index={1}>
                <Text
                  style={[styles.qPromptLight, {
                    color: colors.text, fontSize: promptSize, lineHeight: Math.round(promptSize * promptFace.lineRatio),
                    letterSpacing: promptFace.letterSpacing, fontFamily: promptFace.fontFamily, fontWeight: promptFace.fontWeight,
                  }]}
                >
                  {todayQuestion.prompt}
                </Text>
              </FadeUp>
            )}
            <View style={{ gap: 10, marginTop: 28 }}>
              {todayQuestion.options.map((o, i) => diffuse ? (
                <Pressable
                  key={i}
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
                <FadeUp key={i} index={i + 2}>
                  <SiteChoice
                    label={o.label}
                    selected={picked === i}
                    onPress={() => pick(i)}
                    tone={tone}
                    align="start"
                    tick={picked === i}
                    style={{ opacity: picked !== null && picked !== i ? 0.45 : 1 }}
                  />
                </FadeUp>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingTop: 20 }}>
            {diffuse ? (
              <View style={{ alignItems: 'center', marginBottom: 4 }}>
                <MonoCaps color={colors.textMuted}>{t('sw1_daily_todayEyebrow')}</MonoCaps>
              </View>
            ) : (
              <FadeUp style={{ alignItems: 'center', marginBottom: 10 }}>
                <Text style={[styles.eyebrow, { color: colors.textMuted, fontFamily: theme.font.bodySemiBold, textAlign: 'center' }]}>{t('sw1_daily_todayEyebrow')}</Text>
              </FadeUp>
            )}
            <DailyMessageDeck cards={deck} />
            {diffuse ? (
              <View style={styles.actions}>
                <View style={{ flex: 1 }}>
                  <PillButton label={t('sw1_common_share')} variant="paper" onPress={() => setShareCard(deck[0])} />
                </View>
                <View style={{ flex: 1 }}>
                  <PillButton label={t('common_done')} variant="ink" onPress={onClose} />
                </View>
              </View>
            ) : (
              // Actions rise in after the card has landed.
              <FadeUp delay={420} style={styles.actions}>
                <View style={{ flex: 1 }}>
                  <PillButton label={t('sw1_common_share')} variant="paper" onPress={() => setShareCard(deck[0])} />
                </View>
                <View style={{ flex: 1 }}>
                  <PillButton label={t('common_done')} variant="ink" onPress={onClose} />
                </View>
              </FadeUp>
            )}
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
  eyebrow: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' },
  qPromptLight: { marginTop: 12 },
  qPrompt: { lineHeight: 37, letterSpacing: -0.5, marginTop: 12 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: radius.md, paddingVertical: 18, paddingHorizontal: 20 },
  optionText: { fontFamily: font.bodySemiBold, fontSize: 16, letterSpacing: -0.2 },
  actions: { flexDirection: 'row', gap: 12, justifyContent: 'center', paddingVertical: 20 },
})
