/**
 * Cycle log forms — unified sticker-collage form set.
 *
 * Single source for all 9 cycle log surfaces. Shared shell, sticker chips,
 * phase-aware copy, true-toggle multi-pick. Replaces the older LogForms.tsx.
 *
 * Forms exported: PeriodStartForm, PeriodEndForm, SymptomsForm, MoodForm,
 * BbtForm, LhForm, CmForm, IntimacyForm, OvulationForm.
 *
 * Backwards-compat alias: IntercourseForm re-exports IntimacyForm.
 */
import { numLoc } from '../../lib/kpLocale'
import { SheetFooterAction } from './LogSheet'
import { EyeAction, ACTION_TONES } from '../ui/AuthDock'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, Pressable, Alert, StyleSheet, ActivityIndicator, TextInput,
} from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme, useDiffuseTheme, diffuseFont, getModeField, getDiffuseAccent, getModeColorSoft } from '../../constants/theme'
import { useIsDiffuse, DiffuseArrow } from '../ui/diffuse/DiffuseKit'
import { supabase } from '../../lib/supabase'
import {
  ALL_SYMPTOMS, suggestedForPhase, symptomLabel, type SymptomId,
} from '../../lib/cycleSymptoms'
import { phaseHint, saveLabel, appIntlLocale } from '../../lib/cycleLogForms'
import { askGrandmaAboutSymptoms, canAskGrandma } from '../../lib/symptomAssist'
import type { CyclePhase } from '../../lib/cycleLogic'
import { useUnitsStore } from '../../store/useUnitsStore'
import { cToDisplay, tempLabel, kgToDisplay, displayToKg, weightLabel } from '../../lib/units'
import { SymptomSticker, CustomSymptomBlob, SymptomSiteSticker, CustomSymptomSiteSticker } from './symptomStickers'
import { Smiley, Sad, Sleepy } from '../ui/Stickers'
import { Character, type MoodExpression } from '../characters/Characters'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { CYCLE_LOG_STICKER, CYCLE_MOOD_STICKER } from '../../lib/logStickers'
import { StickerChoice, MoreSection } from './QuickLogKit'
import { useTranslation, t as translate } from '../../lib/i18n'
import type { TranslationKeys } from '../../lib/i18n/keys'
import { assertNotFuture, FutureDateError } from '../../lib/futureDate'

/** Alert text for a failed save: our own (translated) future-date message, else a calm generic
 *  line — never a raw English Supabase/network error. */
function saveErrorText(e: unknown): string {
  return e instanceof FutureDateError ? e.message : translate('cyc_alert_saveFailed')
}

/** The JSON object stored in a log's `notes` by onboarding, or null for plain note text. */
function parseNotesMeta(notes: string): Record<string, unknown> | null {
  if (!notes.trimStart().startsWith('{')) return null
  try {
    const v = JSON.parse(notes)
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null
  } catch {
    return null
  }
}

// ─── Save helpers ──────────────────────────────────────────────────────────
async function replaceSingleLog(
  date: string,
  type: string,
  value: string | null,
  notes?: string,
) {
  assertNotFuture(date)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  // Check the delete: ignoring its error left the old row in place and the insert added a second
  // same-day entry (two period starts on one date → a 0-day cycle in the history).
  const { error: deleteError } = await supabase
    .from('cycle_logs')
    .delete()
    .eq('user_id', session.user.id)
    .eq('date', date)
    .eq('type', type)
  if (deleteError) throw deleteError
  const { error } = await supabase.from('cycle_logs').insert({
    user_id: session.user.id, date, type, value, notes: notes ?? null,
  })
  if (error) throw error
}

async function insertSingleLog(
  date: string,
  type: string,
  value: string | null = null,
  notes?: string,
) {
  assertNotFuture(date)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  const { error } = await supabase.from('cycle_logs').insert({
    user_id: session.user.id, date, type, value, notes: notes ?? null,
  })
  if (error) throw error
}

function useInvalidate() {
  const qc = useQueryClient()
  return async () => {
    await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
  }
}

// ─── useExistingLog (single-value forms) ────────────────────────────────────
/**
 * The row already saved for this day + type, so re-opening a form (from the dock, the day detail
 * or the launcher) shows what she logged instead of a blank form. `apply` runs once per
 * date/type when the row arrives, and never after the user has started changing things.
 */
function useExistingLog(
  date: string,
  type: string,
  apply: (row: { value: string | null; notes: string | null }) => void,
) {
  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id))
  }, [])
  const { data } = useQuery({
    queryKey: ['cycleLogs', 'existing', userId, date, type],
    queryFn: async (): Promise<{ value: string | null; notes: string | null } | null> => {
      if (!userId) return null
      const { data: rows, error } = await supabase
        .from('cycle_logs')
        .select('value, notes')
        .eq('user_id', userId)
        .eq('date', date)
        .eq('type', type)
        .limit(1)
      if (error) throw error
      return rows?.[0] ?? null
    },
    enabled: !!userId,
    staleTime: 0,
  })
  const [appliedFor, setAppliedFor] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const key = `${date}|${type}`
  useEffect(() => {
    if (data && appliedFor !== key && !touched) {
      apply(data)
      setAppliedFor(key)
    }
  }, [data, key]) // eslint-disable-line react-hooks/exhaustive-deps
  return { exists: !!data, markTouched: () => setTouched(true) }
}

// ─── StickerStack (site look) ───────────────────────────────────────────────
/**
 * One sticker drawn 1–3 times (and/or faded) so graded options read at a glance: Light = one
 * drop, Medium = two, Heavy = three; "None" = the sticker faded. Keeps every option of a sheet
 * visually distinct while staying on the log type's own sticker.
 */
function StickerStack({ name, count = 1, faded = false, size = 36 }: {
  name: SiteStickerName; count?: 1 | 2 | 3; faded?: boolean | number; size?: number
}) {
  const opacity = faded === true ? 0.35 : typeof faded === 'number' ? faded : 1
  if (count === 1) {
    return <View style={{ opacity }}><SiteSticker name={name} size={size} /></View>
  }
  const s = Math.round(size * (count === 2 ? 0.7 : 0.6))
  const spots = count === 2
    ? [{ left: 0, top: 0 }, { left: size - s, top: size - s }]
    : [{ left: (size - s) / 2, top: 0 }, { left: 0, top: size - s }, { left: size - s, top: size - s }]
  return (
    <View style={{ width: size, height: size, opacity }}>
      {spots.map((p, i) => (
        <View key={i} style={{ position: 'absolute', left: p.left, top: p.top }}>
          <SiteSticker name={name} size={s} />
        </View>
      ))}
    </View>
  )
}

// ─── useDayLogToggle (multi-pick) ──────────────────────────────────────────
function useDayLogToggle(date: string, type: string) {
  const qc = useQueryClient()
  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) =>
      setUserId(session?.user.id),
    )
  }, [])

  const { data: initial = [] } = useQuery({
    queryKey: ['cycleLogs', 'day', userId, date, type],
    queryFn: async (): Promise<string[]> => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('cycle_logs')
        .select('value')
        .eq('user_id', userId)
        .eq('date', date)
        .eq('type', type)
      if (error) throw error
      return (data ?? []).map((r) => r.value).filter((v): v is string => !!v)
    },
    enabled: !!userId,
    staleTime: 0,
  })

  const initialKey = initial.slice().sort().join('|')
  const initialSet = useMemo(() => new Set(initial), [initialKey])
  const [selected, setSelected] = useState<Set<string>>(initialSet)
  useEffect(() => { setSelected(new Set(initialSet)) }, [initialKey])

  const [saving, setSaving] = useState(false)
  function toggle(v: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v); else next.add(v)
      return next
    })
  }

  async function commit() {
    if (!userId) return
    setSaving(true)
    try {
      const added = [...selected].filter((v) => !initialSet.has(v))
      const removed = [...initialSet].filter((v) => !selected.has(v))
      if (removed.length > 0) {
        const { error } = await supabase
          .from('cycle_logs')
          .delete()
          .eq('user_id', userId)
          .eq('date', date)
          .eq('type', type)
          .in('value', removed)
        if (error) throw error
      }
      if (added.length > 0) {
        assertNotFuture(date)
        const rows = added.map((value) => ({ user_id: userId, date, type, value }))
        const { error } = await supabase.from('cycle_logs').insert(rows)
        if (error) throw error
      }
      await qc.invalidateQueries({ queryKey: ['cycleLogs'] })
    } finally {
      setSaving(false)
    }
  }

  const isDirty =
    selected.size !== initialSet.size ||
    [...selected].some((v) => !initialSet.has(v))

  return {
    initialCount: initialSet.size,
    selected,
    selectedCount: selected.size,
    isDirty,
    saving,
    toggle,
    commit,
  }
}

