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
import { Character, CharacterName } from '../../characters/Characters'
import { DIFFUSE_LOG_CHARACTER, diffuseLogHue } from '../../calendar/DiffuseLogTimeline'
import { CYCLE_QUICK_LOGS } from '../../../lib/cycleQuickLogs'
import { useCycleQuickLogStore } from '../../../store/useCycleQuickLogStore'

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
      <View style={{ gap: 10 }}>
        {CYCLE_QUICK_LOGS.map((q) => {
          const on = draft.includes(q.key)
          const s = blobFor(q.sheet, themeStickers)
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
    </LogSheet>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 16 },
  socket: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
})
