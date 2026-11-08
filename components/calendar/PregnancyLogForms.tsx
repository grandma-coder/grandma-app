/**
 * Pregnancy Log Forms — 15 log forms for pregnancy tracking.
 *
 * Each form saves to Supabase pregnancy_logs table.
 * Forms: Mood, Symptoms, Appointment, ExamResult, KickCount,
 *        Sleep, Exercise, Nutrition, Kegel, Water, Vitamins,
 *        NestingTask, BirthPrepTask, ContractionTimer, Weight
 */

import { dateLoc } from '../../lib/kpLocale'
import { SheetFooterAction } from './LogSheet'
import { EyeAction, ACTION_TONES } from '../ui/AuthDock'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { assertNotFuture } from '../../lib/futureDate'
import { pregnancyLogErrorText } from '../../lib/pregnancyLogError'
import {
  View,
  Text,
  TextInput,
  type TextInputProps,
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
import { useTranslation, t as tNow } from '../../lib/i18n'
import { LogFormSticker } from './LogFormSticker'
import { logSticker } from './logStickers'
import { PREGNANCY_LOG_STICKER, PREGNANCY_MOOD_STICKER } from '../../lib/logStickers'
import { MoodFace } from '../stickers/RewardStickers'
import { Heart as HeartSticker, Burst as BurstSticker, Star as StarSticker } from '../stickers/BrandStickers'
import { moodFaceVariant, moodFaceFill, moodExpression, moodBlobFill } from '../../lib/moodFace'
import { Character } from '../characters/Characters'
import { askGrandmaAboutSymptoms, canAskGrandma } from '../../lib/symptomAssist'
import { ExamForm } from '../exams/ExamForm'
import { StepSlider } from '../ui/StepSlider'
import { NumberStepper } from '../ui/NumberStepper'
import { diffuseLogHue, DIFFUSE_LOG_CHARACTER } from './DiffuseLogTimeline'
import { SiteChoice, SiteStepper } from '../ui/SiteChoice'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { StickerChoice, MoreSection } from './QuickLogKit'

// ─── Shared save helper ────────────────────────────────────────────────────

/** Log types that hold one value per day (the rest — appointments, kicks, contractions, tasks —
 *  legitimately repeat). */
const SINGLE_PER_DAY = new Set(['mood', 'symptom', 'sleep', 'exercise', 'kegel', 'water', 'vitamins', 'weight'])

/**
 * The row already saved for this day + type, so re-opening a form shows what she logged instead
 * of a blank form. `apply` runs once per date/type when the row arrives.
 */
function useExistingPregnancyLog(
  date: string,
  type: string,
  apply: (row: { value: string | null; notes: string | null }) => void,
  /** No row on this day → start from the most recent earlier entry (e.g. weight). */
  latestFallback = false,
) {
  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id))
  }, [])
  const { data } = useQuery({
    queryKey: ['pregnancy-logs', 'existing', userId, date, type, latestFallback],
    queryFn: async (): Promise<{ value: string | null; notes: string | null } | null> => {
      if (!userId) return null
      const { data: rows, error } = await supabase
        .from('pregnancy_logs')
        .select('value, notes')
        .eq('user_id', userId)
        .eq('log_date', date)
        .eq('log_type', type)
        .order('created_at', { ascending: false })
        .limit(1)
      if (error) throw error
      if (rows?.[0] || !latestFallback) return rows?.[0] ?? null
      const { data: earlier, error: e2 } = await supabase
        .from('pregnancy_logs')
        .select('value, notes')
        .eq('user_id', userId)
        .lt('log_date', date)
        .eq('log_type', type)
        .order('log_date', { ascending: false })
        .limit(1)
      if (e2) throw e2
      return earlier?.[0] ?? null
    },
    enabled: !!userId,
    staleTime: 0,
  })
  const [appliedFor, setAppliedFor] = useState<string | null>(null)
  const key = `${date}|${type}`
  useEffect(() => {
    if (data && appliedFor !== key) {
      apply(data)
      setAppliedFor(key)
    }
  }, [data, key]) // eslint-disable-line react-hooks/exhaustive-deps
}

function parseJson<T>(s: string | null): Partial<T> {
  if (!s) return {}
  try { const v = JSON.parse(s); return v && typeof v === 'object' ? v : {} } catch { return {} }
}

