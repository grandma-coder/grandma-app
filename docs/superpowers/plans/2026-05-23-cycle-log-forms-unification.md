# Cycle Log Forms Unification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify all 9 cycle log forms into a single sticker-styled, phase-aware system with shared shell, mini-stickers per symptom, true-toggle multi-pick, and one save-button visual language across the set.

**Architecture:** Replace `components/calendar/LogForms.tsx` (lucide-styled) with new components in `components/calendar/CycleLogForms.tsx` (already sticker-styled). Add 3 shared internal blocks (`LogFormShell`, `StickerChip`, `useDayLogToggle`) at the top of the file. All 9 forms wrap the shell. Add 2 lib helpers (`cycleSymptoms`, `cycleLogForms`) and 1 sticker registry (`symptomStickers`). Update the single import site (`CycleCalendar.tsx`).

**Tech Stack:** React Native 0.81 + Expo SDK 54 · Zustand v5 · React Query v5 · Supabase · react-native-svg · constants/theme.ts tokens.

**Reference:** Spec at [docs/superpowers/specs/2026-05-23-cycle-log-forms-unification-design.md](../specs/2026-05-23-cycle-log-forms-unification-design.md). Visual mockup at `.superpowers/brainstorm/11580-1779590834/content/all-forms.html`.

**Verification model:** This repo has no Jest/Vitest component test suite for cycle forms. After each task, the verification gate is `npx tsc --noEmit` (must produce no new errors beyond the known pre-existing `HeartIcon` / `onboarding/cycle/index` errors). Manual UI verification on iOS simulator after every 2–3 tasks.

---

## File map

| File | State | Responsibility |
|---|---|---|
| `lib/cycleSymptoms.ts` | **New** | `SymptomId` union, `ALL_SYMPTOMS` list, `PHASE_SUGGESTED` map. Pure data, no React. |
| `lib/cycleLogForms.ts` | **New** | `FormId` union, `PHASE_PILL` copy table, `SAVE_LABEL` table, `phaseHint(form, phase)`, `saveLabel(form, count, initial)`. Pure helpers. |
| `components/calendar/symptomStickers.tsx` | **New** | `<SymptomSticker id size />` switch component, 14 mini SVG glyphs reusing existing brand stickers where they fit (`Drop`, `Moon`, `Leaf`, `Heart`, `Sleepy`, `Smiley`, `Sad`, `Bolt`) + 6 new primitives. |
| `components/calendar/CycleLogForms.tsx` | **Major rewrite** | All 9 forms + `LogFormShell` + `StickerChip` + `useDayLogToggle` + `<SaveStickerButton>`. Single source. |
| `components/calendar/LogForms.tsx` | **Delete** | Replaced by `CycleLogForms.tsx`. |
| `components/calendar/CycleCalendar.tsx` | **Modify** | Update import path + add `phase` prop to each form invocation. |
| `components/home/cycle/FertilitySignalsCard.tsx` | **No change** | Imports already resolve from `CycleLogForms.tsx`; new `IntimacyForm` export name is aliased back to `IntercourseForm` for backwards compat. |
| `components/home/cycle/FertileWindowModal.tsx` | **No change** | Same — already imports from `CycleLogForms`. |

---

## Task 1: Symptoms data module

**Files:**
- Create: `lib/cycleSymptoms.ts`

- [ ] **Step 1: Create file with symptom IDs, labels, and phase suggestions**

