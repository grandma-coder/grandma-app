// CycleQuickLogPicker — choose which quick-log chips show on the cycle home
// "Log something" card. Mirrors the pregnancy QuickLogPicker exactly: reuses the
// shared LogSheet shell (so the cream background / handle / title match every
// other sheet in both variants) and renders a 2-column grid of log options.
// Edits a local draft while open; Save commits it to useCycleQuickLogStore.
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from '../../../constants/theme'
import { PillButton } from '../../ui/PillButton'
import { LogSheet } from '../../calendar/LogSheet'
import { useTranslation } from '../../../lib/i18n'
import { Character, CharacterName } from '../../characters/Characters'
import { DIFFUSE_LOG_CHARACTER, diffuseLogHue } from '../../calendar/DiffuseLogTimeline'
import { CYCLE_QUICK_LOGS } from '../../../lib/cycleQuickLogs'
import { useCycleQuickLogStore } from '../../../store/useCycleQuickLogStore'
import { QuickLogPickerGrid, type QuickLogGridItem } from '../QuickLogPickerGrid'

interface Props {
  visible: boolean
  onClose: () => void
}

// Soft companion of a hue — matches the sticker palette's *Soft set. Kept local
// so this picker depends only on committed exports (not a concurrent WIP helper).
function softForHue(hue: string, stickers: ReturnType<typeof useTheme>['stickers']): string {
  const map: Record<string, string> = {
    [stickers.yellow]: stickers.yellowSoft,
    [stickers.blue]: stickers.blueSoft,
    [stickers.pink]: stickers.pinkSoft,
    [stickers.green]: stickers.greenSoft,
    [stickers.lilac]: stickers.lilacSoft,
    [stickers.peach]: stickers.peachSoft,
    [stickers.coral]: stickers.peachSoft,
  }
  return map[hue] ?? stickers.blueSoft
}

// Local per-row overrides where the shared DIFFUSE_LOG_CHARACTER map would
// otherwise collide two cycle rows on the same concept+hue (e.g. sex_drive vs
// intimacy both → heart/pink). Kept local to avoid editing the shared
// DiffuseLogTimeline map (owned by a concurrent workstream). Hue is keyed by
// sticker token name (not resolved here) since `stickers` only exists inside
// the component via useTheme().
const CYCLE_BLOB_OVERRIDE: Record<string, { char: CharacterName; hue: keyof ReturnType<typeof useTheme>['stickers'] }> = {
  sex_drive: { char: 'sparkle', hue: 'lilac' },
}

// Each cycle def → its Character concept-blob + soft socket tint, pulled from
// the SHARED canonical map the Diffuse variant + calendar timeline use (keyed by
// the def's cycle log type). One source of truth = the picker, the home card,
// and the calendar all show the same icon; distinctness is concept + hue.
function blobFor(logType: string, stickers: ReturnType<typeof useTheme>['stickers']): { node: React.ReactElement; soft: string } {
  const override = CYCLE_BLOB_OVERRIDE[logType]
  const name = override?.char ?? DIFFUSE_LOG_CHARACTER[logType] ?? 'note'
  const hue = override ? stickers[override.hue] : diffuseLogHue(logType)
  return {
    node: <Character name={name} size={22} color={hue} />,
    soft: softForHue(hue, stickers),
  }
}

export function CycleQuickLogPicker({ visible, onClose }: Props) {
  const { stickers: themeStickers } = useTheme()
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

  const items: QuickLogGridItem[] = CYCLE_QUICK_LOGS.map((q) => {
    const s = blobFor(q.sheet, themeStickers)
    return {
      key: q.key,
      label: t(q.labelKey),
      icon: s.node,
      socketTint: s.soft,
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
