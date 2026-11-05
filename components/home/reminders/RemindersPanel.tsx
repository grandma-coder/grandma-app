/**
 * RemindersPanel — the site-look reminders sheet body (list ⇄ composer).
 *
 * Lives inside a LogSheet: the sheet owns the title + the one close button, and
 * this panel hands its single primary action (New reminder / Save) to the
 * sheet footer via SheetFooterAction. Two views, never nested cards:
 *
 *   list      → coming up (dated, soonest first) · no date · done (collapsed)
 *               tap the round check to cross off (with undo), tap a row to edit
 *   composer  → what → when (no date · today · tomorrow · another day, then a
 *               time) → optional note (→ for whom, kids). Edit adds Delete.
 *
 * Data-agnostic: pregnancy/cycle pass the local store (UserReminders), kids
 * passes its Supabase-backed handlers. Alerts are scheduled by the data layer;
 * here we only ask for notification permission when a dated reminder is saved
 * and say so calmly when it's off — the reminder is saved either way.
 */

import { useEffect, useRef, useState } from 'react'
import { Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import Svg, { Path } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { ChevronDown, ChevronRight, Clock, Trash2 } from 'lucide-react-native'
import { useTheme, getModeColorSoft, getModeAccent } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'
import { dateLoc } from '../../../lib/kpLocale'
import type { JourneyMode } from '../../../types'
import {
  addDays, dayOffset, defaultTimeFor, draftProblem, dueState, formatReminderDay, formatReminderTime,
  formatReminderWhen, localDateTime, reminderFireAt, splitReminders, toLocalDateStr, toLocalTimeStr,
  DEFAULT_REMINDER_HOUR, type DayWords, type Reminder, type ReminderDraft,
} from '../../../lib/reminders'
import { ensureReminderPermission } from '../../../lib/reminderNotifications'
import { SheetFooterAction } from '../../calendar/LogSheet'
import { EyeAction, ACTION_TONES } from '../../ui/AuthDock'
import { HandDrawnBox } from '../../ui/HandDrawn'
import { SiteChoice } from '../../ui/SiteChoice'
import { Display } from '../../ui/Typography'
import { FadeIn, StickerEnter } from '../../ui/Motion'
import { SiteSticker } from '../../stickers/SiteSticker'
import { useConfirmDialog } from '../../ui/useConfirm'

export type PanelReminder = Reminder & { childId?: string | null }
export interface PanelDraft extends ReminderDraft { personId: string | null }
export interface PanelPerson { id: string | null; label: string }

interface Props {
  context: JourneyMode
  reminders: PanelReminder[]
  /** False while the list is still loading — the composer can't save yet. */
  ready: boolean
  placeholder: string
  /** Resolve false to keep the composer open (save failed). */
  onAdd: (draft: PanelDraft) => Promise<unknown> | unknown
  onUpdate: (id: string, draft: PanelDraft) => Promise<unknown> | unknown
  onSetDone: (id: string, done: boolean) => void
  onDelete: (id: string) => void
  onClearDone?: () => void
  /** Kids: who a reminder is for (id null = everyone). Omit to hide the question. */
  people?: PanelPerson[]
  /** Offer the optional note (default true; kids_reminders has no notes column). */
  notes?: boolean
}

const DEFAULT_TIME = `${String(DEFAULT_REMINDER_HOUR).padStart(2, '0')}:00`
const UNDO_MS = 4500

type PanelView = { kind: 'list' } | { kind: 'compose'; editing: PanelReminder | null }

export function RemindersPanel(props: Props) {
  const { reminders, onSetDone } = props
  const [view, setView] = useState<PanelView>({ kind: 'list' })
  const [permissionOff, setPermissionOff] = useState(false)
  const [undo, setUndo] = useState<string | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current) }, [])
  const submitRef = useRef<() => void>(() => {})
  const [composeState, setComposeState] = useState({ canSave: false, saving: false })
  const { colors } = useTheme()
  const { t } = useTranslation()

  function complete(r: PanelReminder) {
    const done = !r.done
    onSetDone(r.id, done)
    if (undoTimer.current) clearTimeout(undoTimer.current)
    if (done) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      setUndo(r.id)
      undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS)
    } else {
      setUndo(null)
    }
  }

  async function save(draft: PanelDraft, editing: PanelReminder | null) {
    const fireAt = reminderFireAt(draft)
    if (fireAt && fireAt.getTime() > Date.now()) {
      // Asked here, on the user's tap, only when there's something to alert about.
      const status = await ensureReminderPermission().catch(() => 'unavailable' as const)
      setPermissionOff(status === 'denied')
    }
    const ok = editing ? await props.onUpdate(editing.id, draft) : await props.onAdd(draft)
    if (ok === false) return false
    setView({ kind: 'list' })
    return true
  }

  const undone = undo ? reminders.find((r) => r.id === undo && r.done) : undefined
  const composing = view.kind === 'compose'
  const { canSave, saving } = composeState

  return (
    <>
      {view.kind === 'compose' ? (
        <FadeIn key={view.editing?.id ?? 'new'}>
          <Composer
            {...props}
            editing={view.editing}
            submitRef={submitRef}
            onFooterState={setComposeState}
            onCancel={() => setView({ kind: 'list' })}
            onSave={(d) => save(d, view.editing)}
            onDeleted={() => setView({ kind: 'list' })}
          />
        </FadeIn>
      ) : (
        <FadeIn key="list">
          <ReminderList
            {...props}
            permissionOff={permissionOff}
            undoReminder={undone}
            onUndo={() => { if (undone) complete(undone) }}
            onComplete={complete}
            onOpen={(r) => { setComposeState({ canSave: false, saving: false }); setView({ kind: 'compose', editing: r }) }}
          />
        </FadeIn>
      )}

      {/* One footer slot for both views (mounted once, so switching views never blanks it). */}
      <SheetFooterAction>
        <View style={{ alignItems: 'center' }}>
          {composing ? (
            <EyeAction
              key="save"
              label={t('preg_reminders_save')}
              onPress={() => submitRef.current()}
              ink={colors.text}
              loading={saving}
              disabled={!canSave}
              sticker="pencil"
              // Clearly off until there's something to save: plain paper, not the yellow disc.
              fill={canSave || saving ? ACTION_TONES.yellow : colors.surface}
              size={64}
            />
          ) : (
            <EyeAction
              key="new"
              label={t('reminders_new')}
              onPress={() => { setComposeState({ canSave: false, saving: false }); setView({ kind: 'compose', editing: null }) }}
              ink={colors.text}
              disabled={!props.ready}
              sticker="bell"
              fill={ACTION_TONES.yellow}
              size={64}
            />
          )}
        </View>
      </SheetFooterAction>
    </>
  )
}