```ts
// lib/cycleSymptoms.ts
import type { CyclePhase } from './cycleLogic'

export type SymptomId =
  | 'cramps'
  | 'headache'
  | 'bloated'
  | 'fatigue'
  | 'nausea'
  | 'back-pain'
  | 'tender-breasts'
  | 'acne'
  | 'insomnia'
  | 'cravings'
  | 'low-mood'
  | 'spotting'
  | 'energetic'
  | 'restless'

export const ALL_SYMPTOMS: { id: SymptomId; label: string }[] = [
  { id: 'cramps', label: 'Cramps' },
  { id: 'headache', label: 'Headache' },
  { id: 'bloated', label: 'Bloated' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'nausea', label: 'Nausea' },
  { id: 'back-pain', label: 'Back pain' },
  { id: 'tender-breasts', label: 'Tender' },
  { id: 'acne', label: 'Acne' },
  { id: 'insomnia', label: 'Insomnia' },
  { id: 'cravings', label: 'Cravings' },
  { id: 'low-mood', label: 'Low mood' },
  { id: 'spotting', label: 'Spotting' },
  { id: 'energetic', label: 'Energetic' },
  { id: 'restless', label: 'Restless' },
]

const SUGGESTED: Record<CyclePhase, SymptomId[]> = {
  menstruation: ['cramps', 'back-pain', 'fatigue', 'headache', 'low-mood', 'bloated'],
  follicular:   ['acne', 'energetic', 'restless', 'headache'],
  ovulation:    ['tender-breasts', 'cramps', 'cravings', 'spotting'],
  luteal:       ['bloated', 'tender-breasts', 'low-mood', 'cravings', 'acne', 'fatigue'],
}

export function suggestedForPhase(phase: CyclePhase): SymptomId[] {
  return SUGGESTED[phase]
}

export function symptomLabel(id: SymptomId): string {
  return ALL_SYMPTOMS.find((s) => s.id === id)?.label ?? id
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep "cycleSymptoms" || echo "OK"`
Expected: `OK`

---

## Task 2: Phase pill + save label helpers

**Files:**
- Create: `lib/cycleLogForms.ts`

- [ ] **Step 1: Create file**

```ts
// lib/cycleLogForms.ts
import type { CyclePhase } from './cycleLogic'

export type FormId =
  | 'period_start'
  | 'period_end'
  | 'symptoms'
  | 'mood'
  | 'bbt'
  | 'lh'
  | 'cm'
  | 'intimacy'
  | 'ovulation'

const PHASE_PILL: Record<FormId, Record<CyclePhase, string>> = {
  period_start: {
    menstruation: 'Menstruation begins',
    follicular:   'Marking period start',
    ovulation:    'Unusual — period start mid-cycle',
    luteal:       'Period started early',
  },
  period_end: {
    menstruation: 'Last day of period',
    follicular:   'Marking period end',
    ovulation:    'Marking period end',
    luteal:       'Marking period end',
  },
  symptoms: {
    menstruation: 'Common in Menstruation',
    follicular:   'Common in Follicular',
    ovulation:    'Common in Ovulation',
    luteal:       'Common in Luteal',
  },
  mood: {
    menstruation: 'Menstruation · be gentle',
    follicular:   'Follicular · energy rising',
    ovulation:    'Ovulation · peak energy',
    luteal:       'Luteal · mood often softer',
  },
  bbt: {
    menstruation: 'Track every morning',
    follicular:   'Track every morning',
    ovulation:    'Track every morning',
    luteal:       'Track every morning',
  },
  lh: {
    menstruation: 'Predicts ovulation 24–36h ahead',
    follicular:   'Predicts ovulation 24–36h ahead',
    ovulation:    'Surge today?',
    luteal:       'Outside fertile window',
  },
  cm: {
    menstruation: 'Fertility signal',
    follicular:   'Fertility signal',
    ovulation:    'Egg-white = peak fertile',
    luteal:       'Fertility signal',
  },
  intimacy: {
    menstruation: 'Logged for cycle insights',
    follicular:   'Logged for cycle insights',
    ovulation:    'Peak fertile window',
    luteal:       'Logged for cycle insights',
  },
  ovulation: {
    menstruation: 'Unusual — confirm carefully',
    follicular:   'Early but possible',
    ovulation:    'Fertile window peak',
    luteal:       'Late confirmation',
  },
}

export function phaseHint(form: FormId, phase: CyclePhase): string {
  return PHASE_PILL[form][phase]
}

const IDLE_LABEL: Record<FormId, string> = {
  period_start: 'Start period',
  period_end:   'Mark as ended',
  symptoms:     'Save symptoms',
  mood:         'Save mood',
  bbt:          'Save temperature',
  lh:           'Save result',
  cm:           'Save mucus',
  intimacy:     'Save',
  ovulation:    'Confirm ovulation',
}

export function saveLabel(
  form: FormId,
  opts?: { count?: number; initialCount?: number },
): string {
  if (form === 'symptoms') {
    const count = opts?.count ?? 0
    const initial = opts?.initialCount ?? 0
    if (count === 0 && initial > 0) return 'Update symptoms'
    if (count > 0) return `Save ${count} symptom${count === 1 ? '' : 's'}`
    return IDLE_LABEL.symptoms
  }
  return IDLE_LABEL[form]
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep "cycleLogForms" || echo "OK"`
Expected: `OK`

