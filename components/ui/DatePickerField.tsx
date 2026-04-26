/**
 * DatePickerField — canonical sticker-on-paper date picker (mode-aware).
 *
 * Renders a sticker-styled trigger (cream paper, ink border, hard offset
 * shadow) that opens a bottom-sheet modal containing a star-decorated header,
 * an optional secondary "switch" pill (e.g. start/end), the iOS spinner /
 * Android calendar wheel, and a sticker DONE button.
 *
 * Accent color follows the active journey mode unless `accentColor` is passed:
 *   pre-pregnancy → pink   pregnancy → lavender   kids → powder blue
 *
 * Used everywhere a single date is selected — onboarding (due date, LMP,
 * child DOB), profile editors, and any future log form.
 */

import { useState, useMemo } from 'react'
import {
  View,
  Text,
  Pressable,
  Platform,
  Modal,
  StyleSheet,
} from 'react-native'
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker'
import { X, Calendar } from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import { Star as StarSticker } from './Stickers'

const ST_INK = '#141313'
const ST_PAPER = '#FFFEF8'
const ST_CREAM = '#F7F0DF'

interface DatePickerFieldProps {
  /** Caps-style label rendered above the trigger. Empty string hides it. */
  label: string
  /** ISO YYYY-MM-DD. Empty string = unset. */
  value: string
  onChange: (dateString: string) => void
  placeholder?: string
  maximumDate?: Date
  minimumDate?: Date
  /** Modal title. Defaults to the label or "Select date". */
  modalTitle?: string
  /** Override mode accent (e.g. fixed pink in cycle flow). */
  accentColor?: string
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatPretty(iso: string, placeholder: string): string {
  if (!iso) return placeholder
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Mode → sticker accent (matches StarSticker fills used across the app). */
function modeAccent(mode: string, isDark: boolean): { fill: string; soft: string } {
  if (mode === 'pre-pregnancy')
    return { fill: isDark ? '#EFA2C2' : brand.prePregnancy, soft: '#F7CFDD' }
  if (mode === 'pregnancy')
    return { fill: isDark ? '#C4B5EF' : brand.pregnancy, soft: '#DCD2F2' }
  return { fill: isDark ? '#A5C9F0' : brand.kids, soft: '#CFE0F0' }
}

export default function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'Select a date',
  maximumDate,
  minimumDate,
  modalTitle,
  accentColor,
}: DatePickerFieldProps) {
  const { colors, isDark } = useTheme()
  const mode = useModeStore((s) => s.mode)
  const [open, setOpen] = useState(false)

  const accent = useMemo(() => {
    if (accentColor) return { fill: accentColor, soft: accentColor }
    return modeAccent(mode, isDark)
  }, [accentColor, mode, isDark])

  const draftInitial = value ? new Date(value) : new Date()
  const [draft, setDraft] = useState<Date>(draftInitial)

  function handleOpen() {
    setDraft(value ? new Date(value) : new Date())
    setOpen(true)
  }

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      setOpen(false)
      if (event.type === 'set' && selectedDate) {
        onChange(toISO(selectedDate))
      }
      return
    }
    if (selectedDate) setDraft(selectedDate)
  }

  function handleApply() {
    onChange(toISO(draft))
    setOpen(false)
  }

  const trigger = (
    <Pressable
      onPress={handleOpen}
      style={({ pressed }) => [
        styles.trigger,
        {
          backgroundColor: isDark ? colors.surface : ST_PAPER,
          borderColor: isDark ? colors.text : ST_INK,
          shadowOffset: { width: 0, height: pressed ? 1 : 3 },
          opacity: 1,
          transform: [{ translateY: pressed ? 2 : 0 }],
        },
      ]}
    >
      <View style={styles.triggerRow}>
        <View
          style={[
            styles.triggerIcon,
            { backgroundColor: accent.soft, borderColor: isDark ? colors.text : ST_INK },
          ]}
        >
          <Calendar size={14} color={ST_INK} strokeWidth={2.2} />
        </View>
        <Text
          style={[
            styles.triggerText,
            {
              color: value
                ? isDark
                  ? colors.text
                  : ST_INK
                : isDark
                ? colors.textMuted
                : '#8A8480',
            },
          ]}
          numberOfLines={1}
        >
          {formatPretty(value, placeholder)}
        </Text>
      </View>
    </Pressable>
  )

  return (
    <View>
      {label ? (
        <Text style={[styles.label, { color: isDark ? colors.textMuted : '#6E6763' }]}>{label}</Text>
      ) : null}
      {trigger}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
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
            {/* Star sticker accent — top-right */}
            <View style={styles.starAccent} pointerEvents="none">
              <StarSticker size={64} fill={accent.fill} stroke={ST_INK} />
            </View>

            {/* Drag handle */}
            <View style={[styles.handleBar, { backgroundColor: isDark ? colors.border : '#14131340' }]} />

            {/* Header */}
            <View style={styles.headerRow}>
              <Text
                style={[
                  styles.title,
                  { color: isDark ? colors.text : ST_INK },
                ]}
              >
                {modalTitle || label || 'Select date'}
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
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

            {/* Spinner */}
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={draft}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleChange}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                textColor={isDark ? colors.text : ST_INK}
                accentColor={ST_INK}
                themeVariant={isDark ? 'dark' : 'light'}
                style={{ width: '100%' }}
              />
            </View>

            {/* Done sticker button (iOS only — Android dismisses on pick) */}
            {Platform.OS === 'ios' && (
              <Pressable
                onPress={handleApply}
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
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  trigger: {
    borderWidth: 1.5,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: ST_INK,
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  triggerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Fraunces_600SemiBold',
    letterSpacing: -0.2,
  },

  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
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
  starAccent: {
    position: 'absolute',
    top: -8,
    right: 12,
    opacity: 0.6,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    letterSpacing: -0.5,
    fontFamily: 'Fraunces_600SemiBold',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ST_INK,
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  pickerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    height: 60,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ST_INK,
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  doneText: {
    color: ST_INK,
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
})