// ─── List ───────────────────────────────────────────────────────────────────

function ReminderList({
  context, reminders, ready, people, onClearDone, permissionOff, undoReminder, onUndo, onComplete, onOpen,
}: Props & {
  permissionOff: boolean
  undoReminder: PanelReminder | undefined
  onUndo: () => void
  onComplete: (r: PanelReminder) => void
  onOpen: (r: PanelReminder) => void
}) {
  const { colors, font, stickers } = useTheme()
  const { t } = useTranslation()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [showDone, setShowDone] = useState(false)
  const { dated, undated, done } = splitReminders(reminders)
  const ink = colors.text
  const personLabel = (r: PanelReminder) =>
    people && r.childId ? people.find((p) => p.id === r.childId)?.label : undefined

  const row = (r: PanelReminder) => (
    <ReminderRow key={r.id} r={r} context={context} person={personLabel(r)} onComplete={() => onComplete(r)} onOpen={() => onOpen(r)} />
  )

  async function clearDone() {
    const ok = await confirm({
      title: t('reminders_clearDoneConfirmTitle'),
      message: t('reminders_clearDoneConfirmBody', { n: done.length }),
      confirmLabel: t('reminders_clearDone'),
      cancelLabel: t('common_cancel'),
      danger: true,
    })
    if (ok) { onClearDone?.(); setShowDone(false) }
  }

  const empty = ready && dated.length === 0 && undated.length === 0

  return (
    <View style={styles.list}>
      {permissionOff ? (
        <HandDrawnBox fill={stickers.peachSoft} stroke={ink} radius={16} seed="perm" style={styles.banner}>
          <Text style={[styles.bannerText, { color: ink, fontFamily: font.body }]}>{t('reminders_permissionDenied')}</Text>
          <Pressable onPress={() => { void Linking.openSettings() }} hitSlop={8} accessibilityRole="link">
            <Text style={[styles.link, { color: ink, fontFamily: font.bodyBold }]}>{t('reminders_openSettings')}</Text>
          </Pressable>
        </HandDrawnBox>
      ) : null}

      {undoReminder ? (
        <HandDrawnBox fill={stickers.greenSoft} stroke={ink} radius={16} seed="undo" style={[styles.banner, styles.bannerRow]}>
          <Text style={[styles.bannerText, { flex: 1, color: ink, fontFamily: font.bodyMedium }]} numberOfLines={1}>
            {t('reminders_doneToast')}
          </Text>
          <Pressable onPress={onUndo} hitSlop={10} accessibilityRole="button">
            <Text style={[styles.link, { color: ink, fontFamily: font.bodyBold }]}>{t('reminders_undo')}</Text>
          </Pressable>
        </HandDrawnBox>
      ) : null}

      {empty ? (
        <View style={styles.empty}>
          <StickerEnter delay={120} tilt={-8}><SiteSticker name="bell" size={64} cut /></StickerEnter>
          <Display size={22} align="center" style={{ marginTop: 10 }}>{t('reminders_emptyTitle')}</Display>
          <Text style={[styles.emptyBody, { color: colors.textSecondary, fontFamily: font.body }]}>{t('reminders_emptyBody')}</Text>
        </View>
      ) : null}

      {dated.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel>{t('reminders_sectionUpcoming')}</SectionLabel>
          {dated.map(row)}
        </View>
      ) : null}

      {undated.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel>{t('reminders_when_none')}</SectionLabel>
          {undated.map(row)}
        </View>
      ) : null}

      {done.length > 0 ? (
        <View style={styles.section}>
          <Pressable
            onPress={() => setShowDone((v) => !v)}
            style={styles.doneHead}
            accessibilityRole="button"
            accessibilityState={{ expanded: showDone }}
            hitSlop={6}
          >
            <SectionLabel>{t('reminders_sectionDone', { n: done.length })}</SectionLabel>
            {showDone
              ? <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2.4} />
              : <ChevronRight size={16} color={colors.textSecondary} strokeWidth={2.4} />}
            <View style={{ flex: 1 }} />
            {showDone && onClearDone ? (
              <Pressable onPress={clearDone} hitSlop={8} accessibilityRole="button">
                <Text style={[styles.link, { color: colors.textSecondary, fontFamily: font.bodySemiBold }]}>{t('reminders_clearDone')}</Text>
              </Pressable>
            ) : null}
          </Pressable>
          {showDone ? done.map(row) : null}
        </View>
      ) : null}

      {confirmDialog}
    </View>
  )
}

