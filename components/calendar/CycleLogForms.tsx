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
import { useTheme } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import {
  ALL_SYMPTOMS, suggestedForPhase, symptomLabel, type SymptomId,
} from '../../lib/cycleSymptoms'
import { phaseHint, saveLabel } from '../../lib/cycleLogForms'
import type { CyclePhase } from '../../lib/cycleLogic'
import { SymptomSticker } from './symptomStickers'
import { Drop, Heart, Smiley, Sad, Sleepy } from '../ui/Stickers'

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
  return (
    <View style={styles.shell}>
      <View style={styles.headRow}>
        <Text style={[styles.title, { color: colors.text, fontFamily: font.display }]}>
          {title}
        </Text>
        <Text style={[styles.subline, { color: colors.textFaint, fontFamily: font.bodyMedium }]}>
          {subline}
        </Text>
      </View>

      <View
        style={[
          styles.phasePill,
          { borderColor: phaseInk, backgroundColor: phaseTint },
        ]}
      >
        <Text style={[styles.phasePillText, { color: phaseInk, fontFamily: font.bodySemiBold }]}>
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
        <Text style={[styles.chipCheck, { color: '#FFFEF8', fontFamily: font.bodyBold }]}>✓</Text>
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
const FLOW_OPTIONS: { id: 'light' | 'medium' | 'heavy'; label: string; dropColor: string }[] = [
  { id: 'light',  label: 'Light',  dropColor: '#F2B2C7' },
  { id: 'medium', label: 'Medium', dropColor: '#EE7B6D' },
  { id: 'heavy',  label: 'Heavy',  dropColor: '#D94A3E' },
]

export function PeriodStartForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
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
      title="Period started"
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
      <Text style={styles.bodyLabel}>Flow</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {FLOW_OPTIONS.map((opt) => (
          <Pressable
            key={opt.id}
            onPress={() => setFlow(opt.id)}
            style={[
              styles.tileFlex,
              {
                backgroundColor: flow === opt.id ? accent : tint,
                borderColor: '#141313',
              },
            ]}
          >
            <Drop size={36} fill={flow === opt.id ? '#FFFEF8' : opt.dropColor} />
            <Text style={[styles.tileLabel, { color: flow === opt.id ? '#FFFEF8' : '#141313' }]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor="#888"
        style={styles.notesInput}
      />
    </LogFormShell>
  )
}

// ─── PeriodEndForm ─────────────────────────────────────────────────────────
export function PeriodEndForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
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
      title="Period ended"
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
          borderWidth: 2, borderColor: accent, borderStyle: 'dashed',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Drop size={36} fill={accent} />
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
      title="Symptoms"
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
            borderWidth: 1, borderColor: accent, borderStyle: 'dashed',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: accent, fontWeight: '700', fontSize: 12 }}>+</Text>
          </View>
          <Text style={{ color: accent, fontWeight: '600', fontSize: 12 }}>
            Show more ({hiddenCount})
          </Text>
        </Pressable>
      ) : null}
    </LogFormShell>
  )
}

// ─── MoodForm ──────────────────────────────────────────────────────────────
const MOOD_OPTIONS: {
  id: string
  label: string
  Sticker: typeof Sad
  fill: string
}[] = [
  { id: 'low',   label: 'Low',   Sticker: Sad,    fill: '#EE7B6D' },
  { id: 'down',  label: 'Down',  Sticker: Sad,    fill: '#9DC3E8' },
  { id: 'okay',  label: 'Okay',  Sticker: Sleepy, fill: '#C8B6E8' },
  { id: 'good',  label: 'Good',  Sticker: Smiley, fill: '#F5D652' },
  { id: 'great', label: 'Great', Sticker: Smiley, fill: '#BDD48C' },
]