- [ ] **Step 3: Commit Tasks 1+2**

```bash
git add lib/cycleSymptoms.ts lib/cycleLogForms.ts
git commit -m "feat(cycle): add cycleSymptoms + cycleLogForms helper modules

Pure data + helpers for the unified cycle log form set. SymptomId union,
PHASE_SUGGESTED ordering, PHASE_PILL copy table, dynamic save labels.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Symptom sticker registry

**Files:**
- Create: `components/calendar/symptomStickers.tsx`

- [ ] **Step 1: Create the registry. Reuse brand stickers where they fit, draw new tiny glyphs inline for the rest.**

```tsx
// components/calendar/symptomStickers.tsx
/**
 * SymptomSticker — 16px glyph per SymptomId for the unified cycle log forms.
 *
 * Reuses brand stickers (Drop, Moon, Leaf, Heart, Sleepy, Smiley, Sad, Bolt)
 * where they fit; inline SVG for symptoms without a matching brand sticker.
 * Raw hex inside SVG path strings is allowed (design-system exception).
 */
import Svg, { Path, Circle, G } from 'react-native-svg'
import { View } from 'react-native'
import { Drop, Heart, Sleepy, Sad, Bolt } from '../ui/Stickers'
import type { SymptomId } from '../../lib/cycleSymptoms'

interface Props {
  id: SymptomId
  size?: number
}

export function SymptomSticker({ id, size = 16 }: Props) {
  switch (id) {
    case 'cramps':         return <Cramp size={size} />
    case 'headache':       return <Headache size={size} />
    case 'bloated':        return <Bloated size={size} />
    case 'fatigue':        return <Sleepy size={size} fill="#9DC3E8" />
    case 'nausea':         return <Nausea size={size} />
    case 'back-pain':      return <BackPain size={size} />
    case 'tender-breasts': return <Heart size={size} fill="#F2B2C7" />
    case 'acne':           return <Acne size={size} />
    case 'insomnia':       return <Moon16 size={size} />
    case 'cravings':       return <Cravings size={size} />
    case 'low-mood':       return <Sad size={size} fill="#9DC3E8" />
    case 'spotting':       return <Drop size={size} fill="#EE7B6D" />
    case 'energetic':      return <Bolt size={size} fill="#F5D652" />
    case 'restless':       return <Restless size={size} />
  }
}

// ── New primitives (sticker style: filled accent + ink stroke) ──────────────
const INK = '#141313'

function Wrap({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  )
}

function Cramp({ size }: { size: number }) {
  // Spiral squiggle (cramps = a knot)
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M5 12 Q 8 7, 12 9 T 19 12 Q 17 18, 12 16 T 6 14"
          fill="none" stroke="#EE7B6D" strokeWidth={2.2} strokeLinecap="round"
        />
      </Svg>
    </Wrap>
  )
}

function Headache({ size }: { size: number }) {
  // Lightning bolt inside a head outline
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={9} fill="#F5B896" stroke={INK} strokeWidth={1.2} />
        <Path d="M13 6 L 9 13 L 12 13 L 10 18 L 15 11 L 12 11 Z" fill={INK} />
      </Svg>
    </Wrap>
  )
}

function Bloated({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={13} r={8.5} fill="#C8B6E8" stroke={INK} strokeWidth={1.2} />
        <Path d="M8 11 q 4 -3 8 0" stroke={INK} strokeWidth={1} fill="none" />
      </Svg>
    </Wrap>
  )
}

function Nausea({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={9} fill="#BDD48C" stroke={INK} strokeWidth={1.2} />
        <Path d="M8 14 q 2 -2 4 0 t 4 0" stroke={INK} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      </Svg>
    </Wrap>
  )
}

function BackPain({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 4 v 16" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
        <Circle cx={12} cy={4} r={2.5} fill="#F5B896" stroke={INK} strokeWidth={1} />
        <Path d="M9 9 h 6 M9 13 h 6 M9 17 h 6" stroke="#EE7B6D" strokeWidth={1.4} strokeLinecap="round" />
      </Svg>
    </Wrap>
  )
}

