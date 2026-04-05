/**
 * C6 — Kids Calendar Screen
 *
 * Child selector, Month/List toggle, colored dots per child,
 * event banner, quick log buttons, 5 bottom sheet forms.
 */

import { useState, useMemo } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  FlatList,
  StyleSheet,
} from 'react-native'
import {
  ChevronLeft,
  ChevronRight,
  Utensils,
  Moon,
  Heart,
  Smile,
  Camera,
  Calendar,
  User,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { toDateStr } from '../../lib/cycleLogic'
import { LogSheet } from './LogSheet'
import {
  FeedingForm,
  SleepForm,
  HealthEventForm,
  KidsMoodForm,
  MemoryForm,
} from './KidsLogForms'
import type { ChildWithRole } from '../../types'

// ─── Child colors (cycle through for multi-child dots) ─────────────────────

const CHILD_COLORS = [brand.kids, brand.prePregnancy, brand.accent, brand.phase.ovulation, brand.pregnancy, brand.secondary]

function childColor(index: number) {
  return CHILD_COLORS[index % CHILD_COLORS.length]
}

// ─── Constants ─────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type LogType = 'feeding' | 'sleep' | 'health' | 'mood' | 'memory'

const QUICK_LOGS: { id: LogType; label: string; icon: typeof Utensils; color: string }[] = [
  { id: 'feeding', label: 'Feeding', icon: Utensils, color: brand.kids },
  { id: 'sleep', label: 'Sleep', icon: Moon, color: brand.pregnancy },
  { id: 'health', label: 'Health', icon: Heart, color: brand.error },
  { id: 'mood', label: 'Mood', icon: Smile, color: brand.accent },
  { id: 'memory', label: 'Memory', icon: Camera, color: brand.phase.ovulation },
]

// ─── Mock events for list view ─────────────────────────────────────────────

const MOCK_EVENTS = [
  { id: '1', type: 'feeding', childName: '', time: '8:30 AM', detail: 'Breakfast — oatmeal + banana' },
  { id: '2', type: 'sleep', childName: '', time: '10:00 AM', detail: 'Nap — 1.5 hours' },
  { id: '3', type: 'mood', childName: '', time: '12:15 PM', detail: 'Happy and playful' },
  { id: '4', type: 'feeding', childName: '', time: '12:30 PM', detail: 'Lunch — pasta + veggies' },
]

const EVENT_ICONS: Record<string, typeof Utensils> = {
  feeding: Utensils,
  sleep: Moon,
  mood: Smile,
  health: Heart,
  memory: Camera,
}

const EVENT_COLORS: Record<string, string> = {
  feeding: brand.kids,
  sleep: brand.pregnancy,
  mood: brand.accent,
  health: brand.error,
  memory: brand.phase.ovulation,
}

// ─── Main Component ────────────────────────────────────────────────────────

export function KidsCalendar() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()

  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const setActiveChild = useChildStore((s) => s.setActiveChild)

  // 'all' or child id
  const [selectedChildId, setSelectedChildId] = useState<string | 'all'>('all')
  const [view, setView] = useState<'month' | 'list'>('month')
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [sheetType, setSheetType] = useState<LogType | null>(null)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const todayStr = toDateStr(new Date())

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: { date: string; day: number; inMonth: boolean; isToday: boolean; isFuture: boolean }[] = []

    for (let i = 0; i < firstDay; i++) {
      days.push({ date: '', day: 0, inMonth: false, isToday: false, isFuture: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({
        date: dateStr,
        day: d,
        inMonth: true,
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
      })
    }
    return days
  }, [year, month, todayStr])

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)) }
  function handleSaved() { setSheetType(null) }

  const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Populate mock events with first child name
  const events = MOCK_EVENTS.map((e) => ({
    ...e,
    childName: e.childName || activeChild?.name || children[0]?.name || 'Child',
  }))

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Child Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.childSelectorRow}
        >
          <Pressable
            onPress={() => setSelectedChildId('all')}
            style={[
              styles.childSelectorChip,
              {
                backgroundColor: selectedChildId === 'all' ? colors.primaryTint : colors.surface,
                borderColor: selectedChildId === 'all' ? colors.primary : colors.border,
                borderRadius: radius.full,
              },
            ]}
          >
            <Text style={[styles.childSelectorText, { color: selectedChildId === 'all' ? colors.primary : colors.text }]}>
              All Kids
            </Text>
          </Pressable>
          {children.map((c, i) => {
            const active = selectedChildId === c.id
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  setSelectedChildId(c.id)
                  setActiveChild(c)
                }}
                style={[
                  styles.childSelectorChip,
                  {
                    backgroundColor: active ? childColor(i) + '15' : colors.surface,
                    borderColor: active ? childColor(i) : colors.border,
                    borderRadius: radius.full,
                  },
                ]}
              >
                <View style={[styles.childDot, { backgroundColor: childColor(i) }]} />
                <Text style={[styles.childSelectorText, { color: active ? childColor(i) : colors.text }]}>
                  {c.name}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {/* 2. View Toggle */}
        <View style={[styles.toggleRow, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
          <Pressable
            onPress={() => setView('month')}
            style={[styles.toggleBtn, { backgroundColor: view === 'month' ? colors.primary : 'transparent', borderRadius: radius.md }]}
          >
            <Text style={[styles.toggleText, { color: view === 'month' ? '#FFFFFF' : colors.textSecondary }]}>Month</Text>
          </Pressable>
          <Pressable
            onPress={() => setView('list')}
            style={[styles.toggleBtn, { backgroundColor: view === 'list' ? colors.primary : 'transparent', borderRadius: radius.md }]}
          >
            <Text style={[styles.toggleText, { color: view === 'list' ? '#FFFFFF' : colors.textSecondary }]}>List</Text>
          </Pressable>
        </View>

        {view === 'month' ? (
          <>
            {/* 3. Month Header */}
            <View style={styles.monthHeader}>
              <Pressable onPress={prevMonth} style={styles.chevron}>
                <ChevronLeft size={24} color={colors.text} />
              </Pressable>
              <Text style={[styles.monthLabel, { color: colors.text }]}>{monthLabel}</Text>
              <Pressable onPress={nextMonth} style={styles.chevron}>
                <ChevronRight size={24} color={colors.text} />
              </Pressable>
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarWrap}>
              <View style={styles.weekRow}>
                {WEEKDAYS.map((w) => (
                  <Text key={w} style={[styles.weekday, { color: colors.textMuted }]}>{w}</Text>
                ))}
              </View>
              <View style={styles.dayGrid}>
                {calendarDays.map((d, idx) => {
                  if (!d.inMonth) return <View key={`e-${idx}`} style={styles.dayCell} />
                  const isSelected = d.date === selectedDate
                  return (
                    <Pressable
                      key={d.date}
                      onPress={() => setSelectedDate(d.date)}
                      style={[
                        styles.dayCell,
                        {
                          backgroundColor: colors.surface,
                          borderRadius: radius.sm,
                          opacity: d.isFuture ? 0.4 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.dayInner,
                          d.isToday && { borderWidth: 2, borderColor: colors.primary, borderRadius: radius.sm },
                          isSelected && !d.isToday && { borderWidth: 1.5, borderColor: colors.textSecondary, borderRadius: radius.sm },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNumber,
                            { color: d.isToday ? colors.primary : colors.text },
                            d.isToday && { fontWeight: '800' },
                          ]}
                        >
                          {d.day}
                        </Text>
                        {/* Multi-child dots */}
                        <View style={styles.dotRow}>
                          {children.slice(0, 3).map((c, ci) => (
                            <View
                              key={c.id}
                              style={[styles.logDot, { backgroundColor: childColor(ci) }]}
                            />
                          ))}
                        </View>
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          </>
        ) : (
          /* 4. List View */
          <View style={styles.listWrap}>
            {events.map((evt) => {
              const Icon = EVENT_ICONS[evt.type] ?? Calendar
              const color = EVENT_COLORS[evt.type] ?? colors.textMuted
              return (
                <View
                  key={evt.id}
                  style={[styles.listItem, { backgroundColor: colors.surface, borderRadius: radius.xl }]}
                >
                  <View style={[styles.listIcon, { backgroundColor: color + '15' }]}>
                    <Icon size={18} color={color} strokeWidth={2} />
                  </View>
                  <View style={styles.listContent}>
                    <Text style={[styles.listType, { color: colors.text }]}>
                      {evt.type.charAt(0).toUpperCase() + evt.type.slice(1)}
                    </Text>
                    <Text style={[styles.listDetail, { color: colors.textSecondary }]} numberOfLines={1}>
                      {evt.detail}
                    </Text>
                  </View>
                  <View style={styles.listMeta}>
                    <Text style={[styles.listTime, { color: colors.textMuted }]}>{evt.time}</Text>
                    <Text style={[styles.listChild, { color: colors.textMuted }]}>{evt.childName}</Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* 5. Event Banner */}
        <View style={[styles.banner, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <View style={styles.bannerHeader}>
            <Calendar size={18} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.bannerTitle, { color: colors.text }]}>Next Event</Text>
          </View>
          <Text style={[styles.bannerEvent, { color: colors.text }]}>
            Pediatric Checkup
          </Text>
          <Text style={[styles.bannerDate, { color: colors.textSecondary }]}>
            April 20 — {activeChild?.name || children[0]?.name || 'Child'}
          </Text>
        </View>

        {/* 6. Quick Log Buttons */}
        <View style={styles.quickLogGrid}>
          {QUICK_LOGS.map((log) => {
            const Icon = log.icon
            return (
              <Pressable
                key={log.id}
                onPress={() => setSheetType(log.id)}
                style={({ pressed }) => [
                  styles.quickLogBtn,
                  { backgroundColor: colors.surface, borderRadius: radius.xl },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
              >
                <View style={[styles.quickLogIcon, { backgroundColor: log.color + '15' }]}>
                  <Icon size={20} color={log.color} strokeWidth={2} />
                </View>
                <Text style={[styles.quickLogLabel, { color: colors.text }]}>{log.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      {/* ─── Bottom Sheets ────────────────────────────────────────────── */}

      <LogSheet visible={sheetType === 'feeding'} title="Log Feeding" onClose={() => setSheetType(null)}>
        <FeedingForm onSaved={handleSaved} />
      </LogSheet>

      <LogSheet visible={sheetType === 'sleep'} title="Log Sleep" onClose={() => setSheetType(null)}>
        <SleepForm onSaved={handleSaved} />
      </LogSheet>

      <LogSheet visible={sheetType === 'health'} title="Log Health Event" onClose={() => setSheetType(null)}>
        <HealthEventForm onSaved={handleSaved} />
      </LogSheet>

      <LogSheet visible={sheetType === 'mood'} title="Log Mood" onClose={() => setSheetType(null)}>
        <KidsMoodForm onSaved={handleSaved} />
      </LogSheet>

      <LogSheet visible={sheetType === 'memory'} title="Capture Memory" onClose={() => setSheetType(null)}>
        <MemoryForm onSaved={handleSaved} />
      </LogSheet>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },

  // Child selector
  childSelectorRow: { gap: 8, marginBottom: 12, paddingVertical: 4 },
  childSelectorChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1 },
  childSelectorText: { fontSize: 14, fontWeight: '600' },
  childDot: { width: 8, height: 8, borderRadius: 4 },

  // Toggle
  toggleRow: { flexDirection: 'row', padding: 4, marginBottom: 16 },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  toggleText: { fontSize: 14, fontWeight: '700' },

  // Month header
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 16 },
  chevron: { padding: 8 },
  monthLabel: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },

  // Calendar grid
  calendarWrap: { marginBottom: 16 },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  dayInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayNumber: { fontSize: 14, fontWeight: '600' },
  dotRow: { flexDirection: 'row', gap: 2 },
  logDot: { width: 4, height: 4, borderRadius: 2 },

  // List view
  listWrap: { gap: 8, marginBottom: 16 },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  listIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  listContent: { flex: 1, gap: 2 },
  listType: { fontSize: 14, fontWeight: '700' },
  listDetail: { fontSize: 13, fontWeight: '400' },
  listMeta: { alignItems: 'flex-end', gap: 2 },
  listTime: { fontSize: 12, fontWeight: '600' },
  listChild: { fontSize: 11, fontWeight: '500' },

  // Banner
  banner: { padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  bannerEvent: { fontSize: 17, fontWeight: '700' },
  bannerDate: { fontSize: 14, fontWeight: '500', marginTop: 2 },

  // Quick log grid
  quickLogGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickLogBtn: { width: '31%', flexGrow: 1, alignItems: 'center', paddingVertical: 16, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  quickLogIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  quickLogLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
})