// ─── LogFormShell ───────────────────────────────────────────────────────────
interface LogFormShellProps {
  /** Optional — omit when the sheet chrome already titles this form (avoids a
   *  redundant title stacked under the LogSheet title). */
  title?: string
  subline: string
  phaseHintText: string
  phaseAccent: string
  phaseTint: string
  /** High-contrast ink-tinted accent for text on top of phaseTint. */
  phaseInk: string
  children: React.ReactNode
  saveLabel: string
  saveDisabled?: boolean
  saving?: boolean
  onSave: () => void
}

function LogFormShell({
  title, subline, phaseHintText, phaseAccent, phaseTint, phaseInk,
  children, saveLabel: saveLabelText, saveDisabled, saving, onSave,
}: LogFormShellProps) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <View style={styles.shell}>
      <View style={styles.headRow}>
        {title ? (
          <Text style={[styles.title, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display }, diffuse ? null : { textTransform: 'uppercase', letterSpacing: 0.2, fontSize: 24 }]}>
            {title}
          </Text>
        ) : null}
        <Text style={[styles.subline, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 } : { color: colors.textMuted, fontFamily: 'SpaceMono_400Regular', letterSpacing: 1.4 }]}>
          {subline}
        </Text>
      </View>

      {diffuse ? (
        <View style={[styles.phasePill, { borderColor: dt.colors.hairline, backgroundColor: 'transparent', alignSelf: 'flex-start' }]}>
          <Text style={[styles.phasePillText, { color: dt.colors.ink2, fontFamily: diffuseFont.mono }]}>
            {phaseHintText}
          </Text>
        </View>
      ) : (
        <Text style={{ color: colors.textSecondary, fontFamily: font.body, fontSize: 14, lineHeight: 20 }}>
          {phaseHintText}
        </Text>
      )}

      <View style={styles.body}>{children}</View>

      <SaveStickerButton
        label={saveLabelText}
        accent={phaseAccent}
        disabled={saveDisabled}
        loading={saving}
        onPress={onSave}
      />
    </View>
  )
}

function SaveStickerButton({
  label, accent, disabled, loading, onPress,
}: {
  label: string; accent: string; disabled?: boolean; loading?: boolean; onPress: () => void
}) {
  const { font, colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  if (diffuse) {
    // Containerless action: mono-caps label + arrow on a top hairline.
    const diffuseAccent = getDiffuseAccent('pre-pregnancy', dt.isDark)
    return (
      <Pressable
        onPress={loading || disabled ? undefined : onPress}
        style={[styles.saveBtnD, { borderTopColor: dt.colors.line2, opacity: disabled ? 0.45 : 1 }]}
      >
        {loading ? (
          <ActivityIndicator color={dt.colors.ink} />
        ) : (
          <>
            <Text style={[styles.saveLabelD, { color: dt.colors.ink, fontFamily: diffuseFont.monoBold }]}>
              {label}
            </Text>
            <DiffuseArrow color={diffuseAccent} size={18} />
          </>
        )}
      </Pressable>
    )
  }

  // Site look: pencil disc pinned in the sheet footer — always visible, no scrolling to save.
  return (
    <SheetFooterAction>
      <View style={{ alignItems: 'center' }}>
        <EyeAction label={label} onPress={onPress} ink={colors.text} loading={loading} disabled={disabled} sticker="pencil" fill={ACTION_TONES.yellow} size={64} />
      </View>
    </SheetFooterAction>
  )
}

// ─── StickerChip ────────────────────────────────────────────────────────────
interface StickerChipProps {
  sticker: React.ReactNode
  label: string
  selected: boolean
  accent: string
  onPress: () => void
}

function StickerChip({ sticker, label, selected, accent, onPress }: StickerChipProps) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  if (diffuse) {
    // Hairline mono chip (.chip / .chip.on): surface fill + ink hairline when
    // on, transparent + faint hairline when off. Sticker icon retained.
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.chip,
          {
            backgroundColor: selected ? dt.colors.surface : 'transparent',
            borderColor: selected ? dt.colors.hairline : dt.colors.line,
            borderWidth: 1,
          },
        ]}
      >
        <View style={styles.chipSticker}>{sticker}</View>
        <Text
          style={[
            styles.chipLabel,
            { color: selected ? dt.colors.ink : dt.colors.ink3, fontFamily: selected ? diffuseFont.monoBold : diffuseFont.mono, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    )
  }

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? getModeColorSoft('pre') : colors.surface,
          borderColor: colors.text,
          borderWidth: 1.5,
        },
      ]}
    >
      <View style={styles.chipSticker}>{sticker}</View>
      <Text
        style={[
          styles.chipLabel,
          { color: colors.text, fontFamily: font.bodyBold },
        ]}
      >
        {label}
      </Text>
      {selected ? (
        <Text style={[styles.chipCheck, { color: colors.text, fontFamily: font.bodyBold }]}>{'✓'}</Text>
      ) : null}
    </Pressable>
  )
}

// ─── Light-branch helpers ───────────────────────────────────────────────────
/** Card-less sticker choices laid out in a wrapping row (site look). */
function ChoiceGrid({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 }}>{children}</View>
}

/** Notes: always visible in Diffuse; tucked under "More" in the site look. */
function NotesWrap({ children }: { children: React.ReactNode }) {
  const diffuse = useIsDiffuse()
  return diffuse ? <>{children}</> : <MoreSection>{children}</MoreSection>
}

