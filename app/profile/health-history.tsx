/**
 * Health History — Command Center Dashboard
 *
 * Sections: Next Vaccines, Medication Schedule, Growth Chart,
 * Milestones Timeline, Recent Events. Tap any section for detail popup.
 */

import { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  Dimensions,
  Modal,
  Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router, useFocusEffect } from 'expo-router'
import {
  ArrowLeft, Plus, Syringe, Thermometer, Pill, Stethoscope,
  TrendingUp, Baby, Calendar, Activity, AlertTriangle, FileText,
  Heart, ChevronDown, ChevronRight, Check, Save, X, Star,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { supabase } from '../../lib/supabase'
import { LogSheet } from '../../components/calendar/LogSheet'

const SCREEN_W = Dimensions.get('window').width

// ─── Types & Config ───────────────────────────────────────────────────────

interface HealthEvent {
  id: string; childId: string; childName: string
  date: string; type: string; value: string; notes: string
}

const TYPE_CFG: Record<string, { label: string; icon: typeof Syringe; color: string; placeholder: string }> = {
  vaccine:     { label: 'Vaccine',     icon: Syringe,     color: brand.success,        placeholder: 'e.g. MMR, DTaP, Hepatitis B' },
  medicine:    { label: 'Medicine',    icon: Pill,         color: brand.secondary,      placeholder: 'e.g. Ibuprofen 5ml, Amoxicillin' },
  temperature: { label: 'Temperature', icon: Thermometer, color: brand.error,           placeholder: 'e.g. 38.5°C / 101.3°F' },
  growth:      { label: 'Growth',      icon: TrendingUp,  color: brand.kids,            placeholder: 'e.g. Weight: 10.2kg, Height: 78cm' },
  milestone:   { label: 'Milestone',   icon: Star,        color: brand.accent,          placeholder: 'e.g. First steps, First word' },
  note:        { label: 'Health Note', icon: FileText,     color: brand.phase.luteal,   placeholder: 'e.g. Doctor visit, diagnosis' },
}

// Common vaccine schedule for reference
const VACCINE_SCHEDULE = [
  { name: 'Hepatitis B', ages: ['Birth', '1 month', '6 months'] },
  { name: 'DTaP', ages: ['2 months', '4 months', '6 months', '15-18 months', '4-6 years'] },
  { name: 'IPV (Polio)', ages: ['2 months', '4 months', '6-18 months', '4-6 years'] },
  { name: 'MMR', ages: ['12-15 months', '4-6 years'] },
  { name: 'Varicella', ages: ['12-15 months', '4-6 years'] },
  { name: 'Hib', ages: ['2 months', '4 months', '6 months', '12-15 months'] },
  { name: 'PCV13', ages: ['2 months', '4 months', '6 months', '12-15 months'] },
  { name: 'Rotavirus', ages: ['2 months', '4 months', '6 months'] },
  { name: 'Influenza', ages: ['6 months (yearly)'] },
  { name: 'Hepatitis A', ages: ['12-23 months'] },
]

// ─── Main Screen ──────────────────────────────────────────────────────────

export default function HealthHistoryScreen() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const children = useChildStore((s) => s.children)

  const [events, setEvents] = useState<HealthEvent[]>([])
  const [filterChild, setFilterChild] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Add sheet
  const [showAddSheet, setShowAddSheet] = useState(false)

  // Detail popup
  const [detailSection, setDetailSection] = useState<string | null>(null)

  useFocusEffect(useCallback(() => { loadEvents() }, []))

  async function loadEvents() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const childIds = children.map((c) => c.id)
    if (childIds.length === 0) { setEvents([]); setLoading(false); return }

    const { data } = await supabase
      .from('child_logs')
      .select('id, child_id, date, type, value, notes, created_at')
      .in('child_id', childIds)
      .in('type', ['vaccine', 'medicine', 'temperature', 'growth', 'milestone', 'note'])
      .order('date', { ascending: false })
      .limit(500)

    setEvents(((data ?? []) as any[]).map((log) => {
      const child = children.find((c) => c.id === log.child_id)
      return { id: log.id, childId: log.child_id, childName: child?.name ?? 'Child', date: log.date, type: log.type, value: log.value ?? '', notes: log.notes ?? '' }
    }))
    setLoading(false)
  }

  const filtered = filterChild ? events.filter((e) => e.childId === filterChild) : events

  // Section data
  const vaccines = filtered.filter((e) => e.type === 'vaccine')
  const medications = filtered.filter((e) => e.type === 'medicine')
  const growthEntries = filtered.filter((e) => e.type === 'growth')
  const milestones = filtered.filter((e) => e.type === 'milestone')
  const temperatures = filtered.filter((e) => e.type === 'temperature')
  const recentEvents = filtered.slice(0, 8)

  // Given vaccines for display
  const givenVaccineNames = new Set(vaccines.map((v) => v.value.split(/[,(]/)[0].trim()))

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Health History</Text>
        <Pressable onPress={() => setShowAddSheet(true)} style={styles.headerBtn}>
          <Plus size={22} color={colors.primary} />
        </Pressable>
      </View>

      {/* Child filter */}
      {children.length > 1 && (
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            <Pressable onPress={() => setFilterChild(null)} style={[styles.chip, { backgroundColor: !filterChild ? colors.primaryTint : colors.surface, borderColor: !filterChild ? colors.primary : colors.border, borderRadius: radius.full }]}>
              <Text style={[styles.chipText, { color: !filterChild ? colors.primary : colors.text }]}>All Kids</Text>
            </Pressable>
            {children.map((c) => (
              <Pressable key={c.id} onPress={() => setFilterChild(filterChild === c.id ? null : c.id)}
                style={[styles.chip, { backgroundColor: filterChild === c.id ? brand.kids + '15' : colors.surface, borderColor: filterChild === c.id ? brand.kids : colors.border, borderRadius: radius.full }]}
              >
                <Text style={[styles.chipText, { color: filterChild === c.id ? brand.kids : colors.text }]}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ─── Quick Stats ──────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard icon={Syringe} color={brand.success} num={vaccines.length} label="Vaccines" onPress={() => setDetailSection('vaccine')} />
          <StatCard icon={Pill} color={brand.secondary} num={medications.length} label="Meds" onPress={() => setDetailSection('medicine')} />
          <StatCard icon={Thermometer} color={brand.error} num={temperatures.length} label="Temps" onPress={() => setDetailSection('temperature')} />
          <StatCard icon={Star} color={brand.accent} num={milestones.length} label="Milestones" onPress={() => setDetailSection('milestone')} />
        </View>

        {/* ─── Vaccine Tracker ──────────────────────────────────────── */}
        <Pressable onPress={() => setDetailSection('vaccine')} style={[styles.sectionCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <View style={styles.sectionHeader}>
            <Syringe size={18} color={brand.success} strokeWidth={2} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Vaccines</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </View>
          {vaccines.length > 0 ? (
            <View style={styles.vaccineList}>
              {vaccines.slice(0, 3).map((v) => (
                <View key={v.id} style={styles.vaccineItem}>
                  <Check size={14} color={brand.success} strokeWidth={2.5} />
                  <Text style={[styles.vaccineText, { color: colors.text }]}>{v.value}</Text>
                  <Text style={[styles.vaccineDate, { color: colors.textMuted }]}>{new Date(v.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</Text>
                </View>
              ))}
              {vaccines.length > 3 && <Text style={[styles.moreText, { color: colors.primary }]}>+{vaccines.length - 3} more</Text>}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No vaccines logged yet. Tap + to add.</Text>
          )}
          {/* Next recommended */}
          <View style={[styles.nextVaccine, { backgroundColor: brand.success + '08', borderRadius: radius.lg }]}>
            <Text style={[styles.nextLabel, { color: brand.success }]}>Recommended Schedule</Text>
            <Text style={[styles.nextText, { color: colors.textSecondary }]}>
              {VACCINE_SCHEDULE.filter((v) => !givenVaccineNames.has(v.name)).slice(0, 2).map((v) => `${v.name} (${v.ages[0]})`).join(', ') || 'All up to date!'}
            </Text>
          </View>
        </Pressable>

        {/* ─── Medications ──────────────────────────────────────────── */}
        <Pressable onPress={() => setDetailSection('medicine')} style={[styles.sectionCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <View style={styles.sectionHeader}>
            <Pill size={18} color={brand.secondary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Medications</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </View>
          {medications.length > 0 ? (
            medications.slice(0, 3).map((m) => (
              <View key={m.id} style={styles.medItem}>
                <View style={[styles.medDot, { backgroundColor: brand.secondary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.medName, { color: colors.text }]}>{m.value}</Text>
                  {m.notes ? <Text style={[styles.medNotes, { color: colors.textMuted }]} numberOfLines={1}>{m.notes}</Text> : null}
                </View>
                <Text style={[styles.medDate, { color: colors.textMuted }]}>{new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No medications logged.</Text>
          )}
          {/* Active meds from child profiles */}
          {children.some((c) => c.medications.length > 0) && (
            <View style={[styles.activeMeds, { backgroundColor: brand.secondary + '08', borderRadius: radius.lg }]}>
              <Text style={[styles.nextLabel, { color: brand.secondary }]}>Current Medications</Text>
              {children.filter((c) => c.medications.length > 0).map((c) => (
                <Text key={c.id} style={[styles.nextText, { color: colors.textSecondary }]}>{c.name}: {c.medications.join(', ')}</Text>
              ))}
            </View>
          )}
        </Pressable>

        {/* ─── Growth ───────────────────────────────────────────────── */}
        <Pressable onPress={() => setDetailSection('growth')} style={[styles.sectionCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color={brand.kids} strokeWidth={2} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Growth</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </View>
          {growthEntries.length > 0 ? (
            <>
              {/* Separate weight + height lines */}
              {(() => {
                const weights = growthEntries.filter((g) => g.value.toLowerCase().includes('weight')).slice(0, 6).reverse()
                const heights = growthEntries.filter((g) => g.value.toLowerCase().includes('height')).slice(0, 6).reverse()
                const latestWeight = growthEntries.find((g) => g.value.toLowerCase().includes('weight'))
                const latestHeight = growthEntries.find((g) => g.value.toLowerCase().includes('height'))

                return (
                  <>
                    {/* Weight bars */}
                    {weights.length > 0 && (
                      <>
                        <Text style={[styles.chartSubtitle, { color: brand.kids }]}>Weight (kg)</Text>
                        <View style={styles.miniChart}>
                          {weights.map((g) => {
                            const num = parseFloat(g.value.replace(/[^0-9.]/g, '')) || 5
                            const h = Math.min(50, Math.max(10, (num / 20) * 50))
                            return (
                              <View key={g.id} style={styles.barCol}>
                                <Text style={[styles.barValue, { color: brand.kids }]}>{num}</Text>
                                <View style={[styles.bar, { height: h, backgroundColor: brand.kids + '40', borderRadius: 4 }]} />
                                <Text style={[styles.barLabel, { color: colors.textMuted }]}>{new Date(g.date).toLocaleDateString('en-US', { month: 'short' })}</Text>
                              </View>
                            )
                          })}
                        </View>
                      </>
                    )}
                    {/* Height bars */}
                    {heights.length > 0 && (
                      <>
                        <Text style={[styles.chartSubtitle, { color: brand.accent }]}>Height (cm)</Text>
                        <View style={styles.miniChart}>
                          {heights.map((g) => {
                            const num = parseFloat(g.value.replace(/[^0-9.]/g, '')) || 50
                            const h = Math.min(50, Math.max(10, (num / 120) * 50))
                            return (
                              <View key={g.id} style={styles.barCol}>
                                <Text style={[styles.barValue, { color: brand.accent }]}>{num}</Text>
                                <View style={[styles.bar, { height: h, backgroundColor: brand.accent + '40', borderRadius: 4 }]} />
                                <Text style={[styles.barLabel, { color: colors.textMuted }]}>{new Date(g.date).toLocaleDateString('en-US', { month: 'short' })}</Text>
                              </View>
                            )
                          })}
                        </View>
                      </>
                    )}
                    <Text style={[styles.lastMeasure, { color: colors.textSecondary }]}>
                      {latestWeight ? `Weight: ${latestWeight.value.replace(/weight:?\s*/i, '')}` : ''}
                      {latestWeight && latestHeight ? '  ·  ' : ''}
                      {latestHeight ? `Height: ${latestHeight.value.replace(/height:?\s*/i, '')}` : ''}
                    </Text>
                  </>
                )
              })()}
            </>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No growth entries. Log weight and height to track progress.</Text>
          )}
        </Pressable>

        {/* ─── Milestones ───────────────────────────────────────────── */}
        <Pressable onPress={() => setDetailSection('milestone')} style={[styles.sectionCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <View style={styles.sectionHeader}>
            <Star size={18} color={brand.accent} strokeWidth={2} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Milestones</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </View>
          {milestones.length > 0 ? (
            <View style={styles.milestoneList}>
              {milestones.slice(0, 4).map((m) => (
                <View key={m.id} style={styles.milestoneItem}>
                  <View style={[styles.milestoneDot, { backgroundColor: brand.accent }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.milestoneText, { color: colors.text }]}>{m.value}</Text>
                    <Text style={[styles.milestoneDate, { color: colors.textMuted }]}>
                      {m.childName} · {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No milestones yet. Celebrate every first!</Text>
          )}
        </Pressable>

        {/* ─── Quick Reference ──────────────────────────────────────── */}
        {(() => {
          const alertKids = (filterChild
            ? children.filter((c) => c.id === filterChild)
            : children
          ).filter((c) =>
            c.allergies.filter((a) => a && a.toLowerCase() !== 'no').length > 0 ||
            c.medications.length > 0
          )
          if (alertKids.length === 0) return null
          return (
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <View style={styles.sectionHeader}>
              <AlertTriangle size={18} color={brand.error} strokeWidth={2} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Allergies & Alerts</Text>
            </View>
            {alertKids.map((c) => (
              <View key={c.id} style={styles.refChild}>
                <Text style={[styles.refChildName, { color: colors.text }]}>{c.name}</Text>
                {c.allergies.filter((a) => a && a.toLowerCase() !== 'no').length > 0 && (
                  <View style={styles.refChipRow}>
                    {c.allergies.filter((a) => a && a.toLowerCase() !== 'no').map((a) => (
                      <View key={a} style={[styles.refChip, { backgroundColor: brand.error + '12', borderRadius: radius.full }]}>
                        <Text style={[styles.refChipText, { color: brand.error }]}>{a}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {c.medications.length > 0 && (
                  <View style={styles.refChipRow}>
                    {c.medications.map((m) => (
                      <View key={m} style={[styles.refChip, { backgroundColor: brand.secondary + '12', borderRadius: radius.full }]}>
                        <Pill size={10} color={brand.secondary} strokeWidth={2} />
                        <Text style={[styles.refChipText, { color: brand.secondary }]}>{m}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
          )
        })()}
      </ScrollView>

      {/* ─── Detail Popup ──────────────────────────────────────────── */}
      {detailSection && (
        <DetailPopup
          section={detailSection}
          events={filtered.filter((e) => e.type === detailSection)}
          onClose={() => setDetailSection(null)}
        />
      )}

      {/* ─── Add Sheet ─────────────────────────────────────────────── */}
      <AddHealthEventSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onSaved={() => { setShowAddSheet(false); loadEvents() }}
      />
    </View>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, color, num, label, onPress }: any) {
  const { colors, radius } = useTheme()
  return (
    <Pressable onPress={onPress} style={[styles.statCard, { backgroundColor: color + '10', borderRadius: radius.lg }]}>
      <Icon size={16} color={color} strokeWidth={2} />
      <Text style={[styles.statNum, { color }]}>{num}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </Pressable>
  )
}

// ─── Detail Popup ─────────────────────────────────────────────────────────

function DetailPopup({ section, events, onClose }: { section: string; events: HealthEvent[]; onClose: () => void }) {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const cfg = TYPE_CFG[section] ?? { label: section, icon: FileText, color: colors.textMuted }
  const Icon = cfg.icon

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.detailRoot, { backgroundColor: colors.bg }]}>
        <View style={[styles.detailHeader, { paddingTop: insets.top + 8 }]}>
          <Text style={[styles.detailTitle, { color: cfg.color }]}>
            <Icon size={20} color={cfg.color} strokeWidth={2} /> {cfg.label} History
          </Text>
          <Pressable onPress={onClose}><X size={24} color={colors.text} /></Pressable>
        </View>

        {/* Summary */}
        <View style={[styles.detailSummary, { backgroundColor: cfg.color + '10', borderRadius: radius.xl, marginHorizontal: 20 }]}>
          <Text style={[styles.detailSummaryNum, { color: cfg.color }]}>{events.length}</Text>
          <Text style={[styles.detailSummaryLabel, { color: colors.textSecondary }]}>total {cfg.label.toLowerCase()} entries</Text>
        </View>

        <ScrollView contentContainerStyle={styles.detailScroll}>
          {events.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textMuted, textAlign: 'center', marginTop: 40 }]}>No {cfg.label.toLowerCase()} entries yet.</Text>
          )}
          {events.map((e) => (
            <View key={e.id} style={[styles.detailItem, { backgroundColor: colors.surface, borderRadius: radius.lg, borderLeftColor: cfg.color, borderLeftWidth: 3 }]}>
              <View style={styles.detailItemTop}>
                <Text style={[styles.detailItemValue, { color: colors.text }]}>{e.value}</Text>
                <View style={[styles.detailChildBadge, { backgroundColor: brand.kids + '12', borderRadius: radius.full }]}>
                  <Text style={[styles.detailChildText, { color: brand.kids }]}>{e.childName}</Text>
                </View>
              </View>
              {e.notes ? <Text style={[styles.detailItemNotes, { color: colors.textMuted }]}>{e.notes}</Text> : null}
              <Text style={[styles.detailItemDate, { color: colors.textMuted }]}>
                {new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  )
}

// ─── Add Health Event Sheet ───────────────────────────────────────────────

const ADD_TYPES = Object.entries(TYPE_CFG).map(([id, cfg]) => ({ id, ...cfg }))

function AddHealthEventSheet({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)

  const [eventType, setEventType] = useState<string | null>(null)
  const [selectedChild, setSelectedChild] = useState(children.length === 1 ? children[0]?.id ?? '' : '')
  const [eventDate, setEventDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios')
  const [value, setValue] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  function reset() {
    setEventType(null); setSelectedChild(children.length === 1 ? children[0]?.id ?? '' : '')
    setEventDate(new Date()); setValue(''); setWeight(''); setHeight(''); setNotes('')
    setShowDatePicker(Platform.OS === 'ios')
  }

  async function handleSave() {
    if (!eventType) return Alert.alert('Missing Type', 'Please select a health event type (Vaccine, Medicine, etc.)')
    if (!selectedChild) return Alert.alert('Missing Child', 'Please select which child this is for.')

    // Growth: need at least weight or height
    if (eventType === 'growth') {
      if (!weight.trim() && !height.trim()) return Alert.alert('Missing Data', 'Please enter weight, height, or both.')
    } else {
      if (!value.trim()) return Alert.alert('Missing Details', `Please describe the ${TYPE_CFG[eventType]?.label.toLowerCase() ?? 'event'}.`)
    }

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const dateStr = eventDate.toISOString().split('T')[0]

      if (eventType === 'growth') {
        // Save weight and height as separate entries for independent chart lines
        const entries = []
        if (weight.trim()) {
          entries.push({
            child_id: selectedChild, user_id: session.user.id,
            date: dateStr, type: 'growth',
            value: `Weight: ${weight.trim()} kg`, notes: notes.trim() || null,
            logged_by: session.user.id,
          })
        }
        if (height.trim()) {
          entries.push({
            child_id: selectedChild, user_id: session.user.id,
            date: dateStr, type: 'growth',
            value: `Height: ${height.trim()} cm`, notes: notes.trim() || null,
            logged_by: session.user.id,
          })
        }
        const { error } = await supabase.from('child_logs').insert(entries)
        if (error) throw error
      } else {
        const { error } = await supabase.from('child_logs').insert({
          child_id: selectedChild, user_id: session.user.id,
          date: dateStr, type: eventType,
          value: value.trim(), notes: notes.trim() || null, logged_by: session.user.id,
        })
        if (error) throw error
      }

      reset(); onSaved()
    } catch (e: any) { Alert.alert('Error', e.message) }
    finally { setSaving(false) }
  }

  const selCfg = ADD_TYPES.find((t) => t.id === eventType)

  return (
    <LogSheet visible={visible} title="Log Health Event" onClose={() => { reset(); onClose() }}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={formStyles.form}>
          <Text style={[formStyles.label, { color: colors.textSecondary }]}>TYPE</Text>
          <View style={formStyles.typeGrid}>
            {ADD_TYPES.map((t) => {
              const active = eventType === t.id
              return (
                <Pressable key={t.id} onPress={() => setEventType(t.id)}
                  style={[formStyles.typeBtn, { backgroundColor: active ? t.color + '15' : colors.surface, borderColor: active ? t.color : colors.border, borderRadius: radius.lg }]}
                >
                  <t.icon size={18} color={active ? t.color : colors.textMuted} strokeWidth={2} />
                  <Text style={[formStyles.typeLabel, { color: active ? t.color : colors.text }]}>{t.label}</Text>
                </Pressable>
              )
            })}
          </View>

          {children.length > 1 && (
            <>
              <Text style={[formStyles.label, { color: colors.textSecondary }]}>CHILD</Text>
              <View style={formStyles.childRow}>
                {children.map((c) => {
                  const active = selectedChild === c.id
                  return (
                    <Pressable key={c.id} onPress={() => setSelectedChild(c.id)}
                      style={[formStyles.childChip, { backgroundColor: active ? brand.kids + '15' : colors.surface, borderColor: active ? brand.kids : colors.border, borderRadius: radius.full }]}
                    >
                      {active && <Check size={12} color={brand.kids} strokeWidth={3} />}
                      <Text style={[formStyles.childText, { color: active ? brand.kids : colors.text }]}>{c.name}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </>
          )}

          <Text style={[formStyles.label, { color: colors.textSecondary }]}>DATE</Text>
          <Pressable onPress={() => setShowDatePicker(!showDatePicker)} style={[formStyles.dateBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
            <Calendar size={16} color={colors.textMuted} strokeWidth={2} />
            <Text style={[formStyles.dateBtnText, { color: colors.text }]}>{eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker value={eventDate} mode="date" maximumDate={new Date()} minimumDate={new Date(2015, 0, 1)}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'} themeVariant="light"
              onChange={(_, d) => { if (Platform.OS === 'android') setShowDatePicker(false); if (d) setEventDate(d) }}
            />
          )}

          {/* Growth: separate weight + height fields */}
          {eventType === 'growth' ? (
            <>
              <Text style={[formStyles.label, { color: colors.textSecondary }]}>WEIGHT (KG)</Text>
              <TextInput value={weight} onChangeText={setWeight} placeholder="e.g. 10.5" placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={[formStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
              />
              <Text style={[formStyles.label, { color: colors.textSecondary }]}>HEIGHT (CM)</Text>
              <TextInput value={height} onChangeText={setHeight} placeholder="e.g. 78" placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={[formStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
              />
            </>
          ) : (
            <>
              <Text style={[formStyles.label, { color: colors.textSecondary }]}>{selCfg?.label?.toUpperCase() ?? 'DETAILS'}</Text>
              <TextInput value={value} onChangeText={setValue} placeholder={selCfg?.placeholder ?? 'Describe...'} placeholderTextColor={colors.textMuted}
                style={[formStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
              />
            </>
          )}

          <Text style={[formStyles.label, { color: colors.textSecondary }]}>NOTES (OPTIONAL)</Text>
          <TextInput value={notes} onChangeText={setNotes} placeholder="Additional details..." placeholderTextColor={colors.textMuted} multiline
            style={[formStyles.inputMulti, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
          />

          <Pressable onPress={handleSave} disabled={saving}
            style={({ pressed }) => [formStyles.saveBtn, { backgroundColor: colors.primary, borderRadius: radius.lg, opacity: saving ? 0.5 : 1 }, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <Save size={18} color="#FFF" strokeWidth={2} />
            <Text style={formStyles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LogSheet>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  headerBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  filterRow: { height: 40, marginBottom: 8 },
  filterContent: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },

  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 2 },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600' },

  // Section cards
  sectionCard: { padding: 16, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  emptyText: { fontSize: 13, fontWeight: '500', lineHeight: 18 },

  // Vaccines
  vaccineList: { gap: 6 },
  vaccineItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vaccineText: { fontSize: 14, fontWeight: '600', flex: 1 },
  vaccineDate: { fontSize: 11, fontWeight: '500' },
  nextVaccine: { padding: 10, marginTop: 4 },
  nextLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  nextText: { fontSize: 12, fontWeight: '500', lineHeight: 17 },
  moreText: { fontSize: 12, fontWeight: '600', marginTop: 4 },

  // Medications
  medItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  medDot: { width: 6, height: 6, borderRadius: 3 },
  medName: { fontSize: 14, fontWeight: '600' },
  medNotes: { fontSize: 12, fontWeight: '400' },
  medDate: { fontSize: 11, fontWeight: '500' },
  activeMeds: { padding: 10, marginTop: 4 },

  // Growth mini chart
  chartSubtitle: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  miniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 70, paddingTop: 8 },
  barCol: { flex: 1, alignItems: 'center', gap: 2 },
  barValue: { fontSize: 9, fontWeight: '700' },
  bar: { width: '100%' },
  barLabel: { fontSize: 9, fontWeight: '600' },
  lastMeasure: { fontSize: 12, fontWeight: '500', marginTop: 6 },

  // Milestones
  milestoneList: { gap: 8 },
  milestoneItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  milestoneDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  milestoneText: { fontSize: 14, fontWeight: '600' },
  milestoneDate: { fontSize: 11, fontWeight: '500' },

  // Quick Reference
  refChild: { gap: 6, marginTop: 4 },
  refChildName: { fontSize: 14, fontWeight: '700' },
  refChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  refChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4 },
  refChipText: { fontSize: 11, fontWeight: '600' },

  // Detail popup
  detailRoot: { flex: 1 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  detailTitle: { fontSize: 20, fontWeight: '700' },
  detailSummary: { alignItems: 'center', paddingVertical: 16, marginBottom: 12 },
  detailSummaryNum: { fontSize: 32, fontWeight: '800' },
  detailSummaryLabel: { fontSize: 13, fontWeight: '500' },
  detailScroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 8 },
  detailItem: { padding: 14, gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  detailItemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailItemValue: { fontSize: 15, fontWeight: '700', flex: 1 },
  detailChildBadge: { paddingHorizontal: 8, paddingVertical: 2 },
  detailChildText: { fontSize: 10, fontWeight: '600' },
  detailItemNotes: { fontSize: 13, fontWeight: '400' },
  detailItemDate: { fontSize: 11, fontWeight: '500', marginTop: 2 },
})

const formStyles = StyleSheet.create({
  form: { gap: 14, paddingBottom: 40 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { width: '31%', alignItems: 'center', paddingVertical: 14, gap: 6, borderWidth: 1 },
  typeLabel: { fontSize: 11, fontWeight: '700' },
  childRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1 },
  childText: { fontSize: 14, fontWeight: '600' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 48, borderWidth: 1 },
  dateBtnText: { fontSize: 15, fontWeight: '500' },
  input: { borderWidth: 1, paddingHorizontal: 16, height: 48, fontSize: 15, fontWeight: '500' },
  inputMulti: { borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, minHeight: 70, fontSize: 15, fontWeight: '500', textAlignVertical: 'top' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, marginTop: 4 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
})
