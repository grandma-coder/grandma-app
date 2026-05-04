import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import {
  Plus, Bell, Clock, X, Check, Pencil, Flag, Trash2,
} from 'lucide-react-native'
import { useTheme, brand } from '../../../constants/theme'
import { Star as StarSticker } from '../../ui/Stickers'
import { supabase } from '../../../lib/supabase'

interface Reminder {
  id: string
  text: string
  done: boolean
  dueDate?: string | null
  dueTime?: string | null
  notifId?: string | null
  archivedAt?: string | null
  flagged?: boolean
}

interface Props {
  userId: string | null
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

const ACCENT = brand.pregnancy

export function PregnancyUserReminders({ userId }: Props) {
  const { colors, radius, isDark, stickers } = useTheme()

  const [reminders, setReminders] = useState<Reminder[]>([])
  const [showInput, setShowInput] = useState(false)
  const [newText, setNewText] = useState('')
  const [newDate, setNewDate] = useState<Date | null>(null)
  const [newTime, setNewTime] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  const storageKey = userId ? `grandma-reminders-pregnancy-${userId}` : null

  useEffect(() => {
    if (!storageKey) return
    AsyncStorage.getItem(storageKey).then((json) => {
      if (json) {
        try { setReminders(JSON.parse(json)) } catch {}
      }
    })
  }, [storageKey])

  function persist(list: Reminder[]) {
    setReminders(list)
    if (storageKey) AsyncStorage.setItem(storageKey, JSON.stringify(list))
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
          data: { context: 'pregnancy', dueDate, dueTime },
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
    }
    persist([...reminders, r])
    setNewText('')
    setNewDate(null)
    setNewTime(null)
    setShowDatePicker(false)
    setShowTimePicker(false)
    setShowInput(false)
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
      {/* Add toggle */}
      <View style={styles.addRow}>
        <Pressable
          onPress={() => { setShowInput(!showInput); setNewText('') }}
          style={[styles.addBtn, { backgroundColor: ACCENT + '15', borderRadius: radius.full }]}
        >
          <Plus size={13} color={ACCENT} strokeWidth={2.5} />
          <Text style={[styles.addBtnText, { color: ACCENT }]}>Add reminder</Text>
        </Pressable>
      </View>

      {/* Input panel */}
      {showInput && (
        <View style={[styles.inputCard, {
          backgroundColor: isDark ? colors.surface : '#FFFEF8',
          borderColor: isDark ? colors.border : 'rgba(20,19,19,0.12)',
          shadowColor: '#141313',
          shadowOpacity: isDark ? 0 : 0.07,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 4 },
        }]}>
          <View style={{ position: 'absolute', top: -10, right: 14, transform: [{ rotate: '15deg' }] }} pointerEvents="none">
            <StarSticker size={36} fill={stickers.yellow} stroke="#141313" />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <View style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: stickers.yellow,
              borderWidth: 1.5, borderColor: '#141313',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Bell size={13} color="#141313" strokeWidth={2.5} />
            </View>
            <Text style={{ fontSize: 16, fontFamily: 'Fraunces_600SemiBold', color: colors.text, letterSpacing: -0.3 }}>
              Add reminder
            </Text>
          </View>

          <TextInput
            style={[styles.textInput, {
              color: colors.text,
              backgroundColor: isDark ? colors.surfaceRaised : 'rgba(20,19,19,0.04)',
              borderColor: isDark ? colors.border : 'rgba(20,19,19,0.08)',
            }]}
            placeholder="e.g. Take prenatal vitamins, schedule glucose test..."
            placeholderTextColor={colors.textMuted}
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
              style={[styles.pill, {
                borderColor: newDate ? ACCENT : (isDark ? colors.border : 'rgba(20,19,19,0.12)'),
                backgroundColor: newDate
                  ? ACCENT + '18'
                  : (isDark ? colors.surfaceRaised : stickers.blue + '22'),
                borderRadius: radius.full,
              }]}
            >
              <Clock size={12} color={newDate ? ACCENT : colors.textSecondary} strokeWidth={2} />
              <Text style={{
                fontSize: 12,
                color: newDate ? ACCENT : colors.textSecondary,
                fontFamily: 'DMSans_600SemiBold',
              }}>
                {newDate ? newDate.toLocaleDateString('en', { month: 'short', day: 'numeric' }) : 'Set date'}
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
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 12, paddingVertical: 7,
                  borderRadius: radius.full, borderWidth: 1,
                  borderColor: newTime ? stickers.peach + 'CC' : (isDark ? colors.border : 'rgba(20,19,19,0.12)'),
                  backgroundColor: newTime
                    ? stickers.peach + '30'
                    : (isDark ? colors.surfaceRaised : stickers.peach + '22'),
                }}
              >
                <Bell size={11} color={newTime ? '#C06030' : colors.textSecondary} strokeWidth={2} />
                <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: newTime ? '#C06030' : colors.textSecondary }}>
                  {newTime
                    ? formatTime12h(`${String(newTime.getHours()).padStart(2, '0')}:${String(newTime.getMinutes()).padStart(2, '0')}`)
                    : 'Set time'}
                </Text>
                {newTime && (
                  <Pressable onPress={() => { setNewTime(null); setShowTimePicker(false) }} hitSlop={8}>
                    <X size={9} color="#C06030" strokeWidth={2.5} />
                  </Pressable>
                )}
              </Pressable>
            )}

            <View style={{ flex: 1 }} />

            <Pressable
              onPress={addReminder}
              style={[styles.saveBtn, {
                backgroundColor: ACCENT,
                borderRadius: radius.full,
                borderWidth: 1.5,
                borderColor: isDark ? ACCENT : '#141313',
              }]}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </View>

          {showDatePicker && (
            <View style={{
              borderRadius: 20,
              overflow: 'hidden',
              marginTop: 6,
              borderWidth: 1.5,
              borderColor: isDark ? colors.border : 'rgba(20,19,19,0.1)',
              backgroundColor: isDark ? colors.surfaceRaised : '#FFFFFF',
            }}>
              <DateTimePicker
                value={newDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                themeVariant={isDark ? 'dark' : 'light'}
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
                    backgroundColor: isDark ? colors.surface : stickers.blue + '18',
                    borderTopWidth: 1,
                    borderTopColor: isDark ? colors.border : 'rgba(20,19,19,0.08)',
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: ACCENT }}>Done</Text>
                </Pressable>
              )}
            </View>
          )}

          {showTimePicker && newDate && (
            <View style={{
              borderRadius: 20,
              overflow: 'hidden',
              marginTop: 6,
              borderWidth: 1.5,
              borderColor: isDark ? colors.border : 'rgba(20,19,19,0.1)',
              backgroundColor: isDark ? colors.surfaceRaised : '#FFFFFF',
            }}>
              <DateTimePicker
                value={newTime ?? (() => { const d = new Date(); d.setHours(9, 0, 0, 0); return d })()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant={isDark ? 'dark' : 'light'}
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
                    backgroundColor: isDark ? colors.surface : stickers.peach + '18',
                    borderTopWidth: 1,
                    borderTopColor: isDark ? colors.border : 'rgba(20,19,19,0.08)',
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#C06030' }}>Done</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}

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
            />
          ))}
        </View>
      )}
    </View>
  )
}

