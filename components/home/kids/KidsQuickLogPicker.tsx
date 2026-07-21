// KidsQuickLogPicker — choose which quick-log chips show on the kids home
// "Today at a glance" card. Mirrors the pregnancy QuickLogPicker: edits a local
// draft while open, an explicit Save commits it to useKidsQuickLogStore. Reuses
// the shared LogSheet shell (correct cream in both variants). No week gating —
// every kids log type is always available to pick.
import { useEffect, useState } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Check } from 'lucide-react-native'
import { useTheme, radius } from '../../../constants/theme'
import { Body } from '../../ui/Typography'
import { PillButton } from '../../ui/PillButton'
import { LogSheet } from '../../calendar/LogSheet'
import { useTranslation } from '../../../lib/i18n'
import { Character, type CharacterName } from '../../characters/Characters'
import { KIDS_QUICK_LOGS } from '../../../lib/kidsQuickLogs'
import { useKidsQuickLogStore } from '../../../store/useKidsQuickLogStore'

interface Props {
  visible: boolean
  onClose: () => void
}

// Each quick-log key → its Character glyph + a soft socket tint.
function characterFor(
  key: string,
  stickers: ReturnType<typeof useTheme>['stickers'],
): { name: CharacterName; hue: string; soft: string } {
  switch (key) {
    case 'sleep':    return { name: 'sleep',    hue: stickers.lilac, soft: stickers.lilacSoft }
    case 'mood':     return { name: 'mood',     hue: stickers.peach, soft: stickers.peachSoft }
    case 'feeding':  return { name: 'feeding',  hue: stickers.blue,  soft: stickers.blueSoft }
    case 'activity': return { name: 'activity', hue: stickers.green, soft: stickers.greenSoft }
    case 'diaper':   return { name: 'diaper',   hue: stickers.blue,  soft: stickers.blueSoft }
    case 'wake_up':  return { name: 'sun',      hue: stickers.yellow, soft: stickers.yellowSoft }
    case 'health':   return { name: 'checkup',  hue: stickers.coral, soft: stickers.peachSoft }
    case 'memory':   return { name: 'photo',    hue: stickers.lilac, soft: stickers.lilacSoft }
    case 'exam':     return { name: 'exam',     hue: stickers.green, soft: stickers.greenSoft }
    default:         return { name: 'activity', hue: stickers.green, soft: stickers.greenSoft }
  }
}

export function KidsQuickLogPicker({ visible, onClose }: Props) {
  const { colors, stickers } = useTheme()
  const { t } = useTranslation()
  const enabledKeys = useKidsQuickLogStore((s) => s.enabledKeys)
  const setEnabled = useKidsQuickLogStore((s) => s.setEnabled)

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
    const ordered = KIDS_QUICK_LOGS.filter((q) => draft.includes(q.key)).map((q) => q.key)
    setEnabled(ordered)
    onClose()
  }

  return (
    <LogSheet visible={visible} title={t('kids_quickLogs_pickTitle')} onClose={onClose}>
      <View style={{ gap: 10 }}>
        {KIDS_QUICK_LOGS.map((q) => {
          const on = draft.includes(q.key)
          const c = characterFor(q.key, stickers)
          return (
            <Pressable
              key={q.key}
              onPress={() => toggleDraft(q.key)}
              style={({ pressed }) => [
                styles.row,
                { borderColor: on ? colors.text : colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={[styles.socket, { backgroundColor: c.soft }]}>
                <Character name={c.name} size={24} color={c.hue} />
              </View>
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