export function MoodForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
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
      title="How are you?"
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
                backgroundColor: active ? tint : 'transparent',
                borderRadius: 14,
              }}
            >
              <M size={40} fill={m.fill} />
              <Text style={{
                fontSize: 10, marginTop: 4,
                color: active ? '#141313' : '#555',
                fontWeight: active ? '700' : '600',
              }}>
                {m.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Note (optional)"
        placeholderTextColor="#888"
        style={styles.notesInput}
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
      title="Basal temp"
      subline={`${formatDate(date)} · before getting up`}
      phaseHintText={phaseHint('bbt', phase)}
      phaseAccent={accent}
      phaseTint={tint}
      phaseInk={ink}
      saveLabel={saveLabel('bbt')}
      saving={saving}
      onSave={save}
    >
      <View style={[styles.slider, { backgroundColor: colors.surfaceRaised }]}>
        <Text style={[styles.sliderNum, { color: colors.text, fontFamily: font.display }]}>
          {wholeTemp}
          <Text style={[styles.sliderUnit, { color: colors.textFaint, fontFamily: font.italic }]}>
            {' °C'}
          </Text>
        </Text>
        <View style={[styles.sliderTrack, { borderColor: colors.border }]}>
          <View
            style={[
              styles.sliderKnob,
              { left: `${pct * 100}%`, backgroundColor: accent, borderColor: '#141313' },
            ]}
          />
        </View>
        <View style={styles.sliderTicks}>
          {[BBT_MIN, BBT_MAX].map((v) => (
            <Pressable key={v} onPress={() => setTenths(v)} style={styles.sliderTickHit}>
              <Text style={{ color: colors.textFaint, fontFamily: font.bodyMedium, fontSize: 10 }}>
                {(v / 10).toFixed(1)}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.sliderRow}>
          <Pressable onPress={() => setTenths(Math.max(BBT_MIN, tenths - 1))} style={styles.sliderBtn}>
            <Text style={{ color: accent, fontSize: 20, fontFamily: font.bodyBold }}>−</Text>
          </Pressable>
          <Pressable onPress={() => setTenths(Math.min(BBT_MAX, tenths + 1))} style={styles.sliderBtn}>
            <Text style={{ color: accent, fontSize: 20, fontFamily: font.bodyBold }}>+</Text>
          </Pressable>
        </View>
      </View>
    </LogFormShell>
  )
}

// ─── LhForm ─────────────────────────────────────────────────────────────────
const LH_OPTIONS = [
  { id: 'negative', label: 'Negative' },
  { id: 'faint',    label: 'Faint line' },
  { id: 'positive', label: 'Positive' },
  { id: 'peak',     label: 'Peak / surge' },
]

export function LhForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
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
      title="LH test"
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
                  backgroundColor: opt.id === value ? '#FFFEF8' : accent + '55',
                }}
              />
            }
            label={opt.label}
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
const CM_OPTIONS: { id: string; label: string }[] = [
  { id: 'dry',      label: 'Dry' },
  { id: 'sticky',   label: 'Sticky' },
  { id: 'creamy',   label: 'Creamy' },
  { id: 'watery',   label: 'Watery' },
  { id: 'eggwhite', label: 'Eggwhite' },
]

export function CmForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
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
      title="Cervical mucus"
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
        {CM_OPTIONS.map((opt) => (
          <Pressable
            key={opt.id}
            onPress={() => setValue(opt.id)}
            style={[
              styles.tile,
              {
                backgroundColor: value === opt.id ? accent : tint,
                borderColor: '#141313',
              },
            ]}
          >
            <Drop size={28} fill={value === opt.id ? '#FFFEF8' : accent} />
            <Text style={[styles.tileLabel, { color: value === opt.id ? '#FFFEF8' : '#141313' }]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </LogFormShell>
  )
}

// ─── IntimacyForm (replaces IntercourseForm + old IntimacyForm) ────────────
export function IntimacyForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
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
      title="Intimacy"
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
        <Pressable
          onPress={() => setValue('unprotected')}
          style={[
            styles.tileWide,
            { backgroundColor: value === 'unprotected' ? accent : tint, borderColor: '#141313' },
          ]}
        >
          <Heart size={40} fill={value === 'unprotected' ? '#FFFEF8' : accent} />
          <Text style={[styles.tileLabel, { color: value === 'unprotected' ? '#FFFEF8' : '#141313', marginTop: 6 }]}>
            Unprotected
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setValue('protected')}
          style={[
            styles.tileWide,
            { backgroundColor: value === 'protected' ? accent : tint, borderColor: '#141313' },
          ]}
        >
          <Heart size={40} fill={value === 'protected' ? '#FFFEF8' : accent} />
          <Text style={[styles.tileLabel, { color: value === 'protected' ? '#FFFEF8' : '#141313', marginTop: 6 }]}>
            Protected
          </Text>
        </Pressable>
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Note (optional)"
        placeholderTextColor="#888"
        style={styles.notesInput}
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
      title="Ovulation"
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
        <View style={{
          width: 90, height: 90, borderRadius: 999,
          backgroundColor: '#F5D652', borderWidth: 2, borderColor: '#141313',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#141313', shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 3, height: 3 },
        }}>
          <View style={{
            width: 60, height: 60, borderRadius: 999,
            backgroundColor: '#FFFEF8',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: '#EE7B6D' }} />
          </View>
        </View>
        <Text style={{ marginTop: 12, fontSize: 13, color: '#555' }}>
          Confirms ovulation for this cycle
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
