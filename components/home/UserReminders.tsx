/**
 * UserReminders — mode-agnostic reminders list + add form.
 *
 * Shared by the pregnancy Week Wallet and the cycle wallet (and any future
 * mode). `context` drives the AsyncStorage key, the notification `data.context`
 * tag, and the accent color; everything else is identical. Reminders persist
 * locally (per user + context) and mirror to the `notifications` table so they
 * surface in the notification center.
 *
 * The pregnancy entry point (components/home/pregnancy/PregnancyUserReminders)
 * is a thin wrapper that passes context="pregnancy".
 */
import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import {
  Plus, Bell, Clock, X, Check, Pencil, Flag, Trash2,
} from 'lucide-react-native'
import { useTheme, getModeColor, brand, font, useDiffuseTheme, getDiffuseAccent, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { useTranslation } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import type { JourneyMode } from '../../types'
import { type Reminder, type ChecklistItem, storageKey as buildStorageKey, loadReminders, saveReminders } from '../../lib/reminders'

interface Props {
  userId: string | null
  /** Which journey the reminders belong to — scopes storage + notifications +
   *  accent. Defaults to pregnancy for the existing call sites. */
  context?: JourneyMode
  /** Embedded inside a wallet card: drop the outer card chrome and the
   *  redundant "Add reminder" header (the wallet card header owns that). */
  bare?: boolean
}

// getModeColor / getDiffuseAccent take slightly different mode ids than
// JourneyMode; map here so a single `context` prop drives both.
const DIFFUSE_MODE: Record<JourneyMode, 'preg' | 'prePreg' | 'kids'> = {
  pregnancy: 'preg',
  'pre-pregnancy': 'prePreg',
  kids: 'kids',
}

function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':')
  const h = parseInt(hStr, 10)
  const m = mStr ?? '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m} ${ampm}`
}

