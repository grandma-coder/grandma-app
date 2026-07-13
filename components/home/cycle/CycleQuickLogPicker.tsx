// CycleQuickLogPicker — choose which quick-log chips show on the cycle home
// "Log something" card. Mirrors the pregnancy QuickLogPicker exactly: reuses the
// shared LogSheet shell (so the cream background / handle / title match every
// other sheet in both variants) and renders a sticker-in-a-socket per row.
// Edits a local draft while open; Save commits it to useCycleQuickLogStore.
import { useEffect, useState } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Check } from 'lucide-react-native'
import { useTheme, radius } from '../../../constants/theme'
import { Body } from '../../ui/Typography'
import { PillButton } from '../../ui/PillButton'
import { LogSheet } from '../../calendar/LogSheet'
import { useTranslation } from '../../../lib/i18n'
import { Drop, Heart, Smiley } from '../../ui/Stickers'
import { CYCLE_QUICK_LOGS } from '../../../lib/cycleQuickLogs'
import { useCycleQuickLogStore } from '../../../store/useCycleQuickLogStore'

interface Props {
  visible: boolean
  onClose: () => void
}

// Each cycle quick-log key → its sticker + a soft socket tint. Mirrors the
// iconography the cycle Today-at-a-glance card already uses for these signals,
// so the picker and the card read as the same family.
function stickerFor(key: string, stickers: ReturnType<typeof useTheme>['stickers']): { node: React.ReactElement; soft: string } {
  switch (key) {
    case 'mood':         return { node: <Smiley size={24} fill={stickers.yellow} />, soft: stickers.yellowSoft }
    case 'symptoms':     return { node: <Heart size={24} fill={stickers.pink} />, soft: stickers.pinkSoft }
    case 'bbt':          return { node: <Drop size={24} fill={stickers.blue} />, soft: stickers.blueSoft }
    case 'lh':           return { node: <Drop size={24} fill={stickers.yellow} />, soft: stickers.yellowSoft }
    case 'cm':           return { node: <Drop size={24} fill={stickers.green} />, soft: stickers.greenSoft }
    case 'intimacy':     return { node: <Heart size={24} fill={stickers.coral} />, soft: stickers.peachSoft }
    case 'period_start': return { node: <Drop size={24} fill={stickers.coral} />, soft: stickers.peachSoft }
    default:             return { node: <Smiley size={24} fill={stickers.yellow} />, soft: stickers.yellowSoft }
  }
}

export function CycleQuickLogPicker({ visible, onClose }: Props) {
  const { colors, stickers: themeStickers } = useTheme()
  const { t } = useTranslation()
  const enabledKeys = useCycleQuickLogStore((s) => s.enabledKeys)
  const setEnabled = useCycleQuickLogStore((s) => s.setEnabled)

  // Local draft — edits stay uncommitted until Save. Re-seeded from the store
  // each time the sheet opens (so Cancel/X discards).
  const [draft, setDraft] = useState<string[]>(enabledKeys)
  useEffect(() => {
    if (visible) setDraft(enabledKeys)
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDraft = (key: string) =>
    setDraft((d) => (d.includes(key) ? d.filter((k) => k !== key) : [...d, key]))

  const dirty = draft.length !== enabledKeys.length || draft.some((k) => !enabledKeys.includes(k))

  const save = () => {
    // Persist in catalog order so chips render consistently.
    const ordered = CYCLE_QUICK_LOGS.filter((q) => draft.includes(q.key)).map((q) => q.key)
    setEnabled(ordered)
    onClose()
  }

  return (
    <LogSheet visible={visible} title={t('pregnancy_quickLogs_pickTitle')} onClose={onClose}>
      <View style={{ gap: 10 }}>
        {CYCLE_QUICK_LOGS.map((q) => {
          const on = draft.includes(q.key)
          const s = stickerFor(q.key, themeStickers)
          return (
            <Pressable
              key={q.key}
              onPress={() => toggleDraft(q.key)}
              style={({ pressed }) => [
                styles.row,
                { borderColor: on ? colors.text : colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={[styles.socket, { backgroundColor: s.soft }]}>{s.node}</View>
              <Body size={16} color={colors.text} style={{ flex: 1 }}>{t(q.labelKey)}</Body>
              <View style={[styles.checkbox, { borderColor: on ? colors.text : colors.border, backgroundColor: on ? colors.text : 'transparent' }]}>
                {on ? <Check size={14} color={colors.bg} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          )
        })}
      </View>

      <View style={styles.saveWrap}>
        <PillButton
          label={dirty ? t('common_save') : t('common_done')}
          variant="ink"
          onPress={dirty ? save : onClose}
          disabled={draft.length === 0}
        />
      </View>
    </LogSheet>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 16 },
  socket: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  saveWrap: { marginTop: 16 },
})