function SectionLabel({ children }: { children: string }) {
  const { colors, font } = useTheme()
  return <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: font.bodyBold }]}>{children}</Text>
}

function useDayWords(): DayWords {
  const { t } = useTranslation()
  return { today: t('common_today'), tomorrow: t('reminders_when_tomorrow'), yesterday: t('common_yesterday') }
}

function ReminderRow({
  r, context, person, onComplete, onOpen,
}: { r: PanelReminder; context: JourneyMode; person?: string; onComplete: () => void; onOpen: () => void }) {
  const { colors, font, stickers, isDark } = useTheme()
  const { t } = useTranslation()
  const words = useDayWords()
  const now = new Date()
  const ink = colors.text
  const state = r.done ? 'none' : dueState(r, now)
  const when = formatReminderWhen(r, now, dateLoc(), words)
  const past = state === 'past'
  const metaColor = past ? stickers.coralInk : colors.textSecondary
  const meta = [when ? (past ? `${when} · ${t('reminders_pastTag')}` : when) : null, person].filter(Boolean).join(' · ')

  return (
    <HandDrawnBox fill={colors.surface} stroke={ink} radius={18} seed={`rem-${r.id}`} style={styles.row}>
      <CheckDisc checked={r.done} tone={getModeColorSoft(context, isDark)} onPress={onComplete} label={r.text} />
      <Pressable
        onPress={onOpen}
        style={styles.rowBody}
        accessibilityRole="button"
        accessibilityLabel={t('reminders_editA11y', { text: r.text })}
      >
        <Text
          style={[
            styles.rowText,
            { color: r.done ? colors.textMuted : ink, fontFamily: font.bodySemiBold },
            r.done && { textDecorationLine: 'line-through' },
          ]}
          numberOfLines={3}
        >
          {r.text}
        </Text>
        {meta ? (
          <View style={styles.metaRow}>
            {when && !r.done ? <Clock size={12} color={metaColor} strokeWidth={2.4} /> : null}
            <Text style={[styles.meta, { color: r.done ? colors.textMuted : metaColor, fontFamily: font.bodyMedium }]} numberOfLines={1}>
              {meta}
            </Text>
          </View>
        ) : null}
        {r.notes && !r.done ? (
          <Text style={[styles.note, { color: colors.textMuted, fontFamily: font.body }]} numberOfLines={1}>{r.notes}</Text>
        ) : null}
      </Pressable>
      <ChevronRight size={16} color={colors.textMuted} strokeWidth={2.2} />
    </HandDrawnBox>
  )
}

