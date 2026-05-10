/**
 * StickerDateModal — bottom-sheet wrapper around the native date picker
 * that matches the rest of the design system (paper background, ink border,
 * sticker close button, sticker Done button).
 *
 * Use this whenever a screen needs to drop a date picker directly (i.e.
 * not behind the DatePickerField trigger).
 */

import { Platform, Modal, Pressable, View, Text, StyleSheet } from 'react-native'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { X } from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import { Star as StarSticker } from './Stickers'

const ST_INK = '#141313'
const ST_PAPER = '#FFFEF8'
const ST_CREAM = '#F7F0DF'

interface Props {
  visible: boolean
  title: string
  /** Working draft date — parent owns it so it can keep state across reopens. */
  value: Date
  onChange: (d: Date) => void
  onClose: () => void
  onSave: () => void
  minimumDate?: Date
  maximumDate?: Date
  /** Override mode accent (useful when we know the context isn't the active mode). */
  accentColor?: string
}

function modeAccent(mode: string, isDark: boolean): { fill: string; soft: string } {
  if (mode === 'pre-pregnancy') return { fill: isDark ? '#EFA2C2' : brand.prePregnancy, soft: '#F7CFDD' }
  if (mode === 'pregnancy') return { fill: isDark ? '#C4B5EF' : brand.pregnancy, soft: '#DCD2F2' }
  return { fill: isDark ? '#A5C9F0' : brand.kids, soft: '#CFE0F0' }
}

export function StickerDateModal({
  visible,
  title,
  value,
  onChange,
  onClose,
  onSave,
  minimumDate,
  maximumDate,
  accentColor,
}: Props) {
  const { colors, isDark } = useTheme()
  const mode = useModeStore((s) => s.mode)
  const accent = accentColor
    ? { fill: accentColor, soft: accentColor }
    : modeAccent(mode, isDark)

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      onClose()
      if (event.type === 'set' && selectedDate) {
        onChange(selectedDate)
        onSave()
      }
      return
    }
    if (selectedDate) onChange(selectedDate)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? colors.surface : ST_PAPER,
              borderColor: isDark ? colors.text : ST_INK,
            },
          ]}
        >
          <View style={styles.starAccent} pointerEvents="none">
            <StarSticker size={64} fill={accent.fill} stroke={ST_INK} />
          </View>

          <View style={[styles.handleBar, { backgroundColor: isDark ? colors.border : '#14131340' }]} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: isDark ? colors.text : ST_INK }]}>{title}</Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: isDark ? colors.surfaceRaised : ST_CREAM,
                  borderColor: isDark ? colors.text : ST_INK,
                  shadowOffset: { width: 0, height: pressed ? 1 : 2 },
                  transform: [{ translateY: pressed ? 1 : 0 }],
                },
              ]}
            >
              <X size={15} color={isDark ? colors.text : ST_INK} strokeWidth={2.5} />
            </Pressable>
          </View>

          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={value}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              textColor={isDark ? colors.text : ST_INK}
              accentColor={ST_INK}
              themeVariant={isDark ? 'dark' : 'light'}
              style={{ width: '100%' }}
            />
          </View>

          {Platform.OS === 'ios' && (
            <Pressable
              onPress={onSave}
              style={({ pressed }) => [
                styles.doneBtn,
                {
                  backgroundColor: accent.fill,
                  borderColor: ST_INK,
                  shadowOffset: { width: 0, height: pressed ? 2 : 5 },
                  transform: [{ translateY: pressed ? 3 : 0 }],
                },
              ]}
            >
              <Text style={styles.doneText}>Save</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 48,
    gap: 16,
    overflow: 'hidden',
  },
  starAccent: { position: 'absolute', top: -8, right: 12, opacity: 0.6 },
  handleBar: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, letterSpacing: -0.5, fontFamily: 'Fraunces_600SemiBold' },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ST_INK, shadowOpacity: 1, shadowRadius: 0, elevation: 3,
  },
  pickerWrap: { alignItems: 'center', justifyContent: 'center' },
  doneBtn: {
    height: 60, borderRadius: 999, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ST_INK, shadowOpacity: 1, shadowRadius: 0, elevation: 6,
  },
  doneText: {
    color: ST_INK, fontFamily: 'DMSans_700Bold', fontSize: 16,
    letterSpacing: 1, textTransform: 'uppercase',
  },
})
