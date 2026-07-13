// QuickLogPicker — choose which quick-log chips show on the "Log something" home
// card. Reuses the shared LogSheet shell (so its background/handle/title match
// every other sheet, in both the current and Diffuse variants). Each row shows
// the log's own sticker in a soft-tinted socket, with a check toggle.
import { View, Pressable, StyleSheet } from 'react-native'
import { Check } from 'lucide-react-native'
import { useTheme, radius } from '../../../constants/theme'
import { Body } from '../../ui/Typography'
import { LogSheet } from '../../calendar/LogSheet'
import { useTranslation } from '../../../lib/i18n'
import {
  MoodFace, LogWater, LogSleep, LogNutrition, LogWeight, LogKicks,
} from '../../stickers/RewardStickers'
import { PREG_QUICK_LOGS } from '../../../lib/pregnancyQuickLogs'
import { useQuickLogStore } from '../../../store/useQuickLogStore'

interface Props {
  visible: boolean
  onClose: () => void
  weekNumber: number
}

// Each quick-log key → its sticker + a soft socket tint.
function stickerFor(key: string, stickers: ReturnType<typeof useTheme>['stickers']): { node: React.ReactElement; soft: string } {
  switch (key) {
    case 'mood':   return { node: <MoodFace size={24} variant="happy" fill={stickers.yellow} />, soft: stickers.yellowSoft }
    case 'water':  return { node: <LogWater size={24} fill={stickers.blue} />, soft: stickers.blueSoft }
    case 'sleep':  return { node: <LogSleep size={24} fill={stickers.lilac} />, soft: stickers.lilacSoft }
    case 'meals':  return { node: <LogNutrition size={24} fill={stickers.green} />, soft: stickers.greenSoft }
    case 'weight': return { node: <LogWeight size={24} fill={stickers.peach} />, soft: stickers.peachSoft }
    case 'kicks':  return { node: <LogKicks size={24} fill={stickers.pink} />, soft: stickers.pinkSoft }
    default:       return { node: <MoodFace size={24} variant="okay" fill={stickers.yellow} />, soft: stickers.yellowSoft }
  }
}

export function QuickLogPicker({ visible, onClose, weekNumber }: Props) {
  const { colors, stickers } = useTheme()
  const { t } = useTranslation()
  const enabledKeys = useQuickLogStore((s) => s.enabledKeys)
  const toggle = useQuickLogStore((s) => s.toggle)

  const available = PREG_QUICK_LOGS.filter((q) => q.minWeek === undefined || weekNumber >= q.minWeek)

  return (
    <LogSheet visible={visible} title={t('pregnancy_quickLogs_pickTitle')} onClose={onClose}>
      <View style={{ gap: 10, paddingBottom: 8 }}>
        {available.map((q) => {
          const on = enabledKeys.includes(q.key)
          const s = stickerFor(q.key, stickers)
          return (
            <Pressable
              key={q.key}
              onPress={() => toggle(q.key)}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 16 },
  socket: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
})
