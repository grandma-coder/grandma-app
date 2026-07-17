/**
 * Poll composer (Phase 3). A modal to create a poll in a channel: a question +
 * 2–5 options. On create, posts a poll message to the feed (see lib/polls
 * createPoll). Cream + diffuse.
 */

import { useState } from 'react'
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { X, Plus, Trash2 } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useDiffuseTheme, diffuseFont, brand } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { createPoll, POLL_MIN_OPTIONS, POLL_MAX_OPTIONS } from '../../lib/polls'

interface Props {
  visible: boolean
  channelId: string
  onClose: () => void
  onCreated: () => void
}

export function PollComposer({ visible, channelId, onClose, onCreated }: Props) {
  const { colors, font, stickers, radius } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [creating, setCreating] = useState(false)

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const line = diffuse ? dt.colors.line : colors.border
  const accent = diffuse ? dt.colors.ink : brand.primary
  const fieldBg = diffuse ? 'transparent' : colors.surface

  const filledOptions = options.map((o) => o.trim()).filter(Boolean)
  const canCreate = question.trim().length > 0 && filledOptions.length >= POLL_MIN_OPTIONS

  function reset() {
    setQuestion(''); setOptions(['', '']); setCreating(false)
  }

  function setOption(i: number, v: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)))
  }
  function addOption() {
    if (options.length < POLL_MAX_OPTIONS) setOptions((prev) => [...prev, ''])
  }
  function removeOption(i: number) {
    if (options.length > POLL_MIN_OPTIONS) setOptions((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function create() {
    if (!canCreate) return
    setCreating(true)
    try {
      await createPoll({ channelId, question: question.trim(), options: filledOptions })
      reset()
      onClose()
      onCreated()
    } catch (e: any) {
      setCreating(false)
      Alert.alert(t('common_error'), e?.message ?? t('poll_createFailed'))
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: diffuse ? dt.colors.bg : colors.bg, paddingBottom: insets.bottom + 16, borderTopColor: line }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: ink, fontFamily: diffuse ? diffuseFont.display : font.display }]}>{t('poll_composerTitle')}</Text>
            <Pressable onPress={() => { reset(); onClose() }} hitSlop={8}>
              <X size={22} color={inkMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder={t('poll_questionPlaceholder')}
              placeholderTextColor={inkMuted}
              multiline
              style={[styles.questionInput, { color: ink, backgroundColor: fieldBg, borderColor: line, borderRadius: radius.md, fontFamily: diffuse ? diffuseFont.body : font.body }]}
            />

            <Text style={[styles.label, { color: inkMuted, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium }]}>{t('poll_optionsLabel')}</Text>
            {options.map((opt, i) => (
              <View key={i} style={styles.optionRow}>
                <TextInput
                  value={opt}
                  onChangeText={(v) => setOption(i, v)}
                  placeholder={t('poll_optionPlaceholder', { n: i + 1 })}
                  placeholderTextColor={inkMuted}
                  style={[styles.optionInput, { color: ink, backgroundColor: fieldBg, borderColor: line, borderRadius: radius.md, fontFamily: diffuse ? diffuseFont.body : font.body }]}
                />
                {options.length > POLL_MIN_OPTIONS && (
                  <Pressable onPress={() => removeOption(i)} hitSlop={8} style={styles.removeBtn}>
                    <Trash2 size={16} color={inkMuted} strokeWidth={1.8} />
                  </Pressable>
                )}
              </View>
            ))}

            {options.length < POLL_MAX_OPTIONS && (
              <Pressable onPress={addOption} style={styles.addRow}>
                <Plus size={16} color={accent} strokeWidth={2} />
                <Text style={[styles.addText, { color: accent, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>{t('poll_addOption')}</Text>
              </Pressable>
            )}
          </ScrollView>

          <Pressable
            onPress={create}
            disabled={!canCreate || creating}
            style={[styles.cta, { backgroundColor: accent, borderRadius: radius.full, opacity: (!canCreate || creating) ? 0.5 : 1 }]}
          >
            {creating
              ? <ActivityIndicator size="small" color={diffuse ? dt.colors.bg : colors.textInverse} />
              : <Text style={[styles.ctaText, { color: diffuse ? dt.colors.bg : colors.textInverse, fontFamily: diffuse ? diffuseFont.bodySemiBold : font.bodySemiBold }]}>{t('poll_create')}</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,19,19,0.3)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 16, maxHeight: '86%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 22, letterSpacing: -0.3 },
  body: { gap: 10, paddingBottom: 16 },
  questionInput: { fontSize: 16, minHeight: 56, padding: 14, borderWidth: 1 },
  label: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 6 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionInput: { flex: 1, fontSize: 15, height: 48, paddingHorizontal: 14, borderWidth: 1 },
  removeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, marginTop: 2 },
  addText: { fontSize: 14 },
  cta: { height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  ctaText: { fontSize: 15 },
})
