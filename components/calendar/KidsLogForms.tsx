/**
 * Kids Log Forms — 5 bottom sheet forms for child activity tracking.
 *
 * Forms: Feeding/Food (complex), Sleep, Health Event, Mood, Memory
 * Persist to Supabase child_logs table.
 */

import { useState, useMemo, useEffect, useRef, useCallback, type ReactElement, type ReactNode, type ComponentProps } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Alert,
  Modal,
  ScrollView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Vibration,
  AppState,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import {
  Utensils,
  Moon,
  Smile,
  Frown,
  Meh,
  Laugh,
  Zap,
  Camera,
  Plus,
  Check,
  Baby,
  AlertTriangle,
  CalendarDays,
  Clock,
  Dumbbell,
  Repeat,
  MinusCircle,
  Sparkles,
  ScanLine,
  X,
} from 'lucide-react-native'
import { useTheme, brand, stickers as stickerPalette, font, useDiffuseTheme, diffuseFont, getModeField, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse, DiffuseArrow } from '../ui/diffuse/DiffuseKit'
import { useTranslation } from '../../lib/i18n'
import type { TranslationKeys } from '../../lib/i18n/keys'
type TranslationKey = keyof TranslationKeys
import { Character } from '../characters/Characters'
import { Heart as HeartSticker, Moon as MoonSticker, Flower, Drop, Star } from '../stickers/BrandStickers'
import { Smiley, Sleepy, Sad } from '../ui/Stickers'
import { ChildPill, childColor } from '../ui/ChildPills'
import { useChildStore } from '../../store/useChildStore'
import { useModeStore } from '../../store/useModeStore'
import { supabase } from '../../lib/supabase'
import { invalidateKidsLogQueries } from '../../lib/queryClient'
import { ChoiceStep, MoreSection, ActiveChildChip, type ChoiceOption } from './QuickLogKit'
import { StepSlider } from '../ui/StepSlider'
import { diffuseLogHue } from './DiffuseLogTimeline'
import { estimateCalories, matchSingleTag, categoryColor } from '../../lib/foodCalories'
import type { CalorieMatch } from '../../lib/foodCalories'
import { estimateFromText, estimateFromImage, type AiFoodItem } from '../../lib/foodAi'
import type { ChildWithRole } from '../../types'

// ─── Kids-mode accent palette (cream-paper redesign) ─────────────────────
// Log sheets are always "kids mode" — powder blue accent, ink text on cream.

const ACCENT = brand.kids            // #8BB8E8 powder blue
const ACCENT_SOFT = brand.kidsSoft   // #D4E3F3
const INK = '#141313'

// Bottle amount slider range (ml) — covers a single-feed span from a token
// sip to a large toddler bottle. Stored value is unaffected by this range;
// it only bounds/steps what the slider can express.
const BOTTLE_AMOUNT_MIN = 0
const BOTTLE_AMOUNT_MAX = 300

// ─── FormHeaderSticker — decorative per-form accent shown under the title ─
// Each log form gets its own hand-drawn sticker so the sheet reads as a
// purpose-built page rather than a generic input.

type FormKind = 'feeding' | 'sleep' | 'health' | 'mood' | 'memory' | 'activity' | 'diaper' | 'wakeup'

function FormHeaderSticker({ kind }: { kind: FormKind }) {
  const { t } = useTranslation()
  // Sticker + pastel chip color per form
  const map: Record<FormKind, { node: ReactElement; bg: string; label: string }> = {
    feeding: { node: <Drop size={28} fill={stickerPalette.peach} />,  bg: stickerPalette.peachSoft, label: t('kids_logForm_labelFeeding') },
    sleep:   { node: <MoonSticker size={28} fill={stickerPalette.lilac} />,   bg: stickerPalette.blueSoft,  label: t('kids_logForm_labelSleep') },
    health:  { node: <HeartSticker size={28} fill={stickerPalette.pink} />,   bg: stickerPalette.pinkSoft,  label: t('kids_logForm_labelHealth') },
    mood:    { node: <Flower size={28} petal={stickerPalette.lilac} center={stickerPalette.yellow} />,  bg: stickerPalette.lilacSoft, label: t('kids_logForm_labelMood') },
    memory:  { node: <HeartSticker size={28} fill={stickerPalette.coral} />,  bg: stickerPalette.peachSoft, label: t('kids_logForm_labelMemory') },
    activity:{ node: <Star size={28} fill={stickerPalette.yellow} />,   bg: stickerPalette.yellowSoft,label: t('kids_logForm_labelActivity') },
    diaper:  { node: <Drop size={28} fill={stickerPalette.blue} />,     bg: stickerPalette.blueSoft,  label: t('kids_logForm_labelDiaper') },
    wakeup:  { node: <Star size={28} fill={stickerPalette.yellow} />,   bg: stickerPalette.yellowSoft,label: t('kids_logForm_labelWakeUp') },
  }
  const m = map[kind]
  return (
    <View style={formHeaderStickerStyles.wrap}>
      <View style={[formHeaderStickerStyles.chip, { backgroundColor: m.bg }]}>
        {m.node}
        <Text style={formHeaderStickerStyles.label}>{m.label}</Text>
      </View>
    </View>
  )
}

const formHeaderStickerStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', marginBottom: -4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: INK,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  label: {
    fontFamily: font.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: INK,
  },
})

// ═══════════════════════════════════════════════════════════════════════════
// DIFFUSE (v3) form controls — flag-gated helpers
// ═══════════════════════════════════════════════════════════════════════════
// Reusable Diffuse building blocks used across every form's Diffuse branch.
// Token-driven (useDiffuseTheme / diffuseFont / getModeField). Hairlines over
// boxes, containerless actions, mono labels + serif titles. Sticker icons pass
// straight through — they stay the icon system, placed over hairline circles
// instead of filled tiles. These render only inside `useIsDiffuse()` branches.

const df = StyleSheet.create({
  form: { gap: 20, paddingBottom: 8 },
  topRow: { gap: 12 },
  dateTimeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // hairline mono pill (date / time / child / small selection)
  pill: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1,
  },
  pillLabel: { fontFamily: diffuseFont.mono, fontSize: 9.5, letterSpacing: 1.4, textTransform: 'uppercase' },
  pillValue: { fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 0.6 },
  // section eyebrow (mono caps)
  eyebrow: { fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  // header row: sticker over hairline circle + serif title
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: -2, marginBottom: 2 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: diffuseFont.display, fontSize: 24, letterSpacing: -0.5 },
  // hairline mono chip (multi/single select)
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 999, borderWidth: 1,
  },
  chipText: { fontFamily: diffuseFont.mono, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  chipTextOn: { fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  // bare underlined field
  fieldWrap: { gap: 6 },
  fieldLabel: { fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  field: {
    backgroundColor: 'transparent', borderBottomWidth: 1.5, paddingHorizontal: 2, paddingVertical: 8,
    fontFamily: diffuseFont.body, fontSize: 16,
  },
  // segmented (hairline mono pills, single-select, evenly spaced)
  segRow: { flexDirection: 'row', gap: 8 },
  segPill: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 999, borderWidth: 1 },
  // mood face over hairline circle
  moodRow: { flexDirection: 'row', gap: 8 },
  moodBtn: { flex: 1, alignItems: 'center', gap: 6 },
  moodCircle: { width: 62, height: 62, borderRadius: 31, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  moodLabel: { fontFamily: diffuseFont.mono, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' },
  // eat-quality: sticker over hairline circle + mono label
  qualityRow: { flexDirection: 'row', gap: 8 },
  qualityBtn: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 4 },
  qualityCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qualityLabel: { fontFamily: diffuseFont.mono, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', textAlign: 'center' },
  // hairline info banner (duration / sleep session)
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 4, borderTopWidth: 1, borderBottomWidth: 1 },
  bannerLabel: { flex: 1, fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  bannerValue: { fontFamily: diffuseFont.display, fontSize: 22, letterSpacing: -0.5 },
  // switch-style routine row
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1 },
  switchLabel: { flex: 1, fontFamily: diffuseFont.mono, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  switchTrack: { width: 46, height: 26, borderRadius: 999, borderWidth: 1.5, justifyContent: 'center', padding: 3 },
  switchKnob: { width: 17, height: 17, borderRadius: 9, borderWidth: 1.5 },
  daysRow: { flexDirection: 'row', gap: 6, justifyContent: 'space-between', marginTop: 12 },
  dayChip: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dayText: { fontFamily: diffuseFont.mono, fontSize: 12, letterSpacing: 0.5 },
  // containerless save CTA (mono caps + arrow on a top hairline rule)
  saveCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, paddingHorizontal: 2, borderTopWidth: 1 },
  saveCtaLabel: { fontFamily: diffuseFont.monoBold, fontSize: 13, letterSpacing: 2.4, textTransform: 'uppercase' },
  txtlink: { paddingVertical: 14, alignItems: 'center' },
  txtlinkText: { fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
  // photo thumb + hairline add tiles
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: 72, height: 72, borderRadius: 20 },
  photoDelete: { position: 'absolute', top: -6, right: -6, borderRadius: 999, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  photoButtons: { flexDirection: 'row', gap: 8 },
  photoTile: { width: 72, height: 72, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
})

/** Diffuse header — intentionally renders nothing.
 *  The enclosing LogSheet already shows the "Log <Kind>" title, so a second
 *  big title + sticker here was a pure duplication. Kept as a no-op so the
 *  call sites don't need to change. */
function DiffuseFormHeader(_props: { kind: FormKind }) {
  return null
}

/** Diffuse hairline mono chip (single/multi-select). Active = hairline border
 *  + ink + soft color bloom of the chip's hue. */
function DiffuseChip({
  label,
  active,
  onPress,
  leading,
  hue,
}: {
  label: string
  active: boolean
  onPress: () => void
  leading?: ReactNode
  hue?: string
}) {
  const { colors } = useDiffuseTheme()
  // Soft-tint active state: faint hue wash + a hue-colored hairline. When no hue
  // is supplied the chip keeps its neutral (surface + hairline) active look.
  const activeBorder = hue ? hue + '99' : colors.hairline
  const activeBg = hue ? hue + '26' : colors.surface
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        df.chip,
        {
          borderColor: active ? activeBorder : colors.line,
          backgroundColor: active ? activeBg : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {leading}
      <Text style={[active ? df.chipTextOn : df.chipText, { color: active ? colors.ink : colors.ink3 }]}>{label}</Text>
    </Pressable>
  )
}

/** Meal-moment → sticker hue. Warm dawn → cool night, so the meal-time row
 *  reads as a soft spectrum across the day. */
const MEAL_HUE: Record<MealMoment, keyof typeof stickerPalette> = {
  breakfast: 'peach',
  morning_snack: 'yellow',
  lunch: 'green',
  afternoon_snack: 'blue',
  dinner: 'lilac',
  night_snack: 'coral',
}

/** Ordered soft-hue cycle for enum chip groups with no intrinsic color
 *  (sleep quality, event type, activity, consistency). Each option in a row
 *  gets a distinct sticker hue by its index so the row reads as a soft
 *  spectrum. Pull the actual value via useDiffuseTheme().stickers[key]. */
const CHIP_HUE_CYCLE: (keyof typeof stickerPalette)[] = ['green', 'blue', 'lilac', 'peach', 'yellow', 'pink', 'coral']
const chipHueAt = (dt: ReturnType<typeof useDiffuseTheme>, i: number) =>
  dt.stickers[CHIP_HUE_CYCLE[i % CHIP_HUE_CYCLE.length]]

/** Diffuse bare underlined field with a mono uppercase label above. */
function DiffuseField({
  label,
  ...inputProps
}: { label?: string } & ComponentProps<typeof TextInput>) {
  const { colors } = useDiffuseTheme()
  return (
    <View style={df.fieldWrap}>
      {label ? <Text style={[df.fieldLabel, { color: colors.ink3 }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.ink4}
        {...inputProps}
        style={[df.field, { color: colors.ink, borderBottomColor: colors.line2 }, inputProps.style]}
      />
    </View>
  )
}

/** Diffuse switch — hairline track + knob. On = hairline border + ink knob. */
function DiffuseSwitch({ on, accent }: { on: boolean; accent: string }) {
  const { colors } = useDiffuseTheme()
  return (
    <View style={[df.switchTrack, { borderColor: on ? colors.hairline : colors.line2, alignItems: on ? 'flex-end' : 'flex-start' }]}>
      <View style={[df.switchKnob, { borderColor: on ? colors.ink : colors.line2, backgroundColor: on ? accent + '55' : 'transparent' }]} />
    </View>
  )
}

/** Diffuse photo row — thumbnails (hairline framed) + hairline camera / gallery
 *  add tiles. Sticker/lucide glyphs stay; the filled tiles become hairline. */
function DiffusePhotoRow({
  photos,
  onRemove,
  onCamera,
  onGallery,
  max = 4,
}: {
  photos: string[]
  onRemove: (i: number) => void
  onCamera: () => void
  onGallery: () => void
  max?: number
}) {
  const { colors } = useDiffuseTheme()
  return (
    <View style={df.photoRow}>
      {photos.map((uri, i) => (
        <View key={i} style={{ position: 'relative' }}>
          <Image source={{ uri }} style={[df.photoThumb, { borderWidth: 1, borderColor: colors.line2 }]} />
          <Pressable onPress={() => onRemove(i)} style={[df.photoDelete, { backgroundColor: colors.ink }]} hitSlop={4}>
            <X size={13} color={colors.bg} strokeWidth={3} />
          </Pressable>
        </View>
      ))}
      {photos.length < max && (
        <View style={df.photoButtons}>
          <Pressable onPress={onCamera} style={[df.photoTile, { borderColor: colors.line2 }]}>
            <Camera size={22} color={colors.ink3} strokeWidth={2} />
          </Pressable>
          <Pressable onPress={onGallery} style={[df.photoTile, { borderColor: colors.line, borderStyle: 'dashed' }]}>
            <Plus size={20} color={colors.ink3} strokeWidth={2} />
          </Pressable>
        </View>
      )}
    </View>
  )
}

// ─── Routine Prefill type ─────────────────────────────────────────────────

export interface RoutinePrefill {
  routineId?: string
  childId: string
  time?: string   // 'HH:MM'
  value?: string  // JSON string matching the routine's stored value
  name?: string
}

// ─── Edit Log type (minimal shape for editing an existing child_log) ──────

export interface EditLog {
  id: string
  child_id: string
  date: string
  type: string
  value: string | null
  notes: string | null
  photos: string[]
}

// ─── Routine tag helper ────────────────────────────────────────────────────
// Stamps routineId/routineName onto a JSON value string so the log carries
// identity back to the routine that produced it. Enables reliable dedup in the
// calendar and lets logged cards display the routine name (e.g. "Breakfast")
// instead of the generic log-type label (e.g. "Food").
function tagWithRoutine(value: string | undefined, prefill?: RoutinePrefill): string | undefined {
  if (!prefill?.routineId) return value
  try {
    const obj = value ? JSON.parse(value) : {}
    if (typeof obj !== 'object' || obj === null) return value
    return JSON.stringify({ ...obj, routineId: prefill.routineId, routineName: prefill.name ?? undefined })
  } catch {
    return value
  }
}

// ─── Stabilise a picked image ─────────────────────────────────────────────
// iOS image picker URIs (ph://) can become unreadable once the picker closes.
// Run the image through expo-image-manipulator immediately to copy it to a
// stable file:// path and compress to < 1 MB (per project rules).

async function stabiliseUri(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    )
    return result.uri
  } catch {
    // If manipulate fails, return original and let upload handle it
    return uri
  }
}

// ─── Photo upload helper ───────────────────────────────────────────────────

/**
 * Generates an unguessable URL-safe token using a 36-char alphabet.
 * 22 chars ≈ 113 bits, well above what a public-bucket policy needs.
 */
function randomToken(len: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

/**
 * Upload photos to storage. Returns the successfully-uploaded URLs and a
 * count of failed uploads so callers can decide what to do (warn the user,
 * block the save, etc.). Previously this swallowed all failures silently.
 */
async function uploadPhotos(childId: string, uris: string[]): Promise<{ urls: string[]; failed: number }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || !childId || uris.length === 0) return { urls: [], failed: 0 }

  // Child health-log photos go to the PRIVATE child-photos bucket, keyed by
  // {childId}/ so storage RLS scopes them to the parent + accepted caregivers
  // of that child. We store the storage PATH (signed at read time), not a
  // public URL. Returned values are paths — `urls` name kept for caller parity.
  const urls: string[] = []
  let failed = 0
  for (const uri of uris) {
    try {
      const token = `${Date.now().toString(36)}_${randomToken(22)}`
      const path = `${childId}/${token}.jpg`
      const formData = new FormData()
      formData.append('', { uri, name: path.split('/').pop(), type: 'image/jpeg' } as any)
      const { error } = await supabase.storage
        .from('child-photos')
        .upload(path, formData, { contentType: 'multipart/form-data', upsert: true })
      if (!error) {
        urls.push(path)
      } else {
        failed += 1
      }
    } catch {
      failed += 1
    }
  }
  return { urls, failed }
}

// ─── Safe camera launcher ─────────────────────────────────────────────────

async function launchCameraSafe(t: (key: TranslationKey) => string): Promise<string | null> {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert(t('kids_logForm_alertPermNeeded'), t('kids_logForm_alertCameraAccess'))
      return null
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 })
    if (!result.canceled && result.assets[0]) {
      return stabiliseUri(result.assets[0].uri)
    }
  } catch {
    Alert.alert(t('kids_logForm_alertCameraUnavail'), t('kids_logForm_alertCameraUnavailMsg'))
  }
  return null
}

// ─── Shared save helper ────────────────────────────────────────────────────

export async function saveChildLog(
  childId: string,
  type: string,
  value?: string,
  notes?: string,
  photos?: string[],
  date?: string
) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data: child } = await supabase
    .from('children')
    .select('parent_id')
    .eq('id', childId)
    .single()

  const { error } = await supabase.from('child_logs').insert({
    child_id: childId,
    user_id: child?.parent_id ?? session.user.id,
    date: date ?? toDateStr(new Date()),
    type,
    value: value ?? null,
    notes: notes ?? null,
    photos: photos ?? [],
    logged_by: session.user.id,
  })
  if (error) throw error
  // Refresh home + calendar + analytics that read child_logs.
  await invalidateKidsLogQueries()
}

export async function updateChildLog(
  id: string,
  value?: string | null,
  notes?: string | null,
  photos?: string[],
  date?: string,
) {
  const { error } = await supabase
    .from('child_logs')
    .update({
      value: value ?? null,
      notes: notes ?? null,
      ...(photos ? { photos } : {}),
      ...(date ? { date } : {}),
    })
    .eq('id', id)
  if (error) throw error
  await invalidateKidsLogQueries()
}

// ─── Save as Routine helper ────────────────────────────────────────────────

