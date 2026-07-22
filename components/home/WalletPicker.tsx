/**
 * WalletPicker — choose which cards show on a behavior's home wallet.
 *
 * Behavior-agnostic: the wallet component (WeekWallet / CycleWallet / KidsWallet)
 * passes the full list of AVAILABLE cards it can render (already resolved to
 * label + icon), the current enabled selection, and a save callback. This
 * component only owns the draft + toggle + save UX. Mirrors QuickLogPicker:
 * edits a local draft while open (Cancel/X discards), explicit Save commits.
 *
 * Renders the shared QuickLogPickerGrid (2-column tile grid) so the Quick-access
 * edit picker matches the "What do you want to track?" log pickers. SAVE is
 * pinned in the LogSheet footer.
 */
import { useEffect, useState } from 'react'
import { PillButton } from '../ui/PillButton'
import { LogSheet } from '../calendar/LogSheet'
import { useTranslation } from '../../lib/i18n'
import { QuickLogPickerGrid, type QuickLogGridItem } from './QuickLogPickerGrid'

/** One selectable card in the picker — resolved by the wallet component. */
export interface WalletPickerItem {
  key: string
  label: string
  icon: React.ReactNode
  /** Soft socket tint behind the icon. */
  soft: string
}

interface Props {
  visible: boolean
  onClose: () => void
  /** Every card this wallet can show (contextual + shortcuts), in catalog order. */
  items: WalletPickerItem[]
  /** Currently enabled card keys (order = display order). */
  enabledKeys: string[]
  /** Commit the new ordered selection. */
  onSave: (orderedKeys: string[]) => void
}

export function WalletPicker({ visible, onClose, items, enabledKeys, onSave }: Props) {
  const { t } = useTranslation()

  // Local draft — edits stay uncommitted until Save. Re-seeded on open.
  const [draft, setDraft] = useState<string[]>(enabledKeys)
  useEffect(() => {
    if (visible) setDraft(enabledKeys)
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDraft = (key: string) =>
    setDraft((d) => (d.includes(key) ? d.filter((k) => k !== key) : [...d, key]))

  const dirty =
    draft.length !== enabledKeys.length || draft.some((k) => !enabledKeys.includes(k))

  const save = () => {
    // Persist in the catalog/items order so cards render consistently.
    const ordered = items.filter((it) => draft.includes(it.key)).map((it) => it.key)
    onSave(ordered)
    onClose()
  }

  const gridItems: QuickLogGridItem[] = items.map((it) => ({
    key: it.key,
    label: it.label,
    icon: it.icon,
    socketTint: it.soft,
    selected: draft.includes(it.key),
    onToggle: () => toggleDraft(it.key),
  }))

  return (
    <LogSheet
      visible={visible}
      title={t('wallet_pickTitle')}
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
      <QuickLogPickerGrid items={gridItems} />
    </LogSheet>
  )
}