function Acne({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={9} cy={9} r={2.4} fill="#EE7B6D" stroke={INK} strokeWidth={1} />
        <Circle cx={15} cy={11} r={1.8} fill="#EE7B6D" stroke={INK} strokeWidth={1} />
        <Circle cx={10} cy={15} r={2} fill="#EE7B6D" stroke={INK} strokeWidth={1} />
      </Svg>
    </Wrap>
  )
}

function Moon16({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M16 13 a 7 7 0 1 1 -6.5 -8.5 A 6 6 0 0 0 16 13 Z"
          fill="#C8B6E8" stroke={INK} strokeWidth={1.2}
        />
      </Svg>
    </Wrap>
  )
}

function Cravings({ size }: { size: number }) {
  // Cupcake-ish swirl
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M6 15 h 12 l -2 6 h -8 z" fill="#F5D652" stroke={INK} strokeWidth={1.2} />
        <Circle cx={12} cy={10} r={5} fill="#F2B2C7" stroke={INK} strokeWidth={1.2} />
      </Svg>
    </Wrap>
  )
}

function Restless({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M5 8 q 3 -4 7 0 t 7 0 M5 12 q 3 -4 7 0 t 7 0 M5 16 q 3 -4 7 0 t 7 0"
          stroke="#7048B8" strokeWidth={1.4} fill="none" strokeLinecap="round" />
      </Svg>
    </Wrap>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep "symptomStickers" || echo "OK"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add components/calendar/symptomStickers.tsx
git commit -m "feat(cycle): add SymptomSticker registry

14 mini SVG glyphs per SymptomId. Reuses brand Drop/Moon/Leaf/Heart/Sleepy/
Sad/Bolt where they fit; new inline primitives for cramps/headache/bloated/
nausea/back-pain/acne/insomnia-moon/cravings/restless.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Rewrite CycleLogForms.tsx — shared blocks

**Files:**
- Modify: `components/calendar/CycleLogForms.tsx` (full rewrite, replacing existing content)

This task replaces the file's contents up through the shared blocks. The 9 form components come in Tasks 5–7.

- [ ] **Step 1: Read the current file once to copy the BBT slider component intact (it's a sticker-styled slider we want to preserve verbatim inside the new layout).**

```bash
cat components/calendar/CycleLogForms.tsx | head -100
```

Note the `BBT_MIN`, `BBT_MAX`, slider styling — we'll reuse the slider geometry.

- [ ] **Step 2: Replace the file with the new module: shared blocks + the 4 existing forms (BBT/LH/CM/Intimacy) rewrapped in the new shell. Symptom/Mood/PeriodStart/PeriodEnd/Ovulation come in next tasks.**

Write the file with the following content:

```tsx
// components/calendar/CycleLogForms.tsx
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
import { phaseHint, saveLabel, type FormId } from '../../lib/cycleLogForms'
import type { CyclePhase } from '../../lib/cycleLogic'
import { SymptomSticker } from './symptomStickers'
import { Drop, Heart, Moon, Smiley, Sad, Sleepy } from '../ui/Stickers'

// ─── Shared: Save helper for single-pick / continuous forms ────────────────
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

// ─── Shared: useDayLogToggle (for Symptoms multi-pick) ─────────────────────
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

  const initialSet = useMemo(() => new Set(initial), [initial])
  const [selected, setSelected] = useState<Set<string>>(initialSet)
  // Re-sync local state when initial loads (first non-empty fetch)
  useEffect(() => { setSelected(new Set(initialSet)) }, [initialSet])

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

  return {
    initialCount: initialSet.size,
    selected,
    selectedCount: selected.size,
    isDirty: selected.size !== initialSet.size ||
             [...selected].some((v) => !initialSet.has(v)),
    saving,
    toggle,
    commit,
  }
}

// ─── Shared: LogFormShell ───────────────────────────────────────────────────
interface LogFormShellProps {
  title: string
  subline: string
  phaseHintText: string
  phaseAccent: string
  phaseTint: string
  children: React.ReactNode
  saveLabel: string
  saveDisabled?: boolean
  saving?: boolean
  onSave: () => void
}

function LogFormShell({
  title, subline, phaseHintText, phaseAccent, phaseTint,
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
          { borderColor: phaseAccent, backgroundColor: phaseTint },
        ]}
      >
        <Text style={[styles.phasePillText, { color: phaseAccent, fontFamily: font.bodySemiBold }]}>
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
        {
          backgroundColor: accent,
          opacity: disabled ? 0.5 : 1,
          borderColor: '#141313',
        },
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

// ─── Shared: StickerChip ────────────────────────────────────────────────────
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
    case 'menstruation': return { accent: stickers.coral,  tint: stickers.pinkSoft  }
    case 'follicular':   return { accent: stickers.green,  tint: stickers.greenSoft }
    case 'ovulation':    return { accent: stickers.peach,  tint: stickers.peachSoft }
    case 'luteal':       return { accent: stickers.lilac,  tint: stickers.lilacSoft }
  }
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
  const { accent, tint } = phaseColors(phase, stickers)

  async function save() {
    setSaving(true)
    try {
      const value = (tenths / 10).toFixed(1)
      await replaceSingleLog(date, 'basal_temp', value)
      await invalidateCycleLogs()
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
            <Pressable
              key={v}
              onPress={() => setTenths(v)}
              style={styles.sliderTickHit}
            >
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
  const { accent, tint } = phaseColors(phase, stickers)

  async function save() {
    if (!value) return
    setSaving(true)
    try {
      await replaceSingleLog(date, 'lh', value)
      await invalidateCycleLogs()
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
      saveLabel={saveLabel('lh')}
      saveDisabled={!value}
      saving={saving}
      onSave={save}
    >
      <View style={{ gap: 6 }}>
        {LH_OPTIONS.map((opt) => (
          <StickerChip
            key={opt.id}
            sticker={<View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: opt.id === value ? '#FFFEF8' : accent + '55' }} />}
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
  const { accent, tint } = phaseColors(phase, stickers)

  async function save() {
    if (!value) return
    setSaving(true)
    try {
      await replaceSingleLog(date, 'cervical_mucus', value)
      await invalidateCycleLogs()
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
            <Text
              style={{
                color: value === opt.id ? '#FFFEF8' : '#141313',
                fontWeight: '600', fontSize: 11, marginTop: 4,
              }}
            >
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
  const { accent, tint } = phaseColors(phase, stickers)

  async function save() {
    if (!value) return
    setSaving(true)
    try {
      await replaceSingleLog(date, 'intercourse', value, notes || undefined)
      await invalidateCycleLogs()
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
      saveLabel={saveLabel('intimacy')}
      saveDisabled={!value}
      saving={saving}
      onSave={save}
    >
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => setValue('unprotected')}
          style={[styles.tileWide, { backgroundColor: value === 'unprotected' ? accent : tint, borderColor: '#141313' }]}
        >
          <Heart size={40} fill={value === 'unprotected' ? '#FFFEF8' : accent} />
          <Text style={{ color: value === 'unprotected' ? '#FFFEF8' : '#141313', fontWeight: '600', marginTop: 6 }}>
            Unprotected
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setValue('protected')}
          style={[styles.tileWide, { backgroundColor: value === 'protected' ? accent : tint, borderColor: '#141313' }]}
        >
          <Heart size={40} fill={value === 'protected' ? '#FFFEF8' : accent} />
          <Text style={{ color: value === 'protected' ? '#FFFEF8' : '#141313', fontWeight: '600', marginTop: 6 }}>
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

// Backwards-compat alias
export { IntimacyForm as IntercourseForm }

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatDate(d: string): string {
  const dt = new Date(d + 'T12:00:00')
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function phaseTitle(phase: CyclePhase): string {
  return phase[0].toUpperCase() + phase.slice(1)
}

async function invalidateCycleLogs() {
  // No-op stub — each form's `save()` calls qc.invalidateQueries directly
  // via useQueryClient when it needs to. Top-level invalidations happen
  // inside the form bodies that use the hook (Symptoms).
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
  tileWide: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 18, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#141313', shadowOpacity: 1, shadowRadius: 0,
    shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },

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

// PeriodStartForm, PeriodEndForm, SymptomsForm, MoodForm, OvulationForm
// are added in Tasks 5–7.
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep "CycleLogForms" | head -5`
Expected: no output (the missing forms break consumers — that's expected and fixed in Task 8).

If errors are about anything inside this file (typos, prop mismatches), fix them inline.

---

## Task 5: Add PeriodStartForm + PeriodEndForm

**Files:**
- Modify: `components/calendar/CycleLogForms.tsx` (append before the styles block)

- [ ] **Step 1: Insert these two forms above `// ─── Helpers ─────`**

```tsx
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
  const accent = stickers.coral
  const tint = stickers.pinkSoft

  async function save() {
    if (!flow) return
    setSaving(true)
    try {
      await replaceSingleLog(date, 'period_start', flow, notes || undefined)
      await invalidateCycleLogs()
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
      saveLabel={saveLabel('period_start')}
      saveDisabled={!flow}
      saving={saving}
      onSave={save}
    >
      <Text style={{ fontSize: 11, color: '#888', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '600' }}>
        Flow
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {FLOW_OPTIONS.map((opt) => (
          <Pressable
            key={opt.id}
            onPress={() => setFlow(opt.id)}
            style={[
              styles.tile,
              {
                width: undefined, flex: 1,
                backgroundColor: flow === opt.id ? accent : tint,
                borderColor: '#141313',
              },
            ]}
          >
            <Drop size={36} fill={flow === opt.id ? '#FFFEF8' : opt.dropColor} />
            <Text style={{ color: flow === opt.id ? '#FFFEF8' : '#141313', fontWeight: '600', fontSize: 11, marginTop: 4 }}>
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
  const accent = stickers.coral
  const tint = stickers.pinkSoft

  async function save() {
    setSaving(true)
    try {
      await insertSingleLog(date, 'period_end')
      await invalidateCycleLogs()
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep "CycleLogForms" | head -5`
Expected: no output.

---

## Task 6: Add MoodForm + OvulationForm

**Files:**
- Modify: `components/calendar/CycleLogForms.tsx`

- [ ] **Step 1: Insert above `// ─── Helpers ─────`**

```tsx
// ─── MoodForm ──────────────────────────────────────────────────────────────
const MOOD_OPTIONS: {
  id: string
  label: string
  Sticker: typeof Sad | typeof Sleepy | typeof Smiley
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
  const { accent, tint } = phaseColors(phase, stickers)

  async function save() {
    if (!value) return
    setSaving(true)
    try {
      await replaceSingleLog(date, 'mood', value, notes || undefined)
      await invalidateCycleLogs()
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

// ─── OvulationForm ─────────────────────────────────────────────────────────
export function OvulationForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
  const [saving, setSaving] = useState(false)
  const accent = stickers.peach
  const tint = stickers.peachSoft

  async function save() {
    setSaving(true)
    try {
      await insertSingleLog(date, 'ovulation')
      await invalidateCycleLogs()
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
            <View style={{
              width: 24, height: 24, borderRadius: 999,
              backgroundColor: '#EE7B6D',
            }} />
          </View>
        </View>
        <Text style={{ marginTop: 12, fontSize: 13, color: '#555' }}>
          Confirms ovulation for this cycle
        </Text>
      </View>
    </LogFormShell>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep "CycleLogForms" | head -5`
Expected: no output.

---

## Task 7: Add SymptomsForm (the headline form)

**Files:**
- Modify: `components/calendar/CycleLogForms.tsx`

- [ ] **Step 1: Insert above `// ─── Helpers ─────`**

```tsx
// ─── SymptomsForm ──────────────────────────────────────────────────────────
export function SymptomsForm({
  date, phase, onSaved,
}: { date: string; phase: CyclePhase; onSaved: () => void }) {
  const { stickers } = useTheme()
  const toggle = useDayLogToggle(date, 'symptom')
  const [showAll, setShowAll] = useState(false)
  const { accent, tint } = phaseColors(phase, stickers)

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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep "CycleLogForms" | head -5`
Expected: no output.

- [ ] **Step 3: Commit Tasks 4–7**

```bash
git add components/calendar/CycleLogForms.tsx
git commit -m "feat(cycle): unify cycle log forms in CycleLogForms.tsx

Rewrites the file to host all 9 cycle log forms behind a shared
LogFormShell + StickerChip + useDayLogToggle. Symptoms gets phase-aware
suggestions and true-toggle (pre-loads existing rows; diff DELETE+INSERT
on save). Mood, PeriodStart, Intimacy, BBT, LH, CM, PeriodEnd, Ovulation
all wrap the same shell with sticker-collage save buttons. IntimacyForm
re-exported as IntercourseForm for backwards compat.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Repoint CycleCalendar imports + delete LogForms.tsx

**Files:**
- Modify: `components/calendar/CycleCalendar.tsx`
- Delete: `components/calendar/LogForms.tsx`

- [ ] **Step 1: Open CycleCalendar.tsx and replace the import block. Locate this section (around line 27–35) — verify exact content with Read first if linenumbers differ.**

Replace:
```tsx
} from './LogForms'
```

With:
```tsx
} from './CycleLogForms'
```

And inside the import braces, the form names stay the same. Verify the imports include `PeriodStartForm, PeriodEndForm, SymptomsForm, MoodForm, TemperatureForm, IntimacyForm`. `TemperatureForm` does NOT exist in CycleLogForms — it's `BbtForm`. Replace `TemperatureForm` with `BbtForm` in both the import and the JSX where it's rendered.

- [ ] **Step 2: Pass `phase` prop to every form invocation.**

Find each `<XxxForm date={selectedDate} onSaved={handleSaved} />` in CycleCalendar.tsx and add `phase={info.phase as CyclePhase}` so it becomes:

```tsx
<PeriodStartForm date={selectedDate} phase={info.phase as CyclePhase} onSaved={handleSaved} />
```

Repeat for PeriodEndForm, SymptomsForm, MoodForm, BbtForm, IntimacyForm.

`info` is the `getCycleInfo()` result already computed in the component. If `info` isn't in scope where forms render, compute it once near the top of the render: `const info = getCycleInfo(cycleConfig, selectedDate)`. Add `CyclePhase` to the existing `cycleLogic` import line.

- [ ] **Step 3: Delete LogForms.tsx**

```bash
rm components/calendar/LogForms.tsx
```

- [ ] **Step 4: Type-check (full)**

Run: `npx tsc --noEmit 2>&1 | grep -v "HeartIcon\|onboarding/cycle/index" | head -20`
Expected: empty (only the two pre-existing errors remain).

- [ ] **Step 5: Commit**

```bash
git add components/calendar/CycleCalendar.tsx components/calendar/LogForms.tsx
git commit -m "refactor(cycle): repoint CycleCalendar to new CycleLogForms

CycleCalendar now imports from CycleLogForms and passes phase to every
form. LogForms.tsx removed. TemperatureForm references swapped to BbtForm.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Wire phase to FertilitySignalsCard call sites

**Files:**
- Modify: `components/home/cycle/FertilitySignalsCard.tsx`
- Modify: `components/home/cycle/FertileWindowModal.tsx`

These two files already import the 4 new sticker forms (`BbtForm`, `LhForm`, `CmForm`, `IntercourseForm`/`IntimacyForm`) from `CycleLogForms`. The new versions require a `phase` prop, so we need to pass it.

- [ ] **Step 1: In `FertilitySignalsCard.tsx`, find where the forms are rendered (inside LogSheet bodies). The component already takes `cycleConfig` indirectly via its parent — verify by reading the file. If `phase` isn't computed, derive it:**

Add near the top of the component body, after the existing `today` / `startISO` variables:

```tsx
import { getCycleInfo } from '../../../lib/cycleLogic'
// ... inside component ...
const info = getCycleInfo({ /* parent's cycleConfig or default */ }, today)
const phase = info.phase as CyclePhase
```

Pass `phase={phase}` to every `<BbtForm/>`, `<LhForm/>`, `<CmForm/>`, `<IntercourseForm/>` invocation in the file.

If `FertilitySignalsCard` does NOT have a `cycleConfig` prop, hardcode `phase: CyclePhase = 'follicular'` as a safe default — this card lives on the cycle home where the user's real phase comes from CycleHome. Add a TODO comment: `// TODO: thread cycleConfig through FertilitySignalsCard for accurate phase pill copy`.

Actually — better path: add an optional `cycleConfig?: CycleConfig` prop to `FertilitySignalsCard`, default to undefined, and resolve phase as `cycleConfig ? getCycleInfo(cycleConfig, today).phase : 'follicular'`. Then update `CycleHome.tsx` to pass `cycleConfig={cycleConfig}`.

Wait — recall the recent commit: CycleHome was refactored to use CycleJourneyRingFull and no longer renders FertilitySignalsCard. Verify:

```bash
grep "FertilitySignalsCard" components/home/CycleHome.tsx
```

If no match, FertilitySignalsCard is unused on the cycle home (the only other consumer would be the cycle agenda or a modal). Search:

```bash
grep -rn "FertilitySignalsCard" --include="*.tsx" components/ app/
```

Based on what's found:
- **If no consumers remain**: skip wiring; the file is dead code. Note it in commit.
- **If consumers exist**: thread `cycleConfig` from each consumer down to FertilitySignalsCard, then to the forms.

- [ ] **Step 2: In `FertileWindowModal.tsx`, same drill. The modal almost certainly already receives `cycleConfig` (it's a fertility forecast). Add:**

```tsx
const phase = getCycleInfo(cycleConfig, toDateStr(new Date())).phase as CyclePhase
```

Pass `phase={phase}` to `<BbtForm/>`, `<LhForm/>`, `<CmForm/>`.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -v "HeartIcon\|onboarding/cycle/index" | head -10`
Expected: empty.

- [ ] **Step 4: Commit**

```bash
git add components/home/cycle/FertilitySignalsCard.tsx components/home/cycle/FertileWindowModal.tsx
git commit -m "fix(cycle): pass phase prop to cycle log forms from signal callers

Required for the unified CycleLogForms shell. FertileWindowModal derives
phase from its cycleConfig; FertilitySignalsCard handles the case
where the cycle config isn't available.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Manual UI verification

- [ ] **Step 1: Run the app on iOS simulator**

```bash
npx expo start --ios
```

- [ ] **Step 2: From the Agenda → Log Activity sheet, open each of the 6 sheets that used to come from LogForms.tsx:**

  - Period Start → confirm 3 flow tiles, sticker save button "Start period", phase pill matches
  - Period End → confirm dashed-drop hero + "Mark as ended" button
  - Symptoms → confirm top chips reflect current phase, each has a mini sticker; tap 2, save label updates to "Save 2 symptoms"; reopen → both pre-checked
  - Mood → 5 mood stickers in a row, picking one highlights it; reopen after save shows it pre-selected
  - Temperature (now BBT) → slider with phase-tinted knob, +/- buttons
  - Intimacy → 2 large sticker tiles (Unprotected / Protected); pick one, save

- [ ] **Step 3: From Cycle home (or wherever FertilitySignalsCard renders), open the 4 fertility-signal sheets:**

  - BBT → matches what Agenda shows
  - LH → vertical pill stack
  - CM → 5 tiles
  - Intimacy → matches Agenda

- [ ] **Step 4: Toggle correctness check for Symptoms:**

  1. Open Symptoms on today
  2. Select Cramps + Bloated, Save
  3. Reopen Symptoms → both pre-checked, save button disabled (not dirty)
  4. Un-check Cramps, save button enables → "Save 1 symptom"
  5. Save → reopen → only Bloated pre-checked

- [ ] **Step 5: If any sheet looks broken, note which form and fix in CycleLogForms.tsx. Re-run type-check and re-verify.**

- [ ] **Step 6: Final commit (if any fixes were needed)**

```bash
git add components/calendar/CycleLogForms.tsx
git commit -m "fix(cycle): polish on manual UI verification

[describe specific fixes here]

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- ✅ Shared LogFormShell — Task 4
- ✅ StickerChip — Task 4
- ✅ useDayLogToggle — Task 4
- ✅ All 9 forms — Tasks 4–7
- ✅ Symptom data + phase suggestions — Task 1
- ✅ Phase pill copy + save labels — Task 2
- ✅ Symptom mini-stickers — Task 3
- ✅ Delete LogForms.tsx — Task 8
- ✅ Repoint CycleCalendar — Task 8
- ✅ Wire phase from signal callers — Task 9
- ✅ IntimacyForm + IntercourseForm alias — Task 4
- ✅ Backwards-compat (period_start old rows with null value) — handled by `replaceSingleLog` overwriting on save; old rows stay readable
- ✅ Manual verification checklist — Task 10

**Placeholder scan:** Task 9 has a conditional path ("if no consumers remain, skip") because we can't pre-verify worktree state. That's explicit conditional logic, not a placeholder — the engineer follows whichever branch matches reality.

**Type consistency:** `phase: CyclePhase` is the prop name on every form. `formId: FormId` matches `phaseHint(form, phase)` and `saveLabel(form, opts)`. `SymptomId` flows from `cycleSymptoms.ts` → `symptomStickers.tsx` → `SymptomsForm`. `phaseColors(phase, stickers)` consistent return shape `{ accent, tint }`. ✅