async function savePregnancyLog(
  date: string,
  type: string,
  value?: string,
  notes?: string
) {
  assertNotFuture(date)
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error(tNow('kp_pk_notAuth'))

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
    // One row per day for single-value types: re-saving replaces instead of stacking duplicates.
    if (SINGLE_PER_DAY.has(type)) {
      const { error: deleteError } = await supabase
        .from('pregnancy_logs')
        .delete()
        .eq('user_id', userId)
        .eq('log_date', date)
        .eq('log_type', type)
      if (deleteError) throw deleteError
    }
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

// ─── Site look (light) pieces ──────────────────────────────────────────────
// Light-mode forms: one main question first, card-less sticker options, quiet
// extras behind "More", save pinned in the sheet footer. Diffuse never uses these.

/** The form's one main question — hand-lettered, uppercase, ink. */
function SiteQuestion({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme()
  return (
    <Text style={[sl.question, { color: colors.text, fontFamily: font.display }]}>{children}</Text>
  )
}

/** Quiet mono label for a secondary field. */
function SiteEyebrow({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme()
  return <Text style={[sl.eyebrow, { color: colors.textMuted }]}>{children}</Text>
}

/** White field with a clean 1.5px ink outline. */
function SiteInput(props: TextInputProps) {
  const { colors } = useTheme()
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      {...props}
      style={[
        sl.input,
        { color: colors.text, backgroundColor: colors.surface, borderColor: colors.text, fontFamily: font.body },
        props.multiline ? sl.inputMulti : null,
        props.style,
      ]}
    />
  )
}

interface SiteOption { id: string; label: string; sticker: SiteStickerName }

/** Card-less sticker options (single or multi — the caller decides what "on" means). */
function SiteStickerGrid({
  options, isOn, onPress, width = '33.33%',
}: {
  options: SiteOption[]
  isOn: (id: string) => boolean
  onPress: (id: string) => void
  width?: `${number}%`
}) {
  const { isDark } = useTheme()
  const tone = getModeColorSoft('preg', isDark)
  return (
    <View style={sl.grid}>
      {options.map((o) => (
        <StickerChoice key={o.id} width={width} label={o.label} sticker={o.sticker} on={isOn(o.id)} tone={tone} onPress={() => onPress(o.id)} />
      ))}
    </View>
  )
}

/** A few common values as one-tap pills (the current value always shows, even if custom). */
function SitePresets({
  value, onChange, presets, unit,
}: { value: number; onChange: (v: number) => void; presets: number[]; unit: string }) {
  const { isDark } = useTheme()
  const tone = getModeColorSoft('preg', isDark)
  const all = presets.includes(value) ? presets : [...presets, value].sort((a, b) => a - b)
  return (
    <View style={sl.pills}>
      {all.map((p) => (
        <SiteChoice key={p} compact tick={false} label={`${p} ${unit}`} selected={value === p} tone={tone} onPress={() => onChange(p)} />
      ))}
    </View>
  )
}

/** Centered stepper block with its unit — for plain counts (hours, sets, glasses). */
function SiteCounter({
  value, onChange, min, max, unit,
}: { value: number; onChange: (v: number) => void; min: number; max: number; unit: string }) {
  const { isDark } = useTheme()
  return (
    <View style={{ paddingVertical: 4 }}>
      <SiteStepper value={value} onChange={onChange} min={min} max={max} unit={unit} tone={getModeColorSoft('preg', isDark)} />
    </View>
  )
}

const MOOD_STICKER = PREGNANCY_MOOD_STICKER as Record<(typeof MOOD_IDS)[number], SiteStickerName>
// Stored ids stay English; only the visible label is translated.
const PLF_LABEL_KEYS = {
  'Regular checkup': 'kp_plf_l_checkup', Ultrasound: 'preg_appts_type_ultrasound', 'Blood test': 'kp_plf_l_blood',
  'Glucose test': 'kp_plf_l_glucose', 'Group B strep': 'kp_plf_l_gbs', Specialist: 'preg_appts_type_specialist',
  Other: 'preg_appts_type_other', Yoga: 'kp_plf_l_yoga', Walk: 'kp_plf_l_walk', Swim: 'kp_plf_l_swim',
  Stretching: 'kp_plf_l_stretch', Pilates: 'kp_plf_l_pilates', Iron: 'kp_plf_l_iron', 'Folic acid': 'kp_plf_l_folic',
  Protein: 'kp_plf_l_protein', Calcium: 'kp_plf_l_calcium', DHA: 'kp_plf_l_dha', 'Vitamin D': 'kp_plf_l_vitd',
  Nursery: 'kp_plf_l_nursery', Cleaning: 'kp_plf_l_cleaning', Laundry: 'kp_plf_l_laundry', Shopping: 'kp_plf_l_shopping',
  Organizing: 'kp_plf_l_organizing', 'Hospital bag': 'kp_plf_l_bag', 'Birth plan': 'kp_plf_l_plan', Classes: 'kp_plf_l_classes',
  Postpartum: 'kp_plf_l_postpartum', 'Baby gear': 'kp_plf_l_gear', Admin: 'kp_plf_l_admin',
} as const
function plfLabel(id: string): string {
  const key = (PLF_LABEL_KEYS as Record<string, (typeof PLF_LABEL_KEYS)[keyof typeof PLF_LABEL_KEYS]>)[id]
  return key ? tNow(key) : id
}

const APPOINTMENT_STICKER: Record<string, SiteStickerName> = {
  'Regular checkup': 'doc', Ultrasound: 'camera', 'Blood test': 'syringe', 'Glucose test': 'drop',
  'Group B strep': 'otest', Specialist: 'heart', Other: 'pencil',
}
const EXERCISE_STICKER: Record<string, SiteStickerName> = {
  Yoga: 'flower', Walk: 'shoe', Swim: 'sun', Stretching: 'leaf', Pilates: 'star', Other: 'pencil',
}
const NESTING_STICKER: Record<string, SiteStickerName> = {
  Nursery: 'crib', Cleaning: 'house', Laundry: 'bodysuit', Shopping: 'stroller', Organizing: 'books', Other: 'pencil',
}
const BIRTH_PREP_STICKER: Record<string, SiteStickerName> = {
  'Hospital bag': 'backpack', 'Birth plan': 'doc', Classes: 'brain', Postpartum: 'flower',
  'Baby gear': 'stroller', Admin: 'cal', Other: 'pencil',
}


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
  useExistingPregnancyLog(date, 'mood', (r) => { if (r.value) setMood(r.value); if (r.notes) setNotes(r.notes) })

  async function save() {
    if (!mood) return
    setSaving(true)
    try {
      await savePregnancyLog(date, 'mood', mood, notes || undefined)
      onSaved()
    } catch (e: unknown) {
      Alert.alert(tNow('common_error'), pregnancyLogErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  if (!diffuse) {
    return (
      <View style={styles.form}>
        <SiteQuestion>{t('preg_form_mood_question')}</SiteQuestion>
        <SiteStickerGrid
          width="20%"
          options={MOOD_IDS.map((id) => ({ id, label: t(MOOD_LABEL_KEYS[id]), sticker: MOOD_STICKER[id] }))}
          isOn={(id) => mood === id}
          onPress={setMood}
        />
        <MoreSection label={t('kids_logForm_more')}>
          <SiteInput value={notes} onChangeText={setNotes} placeholder={t('preg_form_mood_notesPlaceholder')} multiline />
        </MoreSection>
        <SaveButton onPress={save} saving={saving} disabled={!mood} />
      </View>
    )
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

/** Localized label for any stored English option id (symptom, appointment, exercise, nutrition tag, nesting…). */
export function pregOptionLabel(id: string): string {
  const sym = SYMPTOM_OPTIONS.find((o) => o.id === id)
  return sym ? tNow(sym.key) : plfLabel(id)
}

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
  useExistingPregnancyLog(date, 'symptom', (r) => {
    if (r.value) setSelected(r.value.split(', ').filter(Boolean))
    if (r.notes) setNotes(r.notes)
  })

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
      Alert.alert(tNow('common_error'), pregnancyLogErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  if (!diffuse) {
    return (
      <View style={styles.form}>
        <SiteQuestion>{t('preg_form_symptoms_question')}</SiteQuestion>
        <View style={sl.pills}>
          {SYMPTOM_OPTIONS.map((opt) => (
            <SiteChoice key={opt.id} compact label={t(opt.key)} selected={selected.includes(opt.id)}
              tone={getModeColorSoft('preg', isDark)} onPress={() => toggle(opt.id)} />
          ))}
        </View>
        {/* Symptom-triggered Grandma — offer to ask about the selected symptoms. */}
        {selected.length > 0 && canAskGrandma() ? (
          <SiteChoice compact tick={false} sticker="bubble" label={t('symptomAssist_ask')} selected={false}
            tone={getModeColorSoft('preg', isDark)} style={{ alignSelf: 'flex-start' }}
            onPress={async () => {
              const labels = selected.map((id) => {
                const opt = SYMPTOM_OPTIONS.find((o) => o.id === id)
                return opt ? t(opt.key) : id
              })
              try { await savePregnancyLog(date, 'symptom', selected.join(', '), notes || undefined) } catch { /* still offer chat */ }
              askGrandmaAboutSymptoms(labels)
              onSaved()
            }}
          />
        ) : null}
        <MoreSection label={t('kids_logForm_more')}>
          <SiteInput value={notes} onChangeText={setNotes} placeholder={t('preg_form_symptoms_notesPlaceholder')} multiline />
        </MoreSection>
        <SaveButton onPress={save} saving={saving} disabled={selected.length === 0} />
      </View>
    )
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
                  borderColor: isDark ? (active ? getModeColor('preg', isDark) : colors.border) : colors.text,
                  borderWidth: isDark ? 1 : 1.5,
                  borderRadius: radius.full,
                },
              ]}
            >
              {active && (
                <Check size={12} color={isDark ? getModeColor('preg', isDark) : colors.text} strokeWidth={3} />
              )}
              <Text
                style={[
                  styles.chipText,
                  { color: isDark ? (active ? getModeColor('preg', isDark) : colors.text) : colors.text, fontFamily: font.bodyBold },
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
      {selected.length > 0 && canAskGrandma() ? (
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
      Alert.alert(tNow('common_error'), pregnancyLogErrorText(e))
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

  if (!diffuse) {
    return (
      <View style={styles.form}>
        <SiteQuestion>{tNow('kp_plf_visitOn', { date: formatDate(date) })}</SiteQuestion>
        <SiteStickerGrid
          options={APPOINTMENT_TYPES.map((x) => ({ id: x, label: plfLabel(x), sticker: APPOINTMENT_STICKER[x] ?? 'doc' }))}
          isOn={(id) => type === id}
          onPress={setType}
        />
        {isOther && (
          <SiteInput value={customType} onChangeText={setCustomType} placeholder={tNow('kp_plf_describeAppt')} autoFocus />
        )}
        <MoreSection label={tNow('kids_logForm_more')}>
          <SiteInput value={doctor} onChangeText={setDoctor} placeholder={tNow('kp_plf_doctorOpt')} />
          <SiteInput value={notes} onChangeText={setNotes} placeholder={tNow('kp_plf_notesOpt')} multiline />
        </MoreSection>
        <SaveButton onPress={save} saving={saving} disabled={!canSave} />
      </View>
    )
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="appointment" title={`Visit on ${formatDate(date)}`} />
      ) : (
        <LogFormSticker
          type="appointment"
          label={tNow('kp_plf_visitOn', { date: formatDate(date) })}
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
                    fontFamily: active ? 'HankenGrotesk_700Bold' : 'HankenGrotesk_600SemiBold',
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
          placeholder={tNow('kp_plf_describeAppt')}
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
        placeholder={tNow('kp_plf_doctorOpt')}
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
        placeholder={tNow('kp_plf_notesOpt')}
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
      Alert.alert(tNow('common_error'), pregnancyLogErrorText(e))
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

  if (!diffuse) {
    const tone = getModeColorSoft('preg', isDark)
    return (
      <View style={styles.form}>
        <SiteQuestion>{tNow('kp_plf_countKicks')}</SiteQuestion>
        <View style={styles.kickCenter}>
          <Pressable
            onPress={() => setCount((c) => c + 1)}
            accessibilityRole="button"
            accessibilityLabel={t('preg_form_kick_tap')}
            style={({ pressed }) => [sl.kickBtn, {
              backgroundColor: count > 0 ? tone : colors.surface,
              borderColor: colors.text,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            }]}
          >
            <SiteSticker name={PREGNANCY_LOG_STICKER.kick_count} size={58} cut />
            <Text style={[sl.eyebrow, { color: colors.text, marginTop: 6 }]}>{t('preg_form_kick_tap')}</Text>
          </Pressable>
          <Text style={{ fontSize: 56, lineHeight: 62, fontFamily: font.displayBold, color: colors.text, marginTop: 10 }}>
            {count}
            <Text style={{ fontSize: 20, fontFamily: font.bodyMedium, color: colors.textMuted }}>{` ${tNow(count === 1 ? 'kp_plf_kick' : 'kp_plf_kicks')}`}</Text>
          </Text>
          {/* No target count (NHS/RCOG): the point is learning the baby's own pattern. */}
          <Text style={{ fontSize: 13, fontFamily: font.bodyMedium, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
            {tNow('kp_plf_goal')}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: font.body, color: colors.textSecondary, textAlign: 'center', marginTop: 6, paddingHorizontal: 8 }}>
            {t('preg_kicks_info')}
          </Text>
        </View>
        <SaveButton onPress={save} saving={saving} disabled={count === 0} label={tNow('kp_plf_saveSession')} />
      </View>
    )
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="kick_count" title="Count baby's kicks" />
      ) : (
        <LogFormSticker
          type="kick_count"
          label={tNow('kp_plf_countKicks')}
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
        label={tNow('kp_plf_saveSession')}
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

  // Site look: the pencil disc, pinned in the sheet's footer (always visible).
  return (
    <SheetFooterAction>
      <View style={{ alignItems: 'center' }}>
        <EyeAction
          label={label ?? tNow('common_save')}
          onPress={onPress}
          ink={colors.text}
          loading={saving}
          disabled={isDisabled}
          sticker="pencil"
          fill={ACTION_TONES.yellow}
          size={64}
        />
      </View>
    </SheetFooterAction>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(dateLoc(), {
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
  useExistingPregnancyLog(date, 'sleep', (r) => {
    const h = Number(r.value); if (r.value && !isNaN(h)) setHours(h)
    const q = parseJson<{ quality: number }>(r.notes).quality; if (typeof q === 'number') setQuality(q)
  })

  async function save() {
    setSaving(true)
    try {
      await savePregnancyLog(date, 'sleep', hours.toString(), JSON.stringify({ quality }))
      onSaved()
    } catch (e: unknown) {
      Alert.alert(tNow('common_error'), pregnancyLogErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  if (!diffuse) {
    return (
      <View style={styles.form}>
        <SiteQuestion>{t('preg_form_sleep_hoursSlept')}</SiteQuestion>
        <SiteCounter value={hours} onChange={setHours} min={3} max={12} unit={tNow(hours === 1 ? 'kp_u_hour' : 'kp_u_hours')} />
        <MoreSection label={t('kids_logForm_more')}>
          <SiteEyebrow>{t('preg_form_sleep_qualityRange')}</SiteEyebrow>
          <SiteCounter value={quality} onChange={setQuality} min={1} max={10} unit="/ 10" />
        </MoreSection>
        <SaveButton onPress={save} saving={saving} disabled={false} />
      </View>
    )
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="sleep" title={`Sleep on ${formatDate(date)}`} />
      ) : (
        <LogFormSticker
          type="sleep"
          label={tNow('kp_plf_sleepOn', { date: formatDate(date) })}
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
  useExistingPregnancyLog(date, 'exercise', (r) => {
    const m = Number(r.value); if (r.value && !isNaN(m)) setMinutes(m)
    const ty = parseJson<{ type: string }>(r.notes).type
    if (ty) {
      if (EXERCISE_TYPES.includes(ty)) setExerciseType(ty)
      else { setExerciseType('Other'); setCustomType(ty) }
    }
  })

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
      Alert.alert(tNow('common_error'), pregnancyLogErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  if (!diffuse) {
    return (
      <View style={styles.form}>
        <SiteQuestion>{t('preg_form_exercise_typeLabel')}</SiteQuestion>
        <SiteStickerGrid
          options={EXERCISE_TYPES.map((x) => ({ id: x, label: plfLabel(x), sticker: EXERCISE_STICKER[x] ?? 'shoe' }))}
          isOn={(id) => exerciseType === id}
          onPress={setExerciseType}
        />
        {isOther && (
          <SiteInput value={customType} onChangeText={setCustomType} placeholder={tNow('kp_plf_whatMovement')} autoFocus />
        )}
        <SiteEyebrow>{t('preg_form_exercise_minutesFieldLabel')}</SiteEyebrow>
        <SitePresets value={minutes} onChange={setMinutes} presets={[15, 20, 30, 45, 60, 90]} unit={tNow('kp_u_min')} />
        <MoreSection label={t('kids_logForm_more')}>
          <SiteCounter value={minutes} onChange={setMinutes} min={5} max={120} unit={tNow('kp_u_min')} />
        </MoreSection>
        <SaveButton onPress={save} saving={saving} disabled={!canSave} />
      </View>
    )
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="exercise" title={`Movement on ${formatDate(date)}`} />
      ) : (
        <LogFormSticker
          type="exercise"
          label={tNow('kp_plf_movementOn', { date: formatDate(date) })}
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
          placeholder={tNow('kp_plf_whatMovement')}
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
      Alert.alert(tNow('common_error'), pregnancyLogErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  if (!diffuse) {
    return (
      <View style={styles.form}>
        <SiteQuestion>{t('preg_form_nutrition_coverageLabel')}</SiteQuestion>
        <View style={sl.pills}>
          {NUTRITION_TAGS.map((tag) => (
            <SiteChoice key={tag} compact label={plfLabel(tag)} selected={tags.includes(tag)}
              tone={getModeColorSoft('preg', isDark)} onPress={() => toggle(tag)} />
          ))}
        </View>
        <MoreSection label={t('kids_logForm_more')}>
          <SiteInput value={nutritionNotes} onChangeText={setNutritionNotes} placeholder={tNow('kp_plf_notesOpt')} multiline />
        </MoreSection>
        <SaveButton onPress={save} saving={saving} disabled={tags.length === 0} />
      </View>
    )
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="nutrition" title={`Nourish on ${formatDate(date)}`} />
      ) : (
        <LogFormSticker
          type="nutrition"
          label={tNow('kp_plf_nourishOn', { date: formatDate(date) })}
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
        placeholder={tNow('kp_plf_notesOpt')}
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
  useExistingPregnancyLog(date, 'kegel', (r) => { const n = Number(r.value); if (r.value && !isNaN(n)) setSets(n) })

  async function save() {
    setSaving(true)
    try {
      await savePregnancyLog(date, 'kegel', sets.toString(), undefined)
      onSaved()
    } catch (e: unknown) {
      Alert.alert(tNow('common_error'), pregnancyLogErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  if (!diffuse) {
    return (
      <View style={styles.form}>
        <SiteQuestion>{t('preg_form_kegel_setsCompletedLabel')}</SiteQuestion>
        <SiteCounter value={sets} onChange={setSets} min={1} max={20} unit={tNow(sets === 1 ? 'kp_u_set' : 'kp_u_sets')} />
        <SaveButton onPress={save} saving={saving} disabled={false} />
      </View>
    )
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="kegel" title="Pelvic floor practice" />
      ) : (
        <LogFormSticker
          type="kegel"
          label={tNow('kp_plf_pelvic')}
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
  useExistingPregnancyLog(date, 'water', (r) => { const n = Number(r.value); if (r.value && !isNaN(n)) setGlasses(n) })

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
      Alert.alert(tNow('common_error'), pregnancyLogErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  const hint =
    glasses >= GOAL ? t('preg_form_water_hintDone')
    : glasses >= GOAL / 2 ? t('preg_form_water_hintHalf', { count: remaining })
    : t('preg_form_water_hintMore', { count: remaining })

  if (!diffuse) {
    return (
      <View style={styles.form}>
        <SiteQuestion>{t('preg_form_water_glassesTodayLabel')}</SiteQuestion>
        <SiteCounter value={glasses} onChange={setGlasses} min={0} max={20} unit={`/ ${GOAL}`} />
        <View style={sl.drops}>
          {Array.from({ length: GOAL }, (_, i) => (
            <View key={i} style={{ opacity: i < glasses ? 1 : 0.25 }}>
              <SiteSticker name="glass" size={26} />
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 14, textAlign: 'center', color: colors.textSecondary, fontFamily: font.body }}>{hint}</Text>
        <SaveButton onPress={save} saving={saving} disabled={false} />
      </View>
    )
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="water" title="Hydration check-in" />
      ) : (
        <LogFormSticker type="water" label={tNow('kp_plf_hydration')} tint={s.blueSoft} />
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
  useExistingPregnancyLog(date, 'vitamins', (r) => { if (r.value) setTaken(r.value === '1') })

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
      Alert.alert(tNow('common_error'), pregnancyLogErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  if (!diffuse) {
    return (
      <View style={styles.form}>
        <SiteQuestion>{t('preg_form_vitamins_question')}</SiteQuestion>
        <SiteStickerGrid
          width="50%"
          options={OPTIONS.map((o) => ({ id: o.label, label: o.label, sticker: o.value ? 'face3' : 'face2' }))}
          isOn={(id) => taken !== null && OPTIONS.find((o) => o.value === taken)?.label === id}
          onPress={(id) => setTaken(OPTIONS.find((o) => o.label === id)?.value ?? null)}
        />
        <SaveButton onPress={save} saving={saving} disabled={taken === null} />
      </View>
    )
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="vitamins" title="Prenatal vitamins" />
      ) : (
        <LogFormSticker
          type="vitamins"
          label={tNow('kp_plf_prenatalVit')}
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
      Alert.alert(tNow('common_error'), pregnancyLogErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  if (!diffuse) {
    return (
      <View style={styles.form}>
        <SiteInput value={nestingTitle} onChangeText={setNestingTitle} placeholder={tNow('kp_plf_taskNest')} />
        <SiteEyebrow>{t('preg_form_nesting_categoryLabel')}</SiteEyebrow>
        <SiteStickerGrid
          options={NESTING_CATEGORIES.map((x) => ({ id: x, label: plfLabel(x), sticker: NESTING_STICKER[x] ?? 'house' }))}
          isOn={(id) => nestingCategory === id}
          onPress={setNestingCategory}
        />
        {isOther && (
          <SiteInput value={customCategory} onChangeText={setCustomCategory} placeholder={tNow('kp_plf_customCat')} autoFocus />
        )}
        <SiteChoice compact label={t('preg_form_nesting_alreadyDone')} selected={done}
          tone={getModeColorSoft('preg', isDark)} onPress={() => setDone((d) => !d)} style={{ alignSelf: 'flex-start' }} />
        <SaveButton onPress={save} saving={saving} disabled={!nestingTitle} />
      </View>
    )
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="nesting" title="Getting ready at home" />
      ) : (
        <LogFormSticker
          type="nesting"
          label={tNow('kp_plf_gettingReady')}
          tint={s.peachSoft}
        />
      )}
      <TextInput
        value={nestingTitle}
        onChangeText={setNestingTitle}
        placeholder={tNow('kp_plf_taskNest')}
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
          placeholder={tNow('kp_plf_customCat')}
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
      Alert.alert(tNow('common_error'), pregnancyLogErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  if (!diffuse) {
    return (
      <View style={styles.form}>
        <SiteInput value={birthPrepTitle} onChangeText={setBirthPrepTitle} placeholder={tNow('kp_plf_taskBirth')} />
        <SiteEyebrow>{t('preg_form_nesting_categoryLabel')}</SiteEyebrow>
        <SiteStickerGrid
          options={BIRTH_PREP_CATEGORIES.map((x) => ({ id: x, label: plfLabel(x), sticker: BIRTH_PREP_STICKER[x] ?? 'doc' }))}
          isOn={(id) => birthPrepCategory === id}
          onPress={setBirthPrepCategory}
        />
        {isOther && (
          <SiteInput value={customCategory} onChangeText={setCustomCategory} placeholder={tNow('kp_plf_customCat')} autoFocus />
        )}
        <SiteChoice compact label={t('preg_form_nesting_alreadyDone')} selected={done}
          tone={getModeColorSoft('preg', isDark)} onPress={() => setDone((d) => !d)} style={{ alignSelf: 'flex-start' }} />
        <MoreSection label={t('kids_logForm_more')}>
          <SiteEyebrow>{t('preg_form_birthprep_dueByWeek')}</SiteEyebrow>
          <SiteCounter value={dueWeek} onChange={setDueWeek} min={20} max={42} unit={tNow(dueWeek === 1 ? 'kp_u_week' : 'kp_u_weeks')} />
        </MoreSection>
        <SaveButton onPress={save} saving={saving} disabled={!birthPrepTitle} />
      </View>
    )
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="birth_prep" title="Preparing for baby" />
      ) : (
        <LogFormSticker
          type="birth_prep"
          label={tNow('kp_plf_preparingBaby')}
          tint={s.lilacSoft}
        />
      )}
      <TextInput
        value={birthPrepTitle}
        onChangeText={setBirthPrepTitle}
        placeholder={tNow('kp_plf_taskBirth')}
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
          placeholder={tNow('kp_plf_customCat')}
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
      Alert.alert(tNow('common_error'), pregnancyLogErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  if (!diffuse) {
    return (
      <View style={styles.form}>
        <SiteQuestion>{t('preg_form_contraction_durationLabel')}</SiteQuestion>
        <SitePresets value={durationSec} onChange={setDurationSec} presets={[30, 45, 60, 90]} unit={tNow('kp_u_sec')} />
        <SiteEyebrow>{t('preg_form_contraction_intervalLabel')}</SiteEyebrow>
        <SitePresets value={intervalMin} onChange={setIntervalMin} presets={[3, 5, 10, 15, 20]} unit={tNow('kp_u_min')} />
        <MoreSection label={t('kids_logForm_more')}>
          <SiteEyebrow>{t('preg_form_contraction_durationLabel')}</SiteEyebrow>
          <SiteCounter value={durationSec} onChange={setDurationSec} min={10} max={180} unit={tNow('kp_u_sec')} />
          <SiteEyebrow>{t('preg_form_contraction_intervalLabel')}</SiteEyebrow>
          <SiteCounter value={intervalMin} onChange={setIntervalMin} min={1} max={30} unit={tNow(intervalMin === 1 ? 'kp_u_minute' : 'kp_u_minutes')} />
          <SiteInput value={contractionNotes} onChangeText={setContractionNotes} placeholder={tNow('kp_plf_notesIntensity')} multiline />
        </MoreSection>
        <SaveButton onPress={save} saving={saving} disabled={false} />
      </View>
    )
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="contraction" title={`Contraction on ${formatDate(date)}`} />
      ) : (
        <LogFormSticker
          type="contraction"
          label={tNow('kp_plf_contractionOn', { date: formatDate(date) })}
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
        placeholder={tNow('kp_plf_notesIntensity')}
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
  useExistingPregnancyLog(date, 'weight', (r) => {
    const kg = Number(r.value)
    if (r.value && !isNaN(kg) && kg > 0) setWeight(Math.round(kgToDisplay(kg, weightUnit) * 10) / 10)
  }, true)
  const accent = diffuse ? diffuseLogHue('weight') : (isDark ? stickersDark.peach : stickersLight.peach)

  async function save() {
    if (isNaN(weight) || weight <= 0) {
      Alert.alert(tNow('kp_plf_invalid'), tNow('kp_plf_validWeight'))
      return
    }
    setSaving(true)
    try {
      // Convert the displayed value back to canonical kg before saving.
      const kg = displayToKg(weight, weightUnit)
      await savePregnancyLog(date, 'weight', kg.toFixed(2), undefined)
      onSaved()
    } catch (e: unknown) {
      Alert.alert(tNow('common_error'), pregnancyLogErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  if (!diffuse) {
    return (
      <View style={styles.form}>
        <SiteQuestion>{t('preg_form_weight_fieldLabel')}</SiteQuestion>
        <View style={{ paddingVertical: 8 }}>
          <NumberStepper
            value={weight}
            onChange={setWeight}
            step={weightUnit === 'lb' ? 0.2 : 0.1}
            min={weightUnit === 'lb' ? 44 : 20}
            max={weightUnit === 'lb' ? 550 : 250}
            precision={1}
            unit={weightLabel(weightUnit)}
            color={getModeColorSoft('preg', isDark)}
          />
        </View>
        <SaveButton onPress={save} saving={saving} disabled={weight <= 0} />
      </View>
    )
  }

  return (
    <View style={styles.form}>
      {diffuse ? (
        <DiffuseFormHeader type="weight" title={`Weight on ${formatDate(date)}`} />
      ) : (
        <LogFormSticker
          type="weight"
          label={tNow('kp_plf_weightOn', { date: formatDate(date) })}
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
    letterSpacing: 0.6,
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
    fontFamily: 'HankenGrotesk_700Bold',
    lineHeight: 32,
  },
  counterValue: {
    fontSize: 48,
    fontFamily: 'HankenGrotesk_700Bold',
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

// ─── Site look (light) styles ───────────────────────────────────────────────
const sl = StyleSheet.create({
  question: { fontSize: 18, letterSpacing: 0.3, textTransform: 'uppercase' },
  eyebrow: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, minHeight: 50, fontSize: 16 },
  inputMulti: { minHeight: 84, paddingTop: 14, paddingBottom: 14, textAlignVertical: 'top' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  drops: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  kickBtn: { width: 168, height: 168, borderRadius: 84, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
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
