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
import { Character, type CharacterName } from '../../characters/Characters'
import { useIsDiffuse } from '../../ui/diffuse/DiffuseKit'
import { CYCLE_QUICK_LOGS } from '../../../lib/cycleQuickLogs'
import { useCycleQuickLogStore } from '../../../store/useCycleQuickLogStore'

interface Props {
  visible: boolean
  onClose: () => void
}

// Each cycle quick-log key → its sticker + a soft socket tint. Mirrors the
// iconography the cycle Today-at-a-glance card already uses for these signals,
// so the picker and the card read as the same family.
// key → Character concept + hue + soft socket tint. Under Diffuse we render the
// blob; legacy keeps the sticker. Concepts mirror CycleTodaySummaryCard.
const CYCLE_LOG_META: Record<string, { char: CharacterName; hue: keyof ReturnType<typeof useTheme>['stickers']; soft: keyof ReturnType<typeof useTheme>['stickers'] }> = {
  mood:         { char: 'mood',        hue: 'yellow', soft: 'yellowSoft' },
  symptoms:     { char: 'activity',    hue: 'pink',   soft: 'pinkSoft' },
  bbt:          { char: 'temperature', hue: 'blue',   soft: 'blueSoft' },
  lh:           { char: 'water',       hue: 'yellow', soft: 'yellowSoft' },
  cm:           { char: 'water',       hue: 'green',  soft: 'greenSoft' },
  intimacy:     { char: 'heart',       hue: 'coral',  soft: 'peachSoft' },
  period_start: { char: 'period',      hue: 'coral',  soft: 'peachSoft' },
  period_end:     { char: 'period',      hue: 'coral',  soft: 'peachSoft' },
  pregnancy_test: { char: 'ovulation',   hue: 'yellow', soft: 'yellowSoft' },
  sex_drive:      { char: 'heart',       hue: 'pink',   soft: 'pinkSoft' },
  clots:          { char: 'warning',     hue: 'coral',  soft: 'peachSoft' },
  weight:         { char: 'growth',      hue: 'peach',  soft: 'peachSoft' },
  water:          { char: 'water',       hue: 'blue',   soft: 'blueSoft' },
  activity:       { char: 'activity',    hue: 'green',  soft: 'greenSoft' },
}

function stickerFor(key: string, stickers: ReturnType<typeof useTheme>['stickers'], diffuse: boolean): { node: React.ReactElement; soft: string } {
  const meta = CYCLE_LOG_META[key] ?? CYCLE_LOG_META.mood
  if (diffuse) {
    return { node: <Character name={meta.char} size={28} color={stickers[meta.hue]} />, soft: stickers[meta.soft] }
  }
  switch (key) {
    case 'mood':         return { node: <Smiley size={24} fill={stickers.yellow} />, soft: stickers.yellowSoft }
    case 'symptoms':     return { node: <Heart size={24} fill={stickers.pink} />, soft: stickers.pinkSoft }
    case 'bbt':          return { node: <Drop size={24} fill={stickers.blue} />, soft: stickers.blueSoft }
    case 'lh':           return { node: <Drop size={24} fill={stickers.yellow} />, soft: stickers.yellowSoft }
    case 'cm':           return { node: <Drop size={24} fill={stickers.green} />, soft: stickers.greenSoft }
    case 'intimacy':     return { node: <Heart size={24} fill={stickers.coral} />, soft: stickers.peachSoft }
    case 'period_start': return { node: <Drop size={24} fill={stickers.coral} />, soft: stickers.peachSoft }
    case 'period_end':     return { node: <Drop size={24} fill={stickers.coral} />, soft: stickers.peachSoft }
    case 'pregnancy_test': return { node: <Drop size={24} fill={stickers.yellow} />, soft: stickers.yellowSoft }
    case 'sex_drive':      return { node: <Heart size={24} fill={stickers.pink} />, soft: stickers.pinkSoft }
    case 'clots':          return { node: <Drop size={24} fill={stickers.coral} />, soft: stickers.peachSoft }
    case 'weight':         return { node: <Drop size={24} fill={stickers.peach} />, soft: stickers.peachSoft }
    case 'water':          return { node: <Drop size={24} fill={stickers.blue} />, soft: stickers.blueSoft }
    case 'activity':       return { node: <Heart size={24} fill={stickers.green} />, soft: stickers.greenSoft }
    default:             return { node: <Smiley size={24} fill={stickers.yellow} />, soft: stickers.yellowSoft }
  }
}

export function CycleQuickLogPicker({ visible, onClose }: Props) {
  const { colors, stickers: themeStickers } = useTheme()
  const diffuse = useIsDiffuse()
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
          const s = stickerFor(q.key, themeStickers, diffuse)
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
