/**
 * Pregnancy Log Forms — 15 log forms for pregnancy tracking.
 *
 * Each form saves to Supabase pregnancy_logs table.
 * Forms: Mood, Symptoms, Appointment, ExamResult, KickCount,
 *        Sleep, Exercise, Nutrition, Kegel, Water, Vitamins,
 *        NestingTask, BirthPrepTask, ContractionTimer, Weight
 */

import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import {
  Check,
} from 'lucide-react-native'
import Svg, { Path } from 'react-native-svg'
import {
  useTheme,
  useDiffuseTheme,
  diffuseFont,
  stickers as stickersLight,
  stickersDark,
  getModeColor,
  getModeColorSoft,
  font,
} from '../../constants/theme'
import { useIsDiffuse, DiffuseArrow } from '../ui/diffuse/DiffuseKit'
import { supabase } from '../../lib/supabase'
import { invalidatePregnancyLogQueries, queryClient } from '../../lib/queryClient'
import { toDateStr } from '../../lib/cycleLogic'
import { useUnitsStore } from '../../store/useUnitsStore'
import { kgToDisplay, displayToKg, weightLabel } from '../../lib/units'
import { useTranslation } from '../../lib/i18n'
import { LogFormSticker } from './LogFormSticker'
import { logSticker } from './logStickers'
import { MoodFace } from '../stickers/RewardStickers'
import { Heart as HeartSticker, Burst as BurstSticker, Star as StarSticker } from '../stickers/BrandStickers'
import { moodFaceVariant, moodFaceFill, moodExpression, moodBlobFill } from '../../lib/moodFace'
import { Character } from '../characters/Characters'
import { askGrandmaAboutSymptoms } from '../../lib/symptomAssist'
import { ExamForm } from '../exams/ExamForm'
import { StepSlider } from '../ui/StepSlider'
import { NumberStepper } from '../ui/NumberStepper'
import { diffuseLogHue, DIFFUSE_LOG_CHARACTER } from './DiffuseLogTimeline'

// ─── Shared save helper ────────────────────────────────────────────────────

async function savePregnancyLog(
  date: string,
  type: string,
  value?: string,
  notes?: string
) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  // ── Optimistic patch ───────────────────────────────────────────────────
  // Flip the UI to "logged" the instant the user taps save, before the
  // network insert completes. Rolled back if the insert errors.
  const userId = session.user.id
  const todayKey = ['pregnancy-today-logs', userId]
  const isToday = date === toDateStr(new Date())
  const previousToday = isToday
    ? queryClient.getQueryData<Record<string, { value: string | null; notes: string | null; created_at: string }>>(todayKey)
    : undefined
  if (isToday) {
    const optimisticEntry = {
      value: value ?? null,
      notes: notes ?? null,
      created_at: new Date().toISOString(),
    }
    queryClient.setQueryData(todayKey, {
      ...(previousToday ?? {}),
      [type]: optimisticEntry,
    })
  }

  try {
    const { error } = await supabase.from('pregnancy_logs').insert({
      user_id: userId,
      log_date: date,
      log_type: type,
      value: value ?? null,
      notes: notes ?? null,
    })
    if (error) throw error
  } catch (e) {
    // Roll back the optimistic patch and re-throw so the form surfaces it.
    if (isToday) queryClient.setQueryData(todayKey, previousToday)
    throw e
  }

  // Pull truth from server in the background — keeps charts / journey ring
  // / calendar in sync without blocking the UI we already updated.
  void invalidatePregnancyLogQueries()
}

// ─── Diffuse shared bits ───────────────────────────────────────────────────
// Header, chip + tag-chip in the Diffuse idiom: sticker in a hairline circle,
// mono eyebrow, serif title; chips are hairline pills with mono labels and an
// accent-tinted "on" state. Used only inside the Diffuse render branches; the
// current-system paths (LogFormSticker / colored chips) stay untouched.

// Diffuse header — intentionally renders nothing. The enclosing LogSheet
// already shows the "Log <Type>" title, so a second centred concept blob here
// was pure decoration (it read as an out-of-place violet glyph). Kept as a
// no-op so the ~14 call sites don't need to change — matches KidsLogForms.
function DiffuseFormHeader(_props: { type: string; title: string }) {
  return null
}

