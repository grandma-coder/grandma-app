import { useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useChildStore } from '../../store/useChildStore'
import { useModeStore } from '../../store/useModeStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { getModeConfig } from '../../lib/modeConfig'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { CalendarView, type CalendarViewMode, type ActivityDot } from '../../components/agenda/CalendarView'
import { ActivityTimeline, type TimelineEntry } from '../../components/agenda/ActivityTimeline'
import { FoodDashboard } from '../../components/agenda/FoodDashboard'
import { NotesPanel, type NoteEntry } from '../../components/agenda/NannyNotesPanel'
import { CycleTracker } from '../../components/agenda/CycleTracker'
import { PrePregChecklist } from '../../components/agenda/PrePregChecklist'
import { AppointmentList, type AppointmentEntry } from '../../components/agenda/AppointmentList'
import { SymptomLogger } from '../../components/agenda/SymptomLogger'
import { KickCounter } from '../../components/agenda/KickCounter'
import { ContractionTimer } from '../../components/agenda/ContractionTimer'
import { colors, THEME_COLORS, shadows, borderRadius, spacing, typography } from '../../constants/theme'

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const ACTIVITY_COLORS: Record<string, string> = {
  feeding: THEME_COLORS.pink,
  sleep: THEME_COLORS.blue,
  diaper: THEME_COLORS.yellow,
  mood: THEME_COLORS.green,
  growth: THEME_COLORS.purple,
  medicine: THEME_COLORS.orange,
  vaccines: THEME_COLORS.pink,
  milestones: THEME_COLORS.blue,
  food: THEME_COLORS.green,
}

const NOTE_COLORS: Record<string, string> = {
  food: THEME_COLORS.green,
  vaccine: THEME_COLORS.pink,
  activity: THEME_COLORS.blue,
  health: THEME_COLORS.orange,
  reminder: THEME_COLORS.yellow,
  general: THEME_COLORS.purple,
}

// Pre-pregnancy checklist items (static)
const PREP_CHECKLIST = [
  { id: 'folic_acid', title: 'Start Folic Acid', description: 'Take 400mcg daily at least 1-3 months before conceiving', category: 'health' },
  { id: 'prenatal_vitamins', title: 'Prenatal Vitamins', description: 'Start a complete prenatal vitamin with iron and DHA', category: 'health' },
  { id: 'ob_visit', title: 'Pre-Conception Checkup', description: 'Schedule a visit with your OB/GYN for a full assessment', category: 'health' },
  { id: 'dental', title: 'Dental Checkup', description: 'Complete dental work before pregnancy (hormones worsen gum disease)', category: 'health' },
  { id: 'track_cycle', title: 'Track Your Cycle', description: 'Start tracking periods and ovulation signs for 2-3 months', category: 'fertility' },
  { id: 'partner_checkup', title: 'Partner Health Check', description: 'Both partners should get a pre-conception checkup', category: 'fertility' },
  { id: 'quit_smoking', title: 'Quit Smoking & Limit Alcohol', description: 'Stop smoking and reduce alcohol intake for both partners', category: 'lifestyle' },
  { id: 'exercise', title: 'Start Regular Exercise', description: 'Build a consistent exercise routine to prepare your body', category: 'lifestyle' },
  { id: 'insurance', title: 'Review Insurance Coverage', description: 'Check maternity benefits, deductibles, and pediatrician networks', category: 'financial' },
  { id: 'savings', title: 'Start Baby Fund', description: 'Begin saving for the first year (diapers, gear, childcare, etc.)', category: 'financial' },
]