function localDateStr(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function UserReminders({ userId, context = 'pregnancy' }: Props) {
  const { colors, radius, isDark, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = getDiffuseAccent(DIFFUSE_MODE[context], dt.isDark)
  const { t } = useTranslation()
  const ACCENT = diffuse ? dAccent : getModeColor(context, isDark)

  const [reminders, setReminders] = useState<Reminder[]>([])
  const [showInput, setShowInput] = useState(false)
  const [newText, setNewText] = useState('')
  const [newDate, setNewDate] = useState<Date | null>(null)
  const [newTime, setNewTime] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [newTags, setNewTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'med' | 'high' | null>(null)

  const storageKey = buildStorageKey(userId, context)

  useEffect(() => {
    let alive = true
    loadReminders(userId, context).then((list) => { if (alive) setReminders(list) })
    return () => { alive = false }
  }, [userId, context])

  function persist(list: Reminder[]) {
    setReminders(list)
    void saveReminders(userId, context, list)
  }

  async function addReminder() {
    if (!newText.trim()) return
    const dueDate = newDate ? localDateStr(newDate) : null
    const dueTime = newTime
      ? `${String(newTime.getHours()).padStart(2, '0')}:${String(newTime.getMinutes()).padStart(2, '0')}`
      : null

    let notifId: string | null = null
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const bodyParts: string[] = []
        if (dueDate) bodyParts.push(`Due ${dueDate}`)
        if (dueTime) bodyParts.push(`at ${formatTime12h(dueTime)}`)
        const { data } = await supabase.from('notifications').insert({
          user_id: session.user.id,
          type: 'reminder',
          title: newText.trim(),
          body: bodyParts.length ? bodyParts.join(' ') : 'No due date',
          data: { context, dueDate, dueTime },
          is_read: false,
        }).select('id').single()
        notifId = data?.id ?? null
      }
    } catch {}

    const r: Reminder = {
      id: Date.now().toString(),
      text: newText.trim(),
      done: false,
      dueDate,
      dueTime,
      notifId,
      ...(newTags.length ? { tags: newTags } : {}),
      ...(newNotes.trim() ? { notes: newNotes.trim() } : {}),
      ...(newPriority ? { priority: newPriority } : {}),
    }
    persist([...reminders, r])
    setNewText(''); setNewDate(null); setNewTime(null)
    setNewTags([]); setTagDraft(''); setNewNotes(''); setNewPriority(null)
    setShowDatePicker(false); setShowTimePicker(false); setShowInput(false)
  }

  function toggleReminder(id: string) {
    const r = reminders.find((x) => x.id === id)
    if (!r) return
    const nowDone = !r.done
    const updated = reminders.map((rem) =>
      rem.id === id
        ? { ...rem, done: nowDone, archivedAt: nowDone ? new Date().toISOString() : null }
        : rem
    )
    persist(updated)
    if (r.notifId) {
      supabase.from('notifications').update({ is_read: nowDone }).eq('id', r.notifId).then(() => {})
    }
  }

  function deleteReminder(id: string) {
    const r = reminders.find((x) => x.id === id)
    if (r?.notifId) supabase.from('notifications').delete().eq('id', r.notifId).then(() => {})
    persist(reminders.filter((x) => x.id !== id))
  }

  function flagReminder(id: string) {
    persist(reminders.map((r) => (r.id === id ? { ...r, flagged: !r.flagged } : r)))
  }

  function editReminder(id: string, newTextValue: string) {
    const updated = reminders.map((r) => (r.id === id ? { ...r, text: newTextValue } : r))
    persist(updated)
    const r = reminders.find((x) => x.id === id)
    if (r?.notifId) {
      supabase.from('notifications').update({ title: newTextValue }).eq('id', r.notifId).then(() => {})
    }
  }

  const active = reminders.filter((r) => !r.done)

  return (
    <View style={{ gap: 10 }}>
      {/* Reminder card — always visible, expands on tap */}
      <View style={[styles.inputCard, diffuse ? {
        backgroundColor: dt.colors.surface,
        borderColor: dt.colors.line,
        shadowOpacity: 0,
      } : {
        backgroundColor: colors.surface,
        borderColor: isDark ? colors.border : 'rgba(20,19,19,0.12)',
        shadowColor: '#141313',
        shadowOpacity: isDark ? 0 : 0.07,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
      }]}>
        <Pressable
          onPress={() => { setShowInput(!showInput); if (!showInput) setNewText('') }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: showInput ? 4 : 0 }}
        >
          <View style={diffuse ? {
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: 'transparent',
            borderWidth: 1, borderColor: dt.colors.line2,
            alignItems: 'center', justifyContent: 'center',
          } : {
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: stickers.yellow,
            borderWidth: 1.5, borderColor: '#141313',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Bell size={13} color={diffuse ? dt.colors.ink3 : '#141313'} strokeWidth={diffuse ? 1.8 : 2.5} />
          </View>
          <Text style={{ flex: 1, fontSize: diffuse ? 20 : 16, fontFamily: diffuse ? diffuseFont.display : font.display, color: diffuse ? dt.colors.ink : colors.text, letterSpacing: -0.3 }}>
            {t('preg_reminders_addButton')}
          </Text>
          <View style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: diffuse
              ? 'transparent'
              : (showInput ? 'rgba(20,19,19,0.06)' : ACCENT + '18'),
            borderWidth: diffuse ? 1 : 0,
            borderColor: diffuse ? (showInput ? dt.colors.line2 : ACCENT) : 'transparent',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {showInput
              ? <X size={14} color={diffuse ? dt.colors.ink3 : colors.textSecondary} strokeWidth={2.5} />
              : <Plus size={14} color={ACCENT} strokeWidth={2.5} />}
          </View>
        </Pressable>

        {showInput && (
          <>
          <TextInput
            style={[styles.textInput, diffuse ? {
              color: dt.colors.ink,
              fontFamily: diffuseFont.body,
              backgroundColor: dt.colors.surfaceRaised,
              borderColor: dt.colors.line,
            } : {
              color: colors.text,
              backgroundColor: isDark ? colors.surfaceRaised : 'rgba(20,19,19,0.04)',
              borderColor: isDark ? colors.border : 'rgba(20,19,19,0.08)',
            }]}
            placeholder={t('preg_reminders_inputPlaceholder')}
            placeholderTextColor={diffuse ? dt.colors.ink4 : colors.textMuted}
            value={newText}
            onChangeText={setNewText}
            onSubmitEditing={addReminder}
            autoFocus
            returnKeyType="done"
            multiline={false}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Pressable
              onPress={() => { setShowDatePicker(!showDatePicker); setShowTimePicker(false) }}
              style={[styles.pill, diffuse ? {
                borderColor: newDate ? ACCENT : dt.colors.line,
                backgroundColor: 'transparent',
                borderRadius: radius.full,
              } : {
                borderColor: newDate ? ACCENT : (isDark ? colors.border : 'rgba(20,19,19,0.12)'),
                backgroundColor: newDate
                  ? ACCENT + '18'
                  : (isDark ? colors.surfaceRaised : stickers.blue + '22'),
                borderRadius: radius.full,
              }]}
            >
              <Clock size={12} color={newDate ? ACCENT : (diffuse ? dt.colors.ink3 : colors.textSecondary)} strokeWidth={2} />
              <Text style={diffuse ? {
                fontSize: 11,
                color: newDate ? ACCENT : dt.colors.ink3,
                fontFamily: diffuseFont.mono,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              } : {
                fontSize: 12,
                color: newDate ? ACCENT : colors.textSecondary,
                fontFamily: font.bodySemiBold,
              }}>
                {newDate ? newDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : t('preg_reminders_setDate')}
              </Text>
              {newDate && (
                <Pressable
                  onPress={() => { setNewDate(null); setNewTime(null); setShowDatePicker(false); setShowTimePicker(false) }}
                  hitSlop={8}
                >
                  <X size={10} color={ACCENT} strokeWidth={2.5} />
                </Pressable>
              )}
            </Pressable>

            {newDate && (
              <Pressable
                onPress={() => { setShowTimePicker(!showTimePicker); setShowDatePicker(false) }}
                style={diffuse ? {
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 12, paddingVertical: 7,
                  borderRadius: radius.full, borderWidth: 1,
                  borderColor: newTime ? ACCENT : dt.colors.line,
                  backgroundColor: 'transparent',
                } : {
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 12, paddingVertical: 7,
                  borderRadius: radius.full, borderWidth: 1,
                  borderColor: newTime ? stickers.peach + 'CC' : (isDark ? colors.border : 'rgba(20,19,19,0.12)'),
                  backgroundColor: newTime
                    ? stickers.peach + '30'
                    : (isDark ? colors.surfaceRaised : stickers.peach + '22'),
                }}
              >
                <Bell size={11} color={diffuse ? (newTime ? ACCENT : dt.colors.ink3) : (newTime ? '#C06030' : colors.textSecondary)} strokeWidth={2} />
                <Text style={diffuse ? {
                  fontSize: 11, fontFamily: diffuseFont.mono, letterSpacing: 0.5, textTransform: 'uppercase',
                  color: newTime ? ACCENT : dt.colors.ink3,
                } : { fontSize: 11, fontFamily: font.bodySemiBold, color: newTime ? stickers.peachInk : colors.textSecondary }}>
                  {newTime
                    ? formatTime12h(`${String(newTime.getHours()).padStart(2, '0')}:${String(newTime.getMinutes()).padStart(2, '0')}`)
                    : t('preg_reminders_setTime')}
                </Text>
                {newTime && (
                  <Pressable onPress={() => { setNewTime(null); setShowTimePicker(false) }} hitSlop={8}>
                    <X size={9} color={diffuse ? ACCENT : '#C06030'} strokeWidth={2.5} />
                  </Pressable>
                )}
              </Pressable>
            )}

            <View style={{ flex: 1 }} />

            <Pressable
              onPress={addReminder}
              style={[styles.saveBtn, diffuse ? {
                backgroundColor: 'transparent',
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: dt.colors.hairline,
              } : {
                backgroundColor: ACCENT,
                borderRadius: radius.full,
                borderWidth: 1.5,
                borderColor: isDark ? ACCENT : colors.text,
              }]}
              accessibilityRole="button"
              accessibilityLabel="Save reminder"
            >
              <Text style={diffuse
                ? { fontSize: 11, fontFamily: diffuseFont.monoBold, letterSpacing: 1.2, textTransform: 'uppercase', color: dt.colors.ink }
                : [styles.saveBtnText, { color: colors.textInverse }]}>{t('preg_reminders_save')}</Text>
            </Pressable>
          </View>

          {/* Tags — neutral hairline chips + inline add */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {newTags.map((tag) => (
              <Pressable key={tag} onPress={() => setNewTags((prev) => prev.filter((x) => x !== tag))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.text, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ fontFamily: font.bodyMedium, fontSize: 12, color: colors.text }}>{tag}</Text>
                <X size={11} color={colors.textMuted} strokeWidth={2.5} />
              </Pressable>
            ))}
            <TextInput
              value={tagDraft}
              onChangeText={setTagDraft}
              placeholder={t('reminders_addTag')}
              placeholderTextColor={colors.textFaint}
              onSubmitEditing={() => {
                const v = tagDraft.trim().toLowerCase()
                if (v && !newTags.includes(v)) setNewTags((prev) => [...prev, v])
                setTagDraft('')
              }}
              returnKeyType="done"
              blurOnSubmit={false}
              style={{ minWidth: 90, fontFamily: font.bodyMedium, fontSize: 13, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}
            />
          </View>

          {/* Priority — three neutral pills */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['low', 'med', 'high'] as const).map((p) => {
              const on = newPriority === p
              return (
                <Pressable key={p} onPress={() => setNewPriority(on ? null : p)}
                  style={{ borderWidth: 1, borderColor: on ? colors.text : colors.border, backgroundColor: on ? colors.surfaceRaised : 'transparent', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ fontFamily: font.bodyMedium, fontSize: 12, color: on ? colors.text : colors.textMuted }}>
                    {p === 'low' ? t('reminders_priorityLow') : p === 'med' ? t('reminders_priorityMed') : t('reminders_priorityHigh')}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {/* Notes */}
          <TextInput
            value={newNotes}
            onChangeText={setNewNotes}
            placeholder={t('reminders_notesPlaceholder')}
            placeholderTextColor={colors.textFaint}
            multiline
            style={{ fontFamily: font.body, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44 }}
          />

          {showDatePicker && (
            <View style={{
              borderRadius: 20,
              overflow: 'hidden',
              marginTop: 6,
              borderWidth: diffuse ? 1 : 1.5,
              borderColor: diffuse ? dt.colors.line : (isDark ? colors.border : 'rgba(20,19,19,0.1)'),
              backgroundColor: diffuse ? dt.colors.surface : colors.surface,
            }}>
              <DateTimePicker
                value={newDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                themeVariant={(diffuse ? dt.isDark : isDark) ? 'dark' : 'light'}
                accentColor={ACCENT}
                onChange={(_e: DateTimePickerEvent, date?: Date) => {
                  if (Platform.OS !== 'ios') setShowDatePicker(false)
                  if (date) setNewDate(date)
                }}
              />
              {Platform.OS === 'ios' && (
                <Pressable
                  onPress={() => setShowDatePicker(false)}
                  style={{
                    alignItems: 'center',
                    paddingVertical: 12,
                    backgroundColor: diffuse ? dt.colors.surface : (isDark ? colors.surface : stickers.blue + '18'),
                    borderTopWidth: 1,
                    borderTopColor: diffuse ? dt.colors.line : (isDark ? colors.border : 'rgba(20,19,19,0.08)'),
                  }}
                >
                  <Text style={diffuse
                    ? { fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: dt.colors.ink }
                    : { fontFamily: font.bodyBold, fontSize: 14, color: ACCENT }}>{t('preg_reminders_done')}</Text>
                </Pressable>
              )}
            </View>
          )}

          {showTimePicker && newDate && (
            <View style={{
              borderRadius: 20,
              overflow: 'hidden',
              marginTop: 6,
              borderWidth: diffuse ? 1 : 1.5,
              borderColor: diffuse ? dt.colors.line : (isDark ? colors.border : 'rgba(20,19,19,0.1)'),
              backgroundColor: diffuse ? dt.colors.surface : colors.surface,
            }}>
              <DateTimePicker
                value={newTime ?? (() => { const d = new Date(); d.setHours(9, 0, 0, 0); return d })()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant={(diffuse ? dt.isDark : isDark) ? 'dark' : 'light'}
                accentColor={ACCENT}
                style={{ height: 140 }}
                onChange={(_e: DateTimePickerEvent, date?: Date) => {
                  if (Platform.OS !== 'ios') setShowTimePicker(false)
                  if (date) setNewTime(date)
                }}
              />
              {Platform.OS === 'ios' && (
                <Pressable
                  onPress={() => setShowTimePicker(false)}
                  style={{
                    alignItems: 'center',
                    paddingVertical: 12,
                    backgroundColor: diffuse ? dt.colors.surface : (isDark ? colors.surface : stickers.peach + '18'),
                    borderTopWidth: 1,
                    borderTopColor: diffuse ? dt.colors.line : (isDark ? colors.border : 'rgba(20,19,19,0.08)'),
                  }}
                >
                  <Text style={diffuse
                    ? { fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: dt.colors.ink }
                    : { fontFamily: font.bodyBold, fontSize: 14, color: stickers.peachInk }}>{t('preg_reminders_done')}</Text>
                </Pressable>
              )}
            </View>
          )}
          </>
        )}
      </View>

      {/* Active list */}
      {active.length > 0 && (
        <View style={{ gap: 8 }}>
          {active.map((r) => (
            <ReminderRow
              key={r.id}
              r={r}
              onToggle={() => toggleReminder(r.id)}
              onDelete={() => deleteReminder(r.id)}
              onEdit={editReminder}
              onFlag={() => flagReminder(r.id)}
              colors={colors}
              isDark={isDark}
              stickers={stickers}
              accent={ACCENT}
              diffuse={diffuse}
              dt={dt}
              t={t}
            />
          ))}
        </View>
      )}
    </View>
  )
}

function ReminderRow({
  r, onToggle, onDelete, onEdit, onFlag, colors, isDark, stickers, accent, diffuse, dt, t,
}: {
  r: Reminder
  onToggle: () => void
  onDelete: () => void
  onEdit: (id: string, newText: string) => void
  onFlag: () => void
  colors: any
  isDark: boolean
  stickers: any
  accent: string
  diffuse: boolean
  dt: ReturnType<typeof useDiffuseTheme>
  t: ReturnType<typeof useTranslation>['t']
}) {
  const ACCENT = accent
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = r.dueDate ? new Date(r.dueDate + 'T00:00:00') : null
  const diffDays = due ? Math.round((due.getTime() - today.getTime()) / 86400000) : null
  const isOverdue = !r.done && diffDays !== null && diffDays < 0
  const isDueToday = !r.done && diffDays === 0
  const isDueSoon = !r.done && diffDays !== null && diffDays > 0 && diffDays <= 3
  const dueDateColor = diffuse
    ? (isOverdue ? dt.colors.error : isDueToday ? dt.colors.warning : isDueSoon ? dt.colors.warning : dt.colors.ink3)
    : (isOverdue ? brand.error : isDueToday ? '#C08000' : isDueSoon ? brand.warning : colors.textMuted)
  const timeSuffix = r.dueTime ? ` · ${formatTime12h(r.dueTime)}` : ''
  const dueDateLabel = due
    ? isOverdue
      ? t('preg_reminders_dueOverdue', { days: Math.abs(diffDays!), timeSuffix })
      : isDueToday
        ? t('preg_reminders_dueToday', { timeSuffix })
        : t('preg_reminders_dueOn', {
            date: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            timeSuffix,
          })
    : null

  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(r.text)

  function commitEdit() {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== r.text) onEdit(r.id, trimmed)
    setEditing(false)
  }

  const cardBg = diffuse
    ? dt.colors.surface
    : isOverdue
    ? (isDark ? 'rgba(238,123,109,0.10)' : '#FFF0ED')
    : r.flagged
    ? (isDark ? 'rgba(245,214,82,0.10)' : '#FFFBE6')
    : isDueToday
    ? (isDark ? 'rgba(245,214,82,0.08)' : '#FFFDE8')
    : (colors.surface)

  const cardBorder = diffuse
    ? (isOverdue ? dt.colors.error : r.flagged || isDueToday ? dt.colors.line2 : dt.colors.line)
    : isOverdue
    ? (isDark ? 'rgba(238,123,109,0.28)' : 'rgba(238,123,109,0.38)')
    : r.flagged || isDueToday
    ? (isDark ? 'rgba(245,214,82,0.28)' : 'rgba(245,214,82,0.65)')
    : (isDark ? colors.border : 'rgba(20,19,19,0.1)')

  const badgeBg = isOverdue ? '#EE7B6D' : (r.flagged || isDueToday) ? stickers.yellow : stickers.blue
  const badgeIconColor = isOverdue ? colors.textInverse : colors.text

  return (
    <View style={diffuse ? {
      backgroundColor: cardBg,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: cardBorder,
      paddingVertical: 12,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    } : {
      backgroundColor: cardBg,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: cardBorder,
      paddingVertical: 12,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      shadowColor: '#141313',
      shadowOpacity: isDark ? 0 : 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    }}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: r.done }}
        accessibilityLabel={r.done ? 'Mark as not done' : 'Mark as done'}
        hitSlop={6}
        style={diffuse ? {
          width: 32, height: 32, borderRadius: 10,
          backgroundColor: r.done ? ACCENT : 'transparent',
          borderWidth: 1.5,
          borderColor: r.done
            ? ACCENT
            : isOverdue
            ? dt.colors.error
            : isDueToday
            ? dt.colors.warning
            : dt.colors.line2,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
        } : {
          width: 32, height: 32, borderRadius: 10,
          backgroundColor: r.done ? badgeBg : 'transparent',
          borderWidth: 2,
          borderColor: r.done
            ? (isDark ? 'rgba(255,255,255,0.18)' : '#141313')
            : isOverdue
            ? '#EE7B6D'
            : isDueToday
            ? '#C09A2C'
            : (isDark ? 'rgba(255,255,255,0.30)' : 'rgba(20,19,19,0.35)'),
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {r.done ? <Check size={16} color={diffuse ? dt.colors.bg : badgeIconColor} strokeWidth={3} /> : null}
      </Pressable>

      <View style={{ flex: 1, gap: 6, paddingTop: 2 }}>
        {editing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TextInput
              style={{ fontSize: 15, fontFamily: diffuse ? diffuseFont.body : font.display, color: diffuse ? dt.colors.ink : colors.text, flex: 1, borderBottomWidth: 1, borderBottomColor: ACCENT, paddingVertical: 2 }}
              value={editText}
              onChangeText={setEditText}
              onSubmitEditing={commitEdit}
              onBlur={commitEdit}
              autoFocus
              returnKeyType="done"
            />
            <Pressable onPress={commitEdit} hitSlop={8}>
              <Check size={14} color={diffuse ? ACCENT : '#BDD48C'} strokeWidth={2.5} />
            </Pressable>
            <Pressable onPress={() => { setEditText(r.text); setEditing(false) }} hitSlop={8}>
              <X size={14} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
        ) : (
          <Text
            style={{
              fontSize: 15,
              fontFamily: diffuse ? diffuseFont.body : font.display,
              color: diffuse ? dt.colors.ink : colors.text,
              lineHeight: 21,
            }}
            numberOfLines={2}
          >{r.text}</Text>
        )}

        {dueDateLabel && (() => {
          if (diffuse) {
            const dueInk = isOverdue ? dt.colors.error : isDueToday ? dt.colors.warning : dt.colors.ink3
            return (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: 'transparent',
                borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4,
                borderWidth: 1, borderColor: dt.colors.line,
                alignSelf: 'flex-start',
              }}>
                <Clock size={9} color={dueInk} strokeWidth={2.5} />
                <Text style={{ fontSize: 10, color: dueInk, fontFamily: diffuseFont.mono, letterSpacing: 0.5, textTransform: 'uppercase' }}>{dueDateLabel}</Text>
              </View>
            )
          }
          const dueBg = isOverdue
            ? (isDark ? brand.error + '22' : '#F5B896')
            : isDueToday
              ? (isDark ? '#F5D65222' : '#F5D652')
              : (colors.surfaceRaised)
          const dueBorder = isDark
            ? isOverdue ? brand.error + '60' : isDueToday ? '#F5D65270' : colors.border
            : '#141313'
          const dueInk = isDark
            ? dueDateColor
            : isOverdue ? '#7A1F12' : isDueToday ? '#5A4400' : '#141313'
          return (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: dueBg,
              borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4,
              borderWidth: 1.2, borderColor: dueBorder,
              alignSelf: 'flex-start',
            }}>
              <Clock size={9} color={dueInk} strokeWidth={2.5} />
              <Text style={{ fontSize: 11, color: dueInk, fontFamily: font.bodyBold }}>{dueDateLabel}</Text>
            </View>
          )
        })()}
      </View>

      {/* Actions in a horizontal row — keeps rows compact. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 2 }}>
        {!editing && (
          <Pressable onPress={() => { setEditText(r.text); setEditing(true) }} hitSlop={10}>
            <Pencil size={14} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={2} />
          </Pressable>
        )}
        <Pressable onPress={onFlag} hitSlop={10}>
          <Flag size={14} color={r.flagged ? (diffuse ? ACCENT : '#F5D652') : (diffuse ? dt.colors.ink3 : colors.textMuted)} fill={r.flagged ? (diffuse ? ACCENT : '#F5D652') : 'transparent'} strokeWidth={2} />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={10}>
          <Trash2 size={14} color={diffuse ? dt.colors.ink3 : colors.textMuted} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  addBtnText: { fontSize: 12, fontWeight: '700' },
  inputCard: {
    padding: 14,
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
  },
  textInput: {
    fontSize: 14,
    fontFamily: font.bodyMedium,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1,
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  saveBtnText: {
    fontSize: 13,
    fontFamily: font.bodyBold,
  },
})
