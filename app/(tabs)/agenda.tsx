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
import { colors, typography, spacing, THEME_COLORS, shadows, borderRadius } from '../../constants/theme'

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

  const hasEntries = entries.length > 0

  return (
    <CosmicBackground>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Agenda</Text>
            <Text style={styles.subtitle}>
              {child ? `${child.name}'s daily log` : 'Calendar & tracking'}
            </Text>
          </View>
          <View style={styles.calendarIconBox}>
            <Ionicons name="calendar" size={24} color={THEME_COLORS.yellow} />
          </View>
        </View>

        {/* Calendar */}
        <View style={{ marginBottom: 20 }}>
          <CalendarView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </View>

        {/* Filter pills */}
        <View style={styles.tabRow}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tab,
                  isActive && styles.tabActive,
                ]}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={18}
                  color={isActive ? '#0A0A0A' : colors.textTertiary}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Tab content */}
        {activeTab === 'timeline' && (
          hasEntries || isLoading ? (
            <ActivityTimeline entries={entries} loading={isLoading} />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="skull-outline" size={48} color={THEME_COLORS.blue} />
              </View>
              <Text style={styles.emptyTitle}>
                No activity <Text style={{ color: THEME_COLORS.pink }}>today</Text>
              </Text>
              <Text style={styles.emptyDesc}>
                Nothing has been logged yet. Check back later or add a new entry.
              </Text>
              <Pressable style={styles.refreshButton}>
                <Ionicons name="refresh" size={16} color={colors.textSecondary} />
                <Text style={styles.refreshText}>Refresh View</Text>
              </Pressable>
            </View>
          )
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

        {/* Quick Insight card */}
        <Pressable style={styles.insightCard}>
          <View style={styles.insightIconBox}>
            <Ionicons name="sparkles" size={24} color={THEME_COLORS.pink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightTitle}>Log Food</Text>
            <Text style={styles.insightSubtitle}>Get AI-powered nutrition tips</Text>
          </View>
          <View style={styles.insightChevron}>
            <Ionicons name="chevron-forward" size={18} color={THEME_COLORS.pink} />
          </View>
        </Pressable>
      </ScrollView>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing['2xl'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: -1,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodySecondary,
  },
  calendarIconBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 24,
    backgroundColor: colors.surfaceGlass,
  },
  tabActive: {
    backgroundColor: THEME_COLORS.yellow,
    ...shadows.glow,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  tabLabelActive: {
    color: '#0A0A0A',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconBox: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(77, 150, 255, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 24,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  // Quick Insight card
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.lg,
    padding: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightIconBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 138, 216, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  insightSubtitle: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  insightChevron: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 138, 216, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