/** Round hand-drawn check: empty ring → tone fill + tick. */
function CheckDisc({ checked, tone, onPress, label }: { checked: boolean; tone: string; onPress: () => void; label: string }) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const ink = colors.text
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${checked ? t('kids_home_reminder_mark_not_done') : t('kids_home_reminder_mark_done')}: ${label}`}
    >
      <HandDrawnBox fill={checked ? tone : colors.surface} stroke={ink} radius={15} strokeWidth={2.2} seed="check" style={styles.check}>
        {checked ? (
          <Svg width={16} height={16} viewBox="0 0 18 18">
            <Path d="M3.5 9.5 L7.5 13 L14.5 4.5" stroke={ink} strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        ) : null}
      </HandDrawnBox>
    </Pressable>
  )
}

// ─── Composer ───────────────────────────────────────────────────────────────

type WhenChoice = 'none' | 'today' | 'tomorrow' | 'pick'

function Composer({
  context, editing, placeholder, people, ready, notes: allowNotes = true, onCancel, onSave, onDelete, onDeleted,
  submitRef, onFooterState,
}: Props & {
  editing: PanelReminder | null
  submitRef: { current: () => void }
  onFooterState: (s: { canSave: boolean; saving: boolean }) => void
  onCancel: () => void
  onSave: (d: PanelDraft) => Promise<boolean>
  onDeleted: () => void
}) {
  const { colors, font, stickers, isDark } = useTheme()
  const { t } = useTranslation()
  const words = useDayWords()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [text, setText] = useState(editing?.text ?? '')
  const [dueDate, setDueDate] = useState<string | null>(editing?.dueDate ?? null)
  const [dueTime, setDueTime] = useState<string | null>(editing?.dueTime ?? null)
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [personId, setPersonId] = useState<string | null>(editing?.childId ?? null)
  const [picker, setPicker] = useState<'date' | 'time' | null>(null)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const now = new Date()
  const ink = colors.text
  const tone = getModeColorSoft(context, isDark)
  const accent = getModeAccent(context, isDark)
  const locale = dateLoc()
  const draft: PanelDraft = { text, dueDate, dueTime, notes, personId }
  const problem = draftProblem(draft, editing, now)
  const canSave = ready && !problem && !saving

  const off = dueDate ? dayOffset(dueDate, now) : null
  const choice: WhenChoice = !dueDate ? 'none' : off === 0 ? 'today' : off === 1 ? 'tomorrow' : 'pick'
  const shownTime = dueTime ?? DEFAULT_TIME

  function choose(c: WhenChoice) {
    setFailed(false)
    if (c === 'none') { setDueDate(null); setDueTime(null); setPicker(null); return }
    if (c === 'pick') {
      // Start the calendar on the day after tomorrow (today/tomorrow have their own chips).
      if (choice !== 'pick') pickDate(addDays(now, 2))
      setPicker(choice === 'pick' && picker === 'date' ? null : 'date')
      return
    }
    pickDate(addDays(now, c === 'today' ? 0 : 1))
    setPicker(null)
  }

  /** Set the day; keep the chosen time unless it would be in the past, else offer a sensible one. */
  function pickDate(d: string) {
    setDueDate(d)
    setDueTime((prev) => {
      const candidate = prev ?? DEFAULT_TIME
      const at = localDateTime(d, candidate)
      if (at && at.getTime() > Date.now()) return candidate
      return defaultTimeFor(d, new Date())
    })
  }

  function onDateChange(e: DateTimePickerEvent, d?: Date) {
    if (Platform.OS !== 'ios') setPicker(null)
    if (e.type === 'dismissed' || !d) return
    pickDate(toLocalDateStr(d))
  }

  function onTimeChange(e: DateTimePickerEvent, d?: Date) {
    if (Platform.OS !== 'ios') setPicker(null)
    if (e.type === 'dismissed' || !d) return
    setDueTime(toLocalTimeStr(d))
  }

  // The save disc lives in the panel's single footer slot: report state up, hand over submit.
  submitRef.current = () => { void submit() }
  useEffect(() => { onFooterState({ canSave, saving }) }, [canSave, saving, onFooterState])

  async function submit() {
    if (!canSave) return
    setSaving(true)
    setFailed(false)
    const ok = await onSave(draft).catch(() => false)
    setSaving(false)
    if (!ok) setFailed(true)
  }

  async function remove() {
    if (!editing) return
    const ok = await confirm({
      title: t('reminders_deleteConfirmTitle'),
      message: t('reminders_deleteConfirmBody'),
      confirmLabel: t('common_delete'),
      cancelLabel: t('common_cancel'),
      danger: true,
    })
    if (!ok) return
    onDelete(editing.id)
    onDeleted()
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const pickLabel = choice === 'pick' && dueDate ? formatReminderDay(dueDate, now, locale, words) : t('reminders_when_pick')
  const whenSummary = dueDate ? formatReminderWhen({ dueDate, dueTime: shownTime }, now, locale, words) : null
  const timeLabel = formatReminderTime(shownTime, locale)
  // Only promise an alert that will actually fire (not for an unchanged, already-past time).
  const willAlert = (reminderFireAt({ dueDate, dueTime })?.getTime() ?? 0) > now.getTime()
  const inputStyle = [styles.input, { color: ink, borderColor: ink, backgroundColor: colors.surface, fontFamily: font.body }]

  return (
    <View style={styles.composer}>
      <View style={styles.composerHead}>
        <Display size={20} style={{ flex: 1, textTransform: 'uppercase', letterSpacing: 0.2 }}>
          {editing ? t('reminders_editTitle') : t('reminders_new')}
        </Display>
        <Pressable onPress={onCancel} hitSlop={10} accessibilityRole="button">
          <Text style={[styles.link, { color: colors.textSecondary, fontFamily: font.bodySemiBold }]}>{t('common_cancel')}</Text>
        </Pressable>
      </View>

      {/* What */}
      <View style={styles.field}>
        <Prompt>{t('reminders_whatPrompt')}</Prompt>
        <TextInput
          value={text}
          // One line of meaning: wrap long text, but Return saves nothing and newlines are dropped.
          onChangeText={(v) => { setText(v.replace(/\n+/g, ' ')); setFailed(false) }}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          multiline
          submitBehavior="blurAndSubmit"
          returnKeyType="done"
          maxLength={200}
          autoFocus={!editing}
          style={[inputStyle, styles.inputWhat]}
          accessibilityLabel={t('reminders_whatPrompt')}
        />
      </View>

      {/* When */}
      <View style={styles.field}>
        <Prompt>{t('reminders_whenPrompt')}</Prompt>
        <View style={styles.chips}>
          <SiteChoice compact tick={false} tone={tone} label={t('reminders_when_none')} selected={choice === 'none'} onPress={() => choose('none')} />
          <SiteChoice compact tick={false} tone={tone} label={t('common_today')} selected={choice === 'today'} onPress={() => choose('today')} />
          <SiteChoice compact tick={false} tone={tone} label={t('reminders_when_tomorrow')} selected={choice === 'tomorrow'} onPress={() => choose('tomorrow')} />
          <SiteChoice compact tick={false} tone={tone} sticker="cal" label={pickLabel} selected={choice === 'pick'} onPress={() => choose('pick')} />
        </View>

        {picker === 'date' && dueDate ? (
          Platform.OS === 'ios' ? (
            <HandDrawnBox fill={colors.surface} stroke={ink} radius={18} seed="cal" style={styles.pickerBox}>
              <DateTimePicker
                value={localDateTime(dueDate) ?? now}
                mode="date"
                display="inline"
                minimumDate={startOfToday}
                locale={locale}
                accentColor={accent}
                themeVariant={isDark ? 'dark' : 'light'}
                onChange={onDateChange}
              />
              <PickerDone onPress={() => setPicker(null)} />
            </HandDrawnBox>
          ) : (
            <DateTimePicker value={localDateTime(dueDate) ?? now} mode="date" minimumDate={startOfToday} onChange={onDateChange} />
          )
        ) : null}

        {dueDate ? (
          <View style={styles.timeRow}>
            <Pressable
              onPress={() => setPicker(picker === 'time' ? null : 'time')}
              accessibilityRole="button"
              accessibilityLabel={t('reminders_timeA11y', { time: timeLabel })}
            >
              <HandDrawnBox fill={picker === 'time' ? tone : colors.surface} stroke={ink} radius={999} seed="time" style={styles.timePill}>
                <Clock size={15} color={ink} strokeWidth={2.4} />
                <Text style={[styles.timeText, { color: ink, fontFamily: font.bodyBold }]}>{timeLabel}</Text>
              </HandDrawnBox>
            </Pressable>
            {whenSummary && willAlert ? (
              <Text style={[styles.hint, { flex: 1, color: colors.textSecondary, fontFamily: font.body }]}>
                {t('reminders_alertSummary', { when: whenSummary })}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={[styles.hint, { color: colors.textMuted, fontFamily: font.body }]}>{t('reminders_noDateHint')}</Text>
        )}

        {picker === 'time' && dueDate ? (
          Platform.OS === 'ios' ? (
            <HandDrawnBox fill={colors.surface} stroke={ink} radius={18} seed="clock" style={styles.pickerBox}>
              <DateTimePicker
                value={localDateTime(dueDate, shownTime) ?? now}
                mode="time"
                display="spinner"
                minuteInterval={5}
                locale={locale}
                themeVariant={isDark ? 'dark' : 'light'}
                onChange={onTimeChange}
                style={{ height: 170 }}
              />
              <PickerDone onPress={() => setPicker(null)} />
            </HandDrawnBox>
          ) : (
            <DateTimePicker value={localDateTime(dueDate, shownTime) ?? now} mode="time" onChange={onTimeChange} />
          )
        ) : null}

        {problem === 'past' ? (
          <Text style={[styles.hint, { color: stickers.coralInk, fontFamily: font.bodyMedium }]}>{t('reminders_pastHint')}</Text>
        ) : null}
      </View>

      {/* For whom (kids) */}
      {people && people.length > 1 ? (
        <View style={styles.field}>
          <Prompt>{t('reminders_forWhoPrompt')}</Prompt>
          <View style={styles.chips}>
            {people.map((p) => (
              <SiteChoice key={p.id ?? 'all'} compact tick={false} tone={tone} label={p.label} selected={personId === p.id} onPress={() => setPersonId(p.id)} />
            ))}
          </View>
        </View>
      ) : null}

      {/* Note */}
      {allowNotes ? <View style={styles.field}>
        <Prompt>{t('reminders_notePrompt')}</Prompt>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t('reminders_notesPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={500}
          style={[inputStyle, styles.inputNote]}
          accessibilityLabel={t('reminders_notePrompt')}
        />
      </View> : null}

      {failed ? (
        <Text style={[styles.hint, { color: stickers.coralInk, fontFamily: font.bodyMedium }]}>{t('common_saveFailed')}</Text>
      ) : null}

      {editing ? (
        <Pressable onPress={remove} style={styles.deleteBtn} hitSlop={6} accessibilityRole="button">
          <Trash2 size={16} color={stickers.coralInk} strokeWidth={2.2} />
          <Text style={[styles.link, { color: stickers.coralInk, fontFamily: font.bodySemiBold }]}>{t('reminders_delete')}</Text>
        </Pressable>
      ) : null}

      {confirmDialog}
    </View>
  )
}

function Prompt({ children }: { children: string }) {
  return <Display size={18}>{children}</Display>
}

function PickerDone({ onPress }: { onPress: () => void }) {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  return (
    <Pressable onPress={onPress} style={styles.pickerDone} hitSlop={6} accessibilityRole="button">
      <Text style={[styles.link, { color: colors.text, fontFamily: font.bodyBold }]}>{t('common_done')}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  list: { gap: 18, paddingBottom: 4 },
  section: { gap: 10 },
  sectionLabel: { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  doneHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  banner: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerText: { fontSize: 14, lineHeight: 20 },
  link: { fontSize: 14, textDecorationLine: 'underline' },
  empty: { alignItems: 'center', paddingTop: 8, paddingBottom: 4, paddingHorizontal: 12 },
  emptyBody: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 12, paddingRight: 12 },
  rowBody: { flex: 1, gap: 3 },
  rowText: { fontSize: 16, lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { fontSize: 13, flexShrink: 1 },
  note: { fontSize: 13 },
  check: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  composer: { gap: 22, paddingBottom: 4 },
  composerHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  field: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  inputWhat: { minHeight: 84 },
  inputNote: { minHeight: 64 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  timeText: { fontSize: 16 },
  hint: { fontSize: 13, lineHeight: 18 },
  pickerBox: { paddingVertical: 6, paddingHorizontal: 6, overflow: 'hidden' },
  pickerDone: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 8 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 4 },
})