export async function saveAsRoutine(
  childId: string,
  type: string,
  name: string,
  value: string | null,
  time: string | null,
  daysOfWeek: number[] = [0, 1, 2, 3, 4, 5, 6],
) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  await supabase.from('child_routines').insert({
    child_id: childId,
    user_id: session.user.id,
    type,
    name,
    value,
    time,
    days_of_week: daysOfWeek,
    active: true,
  })
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function RoutineToggle({
  enabled,
  onToggle,
  days,
  onDaysChange,
  locked,
}: {
  enabled: boolean
  onToggle: (v: boolean) => void
  days: number[]
  onDaysChange: (d: number[]) => void
  locked?: boolean
}) {
  const diffuse = useIsDiffuse()
  const { colors, radius, isDark } = useTheme()
  const { t } = useTranslation()
  const accentText = isDark ? colors.text : INK

  if (diffuse) {
    return <DiffuseRoutineToggle enabled={enabled} onToggle={onToggle} days={days} onDaysChange={onDaysChange} locked={locked} />
  }

  if (locked) {
    return (
      <View style={[routineStyles.toggleRow, { backgroundColor: ACCENT_SOFT, borderColor: ACCENT + '66', borderRadius: radius.lg }]}>
        <Repeat size={16} color={ACCENT} strokeWidth={2} />
        <Text style={[routineStyles.toggleText, { color: accentText }]}>{t('kids_logForm_alreadyRoutine')}</Text>
        <Check size={16} color={ACCENT} strokeWidth={2.5} />
      </View>
    )
  }
  return (
    <View style={routineStyles.wrap}>
      <Pressable
        onPress={() => onToggle(!enabled)}
        style={[
          routineStyles.toggleRow,
          {
            backgroundColor: enabled ? ACCENT_SOFT : colors.surface,
            borderColor: enabled ? ACCENT + '66' : (isDark ? colors.border : INK),
            borderRadius: radius.lg,
          },
        ]}
      >
        <Repeat size={16} color={enabled ? ACCENT : colors.textMuted} strokeWidth={2} />
        <Text style={[routineStyles.toggleText, { color: enabled ? accentText : colors.textSecondary }]}>
          {t('kids_logForm_saveAsRoutine')}
        </Text>
        <View
          style={[
            routineStyles.toggleSwitch,
            {
              backgroundColor: enabled ? ACCENT : (isDark ? colors.border : INK),
              borderRadius: 10,
            },
          ]}
        >
          <View
            style={[
              routineStyles.toggleKnob,
              { transform: [{ translateX: enabled ? 14 : 0 }] },
            ]}
          />
        </View>
      </Pressable>
      {enabled && (
        <View style={routineStyles.daysRow}>
          {DAY_LABELS.map((label, i) => {
            const active = days.includes(i)
            return (
              <Pressable
                key={i}
                onPress={() =>
                  onDaysChange(active ? days.filter((d) => d !== i) : [...days, i].sort())
                }
                style={[
                  routineStyles.dayChip,
                  {
                    backgroundColor: active ? ACCENT : 'transparent',
                    borderColor: active ? ACCENT : (isDark ? colors.border : INK),
                    borderRadius: radius.full,
                  },
                ]}
              >
                <Text style={[routineStyles.dayText, { color: active ? INK : colors.textMuted }]}>
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
  )
}

const routineStyles = StyleSheet.create({
  wrap: { gap: 8 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1.5,
    shadowColor: INK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 1,
  },
  toggleText: { flex: 1, fontSize: 14, fontFamily: font.bodySemiBold },
  toggleSwitch: { width: 34, height: 20, padding: 3, justifyContent: 'center' },
  toggleKnob: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFF' },
  daysRow: { flexDirection: 'row', gap: 6, justifyContent: 'space-between', paddingHorizontal: 4 },
  dayChip: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
    shadowColor: INK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 1,
  },
  dayText: { fontSize: 12, fontFamily: font.bodySemiBold },
})

// ─── Diffuse Routine Toggle ────────────────────────────────────────────────

function DiffuseRoutineToggle({
  enabled,
  onToggle,
  days,
  onDaysChange,
  locked,
}: {
  enabled: boolean
  onToggle: (v: boolean) => void
  days: number[]
  onDaysChange: (d: number[]) => void
  locked?: boolean
}) {
  const { colors, isDark } = useDiffuseTheme()
  const { t } = useTranslation()
  const mode = useModeStore((s) => s.mode)
  const accent = getDiffuseAccent(mode, isDark)

  if (locked) {
    return (
      <View style={[df.switchRow, { borderColor: colors.line }]}>
        <Repeat size={15} color={colors.ink3} strokeWidth={2} />
        <Text style={[df.switchLabel, { color: colors.ink2 }]}>{t('kids_logForm_alreadyRoutine')}</Text>
        <Check size={16} color={colors.ink} strokeWidth={2.5} />
      </View>
    )
  }
  return (
    <View>
      <Pressable onPress={() => onToggle(!enabled)} style={[df.switchRow, { borderColor: colors.line }]}>
        <Repeat size={15} color={enabled ? colors.ink : colors.ink3} strokeWidth={2} />
        <Text style={[df.switchLabel, { color: enabled ? colors.ink : colors.ink3 }]}>
          {t('kids_logForm_saveAsRoutine')}
        </Text>
        <DiffuseSwitch on={enabled} accent={accent} />
      </Pressable>
      {enabled && (
        <View style={df.daysRow}>
          {DAY_LABELS.map((label, i) => {
            const active = days.includes(i)
            return (
              <Pressable
                key={i}
                onPress={() => onDaysChange(active ? days.filter((d) => d !== i) : [...days, i].sort())}
                style={[df.dayChip, { borderColor: active ? colors.hairline : colors.line, backgroundColor: active ? accent + '22' : 'transparent' }]}
              >
                <Text style={[df.dayText, { color: active ? colors.ink : colors.ink3, fontFamily: active ? diffuseFont.monoBold : diffuseFont.mono }]}>
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
  )
}

// ─── Child Selector (shared) ───────────────────────────────────────────────

function ChildSelector({
  selected,
  onSelect,
}: {
  selected: string | null
  onSelect: (id: string) => void
}) {
  const diffuse = useIsDiffuse()
  const children = useChildStore((s) => s.children)
  const { colors } = useTheme()
  const dTheme = useDiffuseTheme()
  const { t } = useTranslation()

  if (children.length <= 1) return null

  const needsSelection = !selected

  if (diffuse) {
    return (
      <View style={df.fieldWrap}>
        <Text style={[df.eyebrow, { color: needsSelection ? dTheme.colors.warning : dTheme.colors.ink3 }]}>
          {t('kids_logForm_selectChild')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 6 }}>
          {children.map((c) => (
            <DiffuseChip key={c.id} label={c.name} active={selected === c.id} onPress={() => onSelect(c.id)} />
          ))}
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.childSelectorWrap}>
      {needsSelection && (
        <Text style={[styles.childSelectorPrompt, { color: colors.warning }]}>
          {t('kids_logForm_selectChild')}
        </Text>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childRow}>
        {children.map((c, idx) => (
          <ChildPill
            key={c.id}
            label={c.name}
            active={selected === c.id}
            color={childColor(idx)}
            onPress={() => onSelect(c.id)}
          />
        ))}
      </ScrollView>
    </View>
  )
}

// ─── Date Picker Chip (shared) ────────────────────────────────────────────

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateLabel(dateStr: string, t: (key: TranslationKey) => string): string {
  const today = toDateStr(new Date())
  if (dateStr === today) return t('common_today')
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateStr === toDateStr(yesterday)) return t('common_yesterday')
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function DateChip({
  value,
  onChange,
}: {
  value: string
  onChange: (dateStr: string) => void
}) {
  const diffuse = useIsDiffuse()
  const { colors, radius, isDark } = useTheme()
  const dTheme = useDiffuseTheme()
  const { t } = useTranslation()
  const [showPicker, setShowPicker] = useState(false)
  const [tempDate, setTempDate] = useState(value)

  function openPicker() {
    setTempDate(value)
    setShowPicker(true)
  }

  function confirmDate() {
    onChange(tempDate)
    setShowPicker(false)
  }

  const inkText = diffuse ? dTheme.colors.ink : (isDark ? colors.text : INK)
  const pickerBg = diffuse ? dTheme.colors.surface : colors.surface
  const pickerBorder = diffuse ? dTheme.colors.line2 : (isDark ? colors.border : INK)
  return (
    <View>
      <Pressable
        onPress={openPicker}
        style={diffuse
          ? [df.pill, { borderColor: dTheme.colors.line, backgroundColor: 'transparent' }]
          : [styles.dateChip, { backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: radius.full }]}
      >
        <CalendarDays size={14} color={inkText} strokeWidth={2} />
        <Text style={diffuse ? [df.pillValue, { color: inkText }] : [styles.dateChipText, { color: inkText }]}>
          {formatDateLabel(value, t)}
        </Text>
      </Pressable>
      {showPicker && (
        <View style={diffuse
          ? [styles.datePickerWrap, { backgroundColor: pickerBg, borderColor: pickerBorder, borderRadius: 20 }]
          : [styles.datePickerWrap, { backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg }]}>
          <DateTimePicker
            value={new Date((showPicker ? tempDate : value) + 'T12:00:00')}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            themeVariant={(diffuse ? dTheme.isDark : isDark) ? 'dark' : 'light'}
            onChange={(e, d) => {
              if (Platform.OS === 'android') {
                setShowPicker(false)
                if (e.type === 'set' && d) onChange(toDateStr(d))
              } else {
                if (d) setTempDate(toDateStr(d))
              }
              if (e.type === 'dismissed') setShowPicker(false)
            }}
          />
          {Platform.OS === 'ios' && (
            <Pressable onPress={confirmDate} style={[styles.datePickerDone, { borderColor: pickerBorder }]}>
              <Text style={diffuse
                ? [df.pillValue, { color: dTheme.colors.ink, letterSpacing: 2, textTransform: 'uppercase' }]
                : [styles.datePickerDoneText, { color: colors.primary }]}>{t('common_done')}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  )
}

// ─── Time Picker Chip (shared) ────────────────────────────────────────────

function toTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatTimeLabel(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function TimeChip({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (timeStr: string) => void
  label: string
}) {
  const diffuse = useIsDiffuse()
  const { colors, radius, isDark } = useTheme()
  const dTheme = useDiffuseTheme()
  const { t } = useTranslation()
  const [showPicker, setShowPicker] = useState(false)
  // Local temp value so iOS spinner doesn't fight with parent state
  const [tempTime, setTempTime] = useState(value)

  function openPicker() {
    setTempTime(value)
    setShowPicker(true)
  }

  function confirmTime() {
    onChange(tempTime)
    setShowPicker(false)
  }

  const dateVal = useMemo(() => {
    const d = new Date()
    const [h, m] = (showPicker ? tempTime : value).split(':').map(Number)
    d.setHours(h, m, 0, 0)
    return d
  }, [showPicker ? tempTime : value])

  const inkText = diffuse ? dTheme.colors.ink : (isDark ? colors.text : INK)
  const pickerBg = diffuse ? dTheme.colors.surface : colors.surface
  const pickerBorder = diffuse ? dTheme.colors.line2 : (isDark ? colors.border : INK)
  return (
    <View>
      <Pressable
        onPress={openPicker}
        style={diffuse
          ? [df.pill, { borderColor: dTheme.colors.line, backgroundColor: 'transparent' }]
          : [styles.timeChip, { backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: radius.full }]}
      >
        <Clock size={12} color={diffuse ? dTheme.colors.ink3 : inkText} strokeWidth={2} />
        <Text style={diffuse ? [df.pillLabel, { color: dTheme.colors.ink3 }] : [styles.timeChipLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={diffuse ? [df.pillValue, { color: inkText }] : [styles.timeChipValue, { color: inkText }]}>{formatTimeLabel(value)}</Text>
      </Pressable>
      {showPicker && (
        <View style={diffuse
          ? [styles.datePickerWrap, { backgroundColor: pickerBg, borderColor: pickerBorder, borderRadius: 20 }]
          : [styles.datePickerWrap, { backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg }]}>
          <DateTimePicker
            value={dateVal}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant={(diffuse ? dTheme.isDark : isDark) ? 'dark' : 'light'}
            minuteInterval={5}
            onChange={(e, d) => {
              if (Platform.OS === 'android') {
                setShowPicker(false)
                if (e.type === 'set' && d) onChange(toTimeStr(d))
              } else {
                // iOS: just update local temp, don't commit yet
                if (d) setTempTime(toTimeStr(d))
              }
              if (e.type === 'dismissed') setShowPicker(false)
            }}
          />
          {Platform.OS === 'ios' && (
            <Pressable onPress={confirmTime} style={[styles.datePickerDone, { borderColor: pickerBorder }]}>
              <Text style={diffuse
                ? [df.pillValue, { color: dTheme.colors.ink, letterSpacing: 2, textTransform: 'uppercase' }]
                : [styles.datePickerDoneText, { color: colors.primary }]}>{t('common_done')}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  )
}

// ─── Duration calculator from start/end time ──────────────────────────────

/**
 * Format a duration between two HH:MM time strings.
 *
 * `allowOvernight: true` (sleep) wraps an end-before-start pair around
 * midnight (22:00 → 06:00 = 8h). `allowOvernight: false` (activity) treats
 * the same pair as a user error and returns '' so the UI surfaces no
 * duration rather than silently saving a 23h "playtime" entry.
 */
function calcDuration(start: string, end: string, allowOvernight = true): string {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => !Number.isFinite(n))) return ''
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins === 0) return ''
  if (mins < 0) {
    if (!allowOvernight) return ''
    mins += 24 * 60
  }
  if (mins >= 60) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${mins}m`
}

// ─── 1. FEEDING / FOOD LOG FORM ────────────────────────────────────────────

type FeedingType = 'breast' | 'bottle' | 'solids'
type MealMoment = 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'night_snack'
type EatQuality = 'ate_well' | 'ate_little' | 'did_not_eat'

const MEAL_MOMENT_DEFS: { id: MealMoment; labelKey: TranslationKey }[] = [
  { id: 'breakfast', labelKey: 'kids_logForm_mealBreakfast' },
  { id: 'morning_snack', labelKey: 'kids_logForm_mealAmSnack' },
  { id: 'lunch', labelKey: 'kids_logForm_mealLunch' },
  { id: 'afternoon_snack', labelKey: 'kids_logForm_mealPmSnack' },
  { id: 'dinner', labelKey: 'kids_logForm_mealDinner' },
  { id: 'night_snack', labelKey: 'kids_logForm_mealNight' },
]

const EAT_QUALITY_DEFS: { id: EatQuality; labelKey: TranslationKey; sticker: 'smiley' | 'sleepy' | 'sad' }[] = [
  { id: 'ate_well', labelKey: 'kids_logForm_ateWell', sticker: 'smiley' },
  { id: 'ate_little', labelKey: 'kids_logForm_ateLittle', sticker: 'sleepy' },
  { id: 'did_not_eat', labelKey: 'kids_logForm_didNotEat', sticker: 'sad' },
]

export function FeedingForm({ onSaved, initialDate, prefill, onSkip, editLog }: { onSaved: () => void; initialDate?: string; prefill?: RoutinePrefill; onSkip?: () => void; editLog?: EditLog }) {
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  const { colors, radius, isDark } = useTheme()
  const dTheme = useDiffuseTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const sliderColor = diffuse ? diffuseLogHue('feeding') : ACCENT
  const MEAL_MOMENTS = MEAL_MOMENT_DEFS.map((d) => ({ ...d, label: t(d.labelKey) }))
  const EAT_QUALITIES = EAT_QUALITY_DEFS.map((d) => ({ ...d, label: t(d.labelKey) }))

  const [childId, setChildId] = useState(prefill?.childId ?? editLog?.child_id ?? activeChild?.id ?? children[0]?.id ?? '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  // Seed startTime directly from prefill so the activity time is the routine's time, not "now"
  const [startTime, setStartTime] = useState(() => prefill?.time ?? toTimeStr(new Date()))
  const [feedType, setFeedType] = useState<FeedingType>('solids')
  const [meal, setMeal] = useState<MealMoment | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [foodTags, setFoodTags] = useState<{ name: string; match: CalorieMatch | null; manualCals: number | null }[]>([])
  const [foodInput, setFoodInput] = useState('')
  const [manualCalIdx, setManualCalIdx] = useState<number | null>(null)
  const [manualCalInput, setManualCalInput] = useState('')
  const [quality, setQuality] = useState<EatQuality | null>(null)
  const [isNewFood, setIsNewFood] = useState(false)
  const [newFoodName, setNewFoodName] = useState('')
  const [hasReaction, setHasReaction] = useState(false)
  const [reactionFood, setReactionFood] = useState('')
  const [reactionDesc, setReactionDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [routineEnabled, setRoutineEnabled] = useState(false)
  const [routineDays, setRoutineDays] = useState([0, 1, 2, 3, 4, 5, 6])

  // Breast fields
  const [duration, setDuration] = useState('')
  const [breastSide, setBreastSide] = useState<'left' | 'right' | 'both' | null>(null)
  const [lastSide, setLastSide] = useState<string | null>(null)
  const [lastSideLoading, setLastSideLoading] = useState(false)

  // Live timer state
  const [timerActive, setTimerActive] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerSide, setTimerSide] = useState<'left' | 'right'>('left')
  const [timerSwitched, setTimerSwitched] = useState(false)
  const [switchAlertShown, setSwitchAlertShown] = useState(false)
  const [switchTargetMin, setSwitchTargetMin] = useState(15)  // default 15 min per side
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerStartRef = useRef<number>(0)
  // Track left/right durations separately
  const [leftSeconds, setLeftSeconds] = useState(0)
  const [rightSeconds, setRightSeconds] = useState(0)

  // Bottle fields — `amount` stays the exact stored representation (a plain
  // numeric string in ml, or '' for "not recorded"). The slider only ever
  // reads/writes through the two helpers below so the save/prefill/editLog
  // paths keep working with the same string shape they always have.
  const [amount, setAmount] = useState('')
  const bottleAmountNum = amount ? Math.max(BOTTLE_AMOUNT_MIN, Math.min(BOTTLE_AMOUNT_MAX, Math.round(parseFloat(amount)) || 0)) : 0
  const setBottleAmountNum = (n: number) => setAmount(n > 0 ? String(n) : '')

  // AI enrichment state — tracks tags currently being estimated by the backend
  // (for unknown foods not in local FOOD_DB) + plate-photo scanning
  const [aiLoadingIdx, setAiLoadingIdx] = useState<Set<number>>(new Set())
  const [scanningPlate, setScanningPlate] = useState(false)

  // Derive child age in months for AI context — improves portion estimation
  const childAgeMonths = useMemo(() => {
    const c = children.find((x) => x.id === childId) ?? activeChild
    if (!c?.birthDate) return undefined
    const d = new Date(c.birthDate)
    if (isNaN(d.getTime())) return undefined
    const now = new Date()
    return Math.max(0, (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()))
  }, [children, childId, activeChild])

  // Apply routine prefill when it changes
  useEffect(() => {
    setRoutineEnabled(!!prefill)
    if (!prefill) return
    if (prefill.childId) setChildId(prefill.childId)
    if (prefill.time) setStartTime(prefill.time)
    if (prefill.value) {
      try {
        const p = JSON.parse(prefill.value)
        if (p.feedType) setFeedType(p.feedType as FeedingType)
        if (p.meal) setMeal(p.meal as MealMoment)
        if (p.quality) setQuality(p.quality as EatQuality)
        if (p.amount) setAmount(String(p.amount))
        if (p.side) setBreastSide(p.side)
      } catch {}
    }
  }, [prefill])

  // Apply editLog when opening in edit mode
  useEffect(() => {
    if (!editLog) return
    setChildId(editLog.child_id)
    setLogDate(editLog.date)
    if (editLog.notes) setFoodTags(
      editLog.notes.split(',').map((s) => s.trim()).filter(Boolean).map((name) => ({ name, match: matchSingleTag(name), manualCals: null }))
    )
    if (editLog.photos?.length) setPhotos(editLog.photos)
    try {
      const p = JSON.parse(editLog.value ?? '{}')
      if (p.feedType) setFeedType(p.feedType as FeedingType)
      if (p.meal) setMeal(p.meal as MealMoment)
      if (p.quality) setQuality(p.quality as EatQuality)
      if (p.amount) setAmount(String(p.amount))
      if (p.side) setBreastSide(p.side)
      if (p.duration) setDuration(String(p.duration))
      if (p.time) setStartTime(p.time)
    } catch {}
  }, [editLog?.id])

  // Fetch last breast side for this child
  useEffect(() => {
    if (feedType !== 'breast' || !childId) { setLastSide(null); return }
    setLastSideLoading(true)
    supabase
      .from('child_logs')
      .select('value')
      .eq('child_id', childId)
      .eq('type', 'feeding')
      .like('value', '%breast%')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data[0]?.value) {
          try {
            const parsed = JSON.parse(data[0].value)
            if (parsed.side) setLastSide(parsed.side)
            else setLastSide(null)
          } catch { setLastSide(null) }
        } else {
          setLastSide(null)
        }
        setLastSideLoading(false)
      })
  }, [feedType, childId])

  // Timer tick.
  // Elapsed time is computed from Date.now() - start (not a tick counter)
  // so backgrounding doesn't drift. Per-side seconds also derive from the
  // elapsed delta — previously they incremented +1 per tick, so if the JS
  // thread paused while backgrounded the per-side total drifted relative
  // to the wall-clock total. AppState wake-up forces a re-evaluation.
  useEffect(() => {
    if (!timerActive) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      return
    }
    timerStartRef.current = Date.now() - timerSeconds * 1000
    const sideStartRef = { current: timerSide === 'left' ? leftSeconds : rightSeconds }
    const sideEpochRef = { current: Date.now() }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000)
      setTimerSeconds(elapsed)
      const sideElapsed = sideStartRef.current + Math.floor((Date.now() - sideEpochRef.current) / 1000)
      if (timerSide === 'left') setLeftSeconds(sideElapsed)
      else setRightSeconds(sideElapsed)
    }
    timerRef.current = setInterval(tick, 1000)
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick()
    })
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      sub.remove()
    }
  }, [timerActive, timerSide])

  // Switch side alert
  useEffect(() => {
    if (!timerActive || switchAlertShown) return
    const currentSideSeconds = timerSide === 'left' ? leftSeconds : rightSeconds
    if (currentSideSeconds >= switchTargetMin * 60) {
      setSwitchAlertShown(true)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      Vibration.vibrate([0, 400, 200, 400])
    }
  }, [leftSeconds, rightSeconds, timerActive, switchTargetMin, switchAlertShown, timerSide])

  function startTimer(side: 'left' | 'right') {
    setTimerSide(side)
    setBreastSide(side)
    setTimerActive(true)
    setTimerSeconds(0)
    setLeftSeconds(0)
    setRightSeconds(0)
    setTimerSwitched(false)
    setSwitchAlertShown(false)
  }

  function switchSide() {
    const newSide = timerSide === 'left' ? 'right' : 'left'
    setTimerSide(newSide)
    setTimerSwitched(true)
    setSwitchAlertShown(false)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  function stopTimer() {
    setTimerActive(false)
    const totalMin = Math.round(timerSeconds / 60)
    setDuration(String(totalMin || 1))
    setBreastSide(timerSwitched ? 'both' : timerSide)
  }

  function formatTimer(secs: number): string {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // description derived from tags — used for saving as notes
  const description = foodTags.map((t) => t.name).join(', ')

  // Calorie summary derived directly from tags (match cals or manually entered)
  const calorieMatches = useMemo(() =>
    foodTags
      .filter((t) => t.match !== null || t.manualCals !== null)
      .map((t) => t.match ? { ...t.match, cals: t.manualCals ?? t.match.cals } : { food: t.name, cals: t.manualCals!, category: 'mixed' as const }),
    [foodTags]
  )
  const totalEstimatedCals = useMemo(() => calorieMatches.reduce((s, m) => s + m.cals, 0), [calorieMatches])

  async function pickPhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
        selectionLimit: 4,
      })
      if (!result.canceled) {
        const stable = await Promise.all(result.assets.map((a) => stabiliseUri(a.uri)))
        setPhotos((prev) => [...prev, ...stable].slice(0, 4))
      }
    } catch (e: any) {
      Alert.alert(t('kids_logForm_alertError'), t('kids_logForm_alertCouldNotOpenLibrary'))
    }
  }

  async function takePhoto() {
    const uri = await launchCameraSafe(t)
    if (uri) setPhotos((prev) => [...prev, uri].slice(0, 4))
  }

  /** Convert an AI food item to the tag shape used by FeedingForm */
  function aiItemToTag(item: AiFoodItem): { name: string; match: CalorieMatch; manualCals: null } {
    return {
      name: item.name,
      match: { food: item.name, cals: item.cals, category: item.category },
      manualCals: null,
    }
  }

  /** Enrich a typed food tag via the food-ai backend (used when local DB misses).
   *  Stale responses are dropped: each call captures the foodTag's name at
   *  submit time and only applies the result if the tag at that index still
   *  has the matching name (i.e. the user hasn't replaced it). Avoids the
   *  race where a slow request finishes after the user edited or removed
   *  the tag and overwrites it with old data. */
  async function enrichTagWithAi(indexAtSubmit: number, name: string) {
    setAiLoadingIdx((prev) => { const next = new Set(prev); next.add(indexAtSubmit); return next })
    try {
      const res = await estimateFromText({ text: name, childAgeMonths, meal: meal ?? undefined })
      const first = res.foods[0]
      if (first) {
        setFoodTags((prev) => {
          const target = prev[indexAtSubmit]
          if (!target || target.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
            return prev // stale — user changed the tag while we were waiting
          }
          return prev.map((t, i) => (i === indexAtSubmit ? aiItemToTag(first) : t))
        })
      }
    } catch {
      // Silent — user can still tap the ⚠︎ on the tag to enter kcal manually
    } finally {
      setAiLoadingIdx((prev) => { const next = new Set(prev); next.delete(indexAtSubmit); return next })
    }
  }

  /** Take/pick a photo of the plate and auto-populate foodTags via Claude Vision */
  async function scanPlate(source: 'camera' | 'library') {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync()
        if (!perm.granted) { Alert.alert(t('kids_logForm_alertPermNeeded'), t('kids_logForm_alertCameraAccess')); return }
      }
      const launcher = source === 'camera'
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync
      const pick = await launcher({ mediaTypes: ['images'], quality: 0.8, base64: false })
      if (pick.canceled || !pick.assets[0]) return
      const uri = pick.assets[0].uri

      setScanningPlate(true)
      // Compress + base64 to keep the payload small (<1MB) per project rules
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      )
      if (!manipulated.base64) throw new Error('Could not encode photo')

      const res = await estimateFromImage({
        imageBase64: manipulated.base64,
        mediaType: 'image/jpeg',
        childAgeMonths,
        meal: meal ?? undefined,
      })

      if (res.foods.length === 0) {
        Alert.alert(t('kids_logForm_alertNoFoodDetected'), res.notes ?? 'Try another angle or closer shot.')
        return
      }

      // Keep the photo alongside the tags so the log has visual evidence
      setPhotos((prev) => [...prev, uri].slice(0, 4))
      // Merge AI results with existing tags (don't duplicate by name)
      setFoodTags((prev) => {
        const existing = new Set(prev.map((t) => t.name.toLowerCase()))
        const added = res.foods
          .filter((f) => !existing.has(f.name.toLowerCase()))
          .map(aiItemToTag)
        return [...prev, ...added]
      })
      if (res.notes) Alert.alert(t('kids_logForm_alertGrandmaNoticed'), res.notes)
    } catch (e: unknown) {
      // Surface the real reason to the console for debugging; show the parent a
      // calm, non-technical message (they can always tap ⚠︎ to enter kcal by hand).
      console.warn('[food-scan] failed:', (e as Error)?.message ?? e)
      Alert.alert(
        t('kids_logForm_alertCouldNotReadPhoto'),
        "Grandma couldn't make out the food this time. Try a closer, brighter shot — or tap a food tag to add the calories yourself.",
      )
    } finally {
      setScanningPlate(false)
    }
  }

  /**
   * Compare the food being logged against the child's known allergies.
   * Returns a list of triggering allergens (empty when clear). Matching is
   * substring + case-insensitive on both sides — "peanut" matches "peanut
   * butter" both ways. This is intentionally permissive: false positives
   * (a confirm dialog) are far cheaper than missing a real allergen.
   */
  function detectAllergenMatches(): string[] {
    const child = children.find((c) => c.id === childId)
    const allergies = child?.allergies ?? []
    if (allergies.length === 0 || feedType !== 'solids') return []
    const foodStrings: string[] = []
    for (const t of foodTags) {
      if (t.name) foodStrings.push(t.name)
      if (t.match?.food) foodStrings.push(t.match.food)
    }
    if (isNewFood && newFoodName) foodStrings.push(newFoodName)
    if (description) foodStrings.push(description)
    if (foodStrings.length === 0) return []
    const haystack = foodStrings.join(' ').toLowerCase()
    return allergies.filter((a) => {
      const needle = a.trim().toLowerCase()
      if (!needle) return false
      return haystack.includes(needle)
    })
  }

  async function save() {
    if (!childId) return
    // Allergy check — confirm with the user before saving if any logged
    // food matches a known allergen on the child profile. Returning a
    // Promise so the existing setSaving flow stays linear.
    const allergens = detectAllergenMatches()
    if (allergens.length > 0) {
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          allergens.length === 1 ? t('kids_logForm_alertAllergyWarning') : t('kids_logForm_alertAllergyWarnings'),
          `This food appears to contain ${allergens.join(', ')}, which is listed as an allergy. Are you sure you want to log it?`,
          [
            { text: t('kids_logForm_cancel'), style: 'cancel', onPress: () => resolve(false) },
            { text: t('kids_logForm_alertLogAnyway'), style: 'destructive', onPress: () => resolve(true) },
          ],
        )
      })
      if (!confirmed) return
    }
    setSaving(true)
    try {
      const toUpload = photos.filter((p) => !p.startsWith('http'))
      const upload = toUpload.length ? await uploadPhotos(childId, toUpload) : { urls: [], failed: 0 }
      if (upload.failed > 0) {
        Alert.alert(
          t('kids_logForm_alertPhotosPartialUpload'),
          `${upload.failed} of ${toUpload.length} photos failed to upload. Saving the rest — you can edit and re-add the missing ones later.`,
        )
      }
      const finalPhotos = [...photos.filter((p) => p.startsWith('http')), ...upload.urls]
      if (editLog) {
        // Edit mode — UPDATE existing log, preserving original routine metadata
        let routineMeta: { routineId?: string; routineName?: string } = {}
        try {
          const orig = JSON.parse(editLog.value ?? '{}')
          if (orig.routineId) routineMeta = { routineId: orig.routineId, routineName: orig.routineName }
        } catch {}
        // NOTE: child_logs.type is set on insert as 'food' for solids and
        // 'feeding' for breast/bottle. updateChildLog does NOT change the
        // type column — so if a user opens a food log and switches feedType
        // to bottle, the row stays type='food' but holds a feeding payload.
        // Downstream readers normalize food↔feeding when aggregating
        // (KidsCalendar.normalizeType, isRoutineDone) so this is tolerable.
        // The proper fix is to add type to the update payload, but that
        // shifts the row across analytics buckets retroactively — flagged
        // as a separate follow-up.
        let value: string
        if (feedType === 'solids') {
          value = JSON.stringify({
            feedType: 'solids',
            meal,
            quality,
            time: startTime,
            isNewFood,
            newFoodName: isNewFood ? newFoodName : undefined,
            hasReaction,
            reactionFood: hasReaction ? reactionFood : undefined,
            reactionDesc: hasReaction ? reactionDesc : undefined,
            estimatedCals: totalEstimatedCals || undefined,
            // Preserve the matched-foods catalogue on edit so the calorie
            // breakdown shown in the detail modal doesn't disappear after
            // the first save+edit cycle. The CREATE path writes this too.
            matchedFoods: calorieMatches.length > 0 ? calorieMatches.map((m) => m.food) : undefined,
            ...routineMeta,
          })
        } else if (feedType === 'breast') {
          value = JSON.stringify({ feedType: 'breast', time: startTime, duration: duration || undefined, side: breastSide || undefined, ...routineMeta })
        } else {
          value = JSON.stringify({ feedType: 'bottle', time: startTime, amount: amount || undefined, ...routineMeta })
        }
        await updateChildLog(editLog.id, tagWithRoutine(value, prefill) ?? value, feedType === 'solids' ? (description || null) : null, finalPhotos.length ? finalPhotos : undefined, logDate)
        onSaved()
        return
      }
      if (feedType === 'solids') {
        const value = JSON.stringify({
          feedType: 'solids',
          meal,
          quality,
          time: startTime,
          isNewFood,
          newFoodName: isNewFood ? newFoodName : undefined,
          hasReaction,
          reactionFood: hasReaction ? reactionFood : undefined,
          reactionDesc: hasReaction ? reactionDesc : undefined,
          estimatedCals: totalEstimatedCals || undefined,
          matchedFoods: calorieMatches.length > 0 ? calorieMatches.map((m) => m.food) : undefined,
        })
        await saveChildLog(childId, 'food', tagWithRoutine(value, prefill) ?? value, description || undefined, finalPhotos, logDate)
      } else if (feedType === 'breast') {
        const value = JSON.stringify({
          feedType: 'breast',
          time: startTime,
          duration: duration || undefined,
          side: breastSide || undefined,
        })
        await saveChildLog(childId, 'feeding', tagWithRoutine(value, prefill) ?? value, undefined, undefined, logDate)
      } else {
        // Bottle
        const value = JSON.stringify({
          feedType: 'bottle',
          time: startTime,
          amount: amount || undefined,
        })
        await saveChildLog(childId, 'feeding', tagWithRoutine(value, prefill) ?? value, undefined, undefined, logDate)
      }
      // Save as routine if toggled (only for new logs, not from existing routines)
      if (routineEnabled && !prefill) {
        const routineName = feedType === 'solids'
          ? (meal ? MEAL_MOMENTS.find((m) => m.id === meal)?.label ?? 'Meal' : 'Meal')
          : (feedType === 'breast' ? 'Breastfeed' : 'Bottle')
        const routineValue = feedType === 'solids'
          ? JSON.stringify({ feedType: 'solids', meal })
          : JSON.stringify({ feedType, amount: amount || undefined, duration: duration || undefined })
        await saveAsRoutine(childId, feedType === 'solids' ? 'food' : 'feeding', routineName, routineValue, startTime, routineDays)
      }
      onSaved()
    } catch (e: any) {
      Alert.alert(t('kids_logForm_alertError'), e.message)
    } finally {
      setSaving(false)
    }
  }

  if (diffuse) {
    const dc = dTheme.colors
    return (
      <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
        <View style={df.form}>
          <ActiveChildChip childId={childId} onChange={setChildId} />
          <View style={df.topRow}>
            <View style={df.dateTimeRow}>
              <DateChip value={logDate} onChange={setLogDate} />
              <TimeChip value={startTime} onChange={setStartTime} label={t('kids_logForm_time')} />
            </View>
          </View>

          <DiffuseFormHeader kind="feeding" />

          {/* Feed type — hairline mono segmented pills */}
          <View style={df.segRow}>
            {(['breast', 'bottle', 'solids'] as FeedingType[]).map((ft) => {
              const on = feedType === ft
              return (
                <Pressable
                  key={ft}
                  onPress={() => setFeedType(ft)}
                  style={[df.segPill, { borderColor: on ? dc.hairline : dc.line, backgroundColor: on ? dc.surface : 'transparent' }]}
                >
                  <Text style={[on ? df.chipTextOn : df.chipText, { color: on ? dc.ink : dc.ink3 }]}>
                    {ft.charAt(0).toUpperCase() + ft.slice(1)}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {feedType === 'solids' ? (
            <>
              {/* Meal moment — each its own soft hue across the day */}
              <View style={df.chipGrid}>
                {MEAL_MOMENTS.map((m) => (
                  <DiffuseChip
                    key={m.id}
                    label={m.label}
                    active={meal === m.id}
                    onPress={() => setMeal(m.id)}
                    hue={dTheme.stickers[MEAL_HUE[m.id]]}
                  />
                ))}
              </View>

              {/* Photo area */}
              <DiffusePhotoRow
                photos={photos}
                onRemove={(i) => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                onCamera={takePhoto}
                onGallery={pickPhoto}
              />

              {/* Scan plate — containerless mono action on a hairline rule */}
              <Pressable
                onPress={() =>
                  Alert.alert(t('kids_logForm_alertScanPlate'), t('kids_logForm_alertScanPlate'), [
                    { text: t('kids_logForm_cancel'), style: 'cancel' },
                    { text: t('kids_logForm_alertTakePhoto'), onPress: () => scanPlate('camera') },
                    { text: t('kids_logForm_alertFromLibrary'), onPress: () => scanPlate('library') },
                  ])
                }
                disabled={scanningPlate}
                style={({ pressed }) => [df.saveCta, { borderTopColor: dc.line2, opacity: pressed ? 0.6 : 1 }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {scanningPlate ? <ActivityIndicator size="small" color={dc.ink} /> : <ScanLine size={16} color={dc.ink} strokeWidth={2.2} />}
                  <Text style={[df.saveCtaLabel, { color: dc.ink }]}>
                    {scanningPlate ? t('kids_logForm_readingPlate') : t('kids_logForm_scanPlate')}
                  </Text>
                </View>
                <Character name="sparkle" size={14} color={dc.ink3} />
              </Pressable>

              {/* Food tag input + live calorie estimate */}
              <View style={{ gap: 10 }}>
                {foodTags.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {foodTags.map((tag, i) => {
                      const loading = aiLoadingIdx.has(i)
                      const known = tag.match !== null || tag.manualCals !== null
                      const bColor = loading ? dc.ink3 : known ? dc.success : dc.error
                      return (
                        <View key={`${tag.name}-${i}`} style={[df.chip, { borderColor: bColor, backgroundColor: 'transparent' }]}>
                          {loading
                            ? <ActivityIndicator size="small" color={dc.ink3} />
                            : known
                              ? <Check size={12} color={dc.success} strokeWidth={3} />
                              : (
                                <Pressable onPress={() => { setManualCalIdx(i); setManualCalInput('') }} hitSlop={8}>
                                  <AlertTriangle size={12} color={dc.error} strokeWidth={2.5} />
                                </Pressable>
                              )}
                          <Text style={[df.chipText, { color: dc.ink }]}>{tag.name}</Text>
                          <Pressable onPress={() => setFoodTags((prev) => prev.filter((_, idx) => idx !== i))} hitSlop={8}>
                            <X size={12} color={dc.ink3} strokeWidth={2.5} />
                          </Pressable>
                        </View>
                      )
                    })}
                  </View>
                )}
                <DiffuseField
                  value={foodInput}
                  onChangeText={setFoodInput}
                  placeholder={foodTags.length === 0 ? t('kids_logForm_placeholderFood') : t('kids_logForm_placeholderAddFood')}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    const trimmed = foodInput.trim()
                    if (!trimmed) return
                    const lower = trimmed.toLowerCase()
                    const match = matchSingleTag(trimmed)
                    setFoodTags((prev) => {
                      if (prev.some((tg) => tg.name.trim().toLowerCase() === lower)) {
                        setFoodInput('')
                        return prev
                      }
                      const idx = prev.length
                      if (!match) enrichTagWithAi(idx, trimmed)
                      return [...prev, { name: trimmed, match, manualCals: null }]
                    })
                    setFoodInput('')
                  }}
                />
                {calorieMatches.length > 0 && (
                  <View style={{ paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: dc.line, gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Character name="nutrition" size={13} color={dc.ink3} />
                      <Text style={[df.eyebrow, { color: dc.ink2 }]}>
                        {t('kids_logForm_kcalEstimated', { count: totalEstimatedCals })}
                      </Text>
                    </View>
                    <View style={{ gap: 4 }}>
                      {calorieMatches.map((m, i) => (
                        <View key={`${m.food}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: categoryColor(m.category) }} />
                          <Text style={{ flex: 1, color: dc.ink, fontFamily: diffuseFont.body, fontSize: 13 }}>
                            {m.food.charAt(0).toUpperCase() + m.food.slice(1)}
                          </Text>
                          <Text style={{ color: dc.ink3, fontFamily: diffuseFont.mono, fontSize: 11, letterSpacing: 0.5 }}>
                            {t('kids_logForm_calUnit', { n: m.cals })}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Manual kcal popup — centered Diffuse dialog (paper + hairline,
                    softer backdrop matching DiffuseSheet's 0.45 dim). */}
                <Modal visible={manualCalIdx !== null} transparent animationType="fade" onRequestClose={() => setManualCalIdx(null)}>
                  <Pressable style={[styles.popupBackdrop, { backgroundColor: 'rgba(20,19,19,0.45)' }]} onPress={() => setManualCalIdx(null)} />
                  <View style={[styles.manualCalPopup, { backgroundColor: dc.surface, borderRadius: 28, borderColor: dc.line2 }]}>
                    <Text style={{ color: dc.ink, fontFamily: diffuseFont.display, fontSize: 20, letterSpacing: -0.3, marginBottom: 4 }}>
                      {t('kids_logForm_unknownFood')}
                    </Text>
                    <Text style={{ color: dc.ink3, fontFamily: diffuseFont.body, fontSize: 13, lineHeight: 18 }}>
                      {'"'}{manualCalIdx !== null ? foodTags[manualCalIdx]?.name : ''}{'"'} {t('kids_logForm_notFoundInDb')}
                    </Text>
                    <View style={{ marginTop: 12 }}>
                      <DiffuseField value={manualCalInput} onChangeText={setManualCalInput} placeholder="e.g. 120" keyboardType="number-pad" autoFocus />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 20, marginTop: 18, justifyContent: 'flex-end' }}>
                      <Pressable onPress={() => setManualCalIdx(null)}>
                        <Text style={[df.txtlinkText, { color: dc.ink3 }]}>{t('kids_logForm_skip')}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          const n = parseInt(manualCalInput, 10)
                          if (!isNaN(n) && n > 0 && manualCalIdx !== null) {
                            setFoodTags((prev) => prev.map((tg, i) => i === manualCalIdx ? { ...tg, manualCals: n } : tg))
                          }
                          setManualCalIdx(null)
                          setManualCalInput('')
                        }}
                      >
                        <Text style={[df.txtlinkText, { color: dc.ink }]}>{t('common_confirm')}</Text>
                      </Pressable>
                    </View>
                  </View>
                </Modal>
              </View>

              {/* Eat quality — sticker over hairline circle */}
              <View style={df.qualityRow}>
                {EAT_QUALITIES.map((q) => {
                  const active = quality === q.id
                  const StickerNode =
                    q.sticker === 'smiley' ? <Smiley size={28} /> :
                    q.sticker === 'sleepy' ? <Sleepy size={28} /> :
                    <Sad size={28} />
                  return (
                    <Pressable key={q.id} onPress={() => setQuality(q.id)} style={df.qualityBtn}>
                      <View style={[df.qualityCircle, { borderColor: active ? dc.hairline : dc.line2, backgroundColor: active ? dc.surface : 'transparent' }]}>
                        {StickerNode}
                      </View>
                      <Text style={[df.qualityLabel, { color: active ? dc.ink : dc.ink3 }]}>{q.label}</Text>
                    </Pressable>
                  )
                })}
              </View>

              {/* Flags */}
              <View style={df.chipGrid}>
                <DiffuseChip
                  label={t('kids_logForm_newFood')}
                  active={isNewFood}
                  onPress={() => setIsNewFood(!isNewFood)}
                  hue={dTheme.stickers.blue}
                  leading={<Character name="baby" size={14} color={isNewFood ? dc.ink : dc.ink3} />}
                />
                <DiffuseChip
                  label={t('kids_logForm_reaction')}
                  active={hasReaction}
                  onPress={() => setHasReaction(!hasReaction)}
                  hue={dc.error}
                  leading={<AlertTriangle size={14} color={hasReaction ? dc.error : dc.ink3} strokeWidth={2} />}
                />
              </View>

              {/* New food expanded */}
              {isNewFood && (
                <DiffuseField label={t('kids_logForm_whatNewFood')} value={newFoodName} onChangeText={setNewFoodName} placeholder={t('kids_logForm_placeholderNewFood')} />
              )}

              {/* Reaction expanded */}
              {hasReaction && (
                <View style={{ gap: 14 }}>
                  <DiffuseField label={t('kids_logForm_reactionDetails')} value={reactionFood} onChangeText={setReactionFood} placeholder={t('kids_logForm_placeholderAllergyFood')} />
                  <DiffuseField value={reactionDesc} onChangeText={setReactionDesc} placeholder={t('kids_logForm_placeholderAllergyReaction')} multiline />
                </View>
              )}
            </>
          ) : feedType === 'breast' ? (
            <>
              {/* Last side reminder */}
              {!timerActive && (lastSideLoading ? (
                <ActivityIndicator size="small" color={dc.ink3} style={{ alignSelf: 'flex-start' }} />
              ) : lastSide ? (
                <View style={{ paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: dc.line }}>
                  <Text style={{ color: dc.ink2, fontFamily: diffuseFont.body, fontSize: 13, lineHeight: 20 }}>
                    {t('kids_logForm_lastSidePre')}
                    <Text style={{ fontFamily: diffuseFont.bodyBold, color: dc.ink }}>
                      {lastSide === 'left' ? t('kids_logForm_left') : lastSide === 'right' ? t('kids_logForm_right') : t('kids_logForm_bothSides')}
                    </Text>
                    {t('kids_logForm_lastSideMid')}
                    <Text style={{ fontFamily: diffuseFont.bodyBold, color: dc.ink }}>
                      {lastSide === 'left' ? t('kids_logForm_right') : lastSide === 'right' ? t('kids_logForm_left') : t('kids_logForm_alternating')}
                    </Text>
                    {t('kids_logForm_lastSidePost')}
                  </Text>
                </View>
              ) : null)}

              {timerActive ? (
                /* LIVE TIMER MODE */
                <View style={{ alignItems: 'center', gap: 16, paddingVertical: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={styles.breastIcon}>
                      <View style={[styles.breastShape, styles.breastShapeL, {
                        backgroundColor: timerSide === 'left' ? dc.ink + '18' : 'transparent',
                        borderColor: timerSide === 'left' ? dc.hairline : dc.line2,
                      }]}>
                        {timerSide === 'left' && <View style={[styles.breastNipple, { backgroundColor: dc.ink }]} />}
                      </View>
                      <View style={[styles.breastShape, styles.breastShapeR, {
                        backgroundColor: timerSide === 'right' ? dc.ink + '18' : 'transparent',
                        borderColor: timerSide === 'right' ? dc.hairline : dc.line2,
                      }]}>
                        {timerSide === 'right' && <View style={[styles.breastNipple, { backgroundColor: dc.ink }]} />}
                      </View>
                    </View>
                    <Text style={{ color: dc.ink, fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                      {timerSide === 'left' ? t('kids_logForm_leftSide') : t('kids_logForm_rightSide')}
                    </Text>
                  </View>

                  <Text style={{ color: dc.ink, fontSize: 56, letterSpacing: 1, fontVariant: ['tabular-nums'], fontFamily: diffuseFont.displayLight }}>
                    {formatTimer(timerSeconds)}
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                    {(['left', 'right'] as const).map((side) => {
                      const secs = side === 'left' ? leftSeconds : rightSeconds
                      const on = timerSide === side
                      return (
                        <View key={side} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1, borderRadius: 999, borderColor: on ? dc.hairline : dc.line }}>
                          <Text style={{ color: on ? dc.ink : dc.ink3, fontFamily: diffuseFont.monoBold, fontSize: 11, letterSpacing: 1 }}>{side === 'left' ? t('kids_logForm_timerLabelL') : t('kids_logForm_timerLabelR')}</Text>
                          <Text style={{ color: on ? dc.ink : dc.ink3, fontFamily: diffuseFont.mono, fontSize: 13, fontVariant: ['tabular-nums'] }}>{formatTimer(secs)}</Text>
                        </View>
                      )
                    })}
                  </View>

                  {switchAlertShown && (
                    <View style={{ width: '100%', paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: dc.line, alignItems: 'center' }}>
                      <Text style={{ color: dc.ink2, fontFamily: diffuseFont.mono, fontSize: 11, letterSpacing: 0.8, textAlign: 'center' }}>
                        {t('kids_logForm_switchAlert', { min: switchTargetMin })}
                      </Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                    <Pressable onPress={switchSide} style={({ pressed }) => [{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderWidth: 1, borderRadius: 999, borderColor: dc.line2, opacity: pressed ? 0.7 : 1 }]}>
                      <Repeat size={16} color={dc.ink} strokeWidth={2} />
                      <Text style={{ color: dc.ink, fontFamily: diffuseFont.monoBold, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' }}>{t('kids_logForm_switchSide')}</Text>
                    </Pressable>
                    <Pressable onPress={stopTimer} style={({ pressed }) => [{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderWidth: 1, borderRadius: 999, borderColor: dc.hairline, opacity: pressed ? 0.7 : 1 }]}>
                      <Check size={16} color={dc.ink} strokeWidth={2.5} />
                      <Text style={{ color: dc.ink, fontFamily: diffuseFont.monoBold, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' }}>{t('common_done')}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                /* START MODE */
                <>
                  <Text style={[df.eyebrow, { color: dc.ink3 }]}>{t('kids_logForm_tapToStart')}</Text>
                  <View style={df.segRow}>
                    {([
                      { id: 'left' as const, label: t('kids_logForm_left') },
                      { id: 'right' as const, label: t('kids_logForm_right') },
                    ]).map((s) => {
                      const isRecommended = lastSide && (
                        (lastSide === 'left' && s.id === 'right') ||
                        (lastSide === 'right' && s.id === 'left')
                      )
                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => startTimer(s.id)}
                          style={({ pressed }) => [{ flex: 1, alignItems: 'center', gap: 8, paddingVertical: 16, borderWidth: 1, borderRadius: 20, borderColor: isRecommended ? dc.hairline : dc.line, opacity: pressed ? 0.7 : 1 }]}
                        >
                          <View style={styles.breastIcon}>
                            <View style={[styles.breastShape, styles.breastShapeL, { backgroundColor: s.id === 'left' ? dc.ink + '14' : 'transparent', borderColor: s.id === 'left' ? dc.hairline : dc.line2 }]}>
                              {s.id === 'left' && <View style={[styles.breastNipple, { backgroundColor: dc.ink }]} />}
                            </View>
                            <View style={[styles.breastShape, styles.breastShapeR, { backgroundColor: s.id === 'right' ? dc.ink + '14' : 'transparent', borderColor: s.id === 'right' ? dc.hairline : dc.line2 }]}>
                              {s.id === 'right' && <View style={[styles.breastNipple, { backgroundColor: dc.ink }]} />}
                            </View>
                          </View>
                          <Text style={{ color: dc.ink, fontFamily: diffuseFont.monoBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{s.label}</Text>
                          {isRecommended && (
                            <Text style={{ color: dc.ink3, fontFamily: diffuseFont.mono, fontSize: 8, letterSpacing: 1, textTransform: 'uppercase' }}>{t('kids_logForm_labelNext')}</Text>
                          )}
                        </Pressable>
                      )
                    })}
                  </View>

                  {/* Switch target */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: dc.line }}>
                    <Clock size={14} color={dc.ink3} strokeWidth={2} />
                    <Text style={{ flex: 1, color: dc.ink3, fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>{t('kids_logForm_alertToSwitch')}</Text>
                    {[10, 15, 20].map((min) => {
                      const active = switchTargetMin === min
                      return (
                        <Pressable
                          key={min}
                          onPress={() => setSwitchTargetMin(min)}
                          style={{ paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderRadius: 999, borderColor: active ? dc.hairline : dc.line, backgroundColor: active ? dc.surface : 'transparent' }}
                        >
                          <Text style={{ color: active ? dc.ink : dc.ink3, fontFamily: active ? diffuseFont.monoBold : diffuseFont.mono, fontSize: 11 }}>
                            {t('kids_logForm_minUnit', { n: min })}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>

                  {/* Divider */}
                  <View style={df.divider}>
                    <View style={[df.dividerLine, { backgroundColor: dc.line }]} />
                    <Text style={[df.dividerText, { color: dc.ink3 }]}>{t('kids_logForm_orLogManually')}</Text>
                    <View style={[df.dividerLine, { backgroundColor: dc.line }]} />
                  </View>

                  {/* Manual side selection */}
                  <View style={df.segRow}>
                    {([
                      { id: 'left' as const, label: t('kids_logForm_left') },
                      { id: 'right' as const, label: t('kids_logForm_right') },
                      { id: 'both' as const, label: t('kids_logForm_bothSides') },
                    ]).map((s) => {
                      const active = breastSide === s.id
                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => setBreastSide(s.id)}
                          style={[df.segPill, { borderColor: active ? dc.hairline : dc.line, backgroundColor: active ? dc.surface : 'transparent' }]}
                        >
                          <Text style={[active ? df.chipTextOn : df.chipText, { color: active ? dc.ink : dc.ink3 }]}>{s.label}</Text>
                        </Pressable>
                      )
                    })}
                  </View>

                  <DiffuseField value={duration} onChangeText={setDuration} placeholder={t('kids_logForm_placeholderDuration')} keyboardType="number-pad" />
                </>
              )}
            </>
          ) : (
            /* Bottle */
            <StepSlider
              min={BOTTLE_AMOUNT_MIN}
              max={BOTTLE_AMOUNT_MAX}
              value={bottleAmountNum}
              onChange={setBottleAmountNum}
              color={sliderColor}
              unit="ml"
              blob="feeding"
            />
          )}

          <RoutineToggle enabled={routineEnabled} onToggle={setRoutineEnabled} days={routineDays} onDaysChange={setRoutineDays} locked={!!prefill} />
          <SaveButton onPress={save} saving={saving} disabled={!childId} onSkip={prefill?.routineId ? onSkip : undefined} />
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <ActiveChildChip childId={childId} onChange={setChildId} />
        <View style={styles.topRow}>
          <View style={styles.dateTimeRow}>
            <DateChip value={logDate} onChange={setLogDate} />
            <TimeChip value={startTime} onChange={setStartTime} label={t('kids_logForm_time')} />
          </View>
        </View>

        <FormHeaderSticker kind="feeding" />

        {/* Feed type toggle */}
        <View style={[styles.toggleRow, { backgroundColor: colors.surfaceRaised, borderRadius: 999 }]}>
          {(['breast', 'bottle', 'solids'] as FeedingType[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setFeedType(t)}
              style={[
                styles.toggleBtn,
                {
                  backgroundColor: feedType === t ? ACCENT : 'transparent',
                  borderRadius: 999,
                },
              ]}
            >
              <Text
                style={[styles.toggleText, { color: feedType === t ? INK : colors.textSecondary }]}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {feedType === 'solids' ? (
          <>
            {/* Meal moment */}
            <View style={styles.chipGrid}>
              {MEAL_MOMENTS.map((m) => {
                const active = meal === m.id
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setMeal(m.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? ACCENT_SOFT : colors.surface,
                        borderColor: active ? ACCENT : (isDark ? colors.border : INK),
                        borderRadius: radius.full,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: active ? INK : colors.text }]}>
                      {m.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Photo area */}
            <View style={styles.photoRow}>
              {photos.map((uri, i) => (
                <View key={i} style={{ position: 'relative' }}>
                  <Image source={{ uri }} style={[styles.photoThumb, { borderRadius: radius.lg }]} />
                  <Pressable
                    onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                    style={styles.photoDeleteBtn}
                    hitSlop={4}
                  >
                    <X size={14} color="#FFFFFF" strokeWidth={3} />
                  </Pressable>
                </View>
              ))}
              {photos.length < 4 && (
                <View style={styles.photoButtons}>
                  <Pressable
                    onPress={takePhoto}
                    style={[styles.cameraBtn, { backgroundColor: ACCENT, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg }]}
                  >
                    <Camera size={24} color={INK} strokeWidth={2} />
                  </Pressable>
                  <Pressable
                    onPress={pickPhoto}
                    style={[styles.galleryBtn, { backgroundColor: colors.surfaceRaised, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg }]}
                  >
                    <Plus size={20} color={colors.textMuted} strokeWidth={2} />
                  </Pressable>
                </View>
              )}
            </View>

            {/* Scan plate — Claude Vision identifies every food + estimates kcal */}
            <Pressable
              onPress={() =>
                Alert.alert(t('kids_logForm_alertScanPlate'), t('kids_logForm_alertScanPlate'), [
                  { text: t('kids_logForm_cancel'), style: 'cancel' },
                  { text: t('kids_logForm_alertTakePhoto'), onPress: () => scanPlate('camera') },
                  { text: t('kids_logForm_alertFromLibrary'), onPress: () => scanPlate('library') },
                ])
              }
              disabled={scanningPlate}
              style={({ pressed }) => [
                styles.scanPlateBtn,
                { backgroundColor: ACCENT_SOFT, borderColor: ACCENT + '66', borderRadius: 999 },
                pressed && { opacity: 0.7 },
              ]}
            >
              {scanningPlate
                ? <ActivityIndicator size="small" color={ACCENT} />
                : <ScanLine size={18} color={ACCENT} strokeWidth={2.2} />}
              <Text style={[styles.scanPlateText, { color: INK }]}>
                {scanningPlate ? t('kids_logForm_readingPlate') : t('kids_logForm_scanPlate')}
              </Text>
              <Sparkles size={14} color={ACCENT} strokeWidth={2} />
            </Pressable>

            {/* Food tag input + live calorie estimate */}
            <View>
              {/* Existing tags */}
              {foodTags.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {foodTags.map((tag, i) => {
                    const loading = aiLoadingIdx.has(i)
                    const known = tag.match !== null || tag.manualCals !== null
                    const borderColor = loading ? colors.primary : known ? brand.success : brand.error
                    return (
                      <View key={`${tag.name}-${i}`} style={[styles.foodTag, { backgroundColor: colors.surfaceRaised, borderColor, borderRadius: radius.full }]}>
                        {loading
                          ? <ActivityIndicator size="small" color={colors.primary} />
                          : known
                            ? <Check size={12} color={brand.success} strokeWidth={3} />
                            : (
                              <Pressable onPress={() => { setManualCalIdx(i); setManualCalInput('') }} hitSlop={8}>
                                <AlertTriangle size={12} color={brand.error} strokeWidth={2.5} />
                              </Pressable>
                            )
                        }
                        <Text style={[styles.foodTagText, { color: colors.text }]}>{tag.name}</Text>
                        <Pressable onPress={() => setFoodTags((prev) => prev.filter((_, idx) => idx !== i))} hitSlop={8}>
                          <Text style={[styles.foodTagRemove, { color: colors.textMuted }]}>{t('kids_logForm_removeTag')}</Text>
                        </Pressable>
                      </View>
                    )
                  })}
                </View>
              )}
              {/* Input for next food */}
              <TextInput
                value={foodInput}
                onChangeText={setFoodInput}
                placeholder={foodTags.length === 0 ? t('kids_logForm_placeholderFood') : t('kids_logForm_placeholderAddFood')}
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  const trimmed = foodInput.trim()
                  if (!trimmed) return
                  // De-dupe by case-insensitive name. Previously the same
                  // food could be added 3 times in a row, multiplying its
                  // calorie contribution against the daily target.
                  const lower = trimmed.toLowerCase()
                  const match = matchSingleTag(trimmed)
                  setFoodTags((prev) => {
                    if (prev.some((t) => t.name.trim().toLowerCase() === lower)) {
                      setFoodInput('')
                      return prev
                    }
                    const idx = prev.length
                    // Kick off AI enrichment in the background if the local DB missed
                    if (!match) enrichTagWithAi(idx, trimmed)
                    return [...prev, { name: trimmed, match, manualCals: null }]
                  })
                  setFoodInput('')
                }}
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg, minHeight: 48 }]}
              />
              {calorieMatches.length > 0 && (
                <View style={[styles.calorieBanner, { backgroundColor: stickerPalette.greenSoft, borderColor: stickerPalette.green, borderRadius: radius.lg }]}>
                  <View style={styles.calorieHeader}>
                    <Utensils size={14} color={stickerPalette.green} strokeWidth={2} />
                    <Text style={[styles.calorieTotalText, { color: stickerPalette.green }]}>
                      {t('kids_logForm_kcalEstimated', { count: totalEstimatedCals })}
                    </Text>
                  </View>
                  <View style={styles.calorieMatchList}>
                    {calorieMatches.map((m, i) => (
                      <View key={`${m.food}-${i}`} style={styles.calorieMatchRow}>
                        <View style={[styles.calorieMatchDot, { backgroundColor: categoryColor(m.category) }]} />
                        <Text style={[styles.calorieMatchFood, { color: colors.text }]}>
                          {m.food.charAt(0).toUpperCase() + m.food.slice(1)}
                        </Text>
                        <Text style={[styles.calorieMatchCals, { color: colors.textMuted }]}>
                          {t('kids_logForm_calUnit', { n: m.cals })}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Manual kcal popup for unrecognized foods */}
              <Modal visible={manualCalIdx !== null} transparent animationType="fade" onRequestClose={() => setManualCalIdx(null)}>
                <Pressable style={styles.popupBackdrop} onPress={() => setManualCalIdx(null)} />
                <View style={[styles.manualCalPopup, { backgroundColor: colors.surface, borderRadius: radius.xl, borderColor: (isDark ? colors.border : INK) }]}>
                  <Text style={[styles.manualCalTitle, { color: colors.text }]}>
                    {t('kids_logForm_unknownFood')}
                  </Text>
                  <Text style={[styles.manualCalSubtitle, { color: colors.textSecondary }]}>
                    {'"'}{manualCalIdx !== null ? foodTags[manualCalIdx]?.name : ''}{'"'} {t('kids_logForm_notFoundInDb')}
                  </Text>
                  <TextInput
                    value={manualCalInput}
                    onChangeText={setManualCalInput}
                    placeholder="e.g. 120"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceRaised, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg, minHeight: 48, marginTop: 12 }]}
                    autoFocus
                  />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                    <Pressable
                      onPress={() => setManualCalIdx(null)}
                      style={[styles.manualCalBtn, { backgroundColor: colors.surfaceRaised, borderColor: (isDark ? colors.border : INK), flex: 1 }]}
                    >
                      <Text style={[styles.manualCalBtnText, { color: colors.textSecondary }]}>{t('kids_logForm_skip')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        const n = parseInt(manualCalInput, 10)
                        if (!isNaN(n) && n > 0 && manualCalIdx !== null) {
                          setFoodTags((prev) => prev.map((t, i) => i === manualCalIdx ? { ...t, manualCals: n } : t))
                        }
                        setManualCalIdx(null)
                        setManualCalInput('')
                      }}
                      style={[styles.manualCalBtn, { backgroundColor: ACCENT, borderColor: ACCENT, flex: 1 }]}
                    >
                      <Text style={[styles.manualCalBtnText, { color: INK }]}>{t('common_confirm')}</Text>
                    </Pressable>
                  </View>
                </View>
              </Modal>
            </View>

            {/* Eat quality */}
            <View style={styles.qualityRow}>
              {EAT_QUALITIES.map((q) => {
                const active = quality === q.id
                const StickerNode =
                  q.sticker === 'smiley' ? <Smiley size={32} /> :
                  q.sticker === 'sleepy' ? <Sleepy size={32} /> :
                  <Sad size={32} />
                return (
                  <Pressable
                    key={q.id}
                    onPress={() => setQuality(q.id)}
                    style={[
                      styles.qualityBtn,
                      {
                        backgroundColor: active ? ACCENT_SOFT : colors.surface,
                        borderColor: active ? ACCENT : (isDark ? colors.border : INK),
                        borderRadius: radius.lg,
                      },
                    ]}
                  >
                    {StickerNode}
                    <Text style={[styles.qualityLabel, { color: active ? colors.text : colors.textMuted }]}>
                      {q.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Flags + expandable fields */}
            <View style={styles.flagRow}>
              <Pressable
                onPress={() => setIsNewFood(!isNewFood)}
                style={[styles.flagChip, {
                  backgroundColor: isNewFood ? stickerPalette.blue + '15' : colors.surface,
                  borderColor: isNewFood ? stickerPalette.blue : (isDark ? colors.border : INK),
                  borderRadius: radius.full,
                }]}
              >
                <Baby size={14} color={isNewFood ? stickerPalette.blue : colors.textMuted} strokeWidth={2} />
                <Text style={[styles.flagText, { color: isNewFood ? stickerPalette.blue : colors.textMuted }]}>
                  {t('kids_logForm_newFood')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setHasReaction(!hasReaction)}
                style={[styles.flagChip, {
                  backgroundColor: hasReaction ? colors.error + '15' : colors.surface,
                  borderColor: hasReaction ? colors.error : (isDark ? colors.border : INK),
                  borderRadius: radius.full,
                }]}
              >
                <AlertTriangle size={14} color={hasReaction ? colors.error : colors.textMuted} strokeWidth={2} />
                <Text style={[styles.flagText, { color: hasReaction ? colors.error : colors.textMuted }]}>
                  {t('kids_logForm_reaction')}
                </Text>
              </Pressable>
            </View>

            {/* New food expanded */}
            {isNewFood && (
              <View style={[styles.expandedFlag, { backgroundColor: brand.secondary + '08', borderColor: brand.secondary + '25', borderRadius: radius.lg }]}>
                <Text style={[styles.expandedFlagLabel, { color: brand.secondary }]}>{t('kids_logForm_whatNewFood')}</Text>
                <TextInput
                  value={newFoodName}
                  onChangeText={setNewFoodName}
                  placeholder={t('kids_logForm_placeholderNewFood')}
                  placeholderTextColor={colors.textMuted}
                  style={[styles.expandedFlagInput, { color: colors.text, backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: radius.md }]}
                />
              </View>
            )}

            {/* Reaction expanded */}
            {hasReaction && (
              <View style={[styles.expandedFlag, { backgroundColor: brand.error + '08', borderColor: brand.error + '25', borderRadius: radius.lg }]}>
                <Text style={[styles.expandedFlagLabel, { color: brand.error }]}>{t('kids_logForm_reactionDetails')}</Text>
                <TextInput
                  value={reactionFood}
                  onChangeText={setReactionFood}
                  placeholder={t('kids_logForm_placeholderAllergyFood')}
                  placeholderTextColor={colors.textMuted}
                  style={[styles.expandedFlagInput, { color: colors.text, backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: radius.md }]}
                />
                <TextInput
                  value={reactionDesc}
                  onChangeText={setReactionDesc}
                  placeholder={t('kids_logForm_placeholderAllergyReaction')}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={[styles.expandedFlagInput, { color: colors.text, backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: radius.md, minHeight: 60 }]}
                />
              </View>
            )}
          </>
        ) : feedType === 'breast' ? (
          <>
            {/* ── Breast Feeding with Live Timer ── */}

            {/* Last side reminder */}
            {!timerActive && (lastSideLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ alignSelf: 'flex-start' }} />
            ) : lastSide ? (
              <View style={[styles.lastSideBanner, { backgroundColor: stickerPalette.yellowSoft, borderColor: stickerPalette.yellow, borderRadius: radius.lg }]}>
                <Text style={[styles.lastSideLabel, { color: colors.text }]}>
                  {t('kids_logForm_lastSidePre')}<Text style={{ fontWeight: '800', color: colors.text }}>
                    {lastSide === 'left' ? t('kids_logForm_left') : lastSide === 'right' ? t('kids_logForm_right') : t('kids_logForm_bothSides')}
                  </Text>{t('kids_logForm_lastSideMid')}<Text style={{ fontWeight: '800', color: colors.text }}>
                    {lastSide === 'left' ? t('kids_logForm_right') : lastSide === 'right' ? t('kids_logForm_left') : t('kids_logForm_alternating')}
                  </Text>{t('kids_logForm_lastSidePost')}
                </Text>
              </View>
            ) : null)}

            {timerActive ? (
              /* ── LIVE TIMER MODE ── */
              <View style={[styles.timerWrap, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
                {/* Current side indicator with body icon */}
                <View style={styles.timerSideIndicator}>
                  <View style={styles.breastIcon}>
                    <View style={[styles.breastShape, styles.breastShapeL, {
                      backgroundColor: (timerSide === 'left' ? ACCENT : colors.textMuted + '20') + '20',
                      borderColor: timerSide === 'left' ? ACCENT : colors.textMuted + '30',
                    }]}>
                      {timerSide === 'left' && <View style={[styles.breastNipple, { backgroundColor: ACCENT }]} />}
                    </View>
                    <View style={[styles.breastShape, styles.breastShapeR, {
                      backgroundColor: (timerSide === 'right' ? ACCENT : colors.textMuted + '20') + '20',
                      borderColor: timerSide === 'right' ? ACCENT : colors.textMuted + '30',
                    }]}>
                      {timerSide === 'right' && <View style={[styles.breastNipple, { backgroundColor: ACCENT }]} />}
                    </View>
                  </View>
                  <Text style={[styles.timerSideLabel, { color: ACCENT }]}>
                    {timerSide === 'left' ? t('kids_logForm_leftSide') : t('kids_logForm_rightSide')}
                  </Text>
                </View>

                {/* Big timer display */}
                <Text style={[styles.timerDisplay, { color: colors.text }]}>
                  {formatTimer(timerSeconds)}
                </Text>

                {/* Per-side breakdown */}
                <View style={styles.timerBreakdown}>
                  <View style={[styles.timerBreakdownItem, { backgroundColor: timerSide === 'left' ? ACCENT + '15' : 'transparent', borderRadius: radius.md }]}>
                    <View style={[styles.timerBreakdownDot, { backgroundColor: timerSide === 'left' ? ACCENT : colors.textMuted }]} />
                    <Text style={[styles.timerBreakdownLabel, { color: timerSide === 'left' ? colors.text : colors.textMuted }]}>{t('kids_logForm_timerLabelL')}</Text>
                    <Text style={[styles.timerBreakdownTime, { color: timerSide === 'left' ? ACCENT : colors.textMuted }]}>
                      {formatTimer(leftSeconds)}
                    </Text>
                  </View>
                  <View style={[styles.timerBreakdownItem, { backgroundColor: timerSide === 'right' ? ACCENT + '15' : 'transparent', borderRadius: radius.md }]}>
                    <View style={[styles.timerBreakdownDot, { backgroundColor: timerSide === 'right' ? ACCENT : colors.textMuted }]} />
                    <Text style={[styles.timerBreakdownLabel, { color: timerSide === 'right' ? colors.text : colors.textMuted }]}>{t('kids_logForm_timerLabelR')}</Text>
                    <Text style={[styles.timerBreakdownTime, { color: timerSide === 'right' ? ACCENT : colors.textMuted }]}>
                      {formatTimer(rightSeconds)}
                    </Text>
                  </View>
                </View>

                {/* Switch alert banner */}
                {switchAlertShown && (
                  <View style={[styles.switchAlert, { backgroundColor: stickerPalette.yellowSoft, borderColor: stickerPalette.yellow, borderRadius: radius.lg }]}>
                    <Text style={[styles.switchAlertText, { color: colors.text }]}>
                      {t('kids_logForm_switchAlert', { min: switchTargetMin })}
                    </Text>
                  </View>
                )}

                {/* Timer actions */}
                <View style={styles.timerActions}>
                  <Pressable
                    onPress={switchSide}
                    style={({ pressed }) => [
                      styles.timerSwitchBtn,
                      { backgroundColor: ACCENT_SOFT, borderColor: ACCENT, borderRadius: radius.lg },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Repeat size={18} color={ACCENT} strokeWidth={2} />
                    <Text style={[styles.timerSwitchText, { color: ACCENT }]}>{t('kids_logForm_switchSide')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={stopTimer}
                    style={({ pressed }) => [
                      styles.timerStopBtn,
                      { backgroundColor: '#141313', borderRadius: radius.lg },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Check size={18} color="#FFFEF8" strokeWidth={2.5} />
                    <Text style={[styles.timerStopText, { color: '#FFFEF8' }]}>{t('common_done')}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              /* ── START MODE — pick side and go ── */
              <>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('kids_logForm_tapToStart')}</Text>
                <View style={styles.sideRow}>
                  {([
                    { id: 'left' as const, label: t('kids_logForm_left') },
                    { id: 'right' as const, label: t('kids_logForm_right') },
                  ]).map((s) => {
                    const isRecommended = lastSide && (
                      (lastSide === 'left' && s.id === 'right') ||
                      (lastSide === 'right' && s.id === 'left')
                    )
                    const accentC = ACCENT
                    const dimC = colors.textMuted + '30'
                    const lFill = s.id === 'left' ? accentC : dimC
                    const rFill = s.id === 'right' ? accentC : dimC
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => startTimer(s.id)}
                        style={({ pressed }) => [
                          styles.sideBtn,
                          {
                            backgroundColor: colors.surface,
                            borderColor: isRecommended ? stickerPalette.yellow : (isDark ? colors.border : INK),
                            borderRadius: radius.lg,
                          },
                          pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
                        ]}
                      >
                        <View style={styles.breastIcon}>
                          <View style={[styles.breastShape, styles.breastShapeL, { backgroundColor: lFill + '20', borderColor: lFill }]}>
                            {s.id === 'left' && <View style={[styles.breastNipple, { backgroundColor: lFill }]} />}
                          </View>
                          <View style={[styles.breastShape, styles.breastShapeR, { backgroundColor: rFill + '20', borderColor: rFill }]}>
                            {s.id === 'right' && <View style={[styles.breastNipple, { backgroundColor: rFill }]} />}
                          </View>
                        </View>
                        <Text style={[styles.sideBtnText, { color: colors.text }]}>{s.label}</Text>
                        {isRecommended && (
                          <View style={[styles.recommendedTag, { backgroundColor: stickerPalette.yellowSoft, borderColor: stickerPalette.yellow, borderWidth: 1 }]}>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: INK }}>{t('kids_logForm_labelNext')}</Text>
                          </View>
                        )}
                      </Pressable>
                    )
                  })}
                </View>

                {/* Switch target setting */}
                <View style={[styles.switchTargetRow, { backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg }]}>
                  <Clock size={14} color={colors.textMuted} strokeWidth={2} />
                  <Text style={[styles.switchTargetLabel, { color: colors.textSecondary }]}>{t('kids_logForm_alertToSwitch')}</Text>
                  {[10, 15, 20].map((min) => {
                    const active = switchTargetMin === min
                    return (
                      <Pressable
                        key={min}
                        onPress={() => setSwitchTargetMin(min)}
                        style={[
                          styles.switchTargetChip,
                          {
                            backgroundColor: active ? INK : 'transparent',
                            borderColor: active ? INK : (isDark ? colors.border : INK),
                            borderRadius: radius.full,
                          },
                        ]}
                      >
                        <Text style={[styles.switchTargetChipText, { color: active ? '#FFFEF8' : colors.textMuted }]}>
                          {t('kids_logForm_minUnit', { n: min })}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>

                {/* Or log manually */}
                <View style={styles.manualDivider}>
                  <View style={[styles.manualDividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.manualDividerText, { color: colors.textMuted }]}>{t('kids_logForm_orLogManually')}</Text>
                  <View style={[styles.manualDividerLine, { backgroundColor: colors.border }]} />
                </View>

                {/* Manual side selection */}
                <View style={styles.sideRow}>
                  {([
                    { id: 'left' as const, label: t('kids_logForm_left') },
                    { id: 'right' as const, label: t('kids_logForm_right') },
                    { id: 'both' as const, label: t('kids_logForm_bothSides') },
                  ]).map((s) => {
                    const active = breastSide === s.id
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => setBreastSide(s.id)}
                        style={[
                          styles.sideChipSmall,
                          {
                            backgroundColor: active ? ACCENT_SOFT : 'transparent',
                            borderColor: active ? ACCENT : (isDark ? colors.border : INK),
                            borderRadius: radius.full,
                          },
                        ]}
                      >
                        <Text style={[styles.sideChipSmallText, { color: active ? INK : colors.textMuted }]}>{s.label}</Text>
                      </Pressable>
                    )
                  })}
                </View>

                <TextInput
                  value={duration}
                  onChangeText={setDuration}
                  placeholder={t('kids_logForm_placeholderDuration')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg }]}
                />
              </>
            )}
          </>
        ) : (
          <>
            {/* ── Bottle ── */}
            <StepSlider
              min={BOTTLE_AMOUNT_MIN}
              max={BOTTLE_AMOUNT_MAX}
              value={bottleAmountNum}
              onChange={setBottleAmountNum}
              color={sliderColor}
              unit="ml"
              blob="feeding"
            />
          </>
        )}

        <RoutineToggle enabled={routineEnabled} onToggle={setRoutineEnabled} days={routineDays} onDaysChange={setRoutineDays} locked={!!prefill} />
        <SaveButton onPress={save} saving={saving} disabled={!childId} onSkip={prefill?.routineId ? onSkip : undefined} />
      </View>
    </ScrollView>
  )
}

// ─── 2. SLEEP FORM ─────────────────────────────────────────────────────────

// Quality is stored as the SAME translated string label the old chip UI wrote
// (t('kids_logForm_sleepQualityGreat') etc.) so `formatLogDisplay('sleep', …)`
// and the Kids sleep analytics reader (`buildSleepData` in lib/analyticsData.ts,
// which lowercases `value.quality` and matches 'great'|'good'|'restless'|'poor')
// keep working with zero reader changes. The numeric 1–10 slider is mapped to
// one of those 4 labels on save, and reverse-mapped to a representative number
// on prefill/editLog.
const SLEEP_QUALITY_DEFAULT = 7

function sleepQualityNumToLabel(n: number, t: (key: TranslationKey) => string): string {
  if (n <= 2) return t('kids_logForm_sleepQualityPoor')
  if (n <= 5) return t('kids_logForm_sleepQualityRestless')
  if (n <= 8) return t('kids_logForm_sleepQualityGood')
  return t('kids_logForm_sleepQualityGreat')
}

function sleepQualityLabelToNum(label: string, t: (key: TranslationKey) => string): number {
  if (label === t('kids_logForm_sleepQualityPoor')) return 2
  if (label === t('kids_logForm_sleepQualityRestless')) return 4
  if (label === t('kids_logForm_sleepQualityGood')) return 7
  if (label === t('kids_logForm_sleepQualityGreat')) return 10
  return SLEEP_QUALITY_DEFAULT
}

export function SleepForm({ onSaved, initialDate, prefill, onSkip, editLog }: { onSaved: () => void; initialDate?: string; prefill?: RoutinePrefill; onSkip?: () => void; editLog?: EditLog }) {
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  const { colors, radius, isDark } = useTheme()
  const dTheme = useDiffuseTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const sliderColor = diffuse ? diffuseLogHue('sleep') : ACCENT

  const [childId, setChildId] = useState(prefill?.childId ?? editLog?.child_id ?? activeChild?.id ?? children[0]?.id ?? '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  // Seed startTime directly from prefill so the activity time is the routine's time, not "now"
  const [startTime, setStartTime] = useState(() => {
    if (prefill?.value) {
      try { const p = JSON.parse(prefill.value); if (p.startTime) return p.startTime } catch {}
    }
    return prefill?.time ?? toTimeStr(new Date())
  })
  const [endTime, setEndTime] = useState(() => {
    if (prefill?.value) {
      try { const p = JSON.parse(prefill.value); if (p.endTime) return p.endTime } catch {}
    }
    return ''
  })
  const [hours, setHours] = useState(8)
  const [quality, setQuality] = useState(SLEEP_QUALITY_DEFAULT)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [routineEnabled, setRoutineEnabled] = useState(!!prefill)
  const [routineDays, setRoutineDays] = useState([0, 1, 2, 3, 4, 5, 6])

  // Apply routine prefill when it changes (handles cases where prefill changes after mount)
  useEffect(() => {
    setRoutineEnabled(!!prefill)
    if (!prefill) return
    if (prefill.childId) setChildId(prefill.childId)
    if (prefill.time) setStartTime(prefill.time)
    if (prefill.value) {
      try {
        const p = JSON.parse(prefill.value)
        if (p.quality) setQuality(sleepQualityLabelToNum(p.quality, t))
        if (p.startTime) setStartTime(p.startTime)
        if (p.endTime) setEndTime(p.endTime)
        if (p.duration) {
          const m = String(p.duration).match(/(?:(\d+(?:\.\d+)?)h)?\s*(?:(\d+)m)?/)
          if (m) {
            const h = parseFloat(m[1] || '0') + (parseInt(m[2] || '0', 10) / 60)
            if (h > 0) setHours(Math.round(h))
          }
        }
      } catch {}
    }
  }, [prefill])

  // Apply editLog when opening in edit mode
  useEffect(() => {
    if (!editLog) return
    setChildId(editLog.child_id)
    setLogDate(editLog.date)
    if (editLog.notes) setNotes(editLog.notes)
    try {
      const p = JSON.parse(editLog.value ?? '{}')
      if (p.startTime) setStartTime(p.startTime)
      if (p.endTime) setEndTime(p.endTime)
      if (p.quality) setQuality(sleepQualityLabelToNum(p.quality, t))
      if (p.duration) {
        const m = String(p.duration).match(/(?:(\d+(?:\.\d+)?)h)?\s*(?:(\d+)m)?/)
        if (m) {
          const h = parseFloat(m[1] || '0') + (parseInt(m[2] || '0', 10) / 60)
          if (h > 0) setHours(Math.round(h))
        }
      }
    } catch {}
  }, [editLog?.id])

  // Duration shown/stored: prefer the explicit hours slider. If start+end
  // time are both set (via MoreSection) and produce a real span, that auto
  // duration wins — it reflects an actual logged session over the manual pick.
  const autoDuration = useMemo(() => calcDuration(startTime, endTime, true), [startTime, endTime])
  const durationLabel = autoDuration || `${hours}h`

  async function save() {
    if (!childId) return
    setSaving(true)
    try {
      // When editing a routine-tagged log, preserve the original routineId/routineName
      // so the log remains linked to its routine (e.g. "Afternoon Nap" stays "Afternoon Nap")
      let routineMeta: { routineId?: string; routineName?: string } = {}
      if (editLog) {
        try {
          const orig = JSON.parse(editLog.value ?? '{}')
          if (orig.routineId) routineMeta = { routineId: orig.routineId, routineName: orig.routineName }
        } catch {}
      }
      const qualityLabel = sleepQualityNumToLabel(quality, t)
      const valueObj: Record<string, unknown> = { duration: durationLabel || undefined, quality: qualityLabel, startTime, endTime: endTime || undefined, ...routineMeta }
      const value = JSON.stringify(valueObj)
      const taggedValue = tagWithRoutine(value, prefill) ?? value
      if (editLog) {
        await updateChildLog(editLog.id, taggedValue, notes || null, undefined, logDate)
        onSaved()
        return
      }
      await saveChildLog(childId, 'sleep', taggedValue, notes || undefined, undefined, logDate)
      if (routineEnabled && !prefill) {
        // Nap vs Bedtime classifier.
        // Previously: any sleep starting before 4pm became "Nap" — but
        // afternoon naps starting at 4–5pm got misclassified as bedtime.
        // Now: parse durationLabel (format "8h", "8h 30m", or "45m") into
        // minutes, then call it bedtime when duration >= 4h OR start hour
        // is past 6pm.
        const startHour = parseInt(startTime.split(':')[0])
        const m = durationLabel.match(/(?:(\d+)h)?\s*(?:(\d+)m)?/)
        const durMins = m ? (parseInt(m[1] || '0') * 60 + parseInt(m[2] || '0')) : 0
        const longSleep = durMins >= 240 // 4h
        const isNap = !longSleep && startHour < 18
        await saveAsRoutine(childId, 'sleep', isNap ? 'Nap' : 'Bedtime', JSON.stringify({ startTime, quality: qualityLabel }), startTime, routineDays)
      }
      onSaved()
    } catch (e: any) {
      Alert.alert(t('kids_logForm_alertError'), e.message)
    } finally {
      setSaving(false)
    }
  }

  const moreFields = diffuse ? (
    <>
      <View style={df.dateTimeRow}>
        <DateChip value={logDate} onChange={setLogDate} />
        <TimeChip value={startTime} onChange={setStartTime} label={t('kids_logForm_start')} />
        {endTime ? (
          <TimeChip value={endTime} onChange={setEndTime} label={t('kids_logForm_end')} />
        ) : (
          <Pressable onPress={() => setEndTime(toTimeStr(new Date()))} style={[df.pill, { borderColor: dTheme.colors.line }]}>
            <Plus size={12} color={dTheme.colors.ink3} strokeWidth={2} />
            <Text style={[df.pillLabel, { color: dTheme.colors.ink3 }]}>{t('kids_logForm_end')}</Text>
          </Pressable>
        )}
      </View>
      <DiffuseField label={t('kids_logForm_placeholderNotes')} value={notes} onChangeText={setNotes} placeholder={t('kids_logForm_placeholderNotes')} />
      <RoutineToggle enabled={routineEnabled} onToggle={setRoutineEnabled} days={routineDays} onDaysChange={setRoutineDays} locked={!!prefill} />
    </>
  ) : (
    <>
      <View style={styles.dateTimeRow}>
        <DateChip value={logDate} onChange={setLogDate} />
        <TimeChip value={startTime} onChange={setStartTime} label={t('kids_logForm_start')} />
        {endTime ? (
          <TimeChip value={endTime} onChange={setEndTime} label={t('kids_logForm_end')} />
        ) : (
          <Pressable
            onPress={() => setEndTime(toTimeStr(new Date()))}
            style={[styles.timeChip, { backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: 999 }]}
          >
            <Plus size={12} color={colors.textMuted} strokeWidth={2} />
            <Text style={[styles.timeChipLabel, { color: colors.textMuted }]}>{t('kids_logForm_end')}</Text>
          </Pressable>
        )}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder={t('kids_logForm_placeholderNotes')}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg }]}
      />
      <RoutineToggle enabled={routineEnabled} onToggle={setRoutineEnabled} days={routineDays} onDaysChange={setRoutineDays} locked={!!prefill} />
    </>
  )

  if (diffuse) {
    return (
      <View style={df.form}>
        <ActiveChildChip childId={childId} onChange={setChildId} />
        <DiffuseFormHeader kind="sleep" />
        <Text style={[df.eyebrow, { color: dTheme.colors.ink3 }]}>{t('preg_form_sleep_hoursSlept')}</Text>
        <StepSlider min={0} max={16} value={hours} onChange={setHours} color={sliderColor} unit={hours === 1 ? t('preg_form_sleep_hoursLabel').replace(/s$/, '') : t('preg_form_sleep_hoursLabel')} blob="sleep" />
        <Text style={[df.eyebrow, { color: dTheme.colors.ink3 }]}>{t('preg_form_sleep_qualityRange')}</Text>
        <StepSlider min={1} max={10} value={quality} onChange={setQuality} color={sliderColor} blob="sleep" />
        <MoreSection>{moreFields}</MoreSection>
        <SaveButton onPress={save} saving={saving} disabled={!childId} onSkip={prefill?.routineId ? onSkip : undefined} />
      </View>
    )
  }

  return (
    <View style={styles.form}>
      <ActiveChildChip childId={childId} onChange={setChildId} />
      <FormHeaderSticker kind="sleep" />
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('preg_form_sleep_hoursSlept')}</Text>
      <StepSlider min={0} max={16} value={hours} onChange={setHours} color={sliderColor} unit={hours === 1 ? t('preg_form_sleep_hoursLabel').replace(/s$/, '') : t('preg_form_sleep_hoursLabel')} blob="sleep" />
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('preg_form_sleep_qualityRange')}</Text>
      <StepSlider min={1} max={10} value={quality} onChange={setQuality} color={sliderColor} blob="sleep" />
      <MoreSection>{moreFields}</MoreSection>
      <SaveButton onPress={save} saving={saving} disabled={!childId} onSkip={prefill?.routineId ? onSkip : undefined} />
    </View>
  )
}

// ─── 3. HEALTH EVENT FORM ──────────────────────────────────────────────────

const HEALTH_EVENTS = ['Temperature', 'Vaccine', 'Medicine', 'Doctor visit', 'Injury', 'Other']

export function HealthEventForm({ onSaved, initialDate, prefill, onSkip, editLog }: { onSaved: () => void; initialDate?: string; prefill?: RoutinePrefill; onSkip?: () => void; editLog?: EditLog }) {
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  const { colors, radius, isDark } = useTheme()
  const dTheme = useDiffuseTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)

  const [childId, setChildId] = useState(children.length <= 1 ? (children[0]?.id ?? '') : '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  const [startTime, setStartTime] = useState(() => prefill?.time ?? toTimeStr(new Date()))
  const [eventType, setEventType] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Apply routine prefill when it changes
  useEffect(() => {
    if (!prefill) return
    if (prefill.childId) setChildId(prefill.childId)
    if (prefill.time) setStartTime(prefill.time)
    if (prefill.name) {
      const matched = HEALTH_EVENTS.find((e) => e.toLowerCase() === prefill.name!.toLowerCase())
      if (matched) setEventType(matched)
    }
  }, [prefill])

  // Apply editLog when opening in edit mode
  useEffect(() => {
    if (!editLog) return
    setChildId(editLog.child_id)
    setLogDate(editLog.date)
    if (editLog.notes) setNotes(editLog.notes)
    // Reverse-map log type to event label.
    // For 'note' rows the eventType (Doctor visit / Injury / Other) is
    // packed into the JSON value — extract it so the form opens on the
    // right pill and shows the user's text without the JSON wrapper.
    const typeToLabel: Record<string, string> = { temperature: 'Temperature', vaccine: 'Vaccine', medicine: 'Medicine' }
    if (editLog.type === 'note') {
      try {
        const v = JSON.parse(editLog.value ?? '{}')
        if (v && typeof v.eventType === 'string' && HEALTH_EVENTS.includes(v.eventType)) {
          setEventType(v.eventType)
        } else {
          setEventType('Other')
        }
        if (typeof v?.description === 'string') {
          setValue(v.description === v.eventType ? '' : v.description)
        } else if (typeof editLog.value === 'string') {
          // Pre-W40 row: value was a bare string.
          setValue(editLog.value)
        }
      } catch {
        setEventType('Other')
        if (editLog.value) setValue(editLog.value)
      }
    } else if (typeToLabel[editLog.type]) {
      setEventType(typeToLabel[editLog.type])
      if (editLog.value) setValue(editLog.value)
    } else if (HEALTH_EVENTS.includes(editLog.type)) {
      setEventType(editLog.type)
      if (editLog.value) setValue(editLog.value)
    } else if (editLog.value) {
      setValue(editLog.value)
    }
  }, [editLog?.id])

  async function save() {
    if (!childId || !eventType) return
    setSaving(true)
    try {
      const logType = eventType === 'Temperature' ? 'temperature'
        : eventType === 'Vaccine' ? 'vaccine'
        : eventType === 'Medicine' ? 'medicine'
        : 'note'
      // For typed events the `value` is the actual name shown on the
      // dashboard (the vaccine name, the medicine name, the temperature
      // reading). Falling back to the eventType label produced visible
      // trash like a "vaccine" row literally named "Vaccine" on the home
      // health card. Require the user to fill it in.
      const trimmedValue = value.trim()
      if (!trimmedValue && (logType === 'vaccine' || logType === 'medicine' || logType === 'temperature')) {
        Alert.alert(
          `Add a ${eventType.toLowerCase()} name`,
          `Please enter the ${eventType.toLowerCase()} before saving so it shows up correctly in your health history.`,
        )
        return
      }
      // For typed events keep value as the bare name. For free-form events
      // (Doctor visit / Injury / Other → logType='note') pack the eventType
      // into a JSON value so the subtype survives — the previous code
      // collapsed all three to indistinguishable 'note' rows and the Visits
      // view couldn't tell them apart.
      const finalValue =
        logType === 'note'
          ? JSON.stringify({ eventType, description: trimmedValue || eventType })
          : (trimmedValue || eventType)
      const tagged = tagWithRoutine(finalValue, prefill) ?? finalValue
      if (editLog) {
        await updateChildLog(editLog.id, tagged, notes || null, undefined, logDate)
        onSaved()
        return
      }
      await saveChildLog(childId, logType, tagged, notes || undefined, undefined, logDate)
      onSaved()
    } catch (e: any) {
      Alert.alert(t('kids_logForm_alertError'), e.message)
    } finally {
      setSaving(false)
    }
  }

  if (diffuse) {
    return (
      <View style={df.form}>
        <View style={df.topRow}>
          <ChildSelector selected={childId} onSelect={setChildId} />
          <View style={df.dateTimeRow}>
            <DateChip value={logDate} onChange={setLogDate} />
            <TimeChip value={startTime} onChange={setStartTime} label={t('kids_logForm_time')} />
          </View>
        </View>
        <DiffuseFormHeader kind="health" />
        <View style={df.chipGrid}>
          {HEALTH_EVENTS.map((e, i) => (
            <DiffuseChip key={e} label={e} active={eventType === e} onPress={() => setEventType(e)} hue={chipHueAt(dTheme, i)} />
          ))}
        </View>
        <DiffuseField
          value={value}
          onChangeText={setValue}
          placeholder={eventType === 'Temperature' ? t('kids_logForm_placeholderTemp') : t('kids_logForm_placeholderDetails')}
          keyboardType={eventType === 'Temperature' ? 'decimal-pad' : 'default'}
        />
        <DiffuseField label={t('kids_logForm_placeholderNotes')} value={notes} onChangeText={setNotes} placeholder={t('kids_logForm_placeholderNotes')} />
        <SaveButton onPress={save} saving={saving} disabled={!childId || !eventType} onSkip={prefill?.routineId ? onSkip : undefined} />
      </View>
    )
  }

  return (
    <View style={styles.form}>
      <View style={styles.topRow}>
        <ChildSelector selected={childId} onSelect={setChildId} />
        <View style={styles.dateTimeRow}>
          <DateChip value={logDate} onChange={setLogDate} />
          <TimeChip value={startTime} onChange={setStartTime} label={t('kids_logForm_time')} />
        </View>
      </View>
      <FormHeaderSticker kind="health" />
      <View style={styles.chipGrid}>
        {HEALTH_EVENTS.map((e) => {
          const active = eventType === e
          return (
            <Pressable
              key={e}
              onPress={() => setEventType(e)}
              style={[styles.chip, {
                backgroundColor: active ? ACCENT_SOFT : colors.surface,
                borderColor: active ? ACCENT : (isDark ? colors.border : INK),
                borderRadius: radius.full,
              }]}
            >
              <Text style={[styles.chipText, { color: active ? INK : colors.text }]}>{e}</Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={eventType === 'Temperature' ? t('kids_logForm_placeholderTemp') : t('kids_logForm_placeholderDetails')}
        placeholderTextColor={colors.textMuted}
        keyboardType={eventType === 'Temperature' ? 'decimal-pad' : 'default'}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg }]}
      />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder={t('kids_logForm_placeholderNotes')}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={!childId || !eventType} onSkip={prefill?.routineId ? onSkip : undefined} />
    </View>
  )
}

// ─── 4. MOOD FORM ──────────────────────────────────────────────────────────

// Brand mood stickers with tinted fills per variant — hand-drawn faces from
// the sticker-collage design system replace the generic lucide icons.
const MOOD_DEFS: { id: 'happy' | 'calm' | 'fussy' | 'cranky' | 'energetic'; labelKey: TranslationKey; fill: string }[] = [
  { id: 'happy',     labelKey: 'kids_logForm_moodHappy',     fill: '#FBEA9E' }, // yellow soft
  { id: 'calm',      labelKey: 'kids_logForm_moodCalm',      fill: '#CFE0F0' }, // blue soft
  { id: 'fussy',     labelKey: 'kids_logForm_moodFussy',     fill: '#F9D6C0' }, // peach soft
  { id: 'cranky',    labelKey: 'kids_logForm_moodCranky',    fill: '#F9D8E2' }, // pink soft
  { id: 'energetic', labelKey: 'kids_logForm_moodEnergetic', fill: '#F5D652' }, // yellow bright
]

export function KidsMoodForm({ onSaved, initialDate, prefill, onSkip, editLog }: { onSaved: () => void; initialDate?: string; prefill?: RoutinePrefill; onSkip?: () => void; editLog?: EditLog }) {
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  const { colors, radius, isDark } = useTheme()
  const dTheme = useDiffuseTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const MOODS = MOOD_DEFS.map((d) => ({ ...d, label: t(d.labelKey) }))
  // Each mood id (happy/calm/fussy/cranky/energetic) IS a MoodExpression, so we
  // pass it as `face` for a distinct expression per blob, and use the mood's own
  // `fill` as the color — otherwise all five render the same default peach face.
  const MOOD_OPTS: ChoiceOption[] = MOOD_DEFS.map((m) => ({
    id: m.id, label: t(m.labelKey), blob: 'mood', color: m.fill, face: m.id,
  }))

  const [childId, setChildId] = useState(prefill?.childId ?? editLog?.child_id ?? activeChild?.id ?? children[0]?.id ?? '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  const [startTime, setStartTime] = useState(() => prefill?.time ?? toTimeStr(new Date()))
  const [mood, setMood] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [routineEnabled, setRoutineEnabled] = useState(!!prefill)
  const [routineDays, setRoutineDays] = useState([0, 1, 2, 3, 4, 5, 6])

  // Apply routine prefill when it changes
  useEffect(() => {
    setRoutineEnabled(!!prefill)
    if (!prefill) return
    if (prefill.childId) setChildId(prefill.childId)
    if (prefill.time) setStartTime(prefill.time)
    if (prefill.value) {
      try {
        const p = JSON.parse(prefill.value)
        if (p.mood) setMood(p.mood)
      } catch {
        // value might be the mood string directly
        if (MOODS.some((m) => m.id === prefill.value)) setMood(prefill.value!)
      }
    }
  }, [prefill])

  // Apply editLog when opening in edit mode
  useEffect(() => {
    if (!editLog) return
    setChildId(editLog.child_id)
    setLogDate(editLog.date)
    if (editLog.notes) setNotes(editLog.notes)
    // Accept both shapes: bare string ("happy") or JSON wrapped
    // ({ mood: "happy", routineId, routineName }).
    if (editLog.value) {
      let v: any = editLog.value
      try { v = JSON.parse(editLog.value) } catch {}
      const moodId = typeof v === 'string' ? v : v?.mood
      if (moodId && MOODS.some((m) => m.id === moodId)) setMood(moodId)
    }
  }, [editLog?.id])

  async function save() {
    if (!childId || !mood) return
    setSaving(true)
    try {
      // When this log is tagged to a routine (prefill present), serialize
      // mood as JSON so tagWithRoutine can survive the round-trip. Without
      // the wrap, the bare string "happy" is not valid JSON and the helper
      // returns it unchanged, losing the routineId tag entirely.
      const wrappedValue = prefill?.routineId
        ? JSON.stringify({ mood, routineId: prefill.routineId, routineName: prefill.name ?? undefined })
        : mood
      if (editLog) {
        await updateChildLog(editLog.id, wrappedValue, notes || null, undefined, logDate)
        onSaved()
        return
      }
      await saveChildLog(childId, 'mood', wrappedValue, notes || undefined, undefined, logDate)
      if (routineEnabled && !prefill) {
        await saveAsRoutine(childId, 'mood', 'Mood check', null, startTime, routineDays)
      }
      onSaved()
    } catch (e: any) {
      Alert.alert(t('kids_logForm_alertError'), e.message)
    } finally {
      setSaving(false)
    }
  }

  const moreTimeAndNotes = diffuse ? (
    <DiffuseField label={t('kids_logForm_placeholderWhatHappened')} value={notes} onChangeText={setNotes} placeholder={t('kids_logForm_placeholderWhatHappened')} />
  ) : (
    <TextInput
      value={notes}
      onChangeText={setNotes}
      placeholder={t('kids_logForm_placeholderWhatHappened')}
      placeholderTextColor={colors.textMuted}
      style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg }]}
    />
  )

  if (diffuse) {
    return (
      <View style={df.form}>
        <ActiveChildChip childId={childId} onChange={setChildId} />
        <View style={df.topRow}>
          <DateChip value={logDate} onChange={setLogDate} />
        </View>

        <DiffuseFormHeader kind="mood" />

        {/* Mood — large tappable choice blobs */}
        <ChoiceStep options={MOOD_OPTS} value={mood ? [mood] : []} onChange={(ids) => setMood(ids[0])} />

        <MoreSection label={t('kids_logForm_time')}>
          <TimeChip value={startTime} onChange={setStartTime} label={t('kids_logForm_time')} />
          {moreTimeAndNotes}
        </MoreSection>

        <RoutineToggle enabled={routineEnabled} onToggle={setRoutineEnabled} days={routineDays} onDaysChange={setRoutineDays} locked={!!prefill} />
        <SaveButton onPress={save} saving={saving} disabled={!childId || !mood} onSkip={prefill?.routineId ? onSkip : undefined} />
      </View>
    )
  }

  return (
    <View style={styles.form}>
      <ActiveChildChip childId={childId} onChange={setChildId} />
      <View style={styles.topRow}>
        <DateChip value={logDate} onChange={setLogDate} />
      </View>

      <FormHeaderSticker kind="mood" />

      {/* Mood — large tappable choice blobs */}
      <ChoiceStep options={MOOD_OPTS} value={mood ? [mood] : []} onChange={(ids) => setMood(ids[0])} />

      <MoreSection label={t('kids_logForm_time')}>
        <TimeChip value={startTime} onChange={setStartTime} label={t('kids_logForm_time')} />
        {moreTimeAndNotes}
      </MoreSection>

      <RoutineToggle enabled={routineEnabled} onToggle={setRoutineEnabled} days={routineDays} onDaysChange={setRoutineDays} locked={!!prefill} />
      <SaveButton onPress={save} saving={saving} disabled={!childId || !mood} onSkip={prefill?.routineId ? onSkip : undefined} />
    </View>
  )
}

// ─── 5. MEMORY FORM ────────────────────────────────────────────────────────

export function MemoryForm({ onSaved, initialDate }: { onSaved: () => void; initialDate?: string }) {
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  const { colors, radius, isDark } = useTheme()
  const dTheme = useDiffuseTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)

  const [childId, setChildId] = useState(children.length <= 1 ? (children[0]?.id ?? '') : '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  const [startTime, setStartTime] = useState(toTimeStr(new Date()))
  const [photos, setPhotos] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [saving, setSaving] = useState(false)

  async function pickPhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
        selectionLimit: 4,
      })
      if (!result.canceled) {
        const stable = await Promise.all(result.assets.map((a) => stabiliseUri(a.uri)))
        setPhotos((prev) => [...prev, ...stable].slice(0, 4))
      }
    } catch (e: any) {
      Alert.alert(t('kids_logForm_alertError'), t('kids_logForm_alertCouldNotOpenLibrary'))
    }
  }

  async function takePhoto() {
    const uri = await launchCameraSafe(t)
    if (uri) setPhotos((prev) => [...prev, uri].slice(0, 4))
  }

  async function save() {
    if (!childId) return
    // A "memory" log without any photo is meaningless — downstream readers
    // (home dashboard, future photo gallery) filter by photos.length > 0
    // and orphan empty-memory rows. Block the save instead of writing one.
    if (photos.length === 0) {
      Alert.alert(
        t('kids_logForm_addPhoto'),
        'Memories need at least one photo. Tap the camera or gallery to add one.',
      )
      return
    }
    setSaving(true)
    try {
      const upload = await uploadPhotos(childId, photos)
      // If every upload failed, block the save so the user can retry
      // instead of creating an empty record.
      if (upload.urls.length === 0) {
        Alert.alert(
          t('kids_logForm_alertPhotosFailedAll'),
          'None of the photos could be uploaded. Check your connection and try again.',
        )
        return
      }
      if (upload.failed > 0) {
        Alert.alert(
          t('kids_logForm_alertPhotosPartialUpload'),
          `${upload.failed} of ${photos.length} photos failed. Saving the memory with the ones that worked.`,
        )
      }
      await saveChildLog(childId, 'photo', 'memory', caption || undefined, upload.urls, logDate)
      onSaved()
    } catch (e: any) {
      Alert.alert(t('kids_logForm_alertError'), e.message)
    } finally {
      setSaving(false)
    }
  }

  if (diffuse) {
    return (
      <View style={df.form}>
        <View style={df.topRow}>
          <ChildSelector selected={childId} onSelect={setChildId} />
          <View style={df.dateTimeRow}>
            <DateChip value={logDate} onChange={setLogDate} />
            <TimeChip value={startTime} onChange={setStartTime} label={t('kids_logForm_time')} />
          </View>
        </View>
        <DiffuseFormHeader kind="memory" />
        <DiffusePhotoRow
          photos={photos}
          onRemove={(i) => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
          onCamera={takePhoto}
          onGallery={pickPhoto}
        />
        <DiffuseField label={t('kids_logForm_placeholderCaption')} value={caption} onChangeText={setCaption} placeholder={t('kids_logForm_placeholderCaption')} />
        <SaveButton onPress={save} saving={saving} disabled={!childId} />
      </View>
    )
  }

  return (
    <View style={styles.form}>
      <View style={styles.topRow}>
        <ChildSelector selected={childId} onSelect={setChildId} />
        <View style={styles.dateTimeRow}>
          <DateChip value={logDate} onChange={setLogDate} />
          <TimeChip value={startTime} onChange={setStartTime} label={t('kids_logForm_time')} />
        </View>
      </View>
      <FormHeaderSticker kind="memory" />
      <View style={styles.photoRow}>
        {photos.map((uri, i) => (
          <View key={i} style={{ position: 'relative' }}>
            <Image source={{ uri }} style={[styles.photoThumb, { borderRadius: radius.lg }]} />
            <Pressable
              onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
              style={styles.photoDeleteBtn}
              hitSlop={4}
            >
              <X size={14} color="#FFFEF8" strokeWidth={3} />
            </Pressable>
          </View>
        ))}
        {photos.length < 4 && (
          <View style={styles.photoButtons}>
            <Pressable onPress={takePhoto} style={[styles.cameraBtn, { backgroundColor: ACCENT, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg }]}>
              <Camera size={24} color={INK} strokeWidth={2} />
            </Pressable>
            <Pressable onPress={pickPhoto} style={[styles.galleryBtn, { backgroundColor: colors.surfaceRaised, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg }]}>
              <Plus size={20} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
        )}
      </View>
      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder={t('kids_logForm_placeholderCaption')}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={!childId} />
    </View>
  )
}

// ─── 6. ACTIVITY FORM ─────────────────────────────────────────────────────

const ACTIVITY_TYPE_DEFS: { id: string; labelKey: TranslationKey }[] = [
  { id: 'class', labelKey: 'kids_logForm_activityClass' },
  { id: 'school', labelKey: 'kids_logForm_activitySchool' },
  { id: 'study', labelKey: 'kids_logForm_activityStudy' },
  { id: 'reading', labelKey: 'kids_logForm_activityReading' },
  { id: 'sport', labelKey: 'kids_logForm_activitySport' },
  { id: 'swim', labelKey: 'kids_logForm_activitySwimming' },
  { id: 'dance', labelKey: 'kids_logForm_activityDance' },
  { id: 'music', labelKey: 'kids_logForm_activityMusic' },
  { id: 'art', labelKey: 'kids_logForm_activityArt' },
  { id: 'playground', labelKey: 'kids_logForm_activityPlayground' },
  { id: 'walk', labelKey: 'kids_logForm_activityWalk' },
  { id: 'therapy', labelKey: 'kids_logForm_activityTherapy' },
  { id: 'playdate', labelKey: 'kids_logForm_activityPlaydate' },
]

export function ActivityForm({ onSaved, initialDate, prefill, onSkip, editLog }: { onSaved: () => void; initialDate?: string; prefill?: RoutinePrefill; onSkip?: () => void; editLog?: EditLog }) {
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  const { colors, radius, isDark } = useTheme()
  const dTheme = useDiffuseTheme()
  const children = useChildStore((s) => s.children)
  const ACTIVITY_TYPES = ACTIVITY_TYPE_DEFS.map((d) => ({ ...d, label: t(d.labelKey) }))

  const [childId, setChildId] = useState(children.length <= 1 ? (children[0]?.id ?? '') : '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  const [startTime, setStartTime] = useState(() => prefill?.time ?? toTimeStr(new Date()))
  const [endTime, setEndTime] = useState('')
  const [activityType, setActivityType] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [routineEnabled, setRoutineEnabled] = useState(false)
  const [routineDays, setRoutineDays] = useState([0, 1, 2, 3, 4, 5, 6])

  // Apply routine prefill when it changes
  useEffect(() => {
    setRoutineEnabled(!!prefill)
    if (!prefill) return
    if (prefill.childId) setChildId(prefill.childId)
    if (prefill.time) setStartTime(prefill.time)
    if (prefill.value) {
      try {
        const p = JSON.parse(prefill.value)
        if (p.activityType) setActivityType(p.activityType)
        if (p.name) setName(p.name)
        if (p.startTime) setStartTime(p.startTime)
        if (p.endTime) setEndTime(p.endTime)
      } catch {}
    } else if (prefill.name) {
      setName(prefill.name)
    }
  }, [prefill])

  // Apply editLog when opening in edit mode
  useEffect(() => {
    if (!editLog) return
    setChildId(editLog.child_id)
    setLogDate(editLog.date)
    if (editLog.notes) setNotes(editLog.notes)
    try {
      const p = JSON.parse(editLog.value ?? '{}')
      if (p.activityType) setActivityType(p.activityType)
      if (p.name) setName(p.name)
      if (p.startTime) setStartTime(p.startTime)
      if (p.endTime) setEndTime(p.endTime)
    } catch {}
  }, [editLog?.id])

  // Activities aren't overnight events — an end-before-start almost always
  // means the user transposed two fields, so we surface no duration rather
  // than silently saving a 23-hour playtime.
  const autoDuration = useMemo(() => calcDuration(startTime, endTime, false), [startTime, endTime])

  async function save() {
    if (!childId || !activityType) return
    setSaving(true)
    try {
      // Preserve original routine metadata when editing
      let routineMeta: { routineId?: string; routineName?: string } = {}
      if (editLog) {
        try {
          const orig = JSON.parse(editLog.value ?? '{}')
          if (orig.routineId) routineMeta = { routineId: orig.routineId, routineName: orig.routineName }
        } catch {}
      }
      const value = JSON.stringify({
        activityType,
        name: name || undefined,
        duration: autoDuration || undefined,
        startTime,
        endTime: endTime || undefined,
        ...routineMeta,
      })
      const tagged = tagWithRoutine(value, prefill) ?? value
      if (editLog) {
        await updateChildLog(editLog.id, tagged, notes || null, undefined, logDate)
        onSaved()
        return
      }
      await saveChildLog(childId, 'activity', tagged, notes || undefined, undefined, logDate)
      if (routineEnabled && !prefill) {
        const routineName = name || ACTIVITY_TYPES.find((a) => a.id === activityType)?.label || 'Activity'
        await saveAsRoutine(childId, 'activity', routineName, value, startTime, routineDays)
      }
      onSaved()
    } catch (e: any) {
      Alert.alert(t('kids_logForm_alertError'), e.message)
    } finally {
      setSaving(false)
    }
  }

  if (diffuse) {
    return (
      <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
        <View style={df.form}>
          <View style={df.topRow}>
            <ChildSelector selected={childId} onSelect={setChildId} />
            <View style={df.dateTimeRow}>
              <DateChip value={logDate} onChange={setLogDate} />
              <TimeChip value={startTime} onChange={setStartTime} label={t('kids_logForm_start')} />
              {endTime ? (
                <TimeChip value={endTime} onChange={setEndTime} label={t('kids_logForm_end')} />
              ) : (
                <Pressable onPress={() => setEndTime(toTimeStr(new Date()))} style={[df.pill, { borderColor: dTheme.colors.line }]}>
                  <Plus size={12} color={dTheme.colors.ink3} strokeWidth={2} />
                  <Text style={[df.pillLabel, { color: dTheme.colors.ink3 }]}>{t('kids_logForm_end')}</Text>
                </Pressable>
              )}
            </View>
          </View>
          <DiffuseFormHeader kind="activity" />
          {autoDuration !== '' && (
            <View style={[df.banner, { borderColor: dTheme.colors.line }]}>
              <Character name="activity" size={18} color={dTheme.colors.ink3} />
              <Text style={[df.bannerLabel, { color: dTheme.colors.ink3 }]}>{t('kids_logForm_duration')}</Text>
              <Text style={[df.bannerValue, { color: dTheme.colors.ink }]}>{autoDuration}</Text>
            </View>
          )}
          <View style={df.chipGrid}>
            {ACTIVITY_TYPES.map((a, i) => (
              <DiffuseChip key={a.id} label={a.label} active={activityType === a.id} onPress={() => setActivityType(a.id)} hue={chipHueAt(dTheme, i)} />
            ))}
          </View>
          <DiffuseField label={t('kids_logForm_placeholderActivityName')} value={name} onChangeText={setName} placeholder={t('kids_logForm_placeholderActivityName')} />
          <DiffuseField label={t('kids_logForm_placeholderNotes')} value={notes} onChangeText={setNotes} placeholder={t('kids_logForm_placeholderNotes')} />
          <RoutineToggle enabled={routineEnabled} onToggle={setRoutineEnabled} days={routineDays} onDaysChange={setRoutineDays} locked={!!prefill} />
          <SaveButton onPress={save} saving={saving} disabled={!childId || !activityType} onSkip={prefill?.routineId ? onSkip : undefined} />
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <View style={styles.topRow}>
          <ChildSelector selected={childId} onSelect={setChildId} />
          <View style={styles.dateTimeRow}>
            <DateChip value={logDate} onChange={setLogDate} />
            <TimeChip value={startTime} onChange={setStartTime} label={t('kids_logForm_start')} />
            {endTime ? (
              <TimeChip value={endTime} onChange={setEndTime} label={t('kids_logForm_end')} />
            ) : (
              <Pressable
                onPress={() => setEndTime(toTimeStr(new Date()))}
                style={[styles.timeChip, { backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: 999 }]}
              >
                <Plus size={12} color={colors.textMuted} strokeWidth={2} />
                <Text style={[styles.timeChipLabel, { color: colors.textMuted }]}>{t('kids_logForm_end')}</Text>
              </Pressable>
            )}
          </View>
        </View>
        <FormHeaderSticker kind="activity" />
        {autoDuration !== '' && (
          <View style={[styles.iconBanner, { backgroundColor: ACCENT_SOFT, borderColor: ACCENT + '40', borderWidth: 1 }]}>
            <Dumbbell size={20} color={ACCENT} strokeWidth={2} />
            <Text style={[styles.bannerLabel, { color: colors.text, fontFamily: font.bodySemiBold }]}>{t('kids_logForm_duration')}</Text>
            <Text style={[styles.autoDuration, { color: INK, fontFamily: font.displayBold }]}>{autoDuration}</Text>
          </View>
        )}

        {/* Activity type chips */}
        <View style={styles.chipGrid}>
          {ACTIVITY_TYPES.map((a) => {
            const active = activityType === a.id
            return (
              <Pressable
                key={a.id}
                onPress={() => setActivityType(a.id)}
                style={[styles.chip, {
                  backgroundColor: active ? ACCENT_SOFT : colors.surface,
                  borderColor: active ? ACCENT : (isDark ? colors.border : INK),
                  borderRadius: radius.full,
                }]}
              >
                <Text style={[styles.chipText, { color: active ? INK : colors.text }]}>{a.label}</Text>
              </Pressable>
            )
          })}
        </View>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('kids_logForm_placeholderActivityName')}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg }]}
        />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t('kids_logForm_placeholderNotes')}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg }]}
        />
        <RoutineToggle enabled={routineEnabled} onToggle={setRoutineEnabled} days={routineDays} onDaysChange={setRoutineDays} locked={!!prefill} />
        <SaveButton onPress={save} saving={saving} disabled={!childId || !activityType} onSkip={prefill?.routineId ? onSkip : undefined} />
      </View>
    </ScrollView>
  )
}

// ─── 7. DIAPER FORM ────────────────────────────────────────────────────────

type DiaperType = 'pee' | 'poop' | 'mixed'
type DiaperColor = 'yellow' | 'green' | 'brown' | 'black' | 'red' | 'orange'
type DiaperConsistency = 'liquid' | 'soft' | 'normal' | 'hard'

const DIAPER_COLOR_DEFS: { id: DiaperColor; labelKey: TranslationKey; hex: string }[] = [
  { id: 'yellow', labelKey: 'kids_logForm_diaperColorYellow', hex: '#F4D03F' },
  { id: 'green', labelKey: 'kids_logForm_diaperColorGreen', hex: '#58D68D' },
  { id: 'brown', labelKey: 'kids_logForm_diaperColorBrown', hex: '#A04000' },
  { id: 'black', labelKey: 'kids_logForm_diaperColorBlack', hex: '#2C2C2C' },
  { id: 'orange', labelKey: 'kids_logForm_diaperColorOrange', hex: '#F39C12' },
  { id: 'red', labelKey: 'kids_logForm_diaperColorRed', hex: '#E74C3C' },
]

const DIAPER_CONSISTENCY_DEFS: { id: DiaperConsistency; labelKey: TranslationKey }[] = [
  { id: 'liquid', labelKey: 'kids_logForm_diaperConsistLiquid' },
  { id: 'soft', labelKey: 'kids_logForm_diaperConsistSoft' },
  { id: 'normal', labelKey: 'kids_logForm_diaperConsistNormal' },
  { id: 'hard', labelKey: 'kids_logForm_diaperConsistHard' },
]

export function DiaperForm({ onSaved, initialDate, editLog }: { onSaved: () => void; initialDate?: string; editLog?: EditLog }) {
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  const { colors, radius, isDark } = useTheme()
  const dTheme = useDiffuseTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const DIAPER_COLORS = DIAPER_COLOR_DEFS.map((d) => ({ ...d, label: t(d.labelKey) }))
  const DIAPER_CONSISTENCIES = DIAPER_CONSISTENCY_DEFS.map((d) => ({ ...d, label: t(d.labelKey) }))
  const DIAPER_OPTS: ChoiceOption[] = [
    { id: 'pee', label: t('kids_logForm_diaperPee'), blob: 'diaper', color: stickerPalette.blue },
    { id: 'poop', label: t('kids_logForm_diaperPoop'), blob: 'diaper', color: stickerPalette.peach },
    { id: 'mixed', label: t('kids_logForm_diaperBoth'), blob: 'diaper', color: stickerPalette.green },
  ]

  const [childId, setChildId] = useState(editLog?.child_id ?? activeChild?.id ?? children[0]?.id ?? '')
  const [logDate, setLogDate] = useState(initialDate ?? toDateStr(new Date()))
  const [logTime, setLogTime] = useState(toTimeStr(new Date()))
  const [diaperType, setDiaperType] = useState<DiaperType | null>(null)
  const [color, setColor] = useState<DiaperColor | null>(null)
  const [consistency, setConsistency] = useState<DiaperConsistency | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const showPooDetails = diaperType === 'poop' || diaperType === 'mixed'

  useEffect(() => {
    if (!editLog) return
    setChildId(editLog.child_id)
    setLogDate(editLog.date)
    if (editLog.notes) setNotes(editLog.notes)
    if (editLog.photos?.length) setPhotos(editLog.photos)
    try {
      const p = JSON.parse(editLog.value ?? '{}')
      if (p.diaperType) setDiaperType(p.diaperType)
      if (p.color) setColor(p.color)
      if (p.consistency) setConsistency(p.consistency)
      if (p.time) setLogTime(p.time)
    } catch {}
  }, [editLog?.id])

  async function pickPhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 0.7 })
      if (!result.canceled && result.assets[0]) {
        const stable = await stabiliseUri(result.assets[0].uri)
        setPhotos([stable])
      }
    } catch {
      Alert.alert(t('kids_logForm_alertError'), t('kids_logForm_alertCouldNotOpenLibrary'))
    }
  }

  async function takePhoto() {
    const uri = await launchCameraSafe(t)
    if (uri) setPhotos([uri])
  }

  async function save() {
    if (!childId || !diaperType) return
    setSaving(true)
    try {
      const value = JSON.stringify({
        diaperType,
        color: showPooDetails ? (color ?? undefined) : undefined,
        consistency: showPooDetails ? (consistency ?? undefined) : undefined,
        time: logTime,
      })
      const upload = photos.length ? await uploadPhotos(childId, photos) : { urls: [], failed: 0 }
      if (upload.failed > 0) {
        Alert.alert(
          t('kids_logForm_alertPhotosPartialUpload'),
          `${upload.failed} of ${photos.length} photos failed. Saving the diaper log anyway.`,
        )
      }
      const uploadedPhotos = upload.urls.length ? upload.urls : undefined
      if (editLog) {
        await updateChildLog(editLog.id, value, notes || null, uploadedPhotos, logDate)
        onSaved()
        return
      }
      await saveChildLog(childId, 'diaper', value, notes || undefined, uploadedPhotos, logDate)
      onSaved()
    } catch (e: any) {
      Alert.alert(t('kids_logForm_alertError'), e.message)
    } finally {
      setSaving(false)
    }
  }

  const poopDetails = showPooDetails && (
    diffuse ? (
      <>
        <Text style={[df.eyebrow, { color: dTheme.colors.ink3 }]}>{t('kids_logForm_color')}</Text>
        <View style={df.chipGrid}>
          {DIAPER_COLORS.map((c) => (
            <DiffuseChip
              key={c.id}
              label={c.label}
              active={color === c.id}
              onPress={() => setColor(c.id)}
              hue={c.hex}
              leading={<View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.hex }} />}
            />
          ))}
        </View>

        <Text style={[df.eyebrow, { color: dTheme.colors.ink3 }]}>{t('kids_logForm_consistency')}</Text>
        <View style={df.chipGrid}>
          {DIAPER_CONSISTENCIES.map((c, i) => (
            <DiffuseChip key={c.id} label={c.label} active={consistency === c.id} onPress={() => setConsistency(c.id)} hue={chipHueAt(dTheme, i)} />
          ))}
        </View>
      </>
    ) : (
      <>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('kids_logForm_color')}</Text>
        <View style={[styles.chipGrid, { gap: 8 }]}>
          {DIAPER_COLORS.map((c) => {
            const active = color === c.id
            return (
              <Pressable
                key={c.id}
                onPress={() => setColor(c.id)}
                style={[styles.chip, {
                  backgroundColor: active ? c.hex + '25' : colors.surface,
                  borderColor: active ? c.hex : (isDark ? colors.border : INK),
                  borderRadius: radius.full,
                  gap: 6,
                }]}
              >
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.hex }} />
                <Text style={[styles.chipText, { color: active ? c.hex : colors.text }]}>{c.label}</Text>
              </Pressable>
            )
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('kids_logForm_consistency')}</Text>
        <View style={styles.chipGrid}>
          {DIAPER_CONSISTENCIES.map((c) => {
            const active = consistency === c.id
            return (
              <Pressable
                key={c.id}
                onPress={() => setConsistency(c.id)}
                style={[styles.chip, {
                  backgroundColor: active ? ACCENT_SOFT : colors.surface,
                  borderColor: active ? ACCENT : (isDark ? colors.border : INK),
                  borderRadius: radius.full,
                }]}
              >
                <Text style={[styles.chipText, { color: active ? INK : colors.text }]}>{c.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </>
    )
  )

  const morePhotoAndNotes = diffuse ? (
    <>
      <DiffusePhotoRow
        photos={photos}
        onRemove={(i) => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
        onCamera={takePhoto}
        onGallery={pickPhoto}
        max={1}
      />
      <DiffuseField label={t('kids_logForm_placeholderNotes')} value={notes} onChangeText={setNotes} placeholder={t('kids_logForm_placeholderNotes')} />
    </>
  ) : (
    <>
      <View style={styles.photoRow}>
        {photos.map((uri, i) => (
          <View key={i} style={{ position: 'relative' }}>
            <Image source={{ uri }} style={[styles.photoThumb, { borderRadius: radius.lg }]} />
            <Pressable
              onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
              style={styles.photoDeleteBtn}
              hitSlop={4}
            >
              <X size={14} color="#FFFFFF" strokeWidth={3} />
            </Pressable>
          </View>
        ))}
        {photos.length === 0 && (
          <View style={styles.photoButtons}>
            <Pressable onPress={takePhoto} style={[styles.cameraBtn, { backgroundColor: ACCENT, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg }]}>
              <Camera size={24} color={INK} strokeWidth={2} />
            </Pressable>
            <Pressable onPress={pickPhoto} style={[styles.galleryBtn, { backgroundColor: colors.surfaceRaised, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg }]}>
              <Plus size={20} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
        )}
      </View>

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder={t('kids_logForm_placeholderNotes')}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: (isDark ? colors.border : INK), borderRadius: radius.lg }]}
      />
    </>
  )

  if (diffuse) {
    return (
      <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
        <View style={df.form}>
          <ActiveChildChip childId={childId} onChange={setChildId} />
          <View style={df.topRow}>
            <DateChip value={logDate} onChange={setLogDate} />
          </View>

          <DiffuseFormHeader kind="diaper" />

          {/* Diaper type — large tappable choice blobs */}
          <ChoiceStep options={DIAPER_OPTS} value={diaperType ? [diaperType] : []} onChange={(ids) => setDiaperType(ids[0] as DiaperType)} />

          {/* Poop details */}
          {poopDetails}

          <MoreSection label={t('kids_logForm_time')}>
            <TimeChip value={logTime} onChange={setLogTime} label={t('kids_logForm_time')} />
            {morePhotoAndNotes}
          </MoreSection>

          <SaveButton onPress={save} saving={saving} disabled={!childId || !diaperType} />
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <ActiveChildChip childId={childId} onChange={setChildId} />
        <View style={styles.topRow}>
          <DateChip value={logDate} onChange={setLogDate} />
        </View>

        <FormHeaderSticker kind="diaper" />

        {/* Diaper type — large tappable choice blobs */}
        <ChoiceStep options={DIAPER_OPTS} value={diaperType ? [diaperType] : []} onChange={(ids) => setDiaperType(ids[0] as DiaperType)} />

        {/* Poop details */}
        {poopDetails}

        <MoreSection label={t('kids_logForm_time')}>
          <TimeChip value={logTime} onChange={setLogTime} label={t('kids_logForm_time')} />
          {morePhotoAndNotes}
        </MoreSection>

        <SaveButton onPress={save} saving={saving} disabled={!childId || !diaperType} />
      </View>
    </ScrollView>
  )
}

// ─── 8. WAKE UP FORM ──────────────────────────────────────────────────────
// Finds the last open-ended sleep log (has startTime, no endTime) for the
// selected child within the past 24h and patches it with wake-up time +
// calculated duration. No new log is created — it completes the sleep session.

export function WakeUpForm({ onSaved, prefill, onSkip }: {
  onSaved: () => void
  prefill?: RoutinePrefill
  onSkip?: () => void
}) {
  const diffuse = useIsDiffuse()
  const { t } = useTranslation()
  const { colors, radius } = useTheme()
  const dTheme = useDiffuseTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)

  const [childId, setChildId] = useState(() =>
    prefill?.childId
      ?? activeChild?.id
      ?? (children.length === 1 ? (children[0]?.id ?? '') : '')
  )
  const [wakeTime, setWakeTime] = useState(() => toTimeStr(new Date()))
  const [openLog, setOpenLog] = useState<{
    id: string; startTime: string; date: string; routineName?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fetch the most recent open-ended sleep log within the last ~26h.
  //
  // We can't query JSON content server-side, so pull the last few days of
  // sleep logs and filter client-side. Looking back 3 days (rather than just
  // today/yesterday) avoids timezone-edge misses — a bedtime saved with
  // `date = Friday` may legitimately need to be matched on Sunday morning if
  // it's still inside the 24h window.
  useEffect(() => {
    if (!childId) return
    setLoading(true)
    setOpenLog(null)
    const lookback = new Date()
    lookback.setDate(lookback.getDate() - 3)
    const lookbackStr = toDateStr(lookback)
    supabase
      .from('child_logs')
      .select('id, value, date')
      .eq('child_id', childId)
      .eq('type', 'sleep')
      .gte('date', lookbackStr)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const now = Date.now()
        const MAX_AGE_MS = 26 * 60 * 60 * 1000 // 24h + 2h buffer
        // Find the most recent open log whose bedtime is within the window.
        const found = (data ?? []).find((log) => {
          try {
            const p = JSON.parse(log.value ?? '{}')
            if (!p.startTime || p.endTime) return false
            const bedDate = new Date(`${log.date}T${p.startTime}:00`)
            const age = now - bedDate.getTime()
            // Allow a small future skew (2 min) for clock drift, then cap at 26h
            return age >= -120_000 && age <= MAX_AGE_MS
          } catch { return false }
        })
        if (found) {
          try {
            const p = JSON.parse(found.value ?? '{}')
            setOpenLog({
              id: found.id,
              startTime: p.startTime,
              date: found.date,
              routineName: p.routineName,
            })
          } catch {}
        }
        setLoading(false)
      })
  }, [childId])

  const sleepDuration = useMemo(
    () => (openLog ? calcDuration(openLog.startTime, wakeTime) : ''),
    [openLog, wakeTime]
  )

  function bedtimeAgo(): string {
    if (!openLog) return ''
    const bedDate = new Date(openLog.date + 'T' + openLog.startTime + ':00')
    const mins = Math.round((Date.now() - bedDate.getTime()) / 60000)
    if (mins < 60) return `${mins}m ago`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`
  }

  async function save() {
    if (!openLog || !childId) return
    setSaving(true)
    try {
      const { data: orig } = await supabase
        .from('child_logs')
        .select('value, notes')
        .eq('id', openLog.id)
        .single()
      const p = orig?.value ? JSON.parse(orig.value) : {}
      const newValue = JSON.stringify({ ...p, endTime: wakeTime, duration: sleepDuration || undefined })
      await updateChildLog(openLog.id, newValue, orig?.notes ?? null)
      onSaved()
    } catch (e: any) {
      Alert.alert(t('kids_logForm_alertError'), e.message)
    } finally {
      setSaving(false)
    }
  }

  if (diffuse) {
    return (
      <View style={df.form}>
        <ChildSelector selected={childId} onSelect={setChildId} />
        <DiffuseFormHeader kind="wakeup" />

        {loading ? (
          <ActivityIndicator color={dTheme.colors.ink3} style={{ marginVertical: 24 }} />
        ) : openLog ? (
          <>
            {/* Bedtime summary — hairline row */}
            <View style={{ gap: 6, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: dTheme.colors.line }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Character name="sleep" size={15} color={dTheme.colors.ink3} />
                <Text style={{ color: dTheme.colors.ink, fontFamily: diffuseFont.monoBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  {openLog.routineName ?? t('kids_logForm_sleepSession')}{t('kids_logForm_separator')}{formatTimeLabel(openLog.startTime)}
                </Text>
              </View>
              <Text style={{ color: dTheme.colors.ink3, fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 0.8 }}>
                {bedtimeAgo()}
              </Text>
            </View>

            {/* Wake-up time picker */}
            <View style={df.topRow}>
              <View style={df.dateTimeRow}>
                <TimeChip value={wakeTime} onChange={setWakeTime} label={t('kids_logForm_wakeUp')} />
              </View>
            </View>

            {/* Duration preview — serif hero number over hairline rule */}
            {sleepDuration ? (
              <View style={{ paddingVertical: 18, alignItems: 'center', borderTopWidth: 1, borderColor: dTheme.colors.line }}>
                <Text style={{ color: dTheme.colors.ink, fontSize: 44, letterSpacing: -1, lineHeight: 48, fontFamily: diffuseFont.displayLight }}>{sleepDuration}</Text>
                <Text style={{ color: dTheme.colors.ink3, fontFamily: diffuseFont.mono, fontSize: 10, marginTop: 6, letterSpacing: 1.5, textTransform: 'uppercase' }}>{t('kids_logForm_totalSleep')}</Text>
              </View>
            ) : null}

            <SaveButton onPress={save} saving={saving} disabled={!childId} onSkip={onSkip} />
          </>
        ) : (
          <View style={{ paddingVertical: 28, alignItems: 'center', gap: 12 }}>
            <View style={[df.headerIcon, { width: 64, height: 64, borderRadius: 32, borderColor: dTheme.colors.line2 }]}>
              <Character name="sleep" size={28} color={dTheme.colors.ink3} />
            </View>
            <Text style={{ color: dTheme.colors.ink, fontFamily: diffuseFont.display, fontSize: 20, textAlign: 'center', letterSpacing: -0.3 }}>
              {t('kids_logForm_noBedtimeFound')}
            </Text>
            <Text style={{ color: dTheme.colors.ink3, fontFamily: diffuseFont.body, fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 }}>
              {t('kids_logForm_logBedtimeFirst')}
            </Text>
          </View>
        )}
      </View>
    )
  }

  return (
    <View style={styles.form}>
      <ChildSelector selected={childId} onSelect={setChildId} />
      <FormHeaderSticker kind="wakeup" />

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
      ) : openLog ? (
        <>
          {/* Bedtime summary card */}
          <View style={{ backgroundColor: ACCENT_SOFT, borderRadius: 16, padding: 16, gap: 6, borderWidth: 1, borderColor: ACCENT }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Moon size={15} color={ACCENT} strokeWidth={2} />
              <Text style={{ color: ACCENT, fontWeight: '700', fontSize: 14 }}>
                {openLog.routineName ?? t('kids_logForm_sleepSession')}{t('kids_logForm_separator')}{formatTimeLabel(openLog.startTime)}
              </Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '500' }}>
              {bedtimeAgo()}
            </Text>
          </View>

          {/* Wake-up time picker */}
          <View style={styles.topRow}>
            <View style={styles.dateTimeRow}>
              <TimeChip value={wakeTime} onChange={setWakeTime} label={t('kids_logForm_wakeUp')} />
            </View>
          </View>

          {/* Duration preview */}
          {sleepDuration ? (
            <View style={{ backgroundColor: ACCENT + '12', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: ACCENT + '25' }}>
              <Text style={{ color: ACCENT, fontSize: 36, letterSpacing: -1, lineHeight: 40, fontFamily: font.display }}>{sleepDuration}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }}>{t('kids_logForm_totalSleep')}</Text>
            </View>
          ) : null}

          <SaveButton onPress={save} saving={saving} disabled={!childId} onSkip={onSkip} />
        </>
      ) : (
        <View style={{ paddingVertical: 24, alignItems: 'center', gap: 10 }}>
          <Moon size={32} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>
            {t('kids_logForm_noBedtimeFound')}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
            {t('kids_logForm_logBedtimeFirst')}
          </Text>
        </View>
      )}
    </View>
  )
}

// ─── Save Button ───────────────────────────────────────────────────────────

/** Diffuse save CTA — containerless mono-caps label + arrow on a top hairline
 *  rule (the .solid vocabulary). Skip = quiet mono text link above. */
function DiffuseSaveButton({ onPress, saving, disabled, onSkip }: { onPress: () => void; saving: boolean; disabled?: boolean; onSkip?: () => void }) {
  const { colors } = useDiffuseTheme()
  const { t } = useTranslation()
  return (
    <View style={{ marginTop: 4 }}>
      {onSkip && (
        <Pressable onPress={onSkip} disabled={saving} style={({ pressed }) => [df.txtlink, { opacity: saving ? 0.4 : pressed ? 0.6 : 1 }]}>
          <Text style={[df.txtlinkText, { color: colors.ink3 }]}>{t('kids_logForm_skipThisTime')}</Text>
        </Pressable>
      )}
      <Pressable
        onPress={onPress}
        disabled={saving || disabled}
        style={({ pressed }) => [df.saveCta, { borderTopColor: disabled ? colors.line : colors.line2, opacity: pressed && !disabled ? 0.6 : 1 }]}
      >
        <Text style={[df.saveCtaLabel, { color: disabled ? colors.ink4 : colors.ink }]}>{t('common_save')}</Text>
        {saving
          ? <ActivityIndicator size="small" color={colors.ink} />
          : <DiffuseArrow color={disabled ? colors.ink4 : colors.ink} size={20} />}
      </Pressable>
    </View>
  )
}

function SaveButton({ onPress, saving, disabled, onSkip }: { onPress: () => void; saving: boolean; disabled?: boolean; onSkip?: () => void }) {
  const diffuse = useIsDiffuse()
  const { colors, isDark } = useTheme()
  const { t } = useTranslation()

  if (diffuse) {
    return <DiffuseSaveButton onPress={onPress} saving={saving} disabled={disabled} onSkip={onSkip} />
  }

  return (
    <View style={{ gap: 10, marginTop: 4 }}>
      {onSkip && (
        <Pressable
          onPress={onSkip}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtnGhost,
            {
              borderColor: isDark ? colors.borderStrong : INK,
              borderWidth: 1.5,
              opacity: saving ? 0.4 : 1,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MinusCircle size={16} color={colors.textMuted} strokeWidth={2} />
            <Text style={[styles.saveBtnGhostText, { color: colors.textMuted }]}>{t('kids_logForm_skipThisTime')}</Text>
          </View>
        </Pressable>
      )}
      <Pressable
        onPress={onPress}
        disabled={saving || disabled}
        style={({ pressed }) => [
          styles.saveBtnPrimary,
          {
            backgroundColor: disabled
              ? (colors.surface)
              : (isDark ? colors.text : INK),
            borderColor: disabled
              ? (isDark ? colors.border : INK)
              : (isDark ? colors.text : INK),
          },
          pressed && !disabled && { transform: [{ scale: 0.98 }], opacity: 0.92 },
        ]}
      >
        {saving ? (
          <ActivityIndicator color={disabled ? INK : '#FFFEF8'} />
        ) : (
          <Text style={[
            styles.saveBtnPrimaryText,
            { color: disabled ? (isDark ? colors.textMuted : 'rgba(20,19,19,0.4)') : '#FFFEF8' },
          ]}>{t('common_save')}</Text>
        )}
      </Pressable>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  form: { gap: 16, paddingBottom: 8 },
  topRow: { gap: 10 },
  dateTimeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateChip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1.5,
    shadowColor: INK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 1,
  },
  dateChipText: { fontSize: 13, fontFamily: font.bodyBold },
  datePickerWrap: { marginTop: 4, borderWidth: 1.5, overflow: 'hidden' },
  datePickerDone: { alignItems: 'center', paddingVertical: 10, borderTopWidth: 1 },
  datePickerDoneText: { fontSize: 15, fontWeight: '700' },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5,
    paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1.5,
    shadowColor: INK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 1,
  },
  timeChipLabel: { fontSize: 10, fontFamily: font.bodyBold, letterSpacing: 0.8, textTransform: 'uppercase' },
  timeChipValue: { fontSize: 13, fontFamily: font.bodyBold },
  childSelectorWrap: { gap: 6 },
  childSelectorPrompt: { fontSize: 13, fontFamily: font.bodyBold },
  childRow: { gap: 8 },
  childChip: {
    paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1.5,
    shadowColor: INK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 1,
  },
  childChipText: { fontSize: 14, fontFamily: font.bodyBold },
  iconBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12 },
  bannerLabel: { flex: 1, fontSize: 15, fontFamily: font.bodyMedium },
  autoDuration: { fontSize: 18, fontFamily: font.displayBold },
  input: {
    borderWidth: 1.5, paddingHorizontal: 20, minHeight: 52, fontSize: 15,
    fontFamily: font.bodyMedium, borderRadius: 999,
    shadowColor: INK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 1,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 9, paddingHorizontal: 14, borderWidth: 1.5,
    shadowColor: INK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 1,
  },
  chipText: { fontSize: 13, fontFamily: font.bodySemiBold },
  toggleRow: { flexDirection: 'row', padding: 4 },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  toggleText: { fontSize: 14, fontFamily: font.bodyBold },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: 72, height: 72 },
  photoDeleteBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: 'rgba(20,19,19,0.75)', borderRadius: 999, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  photoButtons: { flexDirection: 'row', gap: 8 },
  cameraBtn: {
    width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
    shadowColor: INK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 1,
  },
  galleryBtn: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed' },
  qualityRow: { flexDirection: 'row', gap: 8 },
  qualityBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14, gap: 6, borderWidth: 1.5,
    shadowColor: INK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 1,
  },
  qualityLabel: { fontSize: 11, fontFamily: font.bodyBold, textAlign: 'center' },
  flagRow: { flexDirection: 'row', gap: 8 },
  flagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderWidth: 1.5,
    shadowColor: INK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 1,
  },
  flagText: { fontSize: 13, fontFamily: font.bodySemiBold },
  moodRow: { flexDirection: 'row', gap: 8 },
  moodBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4, borderWidth: 1.5,
    shadowColor: INK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 1,
  },
  moodLabel: { fontSize: 11, fontFamily: font.bodyBold },
  saveBtnPrimary: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1.5,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  saveBtnPrimaryText: {
    fontSize: 16,
    fontFamily: font.bodyBold,
    letterSpacing: 0.2,
  },
  saveBtnGhost: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  saveBtnGhostText: { fontSize: 14, fontFamily: font.bodyMedium },

  // Scan plate (AI vision)
  scanPlateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, marginBottom: 12 },
  scanPlateText: { flex: 1, fontSize: 14, fontFamily: font.bodySemiBold },

  // Calorie banner
  foodTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5 },
  foodTagText: { fontSize: 13, fontWeight: '600' },
  foodTagRemove: { fontSize: 18, lineHeight: 20, fontWeight: '400' },
  popupBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,19,19,0.6)' },
  manualCalPopup: { position: 'absolute', left: 24, right: 24, top: '35%', padding: 20, borderWidth: 1 },
  manualCalTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  manualCalSubtitle: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  manualCalBtn: { paddingVertical: 12, alignItems: 'center', borderRadius: 999, borderWidth: 1 },
  manualCalBtnText: { fontSize: 14, fontWeight: '700' },
  calorieBanner: { marginTop: 8, padding: 12, borderWidth: 1 },
  calorieHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  calorieTotalText: { fontSize: 13, fontWeight: '700' },
  calorieMatchList: { gap: 3 },
  calorieMatchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calorieMatchDot: { width: 6, height: 6, borderRadius: 3 },
  calorieMatchFood: { flex: 1, fontSize: 12, fontWeight: '500' },
  calorieMatchCals: { fontSize: 12, fontWeight: '600' },

  // Expanded flag fields
  expandedFlag: { padding: 12, gap: 8, borderWidth: 1 },
  expandedFlagLabel: { fontSize: 13, fontWeight: '700' },
  expandedFlagInput: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontWeight: '500' },

  // Breast feeding
  lastSideBanner: { padding: 12, borderWidth: 1 },
  lastSideLabel: { fontSize: 13, fontWeight: '500', lineHeight: 20 },
  sectionLabel: { fontSize: 11, fontFamily: font.bodyMedium, textTransform: 'uppercase', letterSpacing: 1.2 },
  sideRow: { flexDirection: 'row', gap: 8 },
  sideBtn: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 8, borderWidth: 1 },
  breastIcon: { flexDirection: 'row', gap: 2, alignItems: 'flex-end' },
  breastShape: { width: 22, height: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 3 },
  breastShapeL: { borderTopLeftRadius: 14, borderTopRightRadius: 4, borderBottomLeftRadius: 10, borderBottomRightRadius: 4 },
  breastShapeR: { borderTopLeftRadius: 4, borderTopRightRadius: 14, borderBottomLeftRadius: 4, borderBottomRightRadius: 10 },
  breastNipple: { width: 5, height: 5, borderRadius: 3 },
  sideBtnText: { fontSize: 13, fontWeight: '700' },
  recommendedTag: { position: 'absolute', top: 4, right: 4, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  sideChipSmall: {
    flex: 1, alignItems: 'center', paddingVertical: 9, borderWidth: 1.5,
    shadowColor: INK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 1,
  },
  sideChipSmallText: { fontSize: 13, fontWeight: '600' },

  // Live timer
  timerWrap: { padding: 20, alignItems: 'center', gap: 16 },
  timerSideIndicator: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timerSideLabel: { fontSize: 16, fontWeight: '700' },
  timerDisplay: { fontSize: 56, fontWeight: '200', letterSpacing: 2, fontVariant: ['tabular-nums'], fontFamily: font.display },
  timerBreakdown: { flexDirection: 'row', gap: 12, width: '100%' },
  timerBreakdownItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  timerBreakdownDot: { width: 8, height: 8, borderRadius: 4 },
  timerBreakdownLabel: { fontSize: 14, fontWeight: '700' },
  timerBreakdownTime: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  switchAlert: { width: '100%', padding: 12, borderWidth: 1, alignItems: 'center' },
  switchAlertText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  timerActions: { flexDirection: 'row', gap: 10, width: '100%' },
  timerSwitchBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderWidth: 1 },
  timerSwitchText: { fontSize: 14, fontWeight: '700' },
  timerStopBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  timerStopText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  switchTargetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 1 },
  switchTargetLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  switchTargetChip: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  switchTargetChipText: { fontSize: 12, fontWeight: '700' },
  manualDivider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  manualDividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  manualDividerText: { fontSize: 12, fontWeight: '500' },
})
