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
import { useTheme, brand, font, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import { Star as StarSticker } from './Stickers'
import { useIsDiffuse } from './diffuse/DiffuseKit'
import { HandDrawnBox } from './HandDrawn'
import { useTranslation } from '../../lib/i18n'
import { dateLoc } from '../../lib/kpLocale'

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
  /**
   * If true, renders the spinner directly in the page flow (iOS) instead
   * of behind a tap-to-open trigger button + modal. Used in onboarding
   * date steps where there's room for a full picker.
   *
   * Android still falls back to the trigger+native-dialog pattern because
   * RN's DateTimePicker has no in-page mode on Android.
   */
  inline?: boolean
  /** Where the wheel starts when there's no value yet (defaults to today). */
  defaultDate?: Date
  /**
   * Inline only: shown under the wheel while nothing is picked. The wheel already displays a
   * date before any pick, so a gated Continue needs to say why it waits.
   */
  emptyHint?: string
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
  return d.toLocaleDateString(dateLoc(), {
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
  inline = false,
  emptyHint,
  defaultDate,
}: DatePickerFieldProps) {
  const { colors, isDark } = useTheme()
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const mode = useModeStore((s) => s.mode)
  const [open, setOpen] = useState(false)

  const accent = useMemo(() => {
    if (accentColor) return { fill: accentColor, soft: accentColor }
    return modeAccent(mode, isDark)
  }, [accentColor, mode, isDark])

  const draftInitial = value ? new Date(value) : defaultDate ?? new Date()
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

  // Inline mode (iOS): commit the draft on every wheel change so the
  // continue button enables as soon as the user spins to a date. No
  // trigger button, no modal, no Done button.
  function handleInlineChange(_: DateTimePickerEvent, selectedDate?: Date) {
    if (!selectedDate) return
    setDraft(selectedDate)
    onChange(toISO(selectedDate))
  }

  // Inline render — iOS only. Android falls through to the trigger pattern
  // because there's no in-page DateTimePicker on Android.
  if (inline && Platform.OS === 'ios') {
    const wheel = (
      <DateTimePicker
        value={value ? new Date(value + 'T00:00:00') : draft}
        mode="date"
        display="spinner"
        onChange={handleInlineChange}
        maximumDate={maximumDate}
        minimumDate={minimumDate}
        textColor={isDark ? colors.text : ST_INK}
        accentColor={ST_INK}
        themeVariant={isDark ? 'dark' : 'light'}
        style={{ width: '100%', height: 216 }}
      />
    )
    return (
      <View style={styles.inlineWrap}>
        {label ? (
          <Text style={[styles.inlineLabel, { color: diffuse ? dt.colors.ink3 : colors.text, fontFamily: diffuse ? undefined : font.display }]}>
            {label}
          </Text>
        ) : null}
        {diffuse ? wheel : (
          <HandDrawnBox fill={colors.surface} stroke={colors.text} radius={22} seed="datewheel" style={styles.inlineCard}>
            {wheel}
          </HandDrawnBox>
        )}
        {emptyHint && !value ? (
          <Text style={[styles.emptyHint, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? undefined : font.body }]}>
            {emptyHint}
          </Text>
        ) : null}
      </View>
    )
  }

  // Diffuse — bare underlined field: mono value on a bottom hairline, quiet
  // calendar glyph. No paper fill, no hard shadow. (Modal chrome below is a
  // transient surface and kept as-is.)
  const diffuseTrigger = (
    <Pressable
      onPress={handleOpen}
      style={({ pressed }) => [diffuseStyles.trigger, { borderBottomColor: dt.colors.line2, opacity: pressed ? 0.6 : 1 }]}
    >
      <Text
        style={[
          diffuseStyles.triggerText,
          { color: value ? dt.colors.ink : dt.colors.ink4 },
        ]}
        numberOfLines={1}
      >
        {formatPretty(value, placeholder)}
      </Text>
      <Calendar size={17} color={dt.colors.ink3} strokeWidth={1.6} />
    </Pressable>
  )

  const trigger = diffuse ? diffuseTrigger : (
    <Pressable
      onPress={handleOpen}
      style={({ pressed }) => [
        styles.trigger,
        {
          backgroundColor: colors.surface,
          borderColor: colors.text,
          borderRadius: 14,
          shadowColor: colors.text,
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: pressed ? 0 : 2 },
          opacity: 1,
          transform: [{ translateY: pressed ? 2 : 0 }],
        },
      ]}
    >
      <View style={styles.triggerRow}>
        <View
          style={[
            styles.triggerIcon,
            { backgroundColor: accent.soft, borderColor: colors.text },
          ]}
        >
          <Calendar size={14} color={colors.text} strokeWidth={2.2} />
        </View>
        <Text
          style={[
            styles.triggerText,
            {
              color: value
                ? colors.text
                : colors.textMuted,
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
        diffuse
          ? <Text style={[diffuseStyles.label, { color: dt.colors.ink3 }]}>{label}</Text>
          : <Text style={[styles.label, { color: colors.textMuted, fontFamily: 'SpaceMono_400Regular', letterSpacing: 1.4, textTransform: 'uppercase' }]}>{label}</Text>
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
                ...(diffuse
                  ? null
                  : {
                      backgroundColor: isDark ? colors.surface : colors.bg,
                      borderColor: colors.text,
                      borderTopWidth: 2.5,
                      borderTopLeftRadius: 26,
                      borderTopRightRadius: 26,
                    }),
              },
            ]}
          >
            {/* Star sticker accent — top-right */}
            <View style={styles.starAccent} pointerEvents="none">
              <StarSticker size={64} fill={accent.fill} stroke={ST_INK} />
            </View>

            {/* Drag handle */}
            <View style={[styles.handleBar, { backgroundColor: colors.border }, !diffuse && { backgroundColor: colors.text, opacity: 0.25 }]} />

            {/* Header */}
            <View style={styles.headerRow}>
              <Text
                style={[
                  styles.title,
                  { color: isDark ? colors.text : ST_INK },
                  !diffuse && { color: colors.text, textTransform: 'uppercase', letterSpacing: 0.2 },
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
                    ...(diffuse
                      ? null
                      : { backgroundColor: colors.surface, borderColor: colors.text, borderWidth: 2, width: 34, height: 34, borderRadius: 17, shadowColor: colors.text, shadowOpacity: 0.1 }),
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
                display={Platform.OS === 'ios' ? (diffuse ? 'spinner' : 'inline') : 'default'}
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
                    ...(diffuse
                      ? null
                      : { backgroundColor: colors.text, borderColor: colors.text, borderWidth: 1.5, shadowColor: colors.text, shadowOpacity: 0.1, shadowOffset: { width: 0, height: pressed ? 1 : 2 }, transform: [{ translateY: pressed ? 1 : 0 }] }),
                  },
                ]}
              >
                <Text style={[styles.doneText, !diffuse && { color: colors.bg }]}>{t('common_done')}</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  inlineWrap: {
    width: '100%',
    alignItems: 'center',
  },
  inlineCard: {
    alignSelf: 'stretch',
    height: 232,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyHint: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 14,
  },
  inlineLabel: {
    alignSelf: 'flex-start',
    fontSize: 17,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontFamily: font.bodyBold,
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
    fontFamily: font.bodySemiBold,
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
    fontFamily: font.display,
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
    fontFamily: font.bodyBold,
    fontSize: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
})

const diffuseStyles = StyleSheet.create({
  label: {
    fontFamily: diffuseFont.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderBottomWidth: 1.5,
    paddingHorizontal: 2,
    paddingTop: 10,
    paddingBottom: 12,
  },
  triggerText: {
    flex: 1,
    fontFamily: diffuseFont.display,
    fontSize: 18,
    letterSpacing: -0.2,
  },
})
