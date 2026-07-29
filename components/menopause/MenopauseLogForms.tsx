/**
 * Menopause Log Forms (E1 / U7)
 *
 * Two bottom-sheet forms rendered inside the shared <LogSheet> (the parent
 * supplies the sheet shell + title), mirroring the cycle log forms:
 *
 *  - MenopauseSymptomForm — pick a symptom from ALL_MENOPAUSE_SYMPTOMS (grouped
 *    by the 5 groups) → severity 1–5 via StepSlider → optional note → insert a
 *    `menopause_logs` row via saveMenopauseLog.
 *  - MenopausePeriodForm — (peri only) pick a flow level → insert a `period`
 *    event AND update last_period_date (profiles + useMenopauseStore).
 *
 * Design: tokens-only, dual-variant (useMenoPalette). Ember mode color via
 * getModeColor('menopause') (current) / getDiffuseAccent('menopause') (Diffuse).
 * Selectable chips carry the hard-offset sticker shadow in the current variant
 * only (Diffuse stays shadowless). Semantic icons are Character blobs. Uses
 * toDateStr(new Date()) for the log date.
 */

import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native'
import { PillButton } from '../ui/PillButton'
import { StepSlider } from '../ui/StepSlider'
import { Character } from '../characters/Characters'
import { toDateStr } from '../../lib/cycleLogic'
import { saveMenopauseLog } from '../../lib/menopauseLogs'
import {
  ALL_MENOPAUSE_SYMPTOMS,
  type MenopauseSymptomId,
} from '../../lib/menopauseSymptoms'
import { supabase } from '../../lib/supabase'
import { useMenopauseStore } from '../../store/useMenopauseStore'
import { useMenoPalette, STICKER_SHADOW, type MenoPalette } from './menoPalette'
import { GROUP_META, GROUP_ORDER } from './menopauseIcons'

// ─── Copy (English literals — no menopause i18n keys exist yet) ──────────────

const COPY = {
  symptomPick: 'What are you noticing?',
  severityQ: 'How intense is it?',
  severityHint: ['Barely there', 'Mild', 'Moderate', 'Strong', 'Intense'],
  noteLabel: 'Add a note (optional)',
  notePlaceholder: 'Anything you want to remember…',
  save: 'Save',
  periodQ: 'How is the flow?',
  periodNote: 'Logging a period also updates your “months since last period”.',
  flowLight: 'Light',
  flowMedium: 'Medium',
  flowHeavy: 'Heavy',
  savedError: 'Could not save',
  savedErrorBody: 'Something went wrong saving your log. Please try again.',
}

// ═══════════════════════════════════════════════════════════════════════════
// Symptom form
// ═══════════════════════════════════════════════════════════════════════════