export default function Agenda() {
  const insets = useSafeAreaInsets()
  const child = useChildStore((s) => s.activeChild)
  const mode = useModeStore((s) => s.mode)
  const weekNumber = useJourneyStore((s) => s.weekNumber)
  const modeConfig = getModeConfig(mode)
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [activeTab, setActiveTab] = useState(modeConfig.agendaTabs[0]?.id ?? 'timeline')
  const [calendarView, setCalendarView] = useState<CalendarViewMode>('month')
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({})

  // Reset active tab when mode changes
  const tabs = modeConfig.agendaTabs
  if (!tabs.find((t) => t.id === activeTab)) {
    // This will trigger on next render
  }

  // ─── KIDS MODE: Load activity logs for selected date ─────
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
    enabled: !!child?.id && mode === 'kids',
  })

  // ─── KIDS MODE: Load notes ─────
  const { data: notes = [] } = useQuery({
    queryKey: ['notes', child?.id],
    queryFn: async (): Promise<NoteEntry[]> => {
      if (!child?.id) return []
      const { data } = await supabase
        .from('nanny_notes')
        .select('*')
        .eq('child_id', child.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (!data) return []
      return data.map((n: any) => ({
        id: n.id,
        authorName: n.author_name ?? 'You',
        authorRole: n.author_role ?? 'parent',
        topic: n.category ?? 'general',
        content: n.content,
        createdAt: n.created_at,
      }))
    },
    enabled: !!child?.id && mode === 'kids',
  })

  // ─── Load dots for the whole month ─────
  const currentMonth = selectedDate.substring(0, 7)
  const { data: monthDots = [] } = useQuery({
    queryKey: ['month_dots', child?.id, currentMonth, mode],
    queryFn: async (): Promise<ActivityDot[]> => {
      if (mode !== 'kids' || !child?.id) return []
      const startOfMonth = `${currentMonth}-01T00:00:00.000Z`
      const endOfMonth = `${currentMonth}-31T23:59:59.999Z`

      const { data: activities } = await supabase
        .from('activity_logs')
        .select('activity_type, created_at')
        .eq('child_id', child.id)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth)

      const { data: monthNotes } = await supabase
        .from('nanny_notes')
        .select('category, created_at')
        .eq('child_id', child.id)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth)

      const dots: ActivityDot[] = []
      ;(activities ?? []).forEach((a: any) => {
        dots.push({
          date: a.created_at.substring(0, 10),
          color: ACTIVITY_COLORS[a.activity_type] ?? THEME_COLORS.blue,
          type: a.activity_type,
        })
      })
      ;(monthNotes ?? []).forEach((n: any) => {
        dots.push({
          date: n.created_at.substring(0, 10),
          color: NOTE_COLORS[n.category] ?? THEME_COLORS.purple,
          type: `note:${n.category}`,
        })
      })
      return dots
    },
    enabled: !!child?.id && mode === 'kids',
  })

  // ─── KIDS MODE: Add note handler ─────
  const handleAddNote = useCallback(async (content: string, topic: string) => {
    if (!child?.id) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const { error } = await supabase.from('nanny_notes').insert({
        child_id: child.id,
        author_id: user.id,
        direction: child.caregiverRole === 'parent' ? 'parent_to_nanny' : 'nanny_to_parent',
        category: topic,
        content,
      })
      if (error) console.warn('nanny_notes insert failed:', error.message)

      const newNote: NoteEntry = {
        id: Date.now().toString(),
        authorName: user.email?.split('@')[0] ?? 'You',
        authorRole: child.caregiverRole ?? 'parent',
        topic,
        content,
        createdAt: new Date().toISOString(),
      }
      queryClient.setQueryData<NoteEntry[]>(
        ['notes', child.id],
        (old = []) => [newNote, ...old]
      )
      queryClient.invalidateQueries({ queryKey: ['month_dots', child.id, currentMonth] })
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
  }, [child?.id, child?.caregiverRole, currentMonth, queryClient])

  // ─── Header title per mode ─────
  const headerTitle = mode === 'pre-pregnancy' ? 'Planner' : mode === 'pregnancy' ? 'Calendar' : 'Agenda'
  const headerSubtitle = mode === 'pre-pregnancy'
    ? 'Your conception preparation'
    : mode === 'pregnancy'
      ? weekNumber ? `Week ${weekNumber} tracking` : 'Pregnancy tracking'
      : child ? `${child.name}'s daily log` : 'Calendar & tracking'

  const hasEntries = entries.length > 0
  const noteCount = notes.length

  // Checklist items with state
  const checklistItems = PREP_CHECKLIST.map((item) => ({
    ...item,
    completed: checklistState[item.id] ?? false,
  }))

  return (
    <CosmicBackground>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{headerTitle}</Text>
            <Text style={styles.subtitle}>{headerSubtitle}</Text>
          </View>
          <View style={styles.calendarIconBox}>
            <Ionicons name="calendar" size={24} color={THEME_COLORS.yellow} />
          </View>
        </View>

        {/* Calendar */}
        <CalendarView
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          activityDots={monthDots}
          viewMode={calendarView}
          onViewModeChange={setCalendarView}
        />

        {/* Tab pills — dynamic per mode */}
        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            // Show kick counter only after week 28
            if (tab.id === 'kicks' && mode === 'pregnancy' && (weekNumber ?? 0) < 28) return null
            const badgeCount = tab.id === 'notes' ? noteCount : 0
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tab, isActive && styles.tabActive]}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={18}
                  color={isActive ? '#1A1030' : colors.textTertiary}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {badgeCount > 0 && (
                  <View style={[styles.badge, isActive && styles.badgeActive]}>
                    <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                      {badgeCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>

        {/* ═══════ PRE-PREGNANCY CONTENT ═══════ */}
        {mode === 'pre-pregnancy' && activeTab === 'cycle' && (
          <CycleTracker selectedDate={selectedDate} />
        )}
        {mode === 'pre-pregnancy' && activeTab === 'checklist' && (
          <PrePregChecklist
            items={checklistItems}
            onToggle={(id) => setChecklistState((prev) => ({ ...prev, [id]: !prev[id] }))}
          />
        )}
        {mode === 'pre-pregnancy' && activeTab === 'appointments' && (
          <AppointmentList appointments={[]} selectedDate={selectedDate} />
        )}

        {/* ═══════ PREGNANCY CONTENT ═══════ */}
        {mode === 'pregnancy' && activeTab === 'timeline' && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="calendar-outline" size={48} color={THEME_COLORS.blue} />
            </View>
            <Text style={styles.emptyTitle}>
              Pregnancy <Text style={{ color: THEME_COLORS.pink }}>Timeline</Text>
            </Text>
            <Text style={styles.emptyDesc}>
              Your appointments, symptoms, and weight entries for {selectedDate} will appear here.
            </Text>
          </View>
        )}
        {mode === 'pregnancy' && activeTab === 'symptoms' && (
          <SymptomLogger selectedDate={selectedDate} />
        )}
        {mode === 'pregnancy' && activeTab === 'kicks' && (
          <KickCounter />
        )}

        {/* ═══════ KIDS CONTENT ═══════ */}
        {mode === 'kids' && activeTab === 'timeline' && (
          hasEntries || isLoading ? (
            <ActivityTimeline entries={entries} loading={isLoading} />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="calendar-outline" size={48} color={THEME_COLORS.blue} />
              </View>
              <Text style={styles.emptyTitle}>
                No activity <Text style={{ color: THEME_COLORS.pink }}>today</Text>
              </Text>
              <Text style={styles.emptyDesc}>
                Activities logged by you or caregivers appear here. Each activity type has its own color.
              </Text>
            </View>
          )
        )}
        {mode === 'kids' && activeTab === 'food' && <FoodDashboard />}
        {mode === 'kids' && activeTab === 'notes' && (
          <NotesPanel notes={notes} onAddNote={handleAddNote} />
        )}

        {/* Quick Insight — only in kids mode */}
        {mode === 'kids' && (
          <Pressable style={styles.insightCard} onPress={() => setActiveTab('food')}>
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
        )}

        {/* Contraction timer — pregnancy mode, week >= 36 */}
        {mode === 'pregnancy' && (weekNumber ?? 0) >= 36 && activeTab === 'kicks' && (
          <View style={{ marginTop: 24 }}>
            <ContractionTimer />
          </View>
        )}
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
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Tab pills
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: THEME_COLORS.yellow,
    borderColor: THEME_COLORS.yellow,
    ...shadows.glow,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: '#1A1030',
  },

  // Badge
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: THEME_COLORS.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeActive: {
    backgroundColor: '#1A1030',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1A1030',
  },
  badgeTextActive: {
    color: THEME_COLORS.yellow,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconBox: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(77, 150, 255, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  emptyDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },

  // Quick Insight card
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.lg,
    padding: 20,
    marginTop: 20,
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
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
  },
  insightSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textTertiary,
    marginTop: 2,
  },
  insightChevron: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