/** Hairline mono chip — accent-tinted surface + accent hairline when selected. */
function DiffuseChip({
  label, selected, onPress, showCheck, accent,
}: { label: string; selected: boolean; onPress: () => void; showCheck?: boolean; accent: string }) {
  const dt = useDiffuseTheme()
  return (
    <Pressable
      onPress={onPress}
      style={[
        dstyles.chip,
        {
          backgroundColor: selected ? accent + '1F' : 'transparent',
          borderColor: selected ? accent : dt.colors.line,
        },
      ]}
    >
      {showCheck && selected ? (
        <Check size={12} color={accent} strokeWidth={3} />
      ) : null}
      <Text
        style={[
          dstyles.chipLabel,
          { color: selected ? accent : dt.colors.ink3, fontFamily: selected ? diffuseFont.monoBold : diffuseFont.mono },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

/** Diffuse mono field label. */
function DiffuseFieldLabel({ children }: { children: React.ReactNode }) {
  const dt = useDiffuseTheme()
  return (
    <Text style={[dstyles.fieldLabel, { color: dt.colors.ink3, fontFamily: diffuseFont.mono }]}>
      {children}
    </Text>
  )
}

// ─── Mood Form ─────────────────────────────────────────────────────────────

// Mood ids are stable; labels resolved via i18n at render time.
const MOOD_IDS = ['excited', 'happy', 'okay', 'anxious', 'energetic'] as const
const MOOD_LABEL_KEYS = {
  excited: 'preg_mood_excited',
  happy: 'preg_mood_happy',
  okay: 'preg_mood_okay',
  anxious: 'preg_mood_anxious',
  energetic: 'preg_mood_energetic',
} as const

export function PregnancyMoodForm({
  date,
  onSaved,
}: {
  date: string
  onSaved: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = diffuseLogHue('mood')
  const s = isDark ? stickersDark : stickersLight
  const { t } = useTranslation()
  const [mood, setMood] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!mood) return
    setSaving(true)
    try {
      await savePregnancyLog(date, 'mood', mood, notes || undefined)
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="mood" title={t('preg_form_mood_question')} />
      ) : (
        <LogFormSticker
          type="mood"
          label={t('preg_form_mood_question')}
          tint={s.yellowSoft}
        />
      )}
      <View style={styles.moodRow}>
        {MOOD_IDS.map((id) => {
          const active = mood === id
          return (
            <Pressable
              key={id}
              onPress={() => setMood(id)}
              style={[
                styles.moodBtn,
                diffuse
                  ? {
                      backgroundColor: active ? dAccent + '1F' : 'transparent',
                      borderColor: active ? dAccent : dt.colors.line,
                      borderRadius: 18,
                    }
                  : {
                      backgroundColor: active ? getModeColorSoft('preg', isDark) : colors.surface,
                      borderColor: active ? getModeColor('preg', isDark) : colors.border,
                      borderRadius: radius.lg,
                    },
              ]}
            >
              {diffuse ? (
                <Character name="mood" size={44} face={moodExpression(id)} color={moodBlobFill(id)} />
              ) : (
                <MoodFace
                  variant={moodFaceVariant(id)}
                  fill={moodFaceFill(id)}
                  size={44}
                />
              )}
              <Text
                style={[
                  styles.moodLabel,
                  diffuse
                    ? { color: active ? dAccent : dt.colors.ink3, fontFamily: active ? diffuseFont.monoBold : diffuseFont.mono, letterSpacing: 0.4, textTransform: 'uppercase', fontSize: 10 }
                    : { color: active ? getModeColor('preg', isDark) : colors.textSecondary },
                ]}
              >
                {t(MOOD_LABEL_KEYS[id])}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder={t('preg_form_mood_notesPlaceholder')}
        placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
        multiline
        style={[
          styles.inputMultiline,
          diffuse
            ? { color: dt.colors.ink, backgroundColor: 'transparent', borderColor: dt.colors.line, borderRadius: 18, fontFamily: diffuseFont.body }
            : {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
              },
        ]}
      />
      <SaveButton onPress={save} saving={saving} disabled={!mood} />
    </View>
  )
}

// ─── Symptoms Form ─────────────────────────────────────────────────────────

// Symptom labels keyed for i18n. The stored value uses the English label
// (legacy stable ID) so existing logs survive translation changes.
const SYMPTOM_OPTIONS = [
  { id: 'Nausea', key: 'preg_symptom_nausea' },
  { id: 'Fatigue', key: 'preg_symptom_fatigue' },
  { id: 'Back pain', key: 'preg_symptom_backPain' },
  { id: 'Headache', key: 'preg_symptom_headache' },
  { id: 'Swelling', key: 'preg_symptom_swelling' },
  { id: 'Heartburn', key: 'preg_symptom_heartburn' },
  { id: 'Insomnia', key: 'preg_symptom_insomnia' },
  { id: 'Cramps', key: 'preg_symptom_cramps' },
  { id: 'Mood swings', key: 'preg_symptom_moodSwings' },
  { id: 'Cravings', key: 'preg_symptom_cravings' },
  { id: 'Braxton Hicks', key: 'preg_symptom_braxtonHicks' },
  { id: 'Shortness of breath', key: 'preg_symptom_shortBreath' },
] as const

export function PregnancySymptomsForm({
  date,
  onSaved,
}: {
  date: string
  onSaved: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = diffuseLogHue('symptom')
  const s = isDark ? stickersDark : stickersLight
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  function toggle(sym: string) {
    setSelected((prev) =>
      prev.includes(sym) ? prev.filter((x) => x !== sym) : [...prev, sym]
    )
  }

  async function save() {
    if (selected.length === 0) return
    setSaving(true)
    try {
      await savePregnancyLog(date, 'symptom', selected.join(', '), notes || undefined)
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="symptom" title={t('preg_form_symptoms_question')} />
      ) : (
        <LogFormSticker
          type="symptom"
          label={t('preg_form_symptoms_question')}
          tint={s.peachSoft}
        />
      )}
      <View style={styles.chipGrid}>
        {SYMPTOM_OPTIONS.map((opt) => {
          const active = selected.includes(opt.id)
          if (diffuse) {
            return (
              <DiffuseChip
                key={opt.id}
                label={t(opt.key)}
                selected={active}
                showCheck
                accent={dAccent}
                onPress={() => toggle(opt.id)}
              />
            )
          }
          return (
            <Pressable
              key={opt.id}
              onPress={() => toggle(opt.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? getModeColorSoft('preg', isDark) : colors.surface,
                  borderColor: active ? getModeColor('preg', isDark) : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              {active && (
                <Check size={12} color={getModeColor('preg', isDark)} strokeWidth={3} />
              )}
              <Text
                style={[
                  styles.chipText,
                  { color: active ? getModeColor('preg', isDark) : colors.text },
                ]}
              >
                {t(opt.key)}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder={t('preg_form_symptoms_notesPlaceholder')}
        placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
        multiline
        style={[
          styles.inputMultiline,
          diffuse
            ? { color: dt.colors.ink, backgroundColor: 'transparent', borderColor: dt.colors.line, borderRadius: 18, fontFamily: diffuseFont.body }
            : {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
              },
        ]}
      />
      {/* Symptom-triggered Grandma — offer to ask about the selected symptoms. */}
      {selected.length > 0 ? (
        <Pressable
          onPress={async () => {
            const labels = selected.map((id) => {
              const opt = SYMPTOM_OPTIONS.find((o) => o.id === id)
              return opt ? t(opt.key) : id
            })
            try { await savePregnancyLog(date, 'symptom', selected.join(', '), notes || undefined) } catch { /* still offer chat */ }
            askGrandmaAboutSymptoms(labels)
            onSaved()
          }}
          style={({ pressed }) => [{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999,
            backgroundColor: diffuse ? dt.stickers.lilacSoft : stickersLight.lilacSoft,
            alignSelf: 'flex-start', marginTop: 4, opacity: pressed ? 0.7 : 1,
          }]}
        >
          <Character name="heart" size={18} color={diffuse ? dt.stickers.lilac : stickersLight.lilac} />
          <Text style={{
            color: diffuse ? dt.colors.ink : stickersLight.charcoal,
            fontFamily: diffuse ? diffuseFont.bodySemiBold : undefined,
            fontWeight: diffuse ? undefined : '600', fontSize: 13,
          }}>
            {t('symptomAssist_ask')}
          </Text>
        </Pressable>
      ) : null}
      <SaveButton
        onPress={save}
        saving={saving}
        disabled={selected.length === 0}
      />
    </View>
  )
}

// ─── Appointment Form ──────────────────────────────────────────────────────

const APPOINTMENT_TYPES = [
  'Regular checkup',
  'Ultrasound',
  'Blood test',
  'Glucose test',
  'Group B strep',
  'Specialist',
  'Other',
]

export function AppointmentForm({
  date,
  onSaved,
}: {
  date: string
  onSaved: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = diffuseLogHue('appointment')
  const s = isDark ? stickersDark : stickersLight
  const [type, setType] = useState<string | null>(null)
  const [customType, setCustomType] = useState('')
  const [doctor, setDoctor] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const isOther = type === 'Other'
  const finalType = isOther ? customType.trim() : type
  const canSave = !!finalType

  async function save() {
    if (!finalType) return
    setSaving(true)
    try {
      await savePregnancyLog(
        date,
        'appointment',
        finalType,
        JSON.stringify({ doctor: doctor || undefined, notes: notes || undefined })
      )
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  // Sticker-on-paper palette (mode = pregnancy → lavender accent)
  const ST_INK = '#141313'
  const ST_PAPER = isDark ? colors.surface : '#FFFEF8'
  const ST_CREAM = isDark ? colors.surfaceRaised : '#F7F0DF'
  const ST_LAVENDER = isDark ? '#C4B5EF' : getModeColor('preg', isDark)
  const ST_LAVENDER_SOFT = getModeColorSoft('preg', isDark)
  const inkBorder = isDark ? colors.border : ST_INK
  const inkText = isDark ? colors.text : ST_INK

  // Diffuse hairline input style (shared across the 3 text fields below).
  const dInput = { color: dt.colors.ink, backgroundColor: 'transparent', borderColor: dt.colors.line, fontFamily: diffuseFont.body } as const

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="appointment" title={`Visit on ${formatDate(date)}`} />
      ) : (
        <LogFormSticker
          type="appointment"
          label={`Visit on ${formatDate(date)}`}
          tint={s.yellowSoft}
        />
      )}

      {/* Type chips — sticker pills / hairline mono chips */}
      <View style={styles.chipGrid}>
        {APPOINTMENT_TYPES.map((t) => {
          const active = type === t
          if (diffuse) {
            return (
              <DiffuseChip
                key={t}
                label={t}
                selected={active}
                accent={dAccent}
                onPress={() => setType(t)}
              />
            )
          }
          return (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active ? ST_LAVENDER_SOFT : ST_CREAM,
                  borderColor: isDark && !active ? colors.border : ST_INK,
                  borderWidth: 1.5,
                  borderRadius: 999,
                  shadowColor: ST_INK,
                  shadowOffset: { width: 0, height: active ? (pressed ? 1 : 2) : 0 },
                  shadowOpacity: active ? (1) : 0,
                  shadowRadius: 0,
                  elevation: active ? 3 : 0,
                  transform: [{ translateY: active && pressed ? 1 : 0 }],
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: inkText,
                    fontFamily: active ? 'DMSans_700Bold' : 'DMSans_600SemiBold',
                  },
                ]}
              >
                {t}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {isOther && (
        <TextInput
          value={customType}
          onChangeText={setCustomType}
          placeholder="Describe the appointment"
          placeholderTextColor={diffuse ? dt.colors.ink4 : (isDark ? colors.textMuted : '#8A8480')}
          autoFocus
          style={[
            styles.input,
            diffuse
              ? { ...dInput, borderWidth: 1, borderRadius: 18, height: 56 }
              : {
                  color: inkText,
                  backgroundColor: ST_CREAM,
                  borderColor: inkBorder,
                  borderWidth: 1.5,
                  borderRadius: 999,
                  height: 56,
                },
          ]}
        />
      )}

      <TextInput
        value={doctor}
        onChangeText={setDoctor}
        placeholder="Doctor name (optional)"
        placeholderTextColor={diffuse ? dt.colors.ink4 : (isDark ? colors.textMuted : '#8A8480')}
        style={[
          styles.input,
          diffuse
            ? { ...dInput, borderWidth: 1, borderRadius: 18, height: 56, paddingVertical: 0, textAlignVertical: 'center' }
            : {
                color: inkText,
                backgroundColor: ST_CREAM,
                borderColor: inkBorder,
                borderWidth: 1.5,
                borderRadius: 999,
                height: 56,
                paddingVertical: 0,
                textAlignVertical: 'center',
              },
        ]}
      />

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={diffuse ? dt.colors.ink4 : (isDark ? colors.textMuted : '#8A8480')}
        multiline
        style={[
          styles.inputMultiline,
          diffuse
            ? { ...dInput, borderWidth: 1, borderRadius: 18 }
            : {
                color: inkText,
                backgroundColor: ST_CREAM,
                borderColor: inkBorder,
                borderWidth: 1.5,
                borderRadius: 22,
              },
        ]}
      />

      <SaveButton onPress={save} saving={saving} disabled={!canSave} />
    </View>
  )
}

// ─── Exam Result Form ──────────────────────────────────────────────────────
// Delegates to the shared cross-behavior ExamForm (photo + AI extract + save
// into the unified `exams` table).

export function ExamResultForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  return <ExamForm behavior="pregnancy" date={date} onSaved={onSaved} />
}

// ─── Kick Count Form ───────────────────────────────────────────────────────

export function KickCountForm({
  date,
  onSaved,
}: {
  date: string
  onSaved: () => void
}) {
  const { colors, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = diffuseLogHue('kick_count')
  const { t } = useTranslation()
  const s = isDark ? stickersDark : stickersLight
  const [count, setCount] = useState(0)
  const [startTime] = useState(() => Date.now())
  const [saving, setSaving] = useState(false)

  async function save() {
    if (count === 0) return
    const durationMin = Math.round((Date.now() - startTime) / 60000)
    setSaving(true)
    try {
      await savePregnancyLog(
        date,
        'kick_count',
        count.toString(),
        JSON.stringify({ durationMinutes: durationMin })
      )
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const goal = 10
  const goalReached = count >= goal
  const dots = Array.from({ length: goal }, (_, i) => i < count)
  const ink = '#141313'
  const cream = '#FFFEF8'
  const pinkSticker = '#F2B2C7'
  // Diffuse ink ramp for the neutralized tap button / dots / copy.
  const dInk = dt.colors.ink
  const dInk3 = dt.colors.ink3

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="kick_count" title="Count baby's kicks" />
      ) : (
        <LogFormSticker
          type="kick_count"
          label="Count baby's kicks"
          tint={s.pinkSoft}
        />
      )}

      <View style={styles.kickCenter}>
        {/* Big tap button — sticker style with ink border + corner stickers */}
        <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center', paddingTop: 14, paddingBottom: 6 }}>
          <View style={{ position: 'absolute', top: -2, left: 14, transform: [{ rotate: '-18deg' }], opacity: diffuse ? 0.6 : 0.85 }} pointerEvents="none">
            <HeartSticker size={28} fill={pinkSticker} stroke={diffuse ? dt.colors.line2 : ink} />
          </View>
          <View style={{ position: 'absolute', top: 8, right: 14, transform: [{ rotate: '20deg' }], opacity: diffuse ? 0.6 : 0.85 }} pointerEvents="none">
            <StarSticker size={26} fill="#F5D652" stroke={diffuse ? dt.colors.line2 : ink} />
          </View>
          <View style={{ position: 'absolute', bottom: 6, right: 36, transform: [{ rotate: '-12deg' }], opacity: diffuse ? 0.5 : 0.7 }} pointerEvents="none">
            <BurstSticker size={22} fill="#9DC3E8" stroke={diffuse ? dt.colors.line2 : ink} />
          </View>

          <Pressable
            onPress={() => setCount((c) => c + 1)}
            style={({ pressed }) => [
              diffuse
                ? {
                    width: 168,
                    height: 168,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: goalReached ? dAccent : dt.colors.line2,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  }
                : {
                    width: 168,
                    height: 168,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: goalReached ? '#BDD48C' : pinkSticker,
                    borderWidth: 2.5,
                    borderColor: ink,
                    shadowColor: ink,
                    shadowOpacity: pressed ? 0.05 : 0.15,
                    shadowRadius: pressed ? 4 : 12,
                    shadowOffset: { width: 0, height: pressed ? 2 : 6 },
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  },
            ]}
          >
            <View style={diffuse ? {
              width: 140,
              height: 140,
              borderRadius: 999,
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: dt.colors.line,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            } : {
              width: 140,
              height: 140,
              borderRadius: 999,
              backgroundColor: cream,
              borderWidth: 1.5,
              borderColor: ink,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}>
              <Character name="kick" size={42} color={diffuse ? dInk : ink} />
              <Text style={{ fontSize: 12, fontFamily: diffuse ? diffuseFont.monoBold : font.bodyBold, color: diffuse ? dInk : ink, letterSpacing: 2 }}>{t('preg_form_kick_tap')}</Text>
            </View>
          </Pressable>
        </View>

        {/* Big count — serif */}
        <Text style={{
          fontSize: 56,
          fontFamily: diffuse ? diffuseFont.display : font.display,
          color: diffuse ? dInk : (isDark ? colors.text : ink),
          letterSpacing: -1.5,
          lineHeight: 60,
          marginTop: 4,
        }}>
          {count}
          <Text style={{
            fontSize: 22,
            fontFamily: diffuse ? diffuseFont.mono : font.display,
            color: diffuse ? dInk3 : (isDark ? colors.textMuted : 'rgba(20,19,19,0.55)'),
            letterSpacing: -0.4,
          }}>{count === 1 ? ' kick' : ' kicks'}</Text>
        </Text>

        {/* Goal dot ring */}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
          {dots.map((filled, i) => (
            <View
              key={i}
              style={{
                width: 11,
                height: 11,
                borderRadius: 999,
                backgroundColor: filled
                  ? (diffuse ? (goalReached ? dAccent : dt.colors.line2) : (goalReached ? '#BDD48C' : pinkSticker))
                  : 'transparent',
                borderWidth: 1.5,
                borderColor: filled
                  ? (diffuse ? (goalReached ? dAccent : dt.colors.line2) : ink)
                  : (diffuse ? dt.colors.line : (isDark ? colors.border : 'rgba(20,19,19,0.22)')),
              }}
            />
          ))}
        </View>

        <Text style={{
          fontSize: 13,
          fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium,
          color: diffuse ? dInk3 : (isDark ? colors.textMuted : 'rgba(20,19,19,0.55)'),
          textAlign: 'center',
          marginTop: 6,
          letterSpacing: diffuse ? 0.6 : 0,
          textTransform: diffuse ? 'uppercase' : 'none',
        }}>
          {goalReached
            ? 'Goal reached! Great session.'
            : `Goal: 10 kicks in 2 hours`}
        </Text>
      </View>

      <SaveButton
        onPress={save}
        saving={saving}
        disabled={count === 0}
        label="Save Session"
      />
    </View>
  )
}

// ─── Shared Save Button ────────────────────────────────────────────────────

function SaveButton({
  onPress,
  saving,
  disabled,
  label,
}: {
  onPress: () => void
  saving: boolean
  disabled?: boolean
  label?: string
}) {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const isDisabled = !!disabled

  if (diffuse) {
    // Containerless action: mono-caps label + arrow on a top hairline rule.
    // The Save arrow is shared across every log form, so it stays neutral ink
    // (not a behavior/log hue) to avoid clashing with each modal's own color.
    return (
      <Pressable
        onPress={saving || isDisabled ? undefined : onPress}
        style={[dstyles.saveBtnD, { borderTopColor: dt.colors.line2, opacity: isDisabled ? 0.45 : 1 }]}
      >
        {saving ? (
          <ActivityIndicator color={dt.colors.ink} />
        ) : (
          <>
            <Text style={[dstyles.saveLabelD, { color: dt.colors.ink, fontFamily: diffuseFont.monoBold }]}>
              {label ?? 'Save'}
            </Text>
            <DiffuseArrow color={dt.colors.ink3} size={18} />
          </>
        )}
      </Pressable>
    )
  }

  const ST_INK = '#141313'
  const ST_LAVENDER = isDark ? colors.primary : getModeColor('preg', isDark)
  const ST_CREAM = isDark ? colors.surfaceRaised : '#F7F0DF'
  return (
    <Pressable
      onPress={onPress}
      disabled={saving || isDisabled}
      style={({ pressed }) => [
        styles.saveBtn,
        {
          backgroundColor: isDisabled ? ST_CREAM : ST_LAVENDER,
          borderColor: isDark && isDisabled ? colors.border : ST_INK,
          borderWidth: 2,
          borderRadius: 999,
          shadowColor: ST_INK,
          shadowOffset: { width: 0, height: pressed ? 2 : 4 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 5,
          transform: [{ translateY: pressed && !isDisabled ? 2 : 0 }],
          opacity: isDisabled ? 0.55 : 1,
        },
      ]}
    >
      {saving ? (
        <ActivityIndicator color={isDisabled ? colors.textMuted : '#FFFEF8'} />
      ) : (
        <Text
          style={[
            styles.saveBtnText,
            { color: isDisabled ? (isDark ? colors.textMuted : '#6E6763') : '#FFFEF8' },
          ]}
        >
          {label ?? 'Save'}
        </Text>
      )}
    </Pressable>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// ─── Sleep Log Form ────────────────────────────────────────────────────────

export function SleepLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  // Diffuse: slider follows the log-type hue (sleep → lilac) instead of the
  // pregnancy behavior accent, so each modal reads as its own thing.
  const sliderColor = diffuse ? diffuseLogHue('sleep') : getModeColor('preg', isDark)
  const { t } = useTranslation()
  const s = isDark ? stickersDark : stickersLight
  const [hours, setHours] = useState(7)
  const [quality, setQuality] = useState(5)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await savePregnancyLog(date, 'sleep', hours.toString(), JSON.stringify({ quality }))
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="sleep" title={`Sleep on ${formatDate(date)}`} />
      ) : (
        <LogFormSticker
          type="sleep"
          label={`Sleep on ${formatDate(date)}`}
          tint={s.lilacSoft}
        />
      )}
      {diffuse ? <DiffuseFieldLabel>{t('preg_form_sleep_hoursSlept')}</DiffuseFieldLabel> : <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('preg_form_sleep_hoursSlept')}</Text>}
      <StepSlider
        min={3}
        max={12}
        value={hours}
        onChange={setHours}
        color={sliderColor}
        unit={hours === 1 ? 'hour' : 'hours'}
        blob={diffuse ? DIFFUSE_LOG_CHARACTER['sleep'] : undefined}
      />
      {diffuse ? <DiffuseFieldLabel>{t('preg_form_sleep_qualityRange')}</DiffuseFieldLabel> : <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('preg_form_sleep_qualityRange')}</Text>}
      <StepSlider
        min={1}
        max={10}
        value={quality}
        onChange={setQuality}
        color={sliderColor}
        blob={diffuse ? DIFFUSE_LOG_CHARACTER['sleep'] : undefined}
      />
      <SaveButton onPress={save} saving={saving} disabled={false} />
    </View>
  )
}

// ─── Exercise Log Form ─────────────────────────────────────────────────────

const EXERCISE_TYPES = ['Yoga', 'Walk', 'Swim', 'Stretching', 'Pilates', 'Other']

export function ExerciseLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = diffuseLogHue('exercise')
  const { t } = useTranslation()
  const s = isDark ? stickersDark : stickersLight
  const [exerciseType, setExerciseType] = useState<string | null>('Walk')
  const [customType, setCustomType] = useState('')
  const [minutes, setMinutes] = useState(30)
  const [saving, setSaving] = useState(false)

  const isOther = exerciseType === 'Other'
  const finalType = isOther ? customType.trim() : exerciseType
  const canSave = !!finalType

  async function save() {
    if (!finalType) return
    setSaving(true)
    try {
      await savePregnancyLog(date, 'exercise', minutes.toString(), JSON.stringify({ type: finalType }))
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="exercise" title={`Movement on ${formatDate(date)}`} />
      ) : (
        <LogFormSticker
          type="exercise"
          label={`Movement on ${formatDate(date)}`}
          tint={s.greenSoft}
        />
      )}
      {diffuse ? <DiffuseFieldLabel>{t('preg_form_exercise_typeLabel')}</DiffuseFieldLabel> : <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('preg_form_exercise_typeLabel')}</Text>}
      <View style={styles.chipRow}>
        {EXERCISE_TYPES.map((etype) => (
          diffuse ? (
            <DiffuseChip
              key={etype}
              label={etype}
              selected={exerciseType === etype}
              accent={dAccent}
              onPress={() => setExerciseType(etype)}
            />
          ) : (
            <Pressable
              key={etype}
              onPress={() => setExerciseType(etype)}
              style={[
                styles.chip,
                {
                  backgroundColor: exerciseType === etype ? getModeColor('preg', isDark) + '24' : colors.surface,
                  borderColor: exerciseType === etype ? getModeColor('preg', isDark) : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: exerciseType === etype ? getModeColor('preg', isDark) : colors.text }]}>{etype}</Text>
            </Pressable>
          )
        ))}
      </View>
      {isOther && (
        <TextInput
          value={customType}
          onChangeText={setCustomType}
          placeholder="What kind of movement?"
          placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
          autoFocus
          style={[
            styles.input,
            diffuse
              ? { color: dt.colors.ink, backgroundColor: 'transparent', borderColor: dt.colors.line, borderRadius: 18, fontFamily: diffuseFont.body }
              : {
                  color: colors.text,
                  backgroundColor: colors.surface,
                  borderColor: getModeColor('preg', isDark),
                  borderRadius: radius.lg,
                },
          ]}
        />
      )}
      {diffuse ? <DiffuseFieldLabel>{t('preg_form_exercise_minutesFieldLabel')}</DiffuseFieldLabel> : <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('preg_form_exercise_minutesFieldLabel')}</Text>}
      <StepSlider
        min={5}
        max={120}
        value={minutes}
        onChange={setMinutes}
        color={diffuse ? diffuseLogHue('exercise') : getModeColor('preg', isDark)}
        unit="min"
        blob={diffuse ? DIFFUSE_LOG_CHARACTER['exercise'] : undefined}
      />
      <SaveButton onPress={save} saving={saving} disabled={!canSave} />
    </View>
  )
}

// ─── Nutrition Log Form ────────────────────────────────────────────────────

const NUTRITION_TAGS = ['Iron', 'Folic acid', 'Protein', 'Calcium', 'DHA', 'Vitamin D']

export function NutritionLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = diffuseLogHue('nutrition')
  const { t } = useTranslation()
  const s = isDark ? stickersDark : stickersLight
  const [tags, setTags] = useState<string[]>([])
  const [nutritionNotes, setNutritionNotes] = useState('')
  const [saving, setSaving] = useState(false)

  function toggle(tag: string) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  async function save() {
    if (tags.length === 0) return
    setSaving(true)
    try {
      await savePregnancyLog(date, 'nutrition', tags.join(','), nutritionNotes || undefined)
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="nutrition" title={`Nourish on ${formatDate(date)}`} />
      ) : (
        <LogFormSticker
          type="nutrition"
          label={`Nourish on ${formatDate(date)}`}
          tint={s.greenSoft}
        />
      )}
      {diffuse ? <DiffuseFieldLabel>{t('preg_form_nutrition_coverageLabel')}</DiffuseFieldLabel> : <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('preg_form_nutrition_coverageLabel')}</Text>}
      <View style={styles.chipRow}>
        {NUTRITION_TAGS.map((tag) => {
          const active = tags.includes(tag)
          if (diffuse) {
            return (
              <DiffuseChip
                key={tag}
                label={tag}
                selected={active}
                accent={dAccent}
                onPress={() => toggle(tag)}
              />
            )
          }
          return (
            <Pressable
              key={tag}
              onPress={() => toggle(tag)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? getModeColor('preg', isDark) + '24' : colors.surface,
                  borderColor: active ? getModeColor('preg', isDark) : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? getModeColor('preg', isDark) : colors.text }]}>{tag}</Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={nutritionNotes}
        onChangeText={setNutritionNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
        multiline
        style={[styles.inputMultiline, diffuse
          ? { color: dt.colors.ink, backgroundColor: 'transparent', borderColor: dt.colors.line, borderRadius: 18, fontFamily: diffuseFont.body }
          : { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={tags.length === 0} />
    </View>
  )
}

// ─── Kegel Log Form ────────────────────────────────────────────────────────

export function KegelLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const s = isDark ? stickersDark : stickersLight
  const [sets, setSets] = useState(3)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await savePregnancyLog(date, 'kegel', sets.toString(), undefined)
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="kegel" title="Pelvic floor practice" />
      ) : (
        <LogFormSticker
          type="kegel"
          label="Pelvic floor practice"
          tint={s.lilacSoft}
        />
      )}
      {diffuse ? <DiffuseFieldLabel>{t('preg_form_kegel_setsCompletedLabel')}</DiffuseFieldLabel> : <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('preg_form_kegel_setsCompletedLabel')}</Text>}
      <StepSlider
        min={1}
        max={20}
        value={sets}
        onChange={setSets}
        color={diffuse ? diffuseLogHue('kegel') : getModeColor('preg', isDark)}
        unit={sets === 1 ? 'set' : 'sets'}
        blob={diffuse ? DIFFUSE_LOG_CHARACTER['kegel'] : undefined}
      />
      <SaveButton onPress={save} saving={saving} disabled={false} />
    </View>
  )
}

// ─── Water Log Form ────────────────────────────────────────────────────────

export function WaterLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, isDark, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = diffuseLogHue('water')
  const { t } = useTranslation()
  const s = isDark ? stickersDark : stickersLight
  const [glasses, setGlasses] = useState(1)
  const [saving, setSaving] = useState(false)

  const GOAL = 8
  const remaining = Math.max(0, GOAL - glasses)
  const ink = diffuse ? dt.colors.ink : (isDark ? colors.text : '#141313')
  const paper = diffuse ? 'transparent' : (isDark ? colors.surface : '#FFFEF8')
  const paperBorder = diffuse ? dt.colors.line : (isDark ? colors.border : 'rgba(20,19,19,0.10)')
  const dropFill = diffuse ? dAccent : '#9DC3E8'             // sticker blue / accent
  const dropMuted = diffuse ? dt.colors.line : (isDark ? colors.border : 'rgba(20,19,19,0.18)')
  const numFont = diffuse ? diffuseFont.display : font.display
  const stepBtnFont = diffuse ? diffuseFont.monoBold : font.display

  async function save() {
    setSaving(true)
    try {
      await savePregnancyLog(date, 'water', glasses.toString(), undefined)
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const hint =
    glasses >= GOAL ? 'Beautifully hydrated today.'
    : glasses >= GOAL / 2 ? `Halfway there — ${remaining} more to go.`
    : `${remaining} more to reach today's goal.`

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="water" title="Hydration check-in" />
      ) : (
        <LogFormSticker type="water" label="Hydration check-in" tint={s.blueSoft} />
      )}

      {/* Counter card */}
      <View style={[styles.waterCard, { backgroundColor: paper, borderColor: paperBorder }]}>
        <Text style={[styles.waterMetaLabel, { color: diffuse ? dt.colors.ink3 : ink, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold }]}>
          {t('preg_form_water_glassesTodayLabel')}
        </Text>

        <View style={styles.waterCounterRow}>
          <Pressable
            onPress={() => setGlasses((g) => Math.max(0, g - 1))}
            hitSlop={8}
            style={({ pressed }) => [
              styles.waterStepBtn,
              { backgroundColor: paper, borderColor: paperBorder },
              pressed && { transform: [{ scale: 0.94 }], opacity: 0.85 },
            ]}
          >
            <Text style={[styles.waterStepText, { color: ink, fontFamily: stepBtnFont }]}>{'−'}</Text>
          </Pressable>

          <Text style={[styles.waterValue, { color: ink, fontFamily: numFont }]}>
            {glasses}
            <Text style={[styles.waterValueUnit, { color: diffuse ? dt.colors.ink3 : ink, fontFamily: diffuse ? diffuseFont.mono : font.italic, fontStyle: diffuse ? 'normal' : 'italic' }]}>
              /{GOAL}
            </Text>
          </Text>

          <Pressable
            onPress={() => setGlasses((g) => Math.min(20, g + 1))}
            hitSlop={8}
            style={({ pressed }) => [
              styles.waterStepBtn,
              { backgroundColor: paper, borderColor: paperBorder },
              pressed && { transform: [{ scale: 0.94 }], opacity: 0.85 },
            ]}
          >
            <Text style={[styles.waterStepText, { color: ink, fontFamily: stepBtnFont }]}>+</Text>
          </Pressable>
        </View>

        {/* Droplet progress tally */}
        <View style={styles.waterDropletRow}>
          {Array.from({ length: GOAL }, (_, i) => (
            <Droplet key={i} filled={i < glasses} fill={dropFill} stroke={diffuse ? dAccent : ink} muted={dropMuted} />
          ))}
        </View>

        <Text style={[styles.waterHint, { color: diffuse ? dt.colors.ink3 : ink, fontFamily: diffuse ? diffuseFont.italic : font.italic }]}>
          {hint}
        </Text>
      </View>

      <SaveButton onPress={save} saving={saving} disabled={false} />
    </View>
  )
}

function Droplet({ filled, fill, stroke, muted }: { filled: boolean; fill: string; stroke: string; muted: string }) {
  return (
    <Svg width={18} height={24} viewBox="0 0 20 26">
      <Path
        d="M10 2 C5.5 9 2.5 14 2.5 18 C2.5 22.4 5.9 25.5 10 25.5 C14.1 25.5 17.5 22.4 17.5 18 C17.5 14 14.5 9 10 2 Z"
        fill={filled ? fill : 'none'}
        stroke={filled ? stroke : muted}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── Vitamins Log Form ─────────────────────────────────────────────────────

export function VitaminsLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = diffuseLogHue('vitamins')
  const { t } = useTranslation()
  const s = isDark ? stickersDark : stickersLight
  const [taken, setTaken] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  const OPTIONS: { value: boolean; label: string }[] = [
    { value: true, label: t('common_yes') },
    { value: false, label: t('common_no') },
  ]

  async function save() {
    if (taken === null) return
    setSaving(true)
    try {
      await savePregnancyLog(date, 'vitamins', taken ? '1' : '0', undefined)
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="vitamins" title="Prenatal vitamins" />
      ) : (
        <LogFormSticker
          type="vitamins"
          label="Prenatal vitamins"
          tint={s.greenSoft}
        />
      )}
      <Text style={[styles.fieldLabel, diffuse
        ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, textAlign: 'center' }
        : { color: colors.textSecondary, textAlign: 'center' }]}>
        {t('preg_form_vitamins_question')}
      </Text>
      <View style={[styles.chipRow, { justifyContent: 'center' }]}>
        {OPTIONS.map((opt) => {
          const active = taken === opt.value
          if (diffuse) {
            return (
              <DiffuseChip
                key={opt.label}
                label={opt.label}
                selected={active}
                accent={dAccent}
                onPress={() => setTaken(opt.value)}
              />
            )
          }
          return (
            <Pressable
              key={opt.label}
              onPress={() => setTaken(opt.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? getModeColor('preg', isDark) + '24' : colors.surface,
                  borderColor: active ? getModeColor('preg', isDark) : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? getModeColor('preg', isDark) : colors.text }]}>{opt.label}</Text>
            </Pressable>
          )
        })}
      </View>
      <SaveButton onPress={save} saving={saving} disabled={taken === null} />
    </View>
  )
}

