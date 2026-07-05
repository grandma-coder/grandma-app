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
import { useEffect, useMemo, useState } from 'react'
import {
  View, Text, Pressable, Alert, StyleSheet, ActivityIndicator, TextInput,
} from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme, useDiffuseTheme, diffuseFont, getModeField, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse, DiffuseArrow } from '../ui/diffuse/DiffuseKit'
import { supabase } from '../../lib/supabase'
import {
  ALL_SYMPTOMS, suggestedForPhase, symptomLabel, type SymptomId,
} from '../../lib/cycleSymptoms'
import { phaseHint, saveLabel } from '../../lib/cycleLogForms'
import type { CyclePhase } from '../../lib/cycleLogic'
import { SymptomSticker } from './symptomStickers'
import { Drop, Heart, Smiley, Sad, Sleepy } from '../ui/Stickers'
import { useTranslation } from '../../lib/i18n'
import type { TranslationKeys } from '../../lib/i18n/keys'

// ─── Save helpers ──────────────────────────────────────────────────────────
async function replaceSingleLog(
  date: string,
  type: string,
  value: string,
  notes?: string,
) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  await supabase
    .from('cycle_logs')
    .delete()
    .eq('user_id', session.user.id)
    .eq('date', date)
    .eq('type', type)
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
  title: string
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
        <Text style={[styles.title, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display }]}>
          {title}
        </Text>
        <Text style={[styles.subline, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 } : { color: colors.textFaint, fontFamily: font.bodyMedium }]}>
          {subline}
        </Text>
      </View>

      <View
        style={[
          styles.phasePill,
          diffuse
            ? { borderColor: dt.colors.hairline, backgroundColor: 'transparent', alignSelf: 'flex-start' }
            : { borderColor: phaseInk, backgroundColor: phaseTint },
        ]}
      >
        <Text style={[styles.phasePillText, diffuse ? { color: dt.colors.ink2, fontFamily: diffuseFont.mono } : { color: phaseInk, fontFamily: font.bodySemiBold }]}>
          {phaseHintText}
        </Text>
      </View>

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
  const { font } = useTheme()
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

  return (
    <Pressable
      onPress={loading || disabled ? undefined : onPress}
      style={[
        styles.saveBtn,
        { backgroundColor: accent, opacity: disabled ? 0.5 : 1, borderColor: '#141313' },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFEF8" />
      ) : (
        <Text style={[styles.saveLabel, { color: '#FFFEF8', fontFamily: font.bodySemiBold }]}>
          {label}
        </Text>
      )}
    </Pressable>
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
          backgroundColor: selected ? accent : colors.surface,
          borderColor: selected ? '#141313' : colors.border,
          borderWidth: selected ? 1.5 : 1,
        },
      ]}
    >
      <View style={styles.chipSticker}>{sticker}</View>
      <Text
        style={[
          styles.chipLabel,
          { color: selected ? '#FFFEF8' : colors.text, fontFamily: font.bodySemiBold },
        ]}
      >
        {label}
      </Text>
      {selected ? (
        <Text style={[styles.chipCheck, { color: '#FFFEF8', fontFamily: font.bodyBold }]}>{'✓'}</Text>
      ) : null}
    </Pressable>
  )
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
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function phaseTitle(phase: CyclePhase): string {
  return phase[0].toUpperCase() + phase.slice(1)
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMS
// ═══════════════════════════════════════════════════════════════════════════

// ─── PeriodStartForm ───────────────────────────────────────────────────────
const FLOW_OPTIONS: { id: 'light' | 'medium' | 'heavy'; labelKey: keyof TranslationKeys; dropColor: string }[] = [
  { id: 'light',  labelKey: 'cycleLogForm_flow_light',  dropColor: '#F2B2C7' },
  { id: 'medium', labelKey: 'cycleLogForm_flow_medium', dropColor: '#EE7B6D' },
  { id: 'heavy',  labelKey: 'cycleLogForm_flow_heavy',  dropColor: '#D94A3E' },
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
  const accent = stickers.coral
  const tint = stickers.pinkSoft
  const ink = stickers.coralInk

  async function save() {
    if (!flow) return
    setSaving(true)
    try {
      await replaceSingleLog(date, 'period_start', flow, notes || undefined)
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogFormShell
      title={t('cycleLogForm_periodStarted')}
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
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {FLOW_OPTIONS.map((opt) => {
          const on = flow === opt.id
          return (
            <Pressable
              key={opt.id}
              onPress={() => setFlow(opt.id)}
              style={[
                diffuse ? styles.tileFlexD : styles.tileFlex,
                diffuse
                  ? { backgroundColor: on ? dt.colors.surface : 'transparent', borderColor: on ? dt.colors.hairline : dt.colors.line }
                  : { backgroundColor: on ? accent : tint, borderColor: '#141313' },
              ]}
            >
              <Drop size={diffuse ? 26 : 36} fill={diffuse ? opt.dropColor : (on ? '#FFFEF8' : opt.dropColor)} />
              <Text style={[styles.tileLabel, diffuse ? { color: on ? dt.colors.ink : dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.6, textTransform: 'uppercase' } : { color: on ? '#FFFEF8' : '#141313' }]}>
                {t(opt.labelKey)}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder={t('cycleLogForm_notesPlaceholder')}
        placeholderTextColor={diffuse ? dt.colors.ink4 : '#888'}
        style={[styles.notesInput, diffuse ? { backgroundColor: 'transparent', borderBottomWidth: 1.5, borderBottomColor: dt.colors.line2, borderRadius: 0, color: dt.colors.ink, fontFamily: diffuseFont.body, paddingHorizontal: 2 } : null]}
      />
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
      await insertSingleLog(date, 'period_end')
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogFormShell
      title={t('cycleLogForm_periodEnded')}
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
        <View style={{
          width: 80, height: 80, borderRadius: 999,
          borderWidth: diffuse ? 1 : 2, borderColor: diffuse ? dt.colors.line2 : accent, borderStyle: 'dashed',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Drop size={36} fill={diffuse ? stickers.coral : accent} />
        </View>
      </View>
    </LogFormShell>
  )
}

// ─── SymptomsForm ──────────────────────────────────────────────────────────
export function SymptomsForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const toggle = useDayLogToggle(date, 'symptom')
  const [showAll, setShowAll] = useState(false)
  const { accent, tint, ink } = phaseColors(phase, stickers)

  const suggested = useMemo(() => suggestedForPhase(phase), [phase])
  const visible = useMemo<SymptomId[]>(() => {
    if (showAll) return ALL_SYMPTOMS.map((s) => s.id)
    return suggested
  }, [showAll, suggested])
  const hiddenCount = ALL_SYMPTOMS.length - suggested.length

  async function save() {
    try {
      await toggle.commit()
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed')
    }
  }

  return (
    <LogFormShell
      title={t('cycleLogForm_symptoms')}
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
      </View>
      {!showAll && hiddenCount > 0 ? (
        <Pressable
          onPress={() => setShowAll(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}
        >
          <View style={{
            width: 20, height: 20, borderRadius: 999,
            borderWidth: 1, borderColor: diffuse ? dt.colors.line2 : accent, borderStyle: 'dashed',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: diffuse ? dt.colors.ink3 : accent, fontWeight: '700', fontSize: 12 }}>+</Text>
          </View>
          <Text style={diffuse
            ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }
            : { color: accent, fontWeight: '600', fontSize: 12 }}>
            {t('cycleLogForm_showMore', { count: hiddenCount })}
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
}[] = [
  { id: 'low',   labelKey: 'cycleLogForm_mood_low',   Sticker: Sad,    fill: '#EE7B6D' },
  { id: 'down',  labelKey: 'cycleLogForm_mood_down',  Sticker: Sad,    fill: '#9DC3E8' },
  { id: 'okay',  labelKey: 'cycleLogForm_mood_okay',  Sticker: Sleepy, fill: '#C8B6E8' },
  { id: 'good',  labelKey: 'cycleLogForm_mood_good',  Sticker: Smiley, fill: '#F5D652' },
  { id: 'great', labelKey: 'cycleLogForm_mood_great', Sticker: Smiley, fill: '#BDD48C' },
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
  const { accent, tint, ink } = phaseColors(phase, stickers)

  async function save() {
    if (!value) return
    setSaving(true)
    try {
      await replaceSingleLog(date, 'mood', value, notes || undefined)
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed')
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
        {MOOD_OPTIONS.map((m) => {
          const active = value === m.id
          const M = m.Sticker
          return (
            <Pressable
              key={m.id}
              onPress={() => setValue(m.id)}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 10,
                backgroundColor: diffuse ? 'transparent' : (active ? tint : 'transparent'),
                borderRadius: diffuse ? 999 : 14,
                borderWidth: diffuse ? 1 : 0,
                borderColor: diffuse ? (active ? dt.colors.hairline : 'transparent') : 'transparent',
              }}
            >
              <M size={40} fill={m.fill} />
              <Text style={diffuse ? {
                fontSize: 9, marginTop: 4, fontFamily: active ? diffuseFont.monoBold : diffuseFont.mono,
                letterSpacing: 0.6, textTransform: 'uppercase',
                color: active ? dt.colors.ink : dt.colors.ink3,
              } : {
                fontSize: 10, marginTop: 4,
                color: active ? '#141313' : '#555',
                fontWeight: active ? '700' : '600',
              }}>
                {t(m.labelKey)}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder={t('cycleLogForm_noteOptional')}
        placeholderTextColor={diffuse ? dt.colors.ink4 : '#888'}
        style={[styles.notesInput, diffuse ? { backgroundColor: 'transparent', borderBottomWidth: 1.5, borderBottomColor: dt.colors.line2, borderRadius: 0, color: dt.colors.ink, fontFamily: diffuseFont.body, paddingHorizontal: 2 } : null]}
      />
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
  const [tenths, setTenths] = useState(364)
  const [saving, setSaving] = useState(false)
  const invalidate = useInvalidate()
  const { accent, tint, ink } = phaseColors(phase, stickers)

  async function save() {
    setSaving(true)
    try {
      const value = (tenths / 10).toFixed(1)
      await replaceSingleLog(date, 'basal_temp', value)
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const pct = (tenths - BBT_MIN) / (BBT_MAX - BBT_MIN)
  const wholeTemp = (tenths / 10).toFixed(1)

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
      <View style={[styles.slider, diffuse ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line } : { backgroundColor: colors.surfaceRaised }]}>
        <Text style={[styles.sliderNum, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display }]}>
          {wholeTemp}
          <Text style={[styles.sliderUnit, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, fontStyle: 'normal' } : { color: colors.textFaint, fontFamily: font.italic }]}>
            {' °C'}
          </Text>
        </Text>
        <View style={[styles.sliderTrack, diffuse ? { borderColor: dt.colors.line2, backgroundColor: dt.colors.line } : { borderColor: colors.border }]}>
          <View
            style={[
              styles.sliderKnob,
              { left: `${pct * 100}%`, backgroundColor: diffuse ? dt.colors.bg : accent, borderColor: diffuse ? dt.colors.ink : '#141313' },
            ]}
          />
        </View>
        <View style={styles.sliderTicks}>
          {[BBT_MIN, BBT_MAX].map((v) => (
            <Pressable key={v} onPress={() => setTenths(v)} style={styles.sliderTickHit}>
              <Text style={{ color: diffuse ? dt.colors.ink3 : colors.textFaint, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium, fontSize: 10 }}>
                {(v / 10).toFixed(1)}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.sliderRow}>
          <Pressable onPress={() => setTenths(Math.max(BBT_MIN, tenths - 1))} style={styles.sliderBtn}>
            <Text style={{ color: diffuse ? dt.colors.ink : accent, fontSize: 20, fontFamily: font.bodyBold }}>{'−'}</Text>
          </Pressable>
          <Pressable onPress={() => setTenths(Math.min(BBT_MAX, tenths + 1))} style={styles.sliderBtn}>
            <Text style={{ color: diffuse ? dt.colors.ink : accent, fontSize: 20, fontFamily: font.bodyBold }}>+</Text>
          </Pressable>
        </View>
      </View>
    </LogFormShell>
  )
}

// ─── LhForm ─────────────────────────────────────────────────────────────────
const LH_OPTIONS: { id: string; labelKey: keyof TranslationKeys }[] = [
  { id: 'negative', labelKey: 'cycleLogForm_lh_negative' },
  { id: 'faint',    labelKey: 'cycleLogForm_lh_faint' },
  { id: 'positive', labelKey: 'cycleLogForm_lh_positive' },
  { id: 'peak',     labelKey: 'cycleLogForm_lh_peak' },
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
  const { accent, tint, ink } = phaseColors(phase, stickers)

  async function save() {
    if (!value) return
    setSaving(true)
    try {
      await replaceSingleLog(date, 'lh', value)
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed')
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
      <View style={{ gap: 6 }}>
        {LH_OPTIONS.map((opt) => (
          <StickerChip
            key={opt.id}
            sticker={
              <View
                style={{
                  width: 14, height: 14, borderRadius: 7,
                  backgroundColor: diffuse ? (opt.id === value ? dt.colors.ink : dt.colors.line2) : (opt.id === value ? '#FFFEF8' : accent + '55'),
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
    </LogFormShell>
  )
}

// ─── CmForm ─────────────────────────────────────────────────────────────────
const CM_OPTIONS: { id: string; labelKey: keyof TranslationKeys }[] = [
  { id: 'dry',      labelKey: 'cycleLogForm_cm_dry' },
  { id: 'sticky',   labelKey: 'cycleLogForm_cm_sticky' },
  { id: 'creamy',   labelKey: 'cycleLogForm_cm_creamy' },
  { id: 'watery',   labelKey: 'cycleLogForm_cm_watery' },
  { id: 'eggwhite', labelKey: 'cycleLogForm_cm_eggwhite' },
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
  const { accent, tint, ink } = phaseColors(phase, stickers)

  async function save() {
    if (!value) return
    setSaving(true)
    try {
      await replaceSingleLog(date, 'cervical_mucus', value)
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed')
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {CM_OPTIONS.map((opt) => {
          const on = value === opt.id
          return (
            <Pressable
              key={opt.id}
              onPress={() => setValue(opt.id)}
              style={[
                diffuse ? styles.tileD : styles.tile,
                diffuse
                  ? { backgroundColor: on ? dt.colors.surface : 'transparent', borderColor: on ? dt.colors.hairline : dt.colors.line }
                  : { backgroundColor: on ? accent : tint, borderColor: '#141313' },
              ]}
            >
              <Drop size={diffuse ? 22 : 28} fill={diffuse ? stickers.blue : (on ? '#FFFEF8' : accent)} />
              <Text style={[styles.tileLabel, diffuse ? { color: on ? dt.colors.ink : dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 0.6, textTransform: 'uppercase' } : { color: on ? '#FFFEF8' : '#141313' }]}>
                {t(opt.labelKey)}
              </Text>
            </Pressable>
          )
        })}
      </View>
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
  const { accent, tint, ink } = phaseColors(phase, stickers)

  async function save() {
    if (!value) return
    setSaving(true)
    try {
      await replaceSingleLog(date, 'intercourse', value, notes || undefined)
      await invalidate()
      onSaved()
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <LogFormShell
      title={t('cycleLogForm_intimacyTitle')}
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
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['unprotected', 'protected'] as const).map((opt) => {
          const on = value === opt
          return (
            <Pressable
              key={opt}
              onPress={() => setValue(opt)}
              style={[
                diffuse ? styles.tileWideD : styles.tileWide,
                diffuse
                  ? { backgroundColor: on ? dt.colors.surface : 'transparent', borderColor: on ? dt.colors.hairline : dt.colors.line }
                  : { backgroundColor: on ? accent : tint, borderColor: '#141313' },
              ]}
            >
              <Heart size={40} fill={diffuse ? stickers.pink : (on ? '#FFFEF8' : accent)} />
              <Text style={[styles.tileLabel, diffuse ? { color: on ? dt.colors.ink : dt.colors.ink3, marginTop: 6, fontFamily: diffuseFont.mono, letterSpacing: 0.6, textTransform: 'uppercase' } : { color: on ? '#FFFEF8' : '#141313', marginTop: 6 }]}>
                {t(opt === 'unprotected' ? 'cycleLogForm_unprotected' : 'cycleLogForm_protected')}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder={t('cycleLogForm_noteOptional')}
        placeholderTextColor={diffuse ? dt.colors.ink4 : '#888'}
        style={[styles.notesInput, diffuse ? { backgroundColor: 'transparent', borderBottomWidth: 1.5, borderBottomColor: dt.colors.line2, borderRadius: 0, color: dt.colors.ink, fontFamily: diffuseFont.body, paddingHorizontal: 2 } : null]}
      />
    </LogFormShell>
  )
}

// Backwards-compat alias for existing call sites
export { IntimacyForm as IntercourseForm }

// ─── OvulationForm ─────────────────────────────────────────────────────────
export function OvulationForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
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
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed')
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
        <View style={diffuse ? {
          width: 90, height: 90, borderRadius: 999,
          backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2,
          alignItems: 'center', justifyContent: 'center',
        } : {
          width: 90, height: 90, borderRadius: 999,
          backgroundColor: '#F5D652', borderWidth: 2, borderColor: '#141313',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#141313', shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 3, height: 3 },
        }}>
          <View style={{
            width: 60, height: 60, borderRadius: 999,
            backgroundColor: diffuse ? 'transparent' : '#FFFEF8',
            borderWidth: diffuse ? 1 : 0, borderColor: diffuse ? dt.colors.line : 'transparent',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: diffuse ? stickers.peach : '#EE7B6D' }} />
          </View>
        </View>
        <Text style={diffuse
          ? { marginTop: 12, fontSize: 12, color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase' }
          : { marginTop: 12, fontSize: 13, color: '#555' }}>
          {t('cycleLogForm_ovulationConfirm')}
        </Text>
      </View>
    </LogFormShell>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────
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
    shadowColor: '#141313', shadowOpacity: 1, shadowRadius: 0,
    shadowOffset: { width: 2, height: 2 }, elevation: 2,
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
    shadowColor: '#141313', shadowOpacity: 1, shadowRadius: 0,
    shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  tileFlex: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#141313', shadowOpacity: 1, shadowRadius: 0,
    shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  tileWide: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 18, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#141313', shadowOpacity: 1, shadowRadius: 0,
    shadowOffset: { width: 2, height: 2 }, elevation: 2,
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
    backgroundColor: '#FFFEF8', borderWidth: 1.5, borderColor: '#141313',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#141313', shadowOpacity: 1, shadowRadius: 0,
    shadowOffset: { width: 2, height: 2 },
  },
})
