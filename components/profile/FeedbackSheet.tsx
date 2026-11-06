/**
 * "Send a suggestion" — a short sheet from Settings. Kind (idea / problem / question), a text
 * box, Send. Lands in the command center's Support inbox.
 */
import { useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native'
import { LogSheet } from '../calendar/LogSheet'
import { PillButton } from '../ui/PillButton'
import { SiteChoice } from '../ui/SiteChoice'
import { useSavedToast } from '../ui/SavedToast'
import { useTheme } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { useModeStore } from '../../store/useModeStore'
import { FEEDBACK_MAX_LEN, submitFeedback, type FeedbackKind } from '../../lib/feedback'
import type { SiteStickerName } from '../stickers/SiteSticker'

const KINDS: { id: FeedbackKind; labelKey: 'feedback_kindIdea' | 'feedback_kindProblem' | 'feedback_kindQuestion'; sticker: SiteStickerName }[] = [
  { id: 'feedback', labelKey: 'feedback_kindIdea', sticker: 'star' },
  { id: 'bug', labelKey: 'feedback_kindProblem', sticker: 'headache' },
  { id: 'question', labelKey: 'feedback_kindQuestion', sticker: 'bubble' },
]

export function FeedbackSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, language } = useTranslation()
  const { colors, font, stickers } = useTheme()
  const mode = useModeStore((s) => s.mode)
  const toast = useSavedToast()
  const [kind, setKind] = useState<FeedbackKind>('feedback')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    if (!message.trim() || sending) return
    setSending(true)
    const result = await submitFeedback({ kind, message, journey: mode, language })
    setSending(false)
    if (result === 'ok') {
      setMessage('')
      setKind('feedback')
      onClose()
      toast.show({ title: t('feedback_sentTitle'), message: t('feedback_sentBody') })
    } else {
      Alert.alert(t('common_error'), t(result === 'rate_limited' ? 'feedback_rateLimited' : 'common_checkConnection'))
    }
  }

  return (
    <LogSheet
      visible={visible}
      onClose={onClose}
      title={t('feedback_title')}
      sticker="bubble"
      footer={
        <PillButton
          label={t('feedback_send')}
          onPress={send}
          loading={sending}
          disabled={!message.trim() || sending}
          style={{ alignSelf: 'stretch' }}
        />
      }
    >
      <Text style={[styles.intro, { color: colors.textSecondary, fontFamily: font.body }]}>{t('feedback_intro')}</Text>
      <View style={styles.kinds}>
        {KINDS.map((k) => (
          <SiteChoice
            key={k.id}
            compact
            tick={false}
            label={t(k.labelKey)}
            sticker={k.sticker}
            selected={kind === k.id}
            onPress={() => setKind(k.id)}
            tone={stickers.yellowSoft}
          />
        ))}
      </View>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder={t('feedback_placeholder')}
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={FEEDBACK_MAX_LEN}
        textAlignVertical="top"
        accessibilityLabel={t('feedback_title')}
        style={[styles.input, { color: colors.text, borderColor: colors.text, backgroundColor: colors.surface, fontFamily: font.body }]}
      />
    </LogSheet>
  )
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  // Chips size to their label and wrap — equal thirds broke "Problema" mid-word.
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  input: { minHeight: 140, borderWidth: 1.5, borderRadius: 18, padding: 14, fontSize: 15, lineHeight: 21 },
})