// ─── Nesting Task Form ─────────────────────────────────────────────────────

const NESTING_CATEGORIES = ['Nursery', 'Cleaning', 'Laundry', 'Shopping', 'Organizing', 'Other']

export function NestingTaskForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = diffuseLogHue('appointment')
  const { t } = useTranslation()
  const s = isDark ? stickersDark : stickersLight
  const [nestingTitle, setNestingTitle] = useState('')
  const [nestingCategory, setNestingCategory] = useState<string | null>(null)
  const [customCategory, setCustomCategory] = useState('')
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  const isOther = nestingCategory === 'Other'
  const finalCategory = isOther ? (customCategory.trim() || 'Other') : (nestingCategory ?? 'Other')

  async function save() {
    if (!nestingTitle) return
    setSaving(true)
    try {
      await savePregnancyLog(date, 'nesting', done ? '1' : '0', JSON.stringify({ title: nestingTitle, category: finalCategory }))
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="nesting" title="Getting ready at home" />
      ) : (
        <LogFormSticker
          type="nesting"
          label="Getting ready at home"
          tint={s.peachSoft}
        />
      )}
      <TextInput
        value={nestingTitle}
        onChangeText={setNestingTitle}
        placeholder="Task name (e.g. Set up crib)"
        placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
        style={[styles.input, diffuse
          ? { color: dt.colors.ink, backgroundColor: 'transparent', borderColor: dt.colors.line, borderRadius: 18, fontFamily: diffuseFont.body }
          : { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      {diffuse ? <DiffuseFieldLabel>{t('preg_form_nesting_categoryLabel')}</DiffuseFieldLabel> : <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('preg_form_nesting_categoryLabel')}</Text>}
      <View style={styles.chipRow}>
        {NESTING_CATEGORIES.map((cat) => (
          diffuse ? (
            <DiffuseChip
              key={cat}
              label={cat}
              selected={nestingCategory === cat}
              accent={dAccent}
              onPress={() => setNestingCategory(cat)}
            />
          ) : (
            <Pressable
              key={cat}
              onPress={() => setNestingCategory(cat)}
              style={[
                styles.chip,
                {
                  backgroundColor: nestingCategory === cat ? getModeColor('preg', isDark) + '24' : colors.surface,
                  borderColor: nestingCategory === cat ? getModeColor('preg', isDark) : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: nestingCategory === cat ? getModeColor('preg', isDark) : colors.text }]}>{cat}</Text>
            </Pressable>
          )
        ))}
      </View>
      {isOther && (
        <TextInput
          value={customCategory}
          onChangeText={setCustomCategory}
          placeholder="Custom category"
          placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
          autoFocus
          style={[styles.input, diffuse
            ? { color: dt.colors.ink, backgroundColor: 'transparent', borderColor: dt.colors.line2, borderRadius: 18, fontFamily: diffuseFont.body }
            : { color: colors.text, backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#141313', borderRadius: radius.lg }]}
        />
      )}
      <Pressable
        onPress={() => setDone((d) => !d)}
        style={[styles.toggleRow2, diffuse
          ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line, borderRadius: 18 }
          : { backgroundColor: colors.surface, borderRadius: radius.lg }]}
      >
        <Text style={[styles.toggleLabel, diffuse
          ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.4, textTransform: 'uppercase', fontSize: 12 }
          : { color: colors.text }]}>{t('preg_form_nesting_alreadyDone')}</Text>
        <View style={[styles.togglePill, { backgroundColor: done ? (diffuse ? dAccent : getModeColor('preg', isDark)) : (diffuse ? dt.colors.line2 : colors.border) }]}>
          <View style={[styles.toggleThumb, { marginLeft: done ? 20 : 2 }]} />
        </View>
      </Pressable>
      <SaveButton onPress={save} saving={saving} disabled={!nestingTitle} />
    </View>
  )
}

// ─── Birth Prep Task Form ──────────────────────────────────────────────────


const BIRTH_PREP_CATEGORIES = ['Hospital bag', 'Birth plan', 'Classes', 'Postpartum', 'Baby gear', 'Admin', 'Other']

export function BirthPrepTaskForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = diffuseLogHue('appointment')
  const { t } = useTranslation()
  const s = isDark ? stickersDark : stickersLight
  const [birthPrepTitle, setBirthPrepTitle] = useState('')
  const [birthPrepCategory, setBirthPrepCategory] = useState<string | null>(null)
  const [customCategory, setCustomCategory] = useState('')
  const [dueWeek, setDueWeek] = useState<number>(36)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  const isOther = birthPrepCategory === 'Other'
  const finalCategory = isOther ? (customCategory.trim() || 'Other') : (birthPrepCategory ?? 'Other')

  async function save() {
    if (!birthPrepTitle) return
    setSaving(true)
    try {
      await savePregnancyLog(date, 'birth_prep', done ? '1' : '0', JSON.stringify({ title: birthPrepTitle, category: finalCategory, dueWeek }))
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="birth_prep" title="Preparing for baby" />
      ) : (
        <LogFormSticker
          type="birth_prep"
          label="Preparing for baby"
          tint={s.lilacSoft}
        />
      )}
      <TextInput
        value={birthPrepTitle}
        onChangeText={setBirthPrepTitle}
        placeholder="Task name (e.g. Pack hospital bag)"
        placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
        style={[styles.input, diffuse
          ? { color: dt.colors.ink, backgroundColor: 'transparent', borderColor: dt.colors.line, borderRadius: 18, fontFamily: diffuseFont.body }
          : { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      {diffuse ? <DiffuseFieldLabel>{t('preg_form_nesting_categoryLabel')}</DiffuseFieldLabel> : <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('preg_form_nesting_categoryLabel')}</Text>}
      <View style={styles.chipRow}>
        {BIRTH_PREP_CATEGORIES.map((cat) => (
          diffuse ? (
            <DiffuseChip
              key={cat}
              label={cat}
              selected={birthPrepCategory === cat}
              accent={dAccent}
              onPress={() => setBirthPrepCategory(cat)}
            />
          ) : (
            <Pressable
              key={cat}
              onPress={() => setBirthPrepCategory(cat)}
              style={[
                styles.chip,
                {
                  backgroundColor: birthPrepCategory === cat ? getModeColor('preg', isDark) + '24' : colors.surface,
                  borderColor: birthPrepCategory === cat ? getModeColor('preg', isDark) : colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: birthPrepCategory === cat ? getModeColor('preg', isDark) : colors.text }]}>{cat}</Text>
            </Pressable>
          )
        ))}
      </View>
      {isOther && (
        <TextInput
          value={customCategory}
          onChangeText={setCustomCategory}
          placeholder="Custom category"
          placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
          autoFocus
          style={[styles.input, diffuse
            ? { color: dt.colors.ink, backgroundColor: 'transparent', borderColor: dt.colors.line2, borderRadius: 18, fontFamily: diffuseFont.body }
            : { color: colors.text, backgroundColor: colors.surface, borderColor: getModeColor('preg', isDark), borderRadius: radius.lg }]}
        />
      )}
      {diffuse ? <DiffuseFieldLabel>{t('preg_form_birthprep_dueByWeek')}</DiffuseFieldLabel> : <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('preg_form_birthprep_dueByWeek')}</Text>}
      <StepSlider
        min={20}
        max={42}
        value={dueWeek}
        onChange={setDueWeek}
        color={diffuse ? diffuseLogHue('appointment') : getModeColor('preg', isDark)}
        unit={`week${dueWeek === 1 ? '' : 's'}`}
      />
      <Pressable
        onPress={() => setDone((d) => !d)}
        style={[styles.toggleRow2, diffuse
          ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line, borderRadius: 18 }
          : { backgroundColor: colors.surface, borderRadius: radius.lg }]}
      >
        <Text style={[styles.toggleLabel, diffuse
          ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.4, textTransform: 'uppercase', fontSize: 12 }
          : { color: colors.text }]}>{t('preg_form_nesting_alreadyDone')}</Text>
        <View style={[styles.togglePill, { backgroundColor: done ? (diffuse ? dAccent : getModeColor('preg', isDark)) : (diffuse ? dt.colors.line2 : colors.border) }]}>
          <View style={[styles.toggleThumb, { marginLeft: done ? 20 : 2 }]} />
        </View>
      </Pressable>
      <SaveButton onPress={save} saving={saving} disabled={!birthPrepTitle} />
    </View>
  )
}

