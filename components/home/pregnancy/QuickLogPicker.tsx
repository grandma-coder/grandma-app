// QuickLogPicker — bottom sheet to choose which quick-log chips show on the
// "Log something" home card. Reads the catalog (PREG_QUICK_LOGS) and writes the
// user's selection to useQuickLogStore (persisted). Each row shows the log's own
// sticker in a soft-tinted socket. Cream-paper styling.
import { Modal, View, Pressable, StyleSheet, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, X } from 'lucide-react-native'
import { useTheme, radius } from '../../../constants/theme'
import { Display, Body, MonoCaps } from '../../ui/Typography'
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
  const insets = useSafeAreaInsets()
  const { colors, stickers } = useTheme()
  const { t } = useTranslation()
  const enabledKeys = useQuickLogStore((s) => s.enabledKeys)
  const toggle = useQuickLogStore((s) => s.toggle)

  const available = PREG_QUICK_LOGS.filter((q) => q.minWeek === undefined || weekNumber >= q.minWeek)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.bg, paddingBottom: insets.bottom + 20 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.grip}>
            <View style={[styles.gripBar, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <MonoCaps color={colors.textMuted}>QUICK LOGS</MonoCaps>
              <Display size={24} style={{ marginTop: 4 }}>{t('pregnancy_quickLogs_pickTitle')}</Display>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={[styles.close, { borderColor: colors.border }]}>
              <X size={18} color={colors.text} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 8 }}>
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
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(20,19,19,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 8 },
  grip: { alignItems: 'center', paddingVertical: 6 },
  gripBar: { width: 40, height: 4, borderRadius: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 4, marginBottom: 12 },
  close: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 16 },
  socket: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
})
