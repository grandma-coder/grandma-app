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
  Syringe, Thermometer, Pill, TrendingUp, Calendar,
  AlertTriangle, FileText, ChevronRight, Check, Star,
} from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { supabase } from '../../lib/supabase'
import { LogSheet } from '../../components/calendar/LogSheet'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { PillButton } from '../../components/ui/PillButton'
import { Display, MonoCaps, Body } from '../../components/ui/Typography'
import { ChildPill, childColor } from '../../components/ui/ChildPills'
import {
  Cross as CrossSticker,
  Heart as HeartSticker,
  Star as StarSticker,
  Drop as DropSticker,
  Flower as FlowerSticker,
} from '../../components/ui/Stickers'

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
  const { colors, font, stickers, isDark, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const children = useChildStore((s) => s.children)
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'

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
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader
          title="Health History"
          right={
            <Pressable onPress={() => setShowAddSheet(true)} hitSlop={10}>
              <View style={[styles.headerAddBtn, { backgroundColor: paper, borderColor: paperBorder }]}>
                <Ionicons name="add" size={20} color={colors.text} />
              </View>
            </Pressable>
          }
        />
      </View>

      {/* Child filter */}
      {children.length > 1 && (
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            <ChildPill
              label="All Kids"
              active={!filterChild}
              color={stickers.lilac}
              showDot={false}
              onPress={() => setFilterChild(null)}
            />
            {children.map((c, idx) => (
              <ChildPill
                key={c.id}
                label={c.name}
                active={filterChild === c.id}
                color={childColor(idx)}
                onPress={() => setFilterChild(filterChild === c.id ? null : c.id)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ─── Quick Stats ──────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard icon={Syringe} color={isDark ? stickers.green : '#3F5919'} bg={stickers.green} num={vaccines.length} label="Vaccines" onPress={() => setDetailSection('vaccine')} />
          <StatCard icon={Pill} color={isDark ? stickers.blue : '#1F4A7A'} bg={stickers.blue} num={medications.length} label="Meds" onPress={() => setDetailSection('medicine')} />
          <StatCard icon={Thermometer} color={isDark ? stickers.coral : '#B43E2E'} bg={stickers.coral} num={temperatures.length} label="Temps" onPress={() => setDetailSection('temperature')} />
          <StatCard icon={Star} color={isDark ? '#F0CE4C' : '#7C5E0F'} bg={stickers.yellow} num={milestones.length} label="Milestones" onPress={() => setDetailSection('milestone')} />
        </View>

        {/* ─── Vaccine Tracker ──────────────────────────────────────── */}
        <Pressable onPress={() => setDetailSection('vaccine')} style={[styles.sectionCard, { backgroundColor: paper, borderColor: paperBorder }]}>
          <SectionHeader icon={Syringe} color={isDark ? stickers.green : '#3F5919'} title="Vaccines" />
          {vaccines.length > 0 ? (
            <View style={styles.vaccineList}>
              {vaccines.slice(0, 3).map((v) => (
                <View key={v.id} style={styles.vaccineItem}>
                  <Check size={14} color={isDark ? stickers.green : '#3F5919'} strokeWidth={2.5} />
                  <Text style={[styles.vaccineText, { color: colors.text, fontFamily: font.bodyMedium }]}>{v.value}</Text>
                  <Text style={[styles.vaccineDate, { color: colors.textMuted, fontFamily: font.body }]}>{new Date(v.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</Text>
                </View>
              ))}
              {vaccines.length > 3 && (
                <View style={[styles.moreChip, { backgroundColor: stickers.green + (isDark ? '24' : '32'), borderColor: stickers.green + (isDark ? '40' : '60') }]}>
                  <Text style={[styles.moreChipText, { color: isDark ? stickers.green : '#3F5919', fontFamily: font.bodySemiBold }]}>+{vaccines.length - 3} more</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <CrossSticker size={28} />
              <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: font.body }]}>No vaccines logged yet. Tap + to add.</Text>
            </View>
          )}
          {/* Next recommended */}
          <View style={[styles.nextVaccine, { backgroundColor: stickers.green + (isDark ? '20' : '30') }]}>
            <Text style={[styles.nextLabel, { color: isDark ? stickers.green : '#3F5919', fontFamily: font.bodySemiBold }]}>Recommended Schedule</Text>
            <Text style={[styles.nextText, { color: colors.textSecondary, fontFamily: font.body }]}>
              {VACCINE_SCHEDULE.filter((v) => !givenVaccineNames.has(v.name)).slice(0, 2).map((v) => `${v.name} (${v.ages[0]})`).join(', ') || 'All up to date!'}
            </Text>
          </View>
        </Pressable>

        {/* ─── Medications ──────────────────────────────────────────── */}
        <Pressable onPress={() => setDetailSection('medicine')} style={[styles.sectionCard, { backgroundColor: paper, borderColor: paperBorder }]}>
          <SectionHeader icon={Pill} color={isDark ? stickers.blue : '#1F4A7A'} title="Medications" />
          {medications.length > 0 ? (
            medications.slice(0, 3).map((m) => (
              <View key={m.id} style={styles.medItem}>
                <View style={[styles.medDot, { backgroundColor: stickers.blue, borderColor: isDark ? colors.border : 'rgba(20,19,19,0.18)' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.medName, { color: colors.text, fontFamily: font.bodyMedium }]}>{m.value}</Text>
                  {m.notes ? <Text style={[styles.medNotes, { color: colors.textMuted, fontFamily: font.body }]} numberOfLines={1}>{m.notes}</Text> : null}
                </View>
                <Text style={[styles.medDate, { color: colors.textMuted, fontFamily: font.body }]}>{new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              </View>
            ))
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <DropSticker size={28} />
              <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: font.body }]}>No medications logged.</Text>
            </View>
          )}
          {/* Active meds from child profiles */}
          {children.some((c) => c.medications.length > 0) && (
            <View style={[styles.activeMeds, { backgroundColor: stickers.blue + (isDark ? '20' : '30') }]}>
              <Text style={[styles.nextLabel, { color: isDark ? stickers.blue : '#1F4A7A', fontFamily: font.bodySemiBold }]}>Current Medications</Text>
              {children.filter((c) => c.medications.length > 0).map((c) => (
                <Text key={c.id} style={[styles.nextText, { color: colors.textSecondary, fontFamily: font.body }]}>{c.name}: {c.medications.join(', ')}</Text>
              ))}
            </View>
          )}
        </Pressable>

        {/* ─── Growth ───────────────────────────────────────────────── */}
        <Pressable onPress={() => setDetailSection('growth')} style={[styles.sectionCard, { backgroundColor: paper, borderColor: paperBorder }]}>
          <SectionHeader icon={TrendingUp} color={isDark ? stickers.blue : '#1F4A7A'} title="Growth" />
          {growthEntries.length > 0 ? (
            <>
              {/* Separate weight + height lines */}
              {(() => {
                const weights = growthEntries.filter((g) => g.value.toLowerCase().includes('weight')).slice(0, 6).reverse()
                const heights = growthEntries.filter((g) => g.value.toLowerCase().includes('height')).slice(0, 6).reverse()
                const latestWeight = growthEntries.find((g) => g.value.toLowerCase().includes('weight'))
                const latestHeight = growthEntries.find((g) => g.value.toLowerCase().includes('height'))

                const wColor = isDark ? stickers.blue : '#1F4A7A'
                const hColor = isDark ? stickers.peach : '#A6532A'
                return (
                  <>
                    {/* Weight bars */}
                    {weights.length > 0 && (
                      <>
                        <Text style={[styles.chartSubtitle, { color: wColor, fontFamily: font.bodySemiBold }]}>Weight (kg)</Text>
                        <View style={styles.miniChart}>
                          {weights.map((g) => {
                            const num = parseFloat(g.value.replace(/[^0-9.]/g, '')) || 5
                            const h = Math.min(50, Math.max(10, (num / 20) * 50))
                            return (
                              <View key={g.id} style={styles.barCol}>
                                <Text style={[styles.barValue, { color: wColor, fontFamily: font.display }]}>{num}</Text>
                                <View style={[styles.bar, { height: h, backgroundColor: stickers.blue + (isDark ? '40' : '60'), borderColor: stickers.blue + (isDark ? '60' : '70'), borderTopLeftRadius: 8, borderTopRightRadius: 8 }]} />
                                <Text style={[styles.barLabel, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>{new Date(g.date).toLocaleDateString('en-US', { month: 'short' })}</Text>
                              </View>
                            )
                          })}
                        </View>
                      </>
                    )}
                    {/* Height bars */}
                    {heights.length > 0 && (
                      <>
                        <Text style={[styles.chartSubtitle, { color: hColor, fontFamily: font.bodySemiBold }]}>Height (cm)</Text>
                        <View style={styles.miniChart}>
                          {heights.map((g) => {
                            const num = parseFloat(g.value.replace(/[^0-9.]/g, '')) || 50
                            const h = Math.min(50, Math.max(10, (num / 120) * 50))
                            return (
                              <View key={g.id} style={styles.barCol}>
                                <Text style={[styles.barValue, { color: hColor, fontFamily: font.display }]}>{num}</Text>
                                <View style={[styles.bar, { height: h, backgroundColor: stickers.peach + (isDark ? '40' : '60'), borderColor: stickers.peach + (isDark ? '60' : '70'), borderTopLeftRadius: 8, borderTopRightRadius: 8 }]} />
                                <Text style={[styles.barLabel, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>{new Date(g.date).toLocaleDateString('en-US', { month: 'short' })}</Text>
                              </View>
                            )
                          })}
                        </View>
                      </>
                    )}
                    <Text style={[styles.lastMeasure, { color: colors.textSecondary, fontFamily: font.body }]}>
                      {latestWeight ? `Weight: ${latestWeight.value.replace(/weight:?\s*/i, '')}` : ''}
                      {latestWeight && latestHeight ? '  ·  ' : ''}
                      {latestHeight ? `Height: ${latestHeight.value.replace(/height:?\s*/i, '')}` : ''}
                    </Text>
                  </>
                )
              })()}
            </>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <FlowerSticker size={28} />
              <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: font.body }]}>No growth entries. Log weight and height to track progress.</Text>
            </View>
          )}
        </Pressable>

        {/* ─── Milestones ───────────────────────────────────────────── */}
        <Pressable onPress={() => setDetailSection('milestone')} style={[styles.sectionCard, { backgroundColor: paper, borderColor: paperBorder }]}>
          <SectionHeader icon={Star} color={isDark ? '#F0CE4C' : '#7C5E0F'} title="Milestones" />
          {milestones.length > 0 ? (
            <View style={styles.milestoneList}>
              {milestones.slice(0, 4).map((m) => (
                <View key={m.id} style={styles.milestoneItem}>
                  <View style={[styles.milestoneDot, { backgroundColor: stickers.yellow, borderColor: isDark ? colors.border : 'rgba(20,19,19,0.18)' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.milestoneText, { color: colors.text, fontFamily: font.bodySemiBold }]}>{m.value}</Text>
                    <Text style={[styles.milestoneDate, { color: colors.textMuted, fontFamily: font.body }]}>
                      {m.childName} · {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <StarSticker size={28} />
              <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: font.body }]}>No milestones yet. Celebrate every first!</Text>
            </View>
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
          <View style={[styles.sectionCard, { backgroundColor: paper, borderColor: paperBorder }]}>
            <SectionHeader icon={AlertTriangle} color={isDark ? stickers.coral : '#B43E2E'} title="Allergies & Alerts" showChevron={false} />
            {alertKids.map((c) => (
              <View key={c.id} style={styles.refChild}>
                <Text style={[styles.refChildName, { color: colors.text, fontFamily: font.display }]}>{c.name}</Text>
                {c.allergies.filter((a) => a && a.toLowerCase() !== 'no').length > 0 && (
                  <View style={styles.refChipRow}>
                    {c.allergies.filter((a) => a && a.toLowerCase() !== 'no').map((a) => (
                      <View key={a} style={[styles.refChip, { backgroundColor: stickers.coral + (isDark ? '28' : '32') }]}>
                        <Text style={[styles.refChipText, { color: isDark ? stickers.coral : '#B43E2E', fontFamily: font.bodySemiBold }]}>{a}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {c.medications.length > 0 && (
                  <View style={styles.refChipRow}>
                    {c.medications.map((m) => (
                      <View key={m} style={[styles.refChip, { backgroundColor: stickers.blue + (isDark ? '28' : '32') }]}>
                        <Pill size={10} color={isDark ? stickers.blue : '#1F4A7A'} strokeWidth={2} />
                        <Text style={[styles.refChipText, { color: isDark ? stickers.blue : '#1F4A7A', fontFamily: font.bodySemiBold }]}>{m}</Text>
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

// ─── Section Header ───────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, color, title, showChevron = true }: { icon: any; color: string; title: string; showChevron?: boolean }) {
  const { colors, font, isDark } = useTheme()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.18)'
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconBadge, { backgroundColor: paper, borderColor: paperBorder }]}>
        <Icon size={16} color={color} strokeWidth={2} />
      </View>
      <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: font.display }]}>{title}</Text>
      {showChevron ? <ChevronRight size={16} color={colors.textMuted} /> : null}
    </View>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, color, bg, num, label, onPress }: any) {
  const { colors, font, isDark } = useTheme()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.18)'
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCard,
        {
          backgroundColor: bg + (isDark ? '24' : '32'),
          borderColor: bg + (isDark ? '40' : '60'),
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.statIconBadge, { backgroundColor: paper, borderColor: paperBorder }]}>
        <Icon size={16} color={color} strokeWidth={2} />
      </View>
      <Text style={[styles.statNum, { color, fontFamily: font.display }]}>{num}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: font.bodySemiBold }]}>{label}</Text>
    </Pressable>
  )
}

// ─── Detail Popup ─────────────────────────────────────────────────────────

function DetailPopup({ section, events, onClose }: { section: string; events: HealthEvent[]; onClose: () => void }) {
  const { colors, font, stickers, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const cfg = TYPE_CFG[section] ?? { label: section, icon: FileText, color: colors.textMuted, placeholder: '' }
  const Icon = cfg.icon

  return (
    <Modal visible animationType="slide" presentationStyle="overFullScreen">
      <View style={[styles.detailRoot, { backgroundColor: colors.bg }]}>
        <View style={[styles.detailHeader, { paddingTop: insets.top + 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon size={20} color={cfg.color} strokeWidth={2} />
            <Display size={22} color={colors.text}>{cfg.label}</Display>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <View style={[styles.detailClose, { backgroundColor: paper, borderColor: paperBorder }]}>
              <Ionicons name="close" size={20} color={colors.text} />
            </View>
          </Pressable>
        </View>

        {/* Summary */}
        <View style={[styles.detailSummary, { backgroundColor: cfg.color + (isDark ? '20' : '20'), borderColor: cfg.color + '40', marginHorizontal: 20 }]}>
          <Text style={[styles.detailSummaryNum, { color: cfg.color, fontFamily: font.display }]}>{events.length}</Text>
          <Text style={[styles.detailSummaryLabel, { color: colors.textSecondary, fontFamily: font.bodyMedium }]}>total {cfg.label.toLowerCase()} entries</Text>
        </View>

        <ScrollView
          style={styles.detailScrollView}
          contentContainerStyle={styles.detailScroll}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {events.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textMuted, textAlign: 'center', marginTop: 40, fontFamily: font.body }]}>No {cfg.label.toLowerCase()} entries yet.</Text>
          )}
          {events.map((e) => (
            <View
              key={e.id}
              style={[styles.detailItem, {
                backgroundColor: paper,
                borderColor: paperBorder,
                borderLeftColor: cfg.color,
                borderLeftWidth: 3,
              }]}
            >
              <View style={styles.detailItemTop}>
                <Text style={[styles.detailItemValue, { color: colors.text, fontFamily: font.display }]}>{e.value}</Text>
                <View style={[styles.detailChildBadge, { backgroundColor: stickers.blue + (isDark ? '28' : '40') }]}>
                  <Text style={[styles.detailChildText, { color: isDark ? stickers.blue : '#1F4A7A', fontFamily: font.bodySemiBold }]}>{e.childName}</Text>
                </View>
              </View>
              {e.notes ? <Text style={[styles.detailItemNotes, { color: colors.textMuted, fontFamily: font.body }]}>{e.notes}</Text> : null}
              <Text style={[styles.detailItemDate, { color: colors.textMuted, fontFamily: font.body }]}>
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
  const { colors, font, stickers, isDark } = useTheme()
  const children = useChildStore((s) => s.children)
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'

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
          <MonoCaps color={colors.textMuted}>Type</MonoCaps>
          <View style={formStyles.typeGrid}>
            {ADD_TYPES.map((t) => {
              const active = eventType === t.id
              const tintBg = active ? (paper) : paper
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setEventType(t.id)}
                  style={[
                    formStyles.typeBtn,
                    {
                      backgroundColor: tintBg,
                      borderColor: active ? colors.text : paperBorder,
                      borderWidth: active ? 1.5 : 1,
                    },
                  ]}
                >
                  <t.icon size={20} color={active ? colors.text : colors.textMuted} strokeWidth={2} />
                  <Text style={[formStyles.typeLabel, { color: active ? colors.text : colors.textSecondary, fontFamily: active ? font.bodySemiBold : font.bodyMedium }]}>{t.label}</Text>
                </Pressable>
              )
            })}
          </View>

          {children.length > 1 && (
            <>
              <MonoCaps color={colors.textMuted}>Child</MonoCaps>
              <View style={formStyles.childRow}>
                {children.map((c, idx) => (
                  <ChildPill
                    key={c.id}
                    label={c.name}
                    active={selectedChild === c.id}
                    color={childColor(idx)}
                    onPress={() => setSelectedChild(c.id)}
                  />
                ))}
              </View>
            </>
          )}

          <MonoCaps color={colors.textMuted}>Date</MonoCaps>
          <Pressable
            onPress={() => setShowDatePicker(!showDatePicker)}
            style={[formStyles.dateBtn, { backgroundColor: paper, borderColor: paperBorder }]}
          >
            <Calendar size={16} color={colors.textMuted} strokeWidth={2} />
            <Text style={[formStyles.dateBtnText, { color: colors.text, fontFamily: font.body }]}>{eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={eventDate}
              mode="date"
              maximumDate={new Date()}
              minimumDate={new Date(2015, 0, 1)}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant={isDark ? 'dark' : 'light'}
              onChange={(_, d) => { if (Platform.OS === 'android') setShowDatePicker(false); if (d) setEventDate(d) }}
            />
          )}

          {eventType === 'growth' ? (
            <>
              <MonoCaps color={colors.textMuted}>Weight (kg)</MonoCaps>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="e.g. 10.5"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={[formStyles.input, { color: colors.text, backgroundColor: paper, borderColor: paperBorder, fontFamily: font.body }]}
              />
              <MonoCaps color={colors.textMuted}>Height (cm)</MonoCaps>
              <TextInput
                value={height}
                onChangeText={setHeight}
                placeholder="e.g. 78"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={[formStyles.input, { color: colors.text, backgroundColor: paper, borderColor: paperBorder, fontFamily: font.body }]}
              />
            </>
          ) : (
            <>
              <MonoCaps color={colors.textMuted}>Details</MonoCaps>
              <TextInput
                value={value}
                onChangeText={setValue}
                placeholder={selCfg?.placeholder ?? 'Describe…'}
                placeholderTextColor={colors.textMuted}
                style={[formStyles.input, { color: colors.text, backgroundColor: paper, borderColor: paperBorder, fontFamily: font.body }]}
              />
            </>
          )}

          <MonoCaps color={colors.textMuted}>Notes (optional)</MonoCaps>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional details…"
            placeholderTextColor={colors.textMuted}
            multiline
            style={[formStyles.inputMulti, { color: colors.text, backgroundColor: paper, borderColor: paperBorder, fontFamily: font.body }]}
          />

          <PillButton
            label={saving ? 'Saving…' : 'Save'}
            variant="ink"
            onPress={handleSave}
            disabled={saving}
            leading={<Ionicons name="save-outline" size={18} color={colors.bg} />}
            style={{ marginTop: 6 }}
          />
        </View>
      </ScrollView>
    </LogSheet>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { paddingHorizontal: 16, paddingBottom: 6 },
  headerAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterRow: { height: 44, marginBottom: 8 },
  filterContent: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderRadius: 999 },
  chipText: { fontSize: 13 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },

  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    gap: 6,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  statIconBadge: {
    width: 30, height: 30, borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  statNum: { fontSize: 28, letterSpacing: -0.5, lineHeight: 30 },
  statLabel: { fontSize: 11 },

  sectionCard: {
    padding: 18,
    gap: 12,
    borderRadius: 28,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIconBadge: {
    width: 32, height: 32, borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 20, flex: 1, letterSpacing: -0.3 },
  emptyText: { fontSize: 13, lineHeight: 18, flex: 1 },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },

  vaccineList: { gap: 8 },
  vaccineItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vaccineText: { fontSize: 14, flex: 1 },
  vaccineDate: { fontSize: 11 },
  nextVaccine: { padding: 12, marginTop: 4, borderRadius: 18 },
  nextLabel: { fontSize: 12, marginBottom: 4 },
  nextText: { fontSize: 13, lineHeight: 18 },
  moreChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1.5,
    marginTop: 4,
  },
  moreChipText: { fontSize: 12, letterSpacing: 0.2 },

  medItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  medDot: { width: 10, height: 10, borderRadius: 999, borderWidth: 1.5 },
  medName: { fontSize: 14 },
  medNotes: { fontSize: 12 },
  medDate: { fontSize: 11 },
  activeMeds: { padding: 12, marginTop: 4, borderRadius: 18 },

  chartSubtitle: { fontSize: 12, marginTop: 4 },
  miniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 70, paddingTop: 8 },
  barCol: { flex: 1, alignItems: 'center', gap: 2 },
  barValue: { fontSize: 10 },
  bar: { width: '100%' },
  barLabel: { fontSize: 10 },
  lastMeasure: { fontSize: 12, marginTop: 6 },

  milestoneList: { gap: 10 },
  milestoneItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  milestoneDot: { width: 12, height: 12, borderRadius: 999, borderWidth: 1.5, marginTop: 4 },
  milestoneText: { fontSize: 14 },
  milestoneDate: { fontSize: 11 },

  refChild: { gap: 6, marginTop: 6 },
  refChildName: { fontSize: 16 },
  refChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  refChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  refChipText: { fontSize: 11 },

  detailRoot: { flex: 1 },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  detailClose: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSummary: {
    alignItems: 'center',
    paddingVertical: 18,
    marginBottom: 12,
    borderRadius: 22,
    borderWidth: 1,
  },
  detailSummaryNum: { fontSize: 36, letterSpacing: -1 },
  detailSummaryLabel: { fontSize: 13 },
  detailScrollView: { flex: 1 },
  detailScroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  detailItem: {
    padding: 16,
    gap: 6,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  detailItemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  detailItemValue: { fontSize: 16, flex: 1, letterSpacing: -0.1 },
  detailChildBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  detailChildText: { fontSize: 10 },
  detailItemNotes: { fontSize: 13 },
  detailItemDate: { fontSize: 11, marginTop: 2 },
})

const formStyles = StyleSheet.create({
  form: { gap: 12, paddingBottom: 40 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    width: '31.5%',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
    borderRadius: 22,
  },
  typeLabel: { fontSize: 12 },
  childRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 999,
  },
  childText: { fontSize: 14 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    height: 64,
    borderWidth: 1,
    borderRadius: 999,
  },
  dateBtnText: { fontSize: 15 },
  input: { borderWidth: 1, paddingHorizontal: 24, height: 64, fontSize: 15, borderRadius: 999 },
  inputMulti: { borderWidth: 1, paddingHorizontal: 20, paddingVertical: 16, minHeight: 96, fontSize: 15, textAlignVertical: 'top', borderRadius: 28 },
})