// ─── Contraction Timer Log Form ─────────────────────────────────────────────

export function ContractionTimerLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  // Diffuse: slider follows the contraction hue (coral) instead of the behavior accent.
  const sliderColor = diffuse ? diffuseLogHue('contraction') : getModeColor('preg', isDark)
  const { t } = useTranslation()
  const s = isDark ? stickersDark : stickersLight
  const [durationSec, setDurationSec] = useState(45)
  const [intervalMin, setIntervalMin] = useState(10)
  const [contractionNotes, setContractionNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await savePregnancyLog(date, 'contraction', durationSec.toString(), JSON.stringify({ intervalMin, notes: contractionNotes || undefined }))
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="contraction" title={`Contraction on ${formatDate(date)}`} />
      ) : (
        <LogFormSticker
          type="contraction"
          label={`Contraction on ${formatDate(date)}`}
          tint={s.pinkSoft}
        />
      )}
      {diffuse ? <DiffuseFieldLabel>{t('preg_form_contraction_durationLabel')}</DiffuseFieldLabel> : <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('preg_form_contraction_durationLabel')}</Text>}
      <StepSlider
        min={10}
        max={180}
        value={durationSec}
        onChange={setDurationSec}
        color={sliderColor}
        unit="sec"
        blob={diffuse ? DIFFUSE_LOG_CHARACTER['contraction'] : undefined}
      />
      {diffuse ? <DiffuseFieldLabel>{t('preg_form_contraction_intervalLabel')}</DiffuseFieldLabel> : <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('preg_form_contraction_intervalLabel')}</Text>}
      <StepSlider
        min={1}
        max={30}
        value={intervalMin}
        onChange={setIntervalMin}
        color={sliderColor}
        unit={intervalMin === 1 ? 'minute' : 'minutes'}
        blob={diffuse ? DIFFUSE_LOG_CHARACTER['contraction'] : undefined}
      />
      <TextInput
        value={contractionNotes}
        onChangeText={setContractionNotes}
        placeholder="Notes (intensity, location)"
        placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
        multiline
        style={[styles.inputMultiline, diffuse
          ? { color: dt.colors.ink, backgroundColor: 'transparent', borderColor: dt.colors.line, borderRadius: 18, fontFamily: diffuseFont.body }
          : { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
      />
      <SaveButton onPress={save} saving={saving} disabled={false} />
    </View>
  )
}

// ─── Weight Log Form ──────────────────────────────────────────────────────

export function WeightLogForm({ date, onSaved }: { date: string; onSaved: () => void }) {
  const { colors, radius, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const s = isDark ? stickersDark : stickersLight
  // Weight is stored canonically in kg but dialed in the user's chosen unit.
  const weightUnit = useUnitsStore((s) => s.weightUnit)
  // Stepper default 70 kg, shown in the display unit.
  const [weight, setWeight] = useState(() => Math.round(kgToDisplay(70, weightUnit) * 10) / 10)
  const [saving, setSaving] = useState(false)
  const accent = diffuse ? diffuseLogHue('weight') : (isDark ? stickersDark.peach : stickersLight.peach)

  async function save() {
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Invalid', 'Please enter a valid weight.')
      return
    }
    setSaving(true)
    try {
      // Convert the displayed value back to canonical kg before saving.
      const kg = displayToKg(weight, weightUnit)
      await savePregnancyLog(date, 'weight', kg.toFixed(2), undefined)
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="weight" title={`Weight on ${formatDate(date)}`} />
      ) : (
        <LogFormSticker
          type="weight"
          label={`Weight on ${formatDate(date)}`}
          tint={s.peachSoft}
        />
      )}
      {diffuse ? <DiffuseFieldLabel>{t('preg_form_weight_fieldLabel')}</DiffuseFieldLabel> : <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('preg_form_weight_fieldLabel')}</Text>}
      <View style={[styles.weightCard, diffuse
        ? { backgroundColor: 'transparent', borderColor: dt.colors.line, borderRadius: 20 }
        : { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
        <NumberStepper
          value={weight}
          onChange={setWeight}
          step={weightUnit === 'lb' ? 0.2 : 0.1}
          min={weightUnit === 'lb' ? 44 : 20}
          max={weightUnit === 'lb' ? 550 : 250}
          precision={1}
          unit={weightLabel(weightUnit)}
          color={accent}
        />
      </View>
      <SaveButton onPress={save} saving={saving} disabled={weight <= 0} />
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  form: {
    gap: 16,
    paddingBottom: 8,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 18,
    height: 56,
    fontSize: 15,
    fontFamily: font.bodyMedium,
    fontWeight: '500',
  },
  inputMultiline: {
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    minHeight: 80,
    fontSize: 15,
    fontFamily: font.body,
    textAlignVertical: 'top',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  moodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    gap: 8,
    borderWidth: 1,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  kickCenter: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  saveBtn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: font.bodyBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: font.bodyMedium,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  numberRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  numberBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  numberBtnText: {
    fontSize: 14,
    fontFamily: font.bodyMedium,
    fontWeight: '600',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginVertical: 16,
  },
  counterBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnText: {
    fontSize: 28,
    fontFamily: 'Fraunces_800ExtraBold',
    lineHeight: 32,
  },
  counterValue: {
    fontSize: 48,
    fontFamily: 'Fraunces_800ExtraBold',
    minWidth: 64,
    textAlign: 'center',
  },

  weightCard: {
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  // ── Water log card ───────────────────────────────────────────────────────
  waterCard: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    gap: 14,
  },
  waterMetaLabel: {
    fontSize: 11,
    letterSpacing: 1.8,
    textAlign: 'center',
    opacity: 0.55,
    textTransform: 'uppercase',
  },
  waterCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  waterStepBtn: {
    width: 52,
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  waterStepText: {
    fontSize: 28,
    lineHeight: 30,
  },
  waterValue: {
    fontSize: 72,
    letterSpacing: -3,
    lineHeight: 76,
  },
  waterValueUnit: {
    fontSize: 28,
    opacity: 0.45,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  waterDropletRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  waterHint: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
    paddingTop: 4,
  },
  toggleRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: font.bodyMedium,
    fontWeight: '600',
  },
  togglePill: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
})

// ─── Diffuse styles ─────────────────────────────────────────────────────────
const dstyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerChip: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 999,
  },
  chipLabel: {
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
  },
  saveBtnD: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveLabelD: {
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
})