function ReminderRow({
  r, onToggle, onDelete, onEdit, onFlag, colors, isDark, stickers,
}: {
  r: Reminder
  onToggle: () => void
  onDelete: () => void
  onEdit: (id: string, newText: string) => void
  onFlag: () => void
  colors: any
  isDark: boolean
  stickers: any
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = r.dueDate ? new Date(r.dueDate + 'T00:00:00') : null
  const diffDays = due ? Math.round((due.getTime() - today.getTime()) / 86400000) : null
  const isOverdue = !r.done && diffDays !== null && diffDays < 0
  const isDueToday = !r.done && diffDays === 0
  const isDueSoon = !r.done && diffDays !== null && diffDays > 0 && diffDays <= 3
  const dueDateColor = isOverdue ? brand.error : isDueToday ? '#C08000' : isDueSoon ? brand.warning : colors.textMuted
  const timeSuffix = r.dueTime ? ` · ${formatTime12h(r.dueTime)}` : ''
  const dueDateLabel = due
    ? isOverdue ? `${Math.abs(diffDays!)}d overdue${timeSuffix}`
    : isDueToday ? `Due today${timeSuffix}`
    : `Due ${due.toLocaleDateString('en', { month: 'short', day: 'numeric' })}${timeSuffix}`
    : null

  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(r.text)

  function commitEdit() {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== r.text) onEdit(r.id, trimmed)
    setEditing(false)
  }

  const cardBg = isOverdue
    ? (isDark ? 'rgba(238,123,109,0.10)' : '#FFF0ED')
    : r.flagged
    ? (isDark ? 'rgba(245,214,82,0.10)' : '#FFFBE6')
    : isDueToday
    ? (isDark ? 'rgba(245,214,82,0.08)' : '#FFFDE8')
    : (isDark ? colors.surface : '#FFFEF8')

  const cardBorder = isOverdue
    ? (isDark ? 'rgba(238,123,109,0.28)' : 'rgba(238,123,109,0.38)')
    : r.flagged || isDueToday
    ? (isDark ? 'rgba(245,214,82,0.28)' : 'rgba(245,214,82,0.65)')
    : (isDark ? colors.border : 'rgba(20,19,19,0.1)')

  const badgeBg = isOverdue ? '#EE7B6D' : (r.flagged || isDueToday) ? stickers.yellow : stickers.blue
  const badgeIconColor = isOverdue ? '#FFFFFF' : '#141313'

  return (
    <View style={{
      backgroundColor: cardBg,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: cardBorder,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      shadowColor: '#141313',
      shadowOpacity: isDark ? 0 : 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    }}>
      <Pressable
        onPress={onToggle}
        style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: badgeBg,
          borderWidth: 1.5,
          borderColor: isDark ? 'rgba(255,255,255,0.18)' : '#141313',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {isOverdue
          ? <Bell size={13} color={badgeIconColor} strokeWidth={2.5} />
          : (isDueToday || r.flagged)
          ? <Clock size={13} color={badgeIconColor} strokeWidth={2.5} />
          : <View style={{ width: 11, height: 11, borderRadius: 6, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(20,19,19,0.35)' }} />
        }
      </Pressable>

      <View style={{ flex: 1, gap: 6, paddingTop: 2 }}>
        {editing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TextInput
              style={{ fontSize: 15, fontFamily: 'Fraunces_600SemiBold', color: colors.text, flex: 1, borderBottomWidth: 1, borderBottomColor: ACCENT, paddingVertical: 2 }}
              value={editText}
              onChangeText={setEditText}
              onSubmitEditing={commitEdit}
              onBlur={commitEdit}
              autoFocus
              returnKeyType="done"
            />
            <Pressable onPress={commitEdit} hitSlop={8}>
              <Check size={14} color="#BDD48C" strokeWidth={2.5} />
            </Pressable>
            <Pressable onPress={() => { setEditText(r.text); setEditing(false) }} hitSlop={8}>
              <X size={14} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
        ) : (
          <Text
            style={{
              fontSize: 15,
              fontFamily: 'Fraunces_600SemiBold',
              color: isDark ? colors.text : '#141313',
              lineHeight: 21,
            }}
            numberOfLines={2}
          >{r.text}</Text>
        )}

        {dueDateLabel && (() => {
          const dueBg = isOverdue
            ? (isDark ? brand.error + '22' : '#F5B896')
            : isDueToday
              ? (isDark ? '#F5D65222' : '#F5D652')
              : (isDark ? colors.surfaceRaised : '#FFFEF8')
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
              <Text style={{ fontSize: 11, color: dueInk, fontFamily: 'DMSans_700Bold' }}>{dueDateLabel}</Text>
            </View>
          )
        })()}
      </View>

      <View style={{ alignItems: 'center', gap: 10, paddingTop: 4 }}>
        {!editing && (
          <Pressable onPress={() => { setEditText(r.text); setEditing(true) }} hitSlop={12}>
            <Pencil size={13} color={colors.textMuted} strokeWidth={2} />
          </Pressable>
        )}
        <Pressable onPress={onFlag} hitSlop={12}>
          <Flag size={13} color={r.flagged ? '#F5D652' : colors.textMuted} fill={r.flagged ? '#F5D652' : 'transparent'} strokeWidth={2} />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={12}>
          <Trash2 size={13} color={colors.textMuted} strokeWidth={2} />
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
    fontFamily: 'DMSans_500Medium',
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
    fontFamily: 'DMSans_700Bold',
    color: '#FFFFFF',
  },
})