export function MenopauseSymptomForm({ onSaved }: { onSaved: () => void }) {
  const pal = useMenoPalette()
  const [symptomId, setSymptomId] = useState<MenopauseSymptomId | null>(null)
  const [severity, setSeverity] = useState(3)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!symptomId || saving) return
    setSaving(true)
    try {
      await saveMenopauseLog({
        date: toDateStr(new Date()),
        type: symptomId,
        severity,
        notes: notes.trim() || null,
      })
      onSaved()
    } catch (e) {
      setSaving(false)
      Alert.alert(COPY.savedError, COPY.savedErrorBody)
    }
  }

  return (
    <View style={styles.form}>
      <Text style={[styles.sectionLabel, { color: pal.textMuted, fontFamily: pal.fontBodySemiBold }]}>
        {COPY.symptomPick}
      </Text>

      {GROUP_ORDER.map((group) => {
        const items = ALL_MENOPAUSE_SYMPTOMS.filter((s) => s.group === group)
        const meta = GROUP_META[group]
        return (
          <View key={group} style={styles.groupBlock}>
            <View style={styles.groupHead}>
              <Character name={meta.icon} size={20} color={pal.accent} bg={pal.bg} />
              <Text style={[styles.groupLabel, { color: pal.textMuted, fontFamily: pal.fontBodySemiBold }]}>
                {meta.label}
              </Text>
            </View>
            <View style={styles.chipWrap}>
              {items.map((s) => (
                <SelectableChip
                  key={s.id}
                  label={s.label}
                  selected={symptomId === s.id}
                  onPress={() => setSymptomId(s.id)}
                  pal={pal}
                />
              ))}
            </View>
          </View>
        )
      })}

      {symptomId && (
        <View style={styles.severityBlock}>
          <Text style={[styles.sectionLabel, { color: pal.textMuted, fontFamily: pal.fontBodySemiBold }]}>
            {COPY.severityQ}
          </Text>
          <StepSlider min={1} max={5} value={severity} onChange={setSeverity} color={pal.accent} />
          <Text style={[styles.severityHint, { color: pal.textSecondary, fontFamily: pal.fontBody }]}>
            {COPY.severityHint[severity - 1]}
          </Text>
        </View>
      )}

      <View style={styles.noteBlock}>
        <Text style={[styles.sectionLabel, { color: pal.textMuted, fontFamily: pal.fontBodySemiBold }]}>
          {COPY.noteLabel}
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={COPY.notePlaceholder}
          placeholderTextColor={pal.textMuted}
          multiline
          style={[
            styles.noteInput,
            {
              backgroundColor: pal.surface,
              borderColor: pal.border,
              borderRadius: pal.radius.md,
              color: pal.text,
              fontFamily: pal.fontBody,
            },
          ]}
        />
      </View>

      <PillButton
        label={COPY.save}
        variant="ink"
        onPress={handleSave}
        loading={saving}
        disabled={!symptomId || saving}
      />
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Period-event form (peri only)
// ═══════════════════════════════════════════════════════════════════════════

type Flow = 'light' | 'medium' | 'heavy'

const FLOW_OPTIONS: { id: Flow; label: string }[] = [
  { id: 'light', label: COPY.flowLight },
  { id: 'medium', label: COPY.flowMedium },
  { id: 'heavy', label: COPY.flowHeavy },
]

export function MenopausePeriodForm({ onSaved }: { onSaved: () => void }) {
  const pal = useMenoPalette()
  const [flow, setFlow] = useState<Flow | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!flow || saving) return
    setSaving(true)
    const date = toDateStr(new Date())
    try {
      await saveMenopauseLog({ date, type: 'period', value: flow })
      // A logged period is the newest known period start — update the durable
      // store + profile so the home "months since last period" counter and the
      // 12-month offer stay accurate.
      useMenopauseStore.getState().setLastPeriodDate(date)
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user.id
      if (userId) {
        await supabase.from('profiles').update({ last_period_date: date }).eq('id', userId)
      }
      onSaved()
    } catch (e) {
      setSaving(false)
      Alert.alert(COPY.savedError, COPY.savedErrorBody)
    }
  }

  return (
    <View style={styles.form}>
      <View style={styles.periodHead}>
        <View style={[styles.periodIcon, { backgroundColor: pal.accentSoft, borderColor: pal.border }]}>
          <Character name="period" size={30} color={pal.accent} bg={pal.bg} />
        </View>
        <Text style={[styles.sectionLabel, { color: pal.textMuted, fontFamily: pal.fontBodySemiBold }]}>
          {COPY.periodQ}
        </Text>
      </View>

      <View style={styles.chipWrap}>
        {FLOW_OPTIONS.map((o) => (
          <SelectableChip
            key={o.id}
            label={o.label}
            selected={flow === o.id}
            onPress={() => setFlow(o.id)}
            pal={pal}
          />
        ))}
      </View>

      <Text style={[styles.periodNote, { color: pal.textMuted, fontFamily: pal.fontBody }]}>
        {COPY.periodNote}
      </Text>

      <PillButton
        label={COPY.save}
        variant="ink"
        onPress={handleSave}
        loading={saving}
        disabled={!flow || saving}
      />
    </View>
  )
}

// ─── Shared selectable pill chip (dual-variant) ──────────────────────────────

function SelectableChip({
  label,
  selected,
  onPress,
  pal,
}: {
  label: string
  selected: boolean
  onPress: () => void
  pal: MenoPalette
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        // Hard-offset sticker shadow — CURRENT variant only; Diffuse stays flat.
        !pal.diffuse && { ...STICKER_SHADOW, shadowColor: pal.text },
        {
          backgroundColor: selected ? pal.accentSoft : pal.surface,
          borderColor: selected ? pal.accent : pal.border,
          // Diffuse has no `full` pill token — use its xl outline; current keeps
          // the sticker pill.
          borderRadius: pal.diffuse ? pal.radius.xl : pal.radius.full,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? pal.accent : pal.textSecondary, fontFamily: pal.fontBodyMedium },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  form: { gap: 18, paddingBottom: 8 },
  sectionLabel: { fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },

  groupBlock: { gap: 10 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupLabel: { fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingVertical: 11, paddingHorizontal: 16, borderWidth: 1 },
  chipText: { fontSize: 14.5 },

  severityBlock: { gap: 8 },
  severityHint: { fontSize: 14, textAlign: 'center', marginTop: -4 },

  noteBlock: { gap: 8 },
  noteInput: { minHeight: 72, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlignVertical: 'top' },

  periodHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  periodIcon: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  periodNote: { fontSize: 13, lineHeight: 19 },
})
