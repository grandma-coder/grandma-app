/**
 * WalletPicker — choose which cards show on a behavior's home wallet.
 *
 * Behavior-agnostic: the wallet component (WeekWallet / CycleWallet / KidsWallet)
 * passes the full list of AVAILABLE cards it can render (already resolved to
 * label + icon), the current enabled selection, and a save callback. This
 * component only owns the draft + toggle + save UX. Mirrors QuickLogPicker:
 * edits a local draft while open (Cancel/X discards), explicit Save commits.
 *
 * Reuses the shared LogSheet shell so the background/handle/title match every
 * other sheet in both variants. Rows are neutral (no mode accent), variant-aware.
 */
import { useEffect, useState } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Check } from 'lucide-react-native'
import { useTheme, radius, useDiffuseTheme } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { Body } from '../ui/Typography'
import { PillButton } from '../ui/PillButton'
import { LogSheet } from '../calendar/LogSheet'
import { useTranslation } from '../../lib/i18n'

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
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
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

  const rowBorder = diffuse ? dt.colors.line : colors.border
  const rowBg = diffuse ? dt.colors.surface : colors.surface
  const rowInk = diffuse ? dt.colors.ink : colors.text
  const checkBg = diffuse ? dt.colors.ink : colors.text
  const checkGlyph = diffuse ? dt.colors.bg : colors.bg

  return (
    <LogSheet visible={visible} title={t('wallet_pickTitle')} onClose={onClose}>
      <View style={{ gap: 10 }}>
        {items.map((it) => {
          const on = draft.includes(it.key)
          return (
            <Pressable
              key={it.key}
              onPress={() => toggleDraft(it.key)}
              style={({ pressed }) => [
                styles.row,
                { borderColor: on ? rowInk : rowBorder, backgroundColor: rowBg, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={[styles.socket, { backgroundColor: it.soft }]}>{it.icon}</View>
              <Body size={16} color={rowInk} style={{ flex: 1 }}>{it.label}</Body>
              <View style={[styles.checkbox, { borderColor: on ? rowInk : rowBorder, backgroundColor: on ? checkBg : 'transparent' }]}>
                {on ? <Check size={14} color={checkGlyph} strokeWidth={3} /> : null}
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
