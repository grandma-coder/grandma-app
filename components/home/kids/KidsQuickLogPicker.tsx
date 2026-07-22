// KidsQuickLogPicker — choose which quick-log chips show on the kids home
// "Today at a glance" card. Mirrors the pregnancy QuickLogPicker: edits a local
// draft while open, an explicit Save commits it to useKidsQuickLogStore. Reuses
// the shared LogSheet shell (correct cream in both variants). No week gating —
// every kids log type is always available to pick.
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from '../../../constants/theme'
import { Character, type CharacterName } from '../../characters/Characters'
import { QuickLogPickerGrid, type QuickLogGridItem } from '../QuickLogPickerGrid'
import { PillButton } from '../../ui/PillButton'
import { LogSheet } from '../../calendar/LogSheet'
import { useTranslation } from '../../../lib/i18n'
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

  const items: QuickLogGridItem[] = KIDS_QUICK_LOGS.map((q) => {
    const c = characterFor(q.key, stickers)
    return {
      key: q.key,
      label: t(q.labelKey),
      icon: <Character name={c.name} size={24} color={c.hue} />,
      socketTint: c.soft,
      selected: draft.includes(q.key),
      onToggle: () => toggleDraft(q.key),
    }
  })

  return (
    <LogSheet
      visible={visible}
      title={t('kids_quickLogs_pickTitle')}
      onClose={onClose}
      footer={
        <PillButton
          label={dirty ? t('common_save') : t('common_done')}
          variant="ink"
          onPress={dirty ? save : onClose}
          disabled={draft.length === 0}
        />
      }
    >
      <QuickLogPickerGrid items={items} />
    </LogSheet>
  )
}
