// QuickLogPicker — bottom sheet to choose which quick-log chips show on the
// "Log something" home card. Reads the catalog (PREG_QUICK_LOGS) and writes the
// user's selection to useQuickLogStore (persisted). Cream-paper styling.
import { Modal, View, Pressable, StyleSheet, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, X } from 'lucide-react-native'
import { useTheme, radius } from '../../../constants/theme'
import { Display, Body, MonoCaps } from '../../ui/Typography'
import { useTranslation } from '../../../lib/i18n'
import { PREG_QUICK_LOGS } from '../../../lib/pregnancyQuickLogs'
import { useQuickLogStore } from '../../../store/useQuickLogStore'

interface Props {
  visible: boolean
  onClose: () => void
  /** Current pregnancy week — hides chips gated by minWeek. */
  weekNumber: number
}

export function QuickLogPicker({ visible, onClose, weekNumber }: Props) {
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
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

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 8 }}>
            {available.map((q) => {
              const on = enabledKeys.includes(q.key)
              return (
                <Pressable
                  key={q.key}
                  onPress={() => toggle(q.key)}
                  style={({ pressed }) => [
                    styles.row,
                    { borderColor: on ? colors.text : colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Body size={16} color={colors.text}>{t(q.labelKey)}</Body>
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: radius.md, paddingVertical: 16, paddingHorizontal: 18 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
})