// ─── Phase color helper ─────────────────────────────────────────────────────
function phaseColors(phase: CyclePhase, stickers: ReturnType<typeof useTheme>['stickers']) {
  switch (phase) {
    case 'menstruation': return { accent: stickers.coral, tint: stickers.pinkSoft,  ink: stickers.coralInk }
    case 'follicular':   return { accent: stickers.green, tint: stickers.greenSoft, ink: stickers.greenInk }
    case 'ovulation':    return { accent: stickers.peach, tint: stickers.peachSoft, ink: stickers.peachInk }
    case 'luteal':       return { accent: stickers.lilac, tint: stickers.lilacSoft, ink: stickers.lilacInk }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatDate(d: string): string {
  const dt = new Date(d + 'T12:00:00')
  return dt.toLocaleDateString(appIntlLocale(), { weekday: 'long', month: 'short', day: 'numeric' })
}

function phaseTitle(phase: CyclePhase): string {
  return translate(`cyc_phase_${phase}` as const)
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMS
// ═══════════════════════════════════════════════════════════════════════════

// ─── PeriodStartForm ───────────────────────────────────────────────────────
const FLOW_OPTIONS: { id: 'light' | 'medium' | 'heavy'; labelKey: keyof TranslationKeys; dropColor: string; drops: 1 | 2 | 3 }[] = [
  { id: 'light',  labelKey: 'cycleLogForm_flow_light',  dropColor: '#F2B2C7', drops: 1 },
  { id: 'medium', labelKey: 'cycleLogForm_flow_medium', dropColor: '#EE7B6D', drops: 2 },
  { id: 'heavy',  labelKey: 'cycleLogForm_flow_heavy',  dropColor: '#D94A3E', drops: 3 },
]

export function PeriodStartForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const [flow, setFlow] = useState<'light' | 'medium' | 'heavy' | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const invalidate = useInvalidate()
  // The onboarding row keeps its answers (incl. `tryingToConceive`, read by useCycleIntent and the
  // notification engine) as JSON in `notes`. Show only her own note text and write the answers
  // back on save — re-logging that first period used to drop them and show raw JSON here.
  const meta = useRef<Record<string, unknown> | null>(null)
  const existing = useExistingLog(date, 'period_start', (r) => {
    if (r.value === 'light' || r.value === 'medium' || r.value === 'heavy') setFlow(r.value)
    if (!r.notes) return
    const parsed = parseNotesMeta(r.notes)
    meta.current = parsed
    setNotes(parsed ? (typeof parsed.text === 'string' ? parsed.text : '') : r.notes)
  })
  const accent = stickers.coral
  const tint = stickers.pinkSoft
  const ink = stickers.coralInk

  async function save() {
    if (!flow) return
    setSaving(true)
    try {
      const stored = meta.current
        ? JSON.stringify({ ...meta.current, text: notes || undefined })
        : notes || undefined
      await replaceSingleLog(date, 'period_start', flow, stored)
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert(t('common_error'), saveErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogFormShell
      subline={formatDate(date)}
      phaseHintText={phaseHint('period_start', phase)}
      phaseAccent={accent}
      phaseTint={tint}
      phaseInk={ink}
      saveLabel={saveLabel('period_start')}
      saveDisabled={!flow}
      saving={saving}
      onSave={save}
    >
      <Text style={[styles.bodyLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : null]}>{t('cycleLogForm_flow_label')}</Text>
      {diffuse ? (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {FLOW_OPTIONS.map((opt) => {
          const on = flow === opt.id
          return (
            <Pressable
              key={opt.id}
              onPress={() => setFlow(opt.id)}
              style={[
                styles.tileFlexD,
                { backgroundColor: on ? dt.colors.surface : 'transparent', borderColor: on ? dt.colors.hairline : dt.colors.line },
              ]}
            >
              <Character name="period" size={30} color={opt.dropColor} />
              <Text style={[styles.tileLabel, { color: on ? dt.colors.ink : dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.6, textTransform: 'uppercase' }]}>
                {t(opt.labelKey)}
              </Text>
            </Pressable>
          )
        })}
      </View>
      ) : (
        <ChoiceGrid>
          {FLOW_OPTIONS.map((opt) => (
            <StickerChoice key={opt.id} label={t(opt.labelKey)} fallback={<StickerStack name={CYCLE_LOG_STICKER.period_start} count={opt.drops} />} on={flow === opt.id} onPress={() => { existing.markTouched(); setFlow(opt.id) }} tone={getModeColorSoft('pre')} width="33.33%" />
          ))}
        </ChoiceGrid>
      )}
      <NotesWrap>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t('cycleLogForm_notesPlaceholder')}
          placeholderTextColor={diffuse ? dt.colors.ink4 : '#888'}
          style={[styles.notesInput, diffuse ? { backgroundColor: 'transparent', borderBottomWidth: 1.5, borderBottomColor: dt.colors.line2, borderRadius: 0, color: dt.colors.ink, fontFamily: diffuseFont.body, paddingHorizontal: 2 } : SITE_NOTES]}
        />
      </NotesWrap>
    </LogFormShell>
  )
}

// ─── PeriodEndForm ─────────────────────────────────────────────────────────
export function PeriodEndForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const invalidate = useInvalidate()
  const accent = stickers.coral
  const tint = stickers.pinkSoft
  const ink = stickers.coralInk

  async function save() {
    setSaving(true)
    try {
      // Replace, not insert: tapping save twice used to stack two period_end rows on one day.
      await replaceSingleLog(date, 'period_end', null)
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert(t('common_error'), saveErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogFormShell
      subline={formatDate(date)}
      phaseHintText={phaseHint('period_end', phase)}
      phaseAccent={accent}
      phaseTint={tint}
      phaseInk={ink}
      saveLabel={saveLabel('period_end')}
      saving={saving}
      onSave={save}
    >
      <View style={{ alignItems: 'center', padding: 18 }}>
        {diffuse ? (
          <View style={{
            width: 80, height: 80, borderRadius: 999,
            borderWidth: 1, borderColor: dt.colors.line2, borderStyle: 'dashed',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Character name="period" size={40} color={stickers.coral} />
          </View>
        ) : (
          <SiteSticker name={CYCLE_LOG_STICKER.period_end} size={72} />
        )}
      </View>
    </LogFormShell>
  )
}

// ─── SymptomsForm ──────────────────────────────────────────────────────────
const KNOWN_SYMPTOM_IDS = new Set<string>(ALL_SYMPTOMS.map((s) => s.id))

export function SymptomsForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { colors, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const toggle = useDayLogToggle(date, 'symptom')
  const [showAll, setShowAll] = useState(false)
  const [addingCustom, setAddingCustom] = useState(false)
  const [customText, setCustomText] = useState('')
  const { accent, tint, ink } = phaseColors(phase, stickers)

  const suggested = useMemo(() => suggestedForPhase(phase), [phase])
  const visible = useMemo<SymptomId[]>(() => {
    if (showAll) return ALL_SYMPTOMS.map((s) => s.id)
    return suggested
  }, [showAll, suggested])
  const hiddenCount = ALL_SYMPTOMS.length - suggested.length

  // Custom (free-text) symptoms already toggled in — anything selected that
  // isn't one of the 14 known SymptomIds. Rendered as its own chip row so a
  // committed custom entry shows up just like a built-in one.
  const customSelected = useMemo(
    () => [...toggle.selected].filter((v) => !KNOWN_SYMPTOM_IDS.has(v)),
    [toggle.selected],
  )

  function addCustomSymptom() {
    const cleaned = customText.trim().toLowerCase()
    if (!cleaned) return
    const alreadyExists =
      KNOWN_SYMPTOM_IDS.has(cleaned) ||
      [...toggle.selected].some((v) => v.toLowerCase() === cleaned)
    if (alreadyExists) {
      setCustomText('')
      return
    }
    toggle.toggle(cleaned)
    setCustomText('')
  }

  async function save() {
    try {
      await toggle.commit()
      onSaved()
    } catch (e: unknown) {
      Alert.alert(t('common_error'), saveErrorText(e))
    }
  }

  return (
    <LogFormShell
      subline={`${formatDate(date)} · ${phaseTitle(phase)}`}
      phaseHintText={phaseHint('symptoms', phase)}
      phaseAccent={accent}
      phaseTint={tint}
      phaseInk={ink}
      saveLabel={saveLabel('symptoms', {
        count: toggle.selectedCount,
        initialCount: toggle.initialCount,
      })}
      saveDisabled={!toggle.isDirty}
      saving={toggle.saving}
      onSave={save}
    >
      {diffuse ? (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {visible.map((id) => (
          <StickerChip
            key={id}
            sticker={<SymptomSticker id={id} size={16} />}
            label={symptomLabel(id)}
            selected={toggle.selected.has(id)}
            accent={accent}
            onPress={() => toggle.toggle(id)}
          />
        ))}
        {customSelected.map((custom) => (
          <StickerChip
            key={custom}
            sticker={<CustomSymptomBlob size={16} />}
            label={custom}
            selected
            accent={accent}
            onPress={() => toggle.toggle(custom)}
          />
        ))}
      </View>
      ) : (
        <ChoiceGrid>
          {visible.map((id) => (
            <StickerChoice
              key={id}
              label={symptomLabel(id)}
              fallback={<SymptomSiteSticker id={id} size={36} />}
              on={toggle.selected.has(id)}
              onPress={() => toggle.toggle(id)}
              tone={tint}
            />
          ))}
          {customSelected.map((custom) => (
            <StickerChoice
              key={custom}
              label={custom}
              fallback={<CustomSymptomSiteSticker size={36} />}
              on
              onPress={() => toggle.toggle(custom)}
              tone={tint}
            />
          ))}
        </ChoiceGrid>
      )}
      {!showAll && hiddenCount > 0 ? (
        <Pressable
          onPress={() => setShowAll(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}
        >
          <View style={{
            width: 20, height: 20, borderRadius: 999,
            borderWidth: diffuse ? 1 : 1.5, borderColor: diffuse ? dt.colors.line2 : colors.text, ...(diffuse ? { borderStyle: 'dashed' as const } : null),
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', color: diffuse ? dt.colors.ink3 : colors.text, fontWeight: '700', fontSize: 12 }}>+</Text>
          </View>
          <Text style={diffuse
            ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }
            : { color: colors.text, fontFamily: font.bodyBold, fontSize: 13 }}>
            {t('cycleLogForm_showMore', { count: hiddenCount })}
          </Text>
        </Pressable>
      ) : null}

      {/* "Other" — free-text symptom entry, stored the same as any other id. */}
      {!addingCustom ? (
        diffuse ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          <StickerChip
            sticker={<CustomSymptomBlob size={16} />}
            label={t('cycleLogForm_symptomOther')}
            selected={false}
            accent={accent}
            onPress={() => setAddingCustom(true)}
          />
        </View>
        ) : (
          <ChoiceGrid>
            <StickerChoice
              label={t('cycleLogForm_symptomOther')}
              fallback={<CustomSymptomSiteSticker size={36} />}
              on={false}
              onPress={() => setAddingCustom(true)}
              tone={tint}
            />
          </ChoiceGrid>
        )
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <TextInput
            value={customText}
            onChangeText={setCustomText}
            placeholder={t('cycleLogForm_symptomOtherPlaceholder')}
            placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textFaint}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={addCustomSymptom}
            style={[
              styles.notesInput,
              { flex: 1, marginTop: 0, paddingVertical: 10 },
              diffuse
                ? { backgroundColor: 'transparent', borderBottomWidth: 1.5, borderBottomColor: dt.colors.line2, borderRadius: 0, color: dt.colors.ink, fontFamily: diffuseFont.body, paddingHorizontal: 2 }
                : { ...SITE_NOTES, color: colors.text },
            ]}
          />
          <Pressable
            onPress={addCustomSymptom}
            style={{
              paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999,
              backgroundColor: diffuse ? 'transparent' : tint,
              borderWidth: diffuse ? 1 : 1.5,
              borderColor: diffuse ? dt.colors.hairline : colors.text,
            }}
          >
            <Text style={diffuse
              ? { color: dt.colors.ink, fontFamily: diffuseFont.monoBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }
              : { color: colors.text, fontWeight: '700', fontSize: 13 }}>
              {'✓'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Symptom-triggered Grandma — offer to ask about the selected symptoms. */}
      {toggle.selectedCount > 0 && canAskGrandma() ? (
        <Pressable
          onPress={async () => {
            const labels = [...toggle.selected].map((id) => symptomLabel(id as SymptomId))
            try { await toggle.commit() } catch { /* still offer chat */ }
            askGrandmaAboutSymptoms(labels)
            onSaved()
          }}
          style={({ pressed }) => [{
            flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14,
            paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999,
            backgroundColor: diffuse ? dt.stickers.lilacSoft : stickers.lilacSoft,
            ...(diffuse ? null : { borderWidth: 1.5, borderColor: colors.text }),
            alignSelf: 'flex-start', opacity: pressed ? 0.7 : 1,
          }]}
        >
          {diffuse
            ? <Character name="heart" size={18} color={dt.stickers.lilac} />
            : <SiteSticker name="heart" size={20} />}
          <Text style={{
            color: diffuse ? dt.colors.ink : stickers.charcoal,
            fontFamily: diffuse ? diffuseFont.bodySemiBold : undefined,
            fontWeight: diffuse ? undefined : '600', fontSize: 13,
          }}>
            {t('symptomAssist_ask')}
          </Text>
        </Pressable>
      ) : null}
    </LogFormShell>
  )
}

// ─── MoodForm ──────────────────────────────────────────────────────────────
const MOOD_OPTIONS: {
  id: string
  labelKey: keyof TranslationKeys
  Sticker: typeof Sad
  fill: string
  face: MoodExpression   // Diffuse: the mood-blob expression
}[] = [
  { id: 'low',   labelKey: 'cycleLogForm_mood_low',   Sticker: Sad,    fill: '#EE7B6D', face: 'cranky' },
  { id: 'down',  labelKey: 'cycleLogForm_mood_down',  Sticker: Sad,    fill: '#9DC3E8', face: 'fussy' },
  { id: 'okay',  labelKey: 'cycleLogForm_mood_okay',  Sticker: Sleepy, fill: '#C8B6E8', face: 'calm' },
  { id: 'good',  labelKey: 'cycleLogForm_mood_good',  Sticker: Smiley, fill: '#F5D652', face: 'happy' },
  { id: 'great', labelKey: 'cycleLogForm_mood_great', Sticker: Smiley, fill: '#BDD48C', face: 'excited' },
]

export function MoodForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const [value, setValue] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const invalidate = useInvalidate()
  const existing = useExistingLog(date, 'mood', (r) => {
    if (r.value) setValue(r.value)
    if (r.notes) setNotes(r.notes)
  })
  const { accent, tint, ink } = phaseColors(phase, stickers)

  async function save() {
    if (!value) return
    setSaving(true)
    try {
      await replaceSingleLog(date, 'mood', value, notes || undefined)
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert(t('common_error'), saveErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogFormShell
      title={t('cycleLogForm_moodQuestion')}
      subline={`${formatDate(date)} · ${phaseTitle(phase)}`}
      phaseHintText={phaseHint('mood', phase)}
      phaseAccent={accent}
      phaseTint={tint}
      phaseInk={ink}
      saveLabel={saveLabel('mood')}
      saveDisabled={!value}
      saving={saving}
      onSave={save}
    >
      {diffuse ? (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
        {MOOD_OPTIONS.map((m) => {
          const active = value === m.id
          return (
            <Pressable
              key={m.id}
              onPress={() => setValue(m.id)}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 10,
                backgroundColor: 'transparent',
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? dt.colors.hairline : 'transparent',
              }}
            >
              <Character name="mood" size={40} face={m.face} color={m.fill} />
              <Text style={{
                fontSize: 9, marginTop: 4, fontFamily: active ? diffuseFont.monoBold : diffuseFont.mono,
                letterSpacing: 0.6, textTransform: 'uppercase',
                color: active ? dt.colors.ink : dt.colors.ink3,
              }}>
                {t(m.labelKey)}
              </Text>
            </Pressable>
          )
        })}
      </View>
      ) : (
        <ChoiceGrid>
          {MOOD_OPTIONS.map((m) => (
            <StickerChoice key={m.id} label={t(m.labelKey)} sticker={CYCLE_MOOD_STICKER[m.id] ?? 'face2'} on={value === m.id} onPress={() => { existing.markTouched(); setValue(m.id) }} tone={getModeColorSoft('pre')} width="20%" />
          ))}
        </ChoiceGrid>
      )}
      <NotesWrap>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t('cycleLogForm_noteOptional')}
          placeholderTextColor={diffuse ? dt.colors.ink4 : '#888'}
          style={[styles.notesInput, diffuse ? { backgroundColor: 'transparent', borderBottomWidth: 1.5, borderBottomColor: dt.colors.line2, borderRadius: 0, color: dt.colors.ink, fontFamily: diffuseFont.body, paddingHorizontal: 2 } : SITE_NOTES]}
        />
      </NotesWrap>
    </LogFormShell>
  )
}

// ─── BbtForm ────────────────────────────────────────────────────────────────
const BBT_MIN = 350
const BBT_MAX = 380

export function BbtForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const tempUnit = useUnitsStore((s) => s.tempUnit)
  // Internal state + storage stay canonical °C (tenths of a degree). Only the
  // displayed number, unit label, and tick labels convert to the chosen unit.
  const [tenths, setTenths] = useState(364)
  const [saving, setSaving] = useState(false)
  const invalidate = useInvalidate()
  const bbtExisting = useExistingLog(date, 'basal_temp', (r) => {
    const c = parseFloat(String(r.value ?? '').replace(',', '.'))
    if (Number.isFinite(c)) setTenths(Math.min(BBT_MAX, Math.max(BBT_MIN, Math.round(c * 10))))
  })
  const { accent, tint, ink } = phaseColors(phase, stickers)

  // A canonical tenths-°C value → the display string in the user's unit.
  const showTemp = (t10: number) => cToDisplay(t10 / 10, tempUnit).toFixed(1)

  async function save() {
    setSaving(true)
    try {
      const value = (tenths / 10).toFixed(1)
      await replaceSingleLog(date, 'basal_temp', value)
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert(t('common_error'), saveErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  const pct = (tenths - BBT_MIN) / (BBT_MAX - BBT_MIN)
  const wholeTemp = showTemp(tenths)

  return (
    <LogFormShell
      title={t('cycleLogForm_bbtTitle')}
      subline={`${formatDate(date)} · ${t('cycleLogForm_bbtSubline')}`}
      phaseHintText={phaseHint('bbt', phase)}
      phaseAccent={accent}
      phaseTint={tint}
      phaseInk={ink}
      saveLabel={saveLabel('bbt')}
      saving={saving}
      onSave={save}
    >
      <View style={[styles.slider, diffuse ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line } : { backgroundColor: 'transparent' }]}>
        <Text style={[styles.sliderNum, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.displayBold }]}>
          {wholeTemp}
          <Text style={[styles.sliderUnit, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, fontStyle: 'normal' } : { color: colors.textFaint, fontFamily: font.italic }]}>
            {' ' + tempLabel(tempUnit)}
          </Text>
        </Text>
        <View style={[styles.sliderTrack, diffuse ? { borderColor: dt.colors.line2, backgroundColor: dt.colors.line } : { borderColor: colors.text, backgroundColor: colors.surface }]}>
          <View
            style={[
              styles.sliderKnob,
              { left: `${pct * 100}%`, backgroundColor: diffuse ? dt.colors.bg : getModeColorSoft('pre'), borderColor: diffuse ? dt.colors.ink : colors.text },
            ]}
          />
        </View>
        <View style={styles.sliderTicks}>
          {[BBT_MIN, BBT_MAX].map((v) => (
            <Pressable key={v} onPress={() => { bbtExisting.markTouched(); setTenths(v) }} style={styles.sliderTickHit}>
              <Text style={{ color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium, fontSize: 11 }}>
                {showTemp(v)}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.sliderRow}>
          <Pressable onPress={() => { bbtExisting.markTouched(); setTenths(Math.max(BBT_MIN, tenths - 1)) }} style={diffuse ? [styles.sliderBtn, styles.sliderBtnD, { borderColor: dt.colors.line2, backgroundColor: 'transparent' }] : styles.sliderBtn}>
            <Text style={{ color: diffuse ? dt.colors.ink : colors.text, fontSize: 20, fontFamily: diffuse ? diffuseFont.monoBold : font.bodyBold }}>{'−'}</Text>
          </Pressable>
          <Pressable onPress={() => { bbtExisting.markTouched(); setTenths(Math.min(BBT_MAX, tenths + 1)) }} style={diffuse ? [styles.sliderBtn, styles.sliderBtnD, { borderColor: dt.colors.line2, backgroundColor: 'transparent' }] : styles.sliderBtn}>
            <Text style={{ color: diffuse ? dt.colors.ink : colors.text, fontSize: 20, fontFamily: diffuse ? diffuseFont.monoBold : font.bodyBold }}>+</Text>
          </Pressable>
        </View>
      </View>
    </LogFormShell>
  )
}

// ─── LhForm ─────────────────────────────────────────────────────────────────
type StackLook = { count?: 1 | 2 | 3; faded?: boolean | number }
const LH_OPTIONS: { id: string; labelKey: keyof TranslationKeys; look: StackLook }[] = [
  { id: 'negative', labelKey: 'cycleLogForm_lh_negative', look: { faded: true } },
  { id: 'faint',    labelKey: 'cycleLogForm_lh_faint',    look: { faded: 0.65 } },
  { id: 'positive', labelKey: 'cycleLogForm_lh_positive', look: { count: 2 } },
  { id: 'peak',     labelKey: 'cycleLogForm_lh_peak',     look: { count: 3 } },
]

export function LhForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const [value, setValue] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const invalidate = useInvalidate()
  const existing = useExistingLog(date, 'lh', (r) => {
    if (r.value) setValue(r.value as never)
  })
  const { accent, tint, ink } = phaseColors(phase, stickers)

  async function save() {
    if (!value) return
    setSaving(true)
    try {
      await replaceSingleLog(date, 'lh', value)
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert(t('common_error'), saveErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogFormShell
      title={t('cycleLogForm_lhTitle')}
      subline={formatDate(date)}
      phaseHintText={phaseHint('lh', phase)}
      phaseAccent={accent}
      phaseTint={tint}
      phaseInk={ink}
      saveLabel={saveLabel('lh')}
      saveDisabled={!value}
      saving={saving}
      onSave={save}
    >
      {diffuse ? (
      <View style={{ gap: 6 }}>
        {LH_OPTIONS.map((opt) => (
          <StickerChip
            key={opt.id}
            sticker={
              <View
                style={{
                  width: 14, height: 14, borderRadius: 7,
                  backgroundColor: opt.id === value ? dt.colors.ink : dt.colors.line2,
                }}
              />
            }
            label={t(opt.labelKey)}
            selected={value === opt.id}
            accent={accent}
            onPress={() => setValue(opt.id)}
          />
        ))}
      </View>
      ) : (
        <ChoiceGrid>
          {LH_OPTIONS.map((opt) => (
            <StickerChoice key={opt.id} label={t(opt.labelKey)} fallback={<StickerStack name={CYCLE_LOG_STICKER.lh} {...opt.look} />} on={value === opt.id} onPress={() => { existing.markTouched(); setValue(opt.id) }} tone={tint} />
          ))}
        </ChoiceGrid>
      )}
    </LogFormShell>
  )
}

// ─── CmForm ─────────────────────────────────────────────────────────────────
// Site look: dry → wet reads as more drops; egg-white is drawn as the egg it is named after.
const CM_OPTIONS: { id: string; labelKey: keyof TranslationKeys; look: StackLook; sticker?: SiteStickerName }[] = [
  { id: 'dry',      labelKey: 'cycleLogForm_cm_dry',      look: { faded: true } },
  { id: 'sticky',   labelKey: 'cycleLogForm_cm_sticky',   look: {} },
  { id: 'creamy',   labelKey: 'cycleLogForm_cm_creamy',   look: { count: 2 } },
  { id: 'watery',   labelKey: 'cycleLogForm_cm_watery',   look: { count: 3 } },
  { id: 'eggwhite', labelKey: 'cycleLogForm_cm_eggwhite', look: {}, sticker: 'egg' },
]

export function CmForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const [value, setValue] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const invalidate = useInvalidate()
  const existing = useExistingLog(date, 'cervical_mucus', (r) => {
    if (r.value) setValue(r.value as never)
  })
  const { accent, tint, ink } = phaseColors(phase, stickers)

  async function save() {
    if (!value) return
    setSaving(true)
    try {
      await replaceSingleLog(date, 'cervical_mucus', value)
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert(t('common_error'), saveErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogFormShell
      title={t('cycleLogForm_cmTitle')}
      subline={formatDate(date)}
      phaseHintText={phaseHint('cm', phase)}
      phaseAccent={accent}
      phaseTint={tint}
      phaseInk={ink}
      saveLabel={saveLabel('cm')}
      saveDisabled={!value}
      saving={saving}
      onSave={save}
    >
      {diffuse ? (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {CM_OPTIONS.map((opt) => {
          const on = value === opt.id
          return (
            <Pressable
              key={opt.id}
              onPress={() => setValue(opt.id)}
              style={[
                styles.tileD,
                { backgroundColor: on ? dt.colors.surface : 'transparent', borderColor: on ? dt.colors.hairline : dt.colors.line },
              ]}
            >
              <Character name="water" size={26} color={stickers.blue} />
              <Text style={[styles.tileLabel, { color: on ? dt.colors.ink : dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.6, textTransform: 'uppercase' }]}>
                {t(opt.labelKey)}
              </Text>
            </Pressable>
          )
        })}
      </View>
      ) : (
        <ChoiceGrid>
          {CM_OPTIONS.map((opt) => (
            <StickerChoice key={opt.id} label={t(opt.labelKey)} fallback={<StickerStack name={opt.sticker ?? CYCLE_LOG_STICKER.cm} {...opt.look} />} on={value === opt.id} onPress={() => { existing.markTouched(); setValue(opt.id) }} tone={tint} width="20%" />
          ))}
        </ChoiceGrid>
      )}
    </LogFormShell>
  )
}

// ─── IntimacyForm (replaces IntercourseForm + old IntimacyForm) ────────────
export function IntimacyForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const [value, setValue] = useState<'unprotected' | 'protected' | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const invalidate = useInvalidate()
  const existing = useExistingLog(date, 'intercourse', (r) => {
    if (r.value === 'protected' || r.value === 'unprotected') setValue(r.value)
    if (r.notes) setNotes(r.notes)
  })
  const { accent, tint, ink } = phaseColors(phase, stickers)

  async function save() {
    if (!value) return
    setSaving(true)
    try {
      await replaceSingleLog(date, 'intercourse', value, notes || undefined)
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert(t('common_error'), saveErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogFormShell
      subline={`${formatDate(date)} · ${phaseTitle(phase)}`}
      phaseHintText={phaseHint('intimacy', phase)}
      phaseAccent={accent}
      phaseTint={tint}
      phaseInk={ink}
      saveLabel={saveLabel('intimacy')}
      saveDisabled={!value}
      saving={saving}
      onSave={save}
    >
      {diffuse ? (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['unprotected', 'protected'] as const).map((opt) => {
          const on = value === opt
          return (
            <Pressable
              key={opt}
              onPress={() => setValue(opt)}
              style={[
                styles.tileWideD,
                { backgroundColor: on ? dt.colors.surface : 'transparent', borderColor: on ? dt.colors.hairline : dt.colors.line },
              ]}
            >
              <Character name="heart" size={40} color={stickers.pink} />
              <Text style={[styles.tileLabel, { color: on ? dt.colors.ink : dt.colors.ink3, marginTop: 6, fontFamily: diffuseFont.mono, letterSpacing: 0.6, textTransform: 'uppercase' }]}>
                {t(opt === 'unprotected' ? 'cycleLogForm_unprotected' : 'cycleLogForm_protected')}
              </Text>
            </Pressable>
          )
        })}
      </View>
      ) : (
        <ChoiceGrid>
          {(['unprotected', 'protected'] as const).map((opt) => (
            <StickerChoice key={opt} label={t(opt === 'unprotected' ? 'cycleLogForm_unprotected' : 'cycleLogForm_protected')} sticker={opt === 'protected' ? 'lock' : CYCLE_LOG_STICKER.intercourse} on={value === opt} onPress={() => { existing.markTouched(); setValue(opt) }} tone={tint} width="50%" />
          ))}
        </ChoiceGrid>
      )}
      <NotesWrap>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t('cycleLogForm_noteOptional')}
          placeholderTextColor={diffuse ? dt.colors.ink4 : '#888'}
          style={[styles.notesInput, diffuse ? { backgroundColor: 'transparent', borderBottomWidth: 1.5, borderBottomColor: dt.colors.line2, borderRadius: 0, color: dt.colors.ink, fontFamily: diffuseFont.body, paddingHorizontal: 2 } : SITE_NOTES]}
        />
      </NotesWrap>
    </LogFormShell>
  )
}

// Backwards-compat alias for existing call sites
export { IntimacyForm as IntercourseForm }

// ─── OvulationForm ─────────────────────────────────────────────────────────
export function OvulationForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { colors, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const invalidate = useInvalidate()
  const accent = stickers.peach
  const tint = stickers.peachSoft
  const ink = stickers.peachInk

  async function save() {
    setSaving(true)
    try {
      await insertSingleLog(date, 'ovulation')
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert(t('common_error'), saveErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogFormShell
      title={t('cycleLogForm_ovulationTitle')}
      subline={`${formatDate(date)} · ${phaseTitle(phase)}`}
      phaseHintText={phaseHint('ovulation', phase)}
      phaseAccent={accent}
      phaseTint={tint}
      phaseInk={ink}
      saveLabel={saveLabel('ovulation')}
      saving={saving}
      onSave={save}
    >
      <View style={{ alignItems: 'center', padding: 8 }}>
        {diffuse ? (
          <View style={{
            width: 90, height: 90, borderRadius: 999,
            backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <View style={{
              width: 60, height: 60, borderRadius: 999,
              backgroundColor: 'transparent',
              borderWidth: 1, borderColor: dt.colors.line,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: stickers.peach }} />
            </View>
          </View>
        ) : (
          <SiteSticker name="egg" size={80} />
        )}
        <Text style={diffuse
          ? { marginTop: 12, fontSize: 12, color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase' }
          : { marginTop: 12, fontSize: 14, color: colors.textSecondary, fontFamily: font.body, textAlign: 'center' }}>
          {t('cycleLogForm_ovulationConfirm')}
        </Text>
      </View>
    </LogFormShell>
  )
}

// ─── PregnancyTestForm ──────────────────────────────────────────────────────
// Site look: the line gets darker — faded strip, half strip, full strip.
const PREG_TEST_OPTIONS: { id: string; labelKey: keyof TranslationKeys; look: StackLook }[] = [
  { id: 'negative', labelKey: 'cycleLogForm_pregTest_negative', look: { faded: true } },
  { id: 'faint',    labelKey: 'cycleLogForm_pregTest_faint',    look: { faded: 0.65 } },
  { id: 'positive', labelKey: 'cycleLogForm_pregTest_positive', look: {} },
]

export function PregnancyTestForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const [value, setValue] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const invalidate = useInvalidate()
  const existing = useExistingLog(date, 'pregnancy_test', (r) => {
    if (r.value) setValue(r.value as never)
  })
  const { accent, tint, ink } = phaseColors(phase, stickers)

  async function save() {
    if (!value) return
    setSaving(true)
    try {
      await replaceSingleLog(date, 'pregnancy_test', value)
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert(t('common_error'), saveErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogFormShell
      subline={formatDate(date)}
      phaseHintText={phaseHint('pregnancy_test', phase)}
      phaseAccent={accent}
      phaseTint={tint}
      phaseInk={ink}
      saveLabel={saveLabel('pregnancy_test')}
      saveDisabled={!value}
      saving={saving}
      onSave={save}
    >
      {diffuse ? (
      <View style={{ gap: 6 }}>
        {PREG_TEST_OPTIONS.map((opt) => (
          <StickerChip
            key={opt.id}
            sticker={<Character name="ovulation" size={22} color={diffuse ? dt.colors.ink3 : accent} />}
            label={t(opt.labelKey)}
            selected={value === opt.id}
            accent={accent}
            onPress={() => setValue(opt.id)}
          />
        ))}
      </View>
      ) : (
        <ChoiceGrid>
          {PREG_TEST_OPTIONS.map((opt) => (
            <StickerChoice key={opt.id} label={t(opt.labelKey)} fallback={<StickerStack name={CYCLE_LOG_STICKER.pregnancy_test} {...opt.look} />} on={value === opt.id} onPress={() => { existing.markTouched(); setValue(opt.id) }} tone={tint} width="33.33%" />
          ))}
        </ChoiceGrid>
      )}
    </LogFormShell>
  )
}

// ─── SexDriveForm ───────────────────────────────────────────────────────────
// None / low / medium / high on the log type's own sticker: faded, one, two, three.
const LEVEL_LOOK: StackLook[] = [{ faded: true }, {}, { count: 2 }, { count: 3 }]
const SEX_DRIVE_OPTIONS: { id: string; labelKey: keyof TranslationKeys }[] = [
  { id: 'none',   labelKey: 'cycleLogForm_sexDrive_none' },
  { id: 'low',    labelKey: 'cycleLogForm_sexDrive_low' },
  { id: 'medium', labelKey: 'cycleLogForm_sexDrive_medium' },
  { id: 'high',   labelKey: 'cycleLogForm_sexDrive_high' },
]

export function SexDriveForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const [value, setValue] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const invalidate = useInvalidate()
  const existing = useExistingLog(date, 'sex_drive', (r) => {
    if (r.value) setValue(r.value as never)
  })
  const { accent, tint, ink } = phaseColors(phase, stickers)

  async function save() {
    if (!value) return
    setSaving(true)
    try {
      await replaceSingleLog(date, 'sex_drive', value)
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert(t('common_error'), saveErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogFormShell
      subline={formatDate(date)}
      phaseHintText={phaseHint('sex_drive', phase)}
      phaseAccent={accent}
      phaseTint={tint}
      phaseInk={ink}
      saveLabel={saveLabel('sex_drive')}
      saveDisabled={!value}
      saving={saving}
      onSave={save}
    >
      {diffuse ? (
      <View style={{ gap: 6 }}>
        {SEX_DRIVE_OPTIONS.map((opt) => (
          <StickerChip
            key={opt.id}
            sticker={<Character name="heart" size={22} color={diffuse ? dt.colors.ink3 : accent} />}
            label={t(opt.labelKey)}
            selected={value === opt.id}
            accent={accent}
            onPress={() => setValue(opt.id)}
          />
        ))}
      </View>
      ) : (
        <ChoiceGrid>
          {SEX_DRIVE_OPTIONS.map((opt, i) => (
            <StickerChoice key={opt.id} label={t(opt.labelKey)} fallback={<StickerStack name={CYCLE_LOG_STICKER.sex_drive} {...LEVEL_LOOK[i]} />} on={value === opt.id} onPress={() => { existing.markTouched(); setValue(opt.id) }} tone={tint} />
          ))}
        </ChoiceGrid>
      )}
    </LogFormShell>
  )
}

// ─── ClotsForm ──────────────────────────────────────────────────────────────
const CLOTS_OPTIONS: { id: string; labelKey: keyof TranslationKeys }[] = [
  { id: 'none',   labelKey: 'cycleLogForm_clots_none' },
  { id: 'small',  labelKey: 'cycleLogForm_clots_small' },
  { id: 'medium', labelKey: 'cycleLogForm_clots_medium' },
  { id: 'large',  labelKey: 'cycleLogForm_clots_large' },
]

export function ClotsForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const [value, setValue] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const invalidate = useInvalidate()
  const existing = useExistingLog(date, 'clots', (r) => {
    if (r.value) setValue(r.value as never)
  })
  const { accent, tint, ink } = phaseColors(phase, stickers)

  async function save() {
    if (!value) return
    setSaving(true)
    try {
      await replaceSingleLog(date, 'clots', value)
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert(t('common_error'), saveErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogFormShell
      subline={formatDate(date)}
      phaseHintText={phaseHint('clots', phase)}
      phaseAccent={accent}
      phaseTint={tint}
      phaseInk={ink}
      saveLabel={saveLabel('clots')}
      saveDisabled={!value}
      saving={saving}
      onSave={save}
    >
      {diffuse ? (
      <View style={{ gap: 6 }}>
        {CLOTS_OPTIONS.map((opt) => (
          <StickerChip
            key={opt.id}
            sticker={<Character name="period" size={22} color={diffuse ? dt.colors.ink3 : accent} />}
            label={t(opt.labelKey)}
            selected={value === opt.id}
            accent={accent}
            onPress={() => setValue(opt.id)}
          />
        ))}
      </View>
      ) : (
        <ChoiceGrid>
          {CLOTS_OPTIONS.map((opt, i) => (
            <StickerChoice key={opt.id} label={t(opt.labelKey)} fallback={<StickerStack name={CYCLE_LOG_STICKER.clots} {...LEVEL_LOOK[i]} />} on={value === opt.id} onPress={() => { existing.markTouched(); setValue(opt.id) }} tone={tint} />
          ))}
        </ChoiceGrid>
      )}
    </LogFormShell>
  )
}

// ─── Lifestyle: reusable +/- stepper ─────────────────────────────────────────
function CycleStepper({
  value, onChange, step, min, max, unit, decimals = 0, accent,
}: {
  value: number; onChange: (n: number) => void; step: number; min: number; max: number
  unit: string; decimals?: number; accent: string
}) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const btn = (dir: -1 | 1) => {
    const next = Math.min(max, Math.max(min, Number((value + dir * step).toFixed(2))))
    const active = next !== value
    return (
      <Pressable
        onPress={active ? () => onChange(next) : undefined}
        style={{
          width: 44, height: 44, borderRadius: 22, borderWidth: diffuse ? 1 : 1.5,
          borderColor: diffuse ? dt.colors.line : colors.text,
          backgroundColor: diffuse ? undefined : colors.surface,
          alignItems: 'center', justifyContent: 'center', opacity: active ? 1 : 0.35,
        }}
      >
        <Text style={{ fontSize: 22, color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? undefined : font.bodyBold }}>{dir < 0 ? '−' : '+'}</Text>
      </Pressable>
    )
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 12 }}>
      {btn(-1)}
      <Text style={{ fontSize: 32, color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.displayBold, minWidth: 110, textAlign: 'center' }}>
        {numLoc(value, decimals, decimals)}
        <Text style={{ fontSize: 15, color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium }}> {unit}</Text>
      </Text>
      {btn(1)}
    </View>
  )
}

// ─── WeightForm ───────────────────────────────────────────────────────────────
export function WeightForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
  const { t } = useTranslation()
  const weightUnit = useUnitsStore((s) => s.weightUnit)
  const [display, setDisplay] = useState(() => Number(kgToDisplay(65, weightUnit).toFixed(1)))
  const [saving, setSaving] = useState(false)
  const invalidate = useInvalidate()
  const existing = useExistingLog(date, 'weight', (r) => {
    const kg = parseFloat(String(r.value ?? '').replace(',', '.'))
    if (Number.isFinite(kg)) setDisplay(Number(kgToDisplay(kg, weightUnit).toFixed(1)))
  })
  const { accent, tint, ink } = phaseColors(phase, stickers)

  async function save() {
    setSaving(true)
    try {
      // Store canonical kg regardless of the display unit.
      const kg = displayToKg(display, weightUnit)
      await replaceSingleLog(date, 'weight', kg.toFixed(2))
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert(t('common_error'), saveErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogFormShell
      subline={formatDate(date)}
      phaseHintText={phaseHint('weight', phase)}
      phaseAccent={accent}
      phaseTint={tint}
      phaseInk={ink}
      saveLabel={saveLabel('weight')}
      saving={saving}
      onSave={save}
    >
      <CycleStepper value={display} onChange={(n) => { existing.markTouched(); setDisplay(n) }} step={0.1} min={30} max={200} unit={weightLabel(weightUnit)} decimals={1} accent={accent} />
    </LogFormShell>
  )
}

// ─── WaterForm ────────────────────────────────────────────────────────────────
export function WaterForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
  const { t } = useTranslation()
  const [glasses, setGlasses] = useState(6)
  const [saving, setSaving] = useState(false)
  const invalidate = useInvalidate()
  const existing = useExistingLog(date, 'water', (r) => {
    const n = parseInt(String(r.value ?? ''), 10)
    if (Number.isFinite(n)) setGlasses(Math.min(20, Math.max(0, n)))
  })
  const { accent, tint, ink } = phaseColors(phase, stickers)

  async function save() {
    setSaving(true)
    try {
      await replaceSingleLog(date, 'water', String(glasses))
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert(t('common_error'), saveErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogFormShell
      subline={formatDate(date)}
      phaseHintText={phaseHint('water', phase)}
      phaseAccent={accent}
      phaseTint={tint}
      phaseInk={ink}
      saveLabel={saveLabel('water')}
      saving={saving}
      onSave={save}
    >
      <CycleStepper value={glasses} onChange={(n) => { existing.markTouched(); setGlasses(n) }} step={1} min={0} max={20} unit={t('cycleLogForm_water_glasses')} accent={accent} />
    </LogFormShell>
  )
}

// ─── ActivityForm ─────────────────────────────────────────────────────────────
const ACTIVITY_OPTIONS: { id: string; labelKey: keyof TranslationKeys }[] = [
  { id: 'rest',     labelKey: 'cycleLogForm_activity_rest' },
  { id: 'light',    labelKey: 'cycleLogForm_activity_light' },
  { id: 'moderate', labelKey: 'cycleLogForm_activity_moderate' },
  { id: 'intense',  labelKey: 'cycleLogForm_activity_intense' },
]

export function ActivityForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const [value, setValue] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const invalidate = useInvalidate()
  const existing = useExistingLog(date, 'activity', (r) => {
    if (r.value) setValue(r.value as never)
  })
  const { accent, tint, ink } = phaseColors(phase, stickers)

  async function save() {
    if (!value) return
    setSaving(true)
    try {
      await replaceSingleLog(date, 'activity', value)
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert(t('common_error'), saveErrorText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogFormShell
      subline={formatDate(date)}
      phaseHintText={phaseHint('activity', phase)}
      phaseAccent={accent}
      phaseTint={tint}
      phaseInk={ink}
      saveLabel={saveLabel('activity')}
      saveDisabled={!value}
      saving={saving}
      onSave={save}
    >
      {diffuse ? (
      <View style={{ gap: 6 }}>
        {ACTIVITY_OPTIONS.map((opt) => (
          <StickerChip
            key={opt.id}
            sticker={<Character name="activity" size={22} color={diffuse ? dt.colors.ink3 : accent} />}
            label={t(opt.labelKey)}
            selected={value === opt.id}
            accent={accent}
            onPress={() => setValue(opt.id)}
          />
        ))}
      </View>
      ) : (
        <ChoiceGrid>
          {ACTIVITY_OPTIONS.map((opt, i) => (
            <StickerChoice key={opt.id} label={t(opt.labelKey)} fallback={<StickerStack name={CYCLE_LOG_STICKER.activity} {...LEVEL_LOOK[i]} />} on={value === opt.id} onPress={() => { existing.markTouched(); setValue(opt.id) }} tone={tint} />
          ))}
        </ChoiceGrid>
      )}
    </LogFormShell>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const SITE_NOTES = {
  backgroundColor: '#FFFFFF',
  borderWidth: 1.5,
  borderColor: '#161513',
  borderRadius: 14,
  fontSize: 16,
}

const styles = StyleSheet.create({
  shell: { padding: 0, gap: 12 },
  headRow: { gap: 4 },
  title: { fontSize: 22, letterSpacing: -0.3 },
  subline: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  phasePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 11, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1,
  },
  phasePillText: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  body: { gap: 12 },
  bodyLabel: {
    fontSize: 11, color: '#888',
    letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '600',
  },
  saveBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    shadowColor: '#141313', shadowOpacity: 0.1, shadowRadius: 0,
    shadowOffset: { width: 0, height: 2 }, elevation: 0,
  },
  saveLabel: { fontSize: 15, letterSpacing: 0.2 },
  // Diffuse containerless save (.solid): mono-caps + arrow on a top hairline
  saveBtnD: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveLabelD: { fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' },

  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999,
    gap: 6,
  },
  chipSticker: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { fontSize: 12, letterSpacing: 0.2 },
  chipCheck: { fontSize: 11, marginLeft: 2 },

  tile: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 18, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#141313', shadowOpacity: 0.1, shadowRadius: 0,
    shadowOffset: { width: 0, height: 2 }, elevation: 0,
  },
  tileFlex: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#141313', shadowOpacity: 0.1, shadowRadius: 0,
    shadowOffset: { width: 0, height: 2 }, elevation: 0,
  },
  tileWide: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 18, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#141313', shadowOpacity: 0.1, shadowRadius: 0,
    shadowOffset: { width: 0, height: 2 }, elevation: 0,
  },
  // Diffuse tiles — hairline, no offset shadow
  tileD: {
    width: '30%', aspectRatio: 1,
    borderRadius: 18, borderWidth: 1, gap: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  tileFlexD: {
    flex: 1, paddingVertical: 14, gap: 6,
    borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  tileWideD: {
    flex: 1, paddingVertical: 18,
    borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  tileLabel: { fontSize: 11, fontWeight: '600', marginTop: 4 },

  notesInput: {
    backgroundColor: '#F7F0DF',
    borderRadius: 18, padding: 14,
    marginTop: 4, fontSize: 13, color: '#141313',
  },

  slider: { borderRadius: 18, padding: 18, alignItems: 'center' },
  sliderNum: { fontSize: 36, lineHeight: 40, letterSpacing: -1 },
  sliderUnit: { fontSize: 14, fontStyle: 'italic' },
  sliderTrack: {
    height: 6, width: '100%', backgroundColor: '#FFFEF8',
    borderRadius: 99, borderWidth: 1, marginTop: 14, position: 'relative',
  },
  sliderKnob: {
    position: 'absolute', top: -5, width: 16, height: 16,
    borderRadius: 999, borderWidth: 1.5,
    transform: [{ translateX: -8 }],
  },
  sliderTicks: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 6 },
  sliderTickHit: { padding: 4 },
  sliderRow: { flexDirection: 'row', gap: 24, marginTop: 12 },
  sliderBtn: {
    width: 44, height: 44, borderRadius: 999,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#161513',
    alignItems: 'center', justifyContent: 'center',
  },
  // Diffuse: hairline circle, no offset shadow (color/border set inline).
  sliderBtnD: {
    borderWidth: 1,
    shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0,
  },
})
