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
import { SheetFooterAction } from '../calendar/LogSheet'
import { EyeAction, ACTION_TONES } from '../ui/AuthDock'
import { StepSlider } from '../ui/StepSlider'
import { Character } from '../characters/Characters'
import { SiteChoice } from '../ui/SiteChoice'
import { StickerChoice } from '../calendar/QuickLogKit'
import { SiteSticker } from '../stickers/SiteSticker'
import { menoSticker } from './MenopauseLogSheet'
import { toDateStr } from '../../lib/cycleLogic'
import { saveMenopauseLog } from '../../lib/menopauseLogs'
import {
  ALL_MENOPAUSE_SYMPTOMS,
  menopauseSymptomLabel,
  type MenopauseSymptomId,
} from '../../lib/menopauseSymptoms'
import { supabase } from '../../lib/supabase'
import { useMenopauseStore } from '../../store/useMenopauseStore'
import { useMenoPalette, STICKER_SHADOW, type MenoPalette } from './menoPalette'
import { GROUP_META, GROUP_ORDER, GROUP_STICKER, symptomBlob, symptomStickerKey } from './menopauseIcons'
import { useTheme } from '../../constants/theme'

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

// Site look (light) bits: Space Mono eyebrow + the white ink-outlined field.
const SITE_MONO = 'SpaceMono_400Regular'
function SiteEyebrow({ children }: { children: string }) {
  const { colors } = useTheme()
  return (
    <Text style={{ fontFamily: SITE_MONO, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.textMuted }}>
      {children}
    </Text>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Symptom form
// ═══════════════════════════════════════════════════════════════════════════

export function MenopauseSymptomForm({ onSaved, initialId, logDate }: { onSaved: () => void; initialId?: MenopauseSymptomId; logDate?: string }) {
  const pal = useMenoPalette()
  const { stickers, colors, font } = useTheme()
  const st = stickers as Record<string, string>
  const site = !pal.diffuse
  // Pre-select when opened from a home quick-log chip (skips straight to severity).
  const [symptomId, setSymptomId] = useState<MenopauseSymptomId | null>(initialId ?? null)
  const [severity, setSeverity] = useState(3)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!symptomId || saving) return
    setSaving(true)
    try {
      await saveMenopauseLog({
        // logDate = the calendar/week-strip selected day; defaults to today.
        date: logDate ?? toDateStr(new Date()),
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
      {initialId ? (
        // Compact mode — opened from a log tile with the symptom already chosen:
        // skip the picker, go straight to severity + note.
        site ? (
          <View style={styles.lockedHead}>
            <SiteSticker name={menoSticker(initialId)} size={40} />
            <Text style={[styles.lockedLabel, { color: colors.text, fontFamily: font.display, letterSpacing: 0.3, textTransform: 'uppercase' }]}>
              {menopauseSymptomLabel(initialId)}
            </Text>
          </View>
        ) : (
        <View style={styles.lockedHead}>
          <View style={[styles.lockedIcon, { backgroundColor: st[`${symptomStickerKey(initialId)}Soft`], borderColor: pal.border }]}>
            <Character name={symptomBlob(initialId)} size={22} color={st[`${symptomStickerKey(initialId)}Ink`]} bg={st[`${symptomStickerKey(initialId)}Soft`]} />
          </View>
          <Text style={[styles.lockedLabel, { color: pal.text, fontFamily: pal.fontDisplay }]}>
            {menopauseSymptomLabel(initialId)}
          </Text>
        </View>
        )
      ) : (
      site ? (
      <>
      <SiteEyebrow>{COPY.symptomPick}</SiteEyebrow>
      {GROUP_ORDER.map((group) => (
        <View key={group} style={{ gap: 4 }}>
          <SiteEyebrow>{GROUP_META[group].label}</SiteEyebrow>
          <View style={styles.stickerWrap}>
            {ALL_MENOPAUSE_SYMPTOMS.filter((s) => s.group === group).map((s) => (
              <StickerChoice
                key={s.id}
                label={s.label}
                sticker={menoSticker(s.id)}
                on={symptomId === s.id}
                onPress={() => setSymptomId(s.id)}
                tone={pal.accentSoft}
              />
            ))}
          </View>
        </View>
      ))}
      </>
      ) : (
      <>
      <Text style={[styles.sectionLabel, { color: pal.textMuted, fontFamily: pal.fontBodySemiBold }]}>
        {COPY.symptomPick}
      </Text>

      {GROUP_ORDER.map((group) => {
        const items = ALL_MENOPAUSE_SYMPTOMS.filter((s) => s.group === group)
        const meta = GROUP_META[group]
        return (
          <View key={group} style={styles.groupBlock}>
            <View style={styles.groupHead}>
              <Character name={meta.icon} size={20} color={st[`${GROUP_STICKER[group]}Ink`]} bg={pal.bg} />
              <Text style={[styles.groupLabel, { color: pal.textMuted, fontFamily: pal.fontBodySemiBold }]}>
                {meta.label}
              </Text>
            </View>
            <View style={styles.chipWrap}>
              {items.map((s) => (
                <SelectableChip
                  key={s.id}
                  id={s.id}
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
      </>
      )
      )}

      {symptomId && (
        <View style={styles.severityBlock}>
          {site ? <SiteEyebrow>{COPY.severityQ}</SiteEyebrow> : (
          <Text style={[styles.sectionLabel, { color: pal.textMuted, fontFamily: pal.fontBodySemiBold }]}>
            {COPY.severityQ}
          </Text>
          )}
          {site ? (
            <View style={styles.severityRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <SiteChoice
                  key={n}
                  label={String(n)}
                  selected={severity === n}
                  onPress={() => setSeverity(n)}
                  tone={pal.accentSoft}
                  compact
                  tick={false}
                  style={{ flex: 1 }}
                />
              ))}
            </View>
          ) : (
          <StepSlider min={1} max={5} value={severity} onChange={setSeverity} color={pal.accent} />
          )}
          <Text style={[styles.severityHint, { color: pal.textSecondary, fontFamily: pal.fontBody }]}>
            {COPY.severityHint[severity - 1]}
          </Text>
        </View>
      )}

      <View style={styles.noteBlock}>
        {site ? <SiteEyebrow>{COPY.noteLabel}</SiteEyebrow> : (
        <Text style={[styles.sectionLabel, { color: pal.textMuted, fontFamily: pal.fontBodySemiBold }]}>
          {COPY.noteLabel}
        </Text>
        )}
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
              borderColor: site ? colors.text : pal.border,
              borderWidth: site ? 1.5 : 1,
              borderRadius: site ? 14 : pal.radius.md,
              color: pal.text,
              fontFamily: pal.fontBody,
              fontSize: site ? 16 : 15,
            },
          ]}
        />
      </View>

      <SheetFooterAction>
        <View style={{ alignItems: 'center' }}>
          <EyeAction label={COPY.save} onPress={handleSave} ink={colors.text} loading={saving} disabled={!symptomId || saving} sticker="pencil" fill={ACTION_TONES.yellow} size={64} />
        </View>
      </SheetFooterAction>
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

export function MenopausePeriodForm({ onSaved, logDate }: { onSaved: () => void; logDate?: string }) {
  const pal = useMenoPalette()
  const { colors } = useTheme()
  const site = !pal.diffuse
  const [flow, setFlow] = useState<Flow | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!flow || saving) return
    setSaving(true)
    const date = logDate ?? toDateStr(new Date())
    try {
      await saveMenopauseLog({ date, type: 'period', value: flow })
      // A logged period updates the "months since last period" counter only when
      // it's the NEWEST known period start — backfilling an older day via the
      // calendar must not regress the counter. ISO 'YYYY-MM-DD' compares lexically.
      const current = useMenopauseStore.getState().lastPeriodDate
      if (!current || date >= current) {
        useMenopauseStore.getState().setLastPeriodDate(date)
        const { data } = await supabase.auth.getSession()
        const userId = data.session?.user.id
        if (userId) {
          // upsert (not update) — a menopause-first user may have no profiles row
          // yet, and .update() would silently match 0 rows. Best-effort mirror.
          const { error: profErr } = await supabase
            .from('profiles')
            .upsert({ id: userId, last_period_date: date }, { onConflict: 'id' })
          if (profErr) console.warn('[menopause] profiles last_period_date write failed:', profErr.message)
        }
      }
      onSaved()
    } catch (e) {
      setSaving(false)
      Alert.alert(COPY.savedError, COPY.savedErrorBody)
    }
  }

  return (
    <View style={styles.form}>
      {site ? (
        <>
          <View style={styles.periodHead}>
            <SiteSticker name={menoSticker('period')} size={44} />
            <SiteEyebrow>{COPY.periodQ}</SiteEyebrow>
          </View>
          <View style={styles.severityRow}>
            {FLOW_OPTIONS.map((o) => (
              <SiteChoice
                key={o.id}
                label={o.label}
                selected={flow === o.id}
                onPress={() => setFlow(o.id)}
                tone={pal.accentSoft}
                compact
                tick={false}
                style={{ flex: 1 }}
              />
            ))}
          </View>
        </>
      ) : (
        <>
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
        </>
      )}

      <Text style={[styles.periodNote, { color: pal.textMuted, fontFamily: pal.fontBody }]}>
        {COPY.periodNote}
      </Text>

      <SheetFooterAction>
        <View style={{ alignItems: 'center' }}>
          <EyeAction label={COPY.save} onPress={handleSave} ink={colors.text} loading={saving} disabled={!flow || saving} sticker="pencil" fill={ACTION_TONES.yellow} size={64} />
        </View>
      </SheetFooterAction>
    </View>
  )
}

// ─── Shared selectable pill chip (dual-variant) ──────────────────────────────

function SelectableChip({
  id,
  label,
  selected,
  onPress,
  pal,
}: {
  /** Symptom id → colored icon + hue. Omitted for plain chips (e.g. period flow). */
  id?: MenopauseSymptomId
  label: string
  selected: boolean
  onPress: () => void
  pal: MenoPalette
}) {
  // Symptom chips carry their own colour: a crisp Ink blob, and when selected the
  // pill tints in that hue. Plain chips (no id) keep the Ember look, no icon.
  const { stickers } = useTheme()
  const st = stickers as Record<string, string>
  const key = id ? symptomStickerKey(id) : null
  const hue = key ? st[key] : pal.accent
  const hueSoft = key ? st[`${key}Soft`] : pal.accentSoft
  const hueInk = key ? st[`${key}Ink`] : pal.accent
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
          backgroundColor: selected ? hueSoft : pal.surface,
          borderColor: selected ? hue : pal.border,
          // Diffuse has no `full` pill token — use its xl outline; current keeps
          // the sticker pill.
          borderRadius: pal.diffuse ? pal.radius.xl : pal.radius.full,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {id ? <Character name={symptomBlob(id)} size={17} color={hueInk} /> : null}
      <Text
        style={[
          styles.chipText,
          { color: selected ? hueInk : pal.textSecondary, fontFamily: pal.fontBodyMedium },
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

  lockedHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lockedIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  lockedLabel: { fontSize: 20, letterSpacing: -0.3 },

  groupBlock: { gap: 10 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupLabel: { fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stickerWrap: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 4 },
  severityRow: { flexDirection: 'row', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1 },
  chipText: { fontSize: 14.5 },

  severityBlock: { gap: 8 },
  severityHint: { fontSize: 14, textAlign: 'center', marginTop: -4 },

  noteBlock: { gap: 8 },
  noteInput: { minHeight: 72, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlignVertical: 'top' },

  periodHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  periodIcon: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  periodNote: { fontSize: 13, lineHeight: 19 },
})
