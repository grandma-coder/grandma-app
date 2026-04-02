import { useState, useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useChildStore } from '../../store/useChildStore'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { CalendarView } from '../../components/agenda/CalendarView'
import { ActivityTimeline, type TimelineEntry } from '../../components/agenda/ActivityTimeline'
import { FoodDashboard } from '../../components/agenda/FoodDashboard'
import { NannyNotesPanel } from '../../components/agenda/NannyNotesPanel'
import { colors, typography, spacing } from '../../constants/theme'

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Tab = 'timeline' | 'food' | 'notes'

export default function Agenda() {
  const insets = useSafeAreaInsets()
  const child = useChildStore((s) => s.activeChild)
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [activeTab, setActiveTab] = useState<Tab>('timeline')

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['activity_logs', child?.id, selectedDate],
    queryFn: async () => {
      if (!child?.id) return []
      const startOfDay = `${selectedDate}T00:00:00.000Z`
      const endOfDay = `${selectedDate}T23:59:59.999Z`

      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('child_id', child.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false })
        .limit(50)

      return (data ?? []).map((e: any): TimelineEntry => ({
        id: e.id,
        activityType: e.activity_type,
        value: e.value ?? '',
        notes: e.notes ?? '',
        createdAt: e.created_at,
      }))
    },
    enabled: !!child?.id,
  })

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'timeline', label: 'Timeline', icon: 'time-outline' },
    { id: 'food', label: 'Food', icon: 'restaurant-outline' },
    { id: 'notes', label: 'Notes', icon: 'document-text-outline' },
  ]

  return (
    <CosmicBackground>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Agenda</Text>
        <Text style={styles.subtitle}>
          {child ? `${child.name}'s daily log` : 'Calendar & tracking'}
        </Text>

        {/* Calendar */}
        <CalendarView
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {/* Sub-tabs */}
        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={activeTab === tab.id ? colors.accent : colors.textTertiary}
              />
              <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab content */}
        {activeTab === 'timeline' && (
          <ActivityTimeline entries={entries} loading={isLoading} />
        )}

        {activeTab === 'food' && (
          <FoodDashboard />
        )}

        {activeTab === 'notes' && (
          <NannyNotesPanel
            notes={[]}
            userRole={child?.caregiverRole ?? 'parent'}
          />
        )}
      </ScrollView>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing['2xl'],
  },
  title: {
    ...typography.heading,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodySecondary,
    marginBottom: 20,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  tabLabelActive: {
    color: colors.accent,
  },
})
