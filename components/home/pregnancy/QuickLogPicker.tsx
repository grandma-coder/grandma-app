// QuickLogPicker — choose which quick-log chips show on the "Log something" home
// card. Reuses the shared LogSheet shell (background/handle/title match every
// other sheet, in both variants). Edits a local draft while open; an explicit
// Save commits it to the store and closes — so it's clear the choice was saved.
import { useEffect, useState } from 'react'
import { useTheme } from '../../../constants/theme'
import { PillButton } from '../../ui/PillButton'
import { LogSheet } from '../../calendar/LogSheet'
import { useTranslation } from '../../../lib/i18n'
import { Character } from '../../characters/Characters'
import { DIFFUSE_LOG_CHARACTER, diffuseLogHue } from '../../calendar/DiffuseLogTimeline'
import { PREG_QUICK_LOGS } from '../../../lib/pregnancyQuickLogs'
import { useQuickLogStore } from '../../../store/useQuickLogStore'
import { QuickLogPickerGrid, type QuickLogGridItem } from '../QuickLogPickerGrid'

interface Props {
  visible: boolean
  onClose: () => void
  weekNumber: number
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

// Each quick-log def → its Character concept-blob + a soft socket tint, pulled
// from the SHARED canonical map the Diffuse variant + calendar timeline use
// (keyed by the def's cycle/pregnancy log type). Keeping this on one source of
// truth means both variants read the same icon and no concept collides on a
// generic star/leaf shape any more.
function blobFor(logType: string, stickers: ReturnType<typeof useTheme>['stickers']): { node: React.ReactElement; soft: string } {
  const hue = diffuseLogHue(logType)
  return {
    node: <Character name={DIFFUSE_LOG_CHARACTER[logType] ?? 'note'} size={26} color={hue} />,
    soft: softForHue(hue, stickers),
  }
}

export function QuickLogPicker({ visible, onClose, weekNumber }: Props) {
  const { stickers } = useTheme()
  const { t } = useTranslation()
  const enabledKeys = useQuickLogStore((s) => s.enabledKeys)
  const setEnabled = useQuickLogStore((s) => s.setEnabled)

  // Local draft — edits stay uncommitted until Save. Re-seeded from the store
  // each time the sheet opens (so Cancel/X discards).
  const [draft, setDraft] = useState<string[]>(enabledKeys)
  useEffect(() => {
    if (visible) setDraft(enabledKeys)
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  const available = PREG_QUICK_LOGS.filter((q) => q.minWeek === undefined || weekNumber >= q.minWeek)

  const toggleDraft = (key: string) =>
    setDraft((d) => (d.includes(key) ? d.filter((k) => k !== key) : [...d, key]))

  const dirty = draft.length !== enabledKeys.length || draft.some((k) => !enabledKeys.includes(k))

  const save = () => {
    // Persist in catalog order so chips render consistently.
    const ordered = PREG_QUICK_LOGS.filter((q) => draft.includes(q.key)).map((q) => q.key)
    setEnabled(ordered)
    onClose()
  }

  const items: QuickLogGridItem[] = available.map((q) => {
    const s = blobFor(q.logType, stickers)
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
