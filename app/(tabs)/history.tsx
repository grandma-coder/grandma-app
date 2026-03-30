import { useState, useMemo } from 'react'
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useChildStore } from '../../store/useChildStore'

interface ActivityEntry {
  id: string
  activity_type: string
  value: string | null
  notes: string | null
  created_at: string
}

const ACTIVITY_ICONS: Record<string, string> = {
  feeding: '🍼',
  sleep: '😴',
  diaper: '🧷',
  mood: '😊',
  growth: '📏',
  medicine: '💊',
  vaccines: '💉',
  milestones: '⭐',
  symptoms: '🤢',
  appointments: '🏥',
  weight: '⚖️',
  nutrition: '🥗',
}

const ACTIVITY_COLORS: Record<string, string> = {
  feeding: '#FDE8F0',
  sleep: '#E1F5EE',
  diaper: '#FAEEDA',
  mood: '#E8F5E9',
  growth: '#E6F1FB',
  medicine: '#EEEDFE',
  vaccines: '#EEEDFE',
  milestones: '#FAEEDA',
  symptoms: '#FDE8F0',
  appointments: '#E6F1FB',
  weight: '#E1F5EE',
  nutrition: '#FAEEDA',
}

function getWeekDays(selectedDate: Date): { label: string; date: Date; key: string }[] {
  const start = new Date(selectedDate)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return {
      label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      date: d,
      key: d.toISOString().split('T')[0],
    }
  })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function History() {
  const child = useChildStore((s) => s.activeChild)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const dateStr = toDateString(selectedDate)
  const weekDays = useMemo(() => getWeekDays(selectedDate), [dateStr])

  const { data: entries, isLoading } = useQuery({
    queryKey: ['activity_logs', child?.id, dateStr],
    queryFn: async () => {
      if (!child?.id) return []
      const startOfDay = `${dateStr}T00:00:00`
      const endOfDay = `${dateStr}T23:59:59`
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, activity_type, value, notes, created_at')
        .eq('child_id', child.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ActivityEntry[]
    },
    enabled: !!child?.id,
  })

  const todayStr = toDateString(new Date())

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{child?.name ?? 'History'}</Text>
        <Text style={styles.dateLabel}>
          {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      {/* Week strip */}
      <View style={styles.weekStrip}>
        {weekDays.map((day) => {
          const isSelected = day.key === dateStr
          const isToday = day.key === todayStr
          return (
            <Pressable
              key={day.key}
              onPress={() => setSelectedDate(day.date)}
              style={[styles.dayPill, isSelected && styles.dayPillSelected]}
            >
              <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                {day.label}
              </Text>
              <Text style={[
                styles.dayNumber,
                isSelected && styles.dayNumberSelected,
                isToday && !isSelected && styles.dayNumberToday,
              ]}>
                {day.date.getDate()}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Feed */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7BAE8E" />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.feed}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={40} color="#E8E4DC" />
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptySubtitle}>Start tracking today</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.entryRow}>
              <View style={[styles.entryIcon, { backgroundColor: ACTIVITY_COLORS[item.activity_type] ?? '#F5F5F5' }]}>
                <Text style={styles.entryEmoji}>
                  {ACTIVITY_ICONS[item.activity_type] ?? '📝'}
                </Text>
              </View>
              <View style={styles.entryContent}>
                <Text style={styles.entryType}>
                  {item.activity_type.charAt(0).toUpperCase() + item.activity_type.slice(1)}
                </Text>
                <Text style={styles.entryMeta}>
                  {formatTime(item.created_at)}
                  {item.value ? ` · ${item.value}` : ''}
                  {item.notes ? ` · ${item.notes}` : ''}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F4',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 14,
    color: '#888888',
  },
  weekStrip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 16,
    gap: 4,
  },
  dayPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 20,
  },
  dayPillSelected: {
    backgroundColor: '#1A1A2E',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 4,
  },
  dayLabelSelected: {
    color: '#FFFFFF',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  dayNumberSelected: {
    color: '#FFFFFF',
  },
  dayNumberToday: {
    color: '#7BAE8E',
  },
  feed: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E4DC',
    marginBottom: 8,
  },
  entryIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryEmoji: {
    fontSize: 20,
  },
  entryContent: {
    flex: 1,
  },
  entryType: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  entryMeta: {
    fontSize: 12,
    color: '#888888',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888888',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#CCCCCC',
  },
})
