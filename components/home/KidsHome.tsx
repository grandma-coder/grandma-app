/**
 * Kids Home — Clean Command Center
 *
 * Focus: daily food tracker, today's summary, health at a glance.
 * No mock data — shows real child info or empty states.
 */

import { useState, useEffect } from 'react'
import {
  View, Text, Pressable, ScrollView, StyleSheet, Dimensions,
} from 'react-native'
import { router } from 'expo-router'
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg'
import {
  Utensils, Moon, Smile, Heart, Camera, ChevronRight,
  User, TrendingUp, Star, Thermometer, Shield, Pill,
  MessageCircle, AlertTriangle, Plus, Droplets, Clock,
  Stethoscope, Apple,
} from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { supabase } from '../../lib/supabase'
import type { ChildWithRole } from '../../types'

const SW = Dimensions.get('window').width

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatAge(bd: string): string {
  if (!bd) return ''
  const b = new Date(bd), n = new Date()
  const m = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth())
  if (m < 1) return 'Newborn'
  if (m < 12) return `${m}mo`
  const y = Math.floor(m / 12), r = m % 12
  return r > 0 ? `${y}y ${r}mo` : `${y}y`
}

function getGreeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function getMilestone(bd: string): string {
  if (!bd) return 'Set birth date for milestones'
  const m = (new Date().getFullYear() - new Date(bd).getFullYear()) * 12 + (new Date().getMonth() - new Date(bd).getMonth())
  if (m < 2) return 'First social smile'
  if (m < 4) return 'Reaching for objects'
  if (m < 6) return 'Rolling over'
  if (m < 9) return 'Sitting up'
  if (m < 12) return 'First words'
  if (m < 15) return 'First steps'
  if (m < 18) return 'Using a spoon'
  if (m < 24) return 'Two-word phrases'
  if (m < 36) return 'Imaginative play'
  return 'Growing strong'
}

interface DaySummary {
  meals: number
  sleepHours: number
  moods: number
  healthEvents: number
}

// ─── Main Component ──────────────────────────────────────────────────────

export function KidsHome() {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const setActiveChild = useChildStore((s) => s.setActiveChild)
  const child = activeChild ?? children[0]

  const [daySummary, setDaySummary] = useState<DaySummary>({ meals: 0, sleepHours: 0, moods: 0, healthEvents: 0 })
  const [todayMeals, setTodayMeals] = useState<{ value: string; time: string }[]>([])

  useEffect(() => {
    if (child) loadTodaySummary(child.id)
  }, [child?.id])

  async function loadTodaySummary(childId: string) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('child_logs')
      .select('type, value, created_at')
      .eq('child_id', childId)
      .eq('date', today)
      .order('created_at', { ascending: false })

    if (!data) return
    const logs = data as any[]
    const meals = logs.filter((l) => l.type === 'feeding' || l.type === 'food')
    setDaySummary({
      meals: meals.length,
      sleepHours: logs.filter((l) => l.type === 'sleep').length,
      moods: logs.filter((l) => l.type === 'mood').length,
      healthEvents: logs.filter((l) => ['vaccine', 'medicine', 'temperature', 'growth'].includes(l.type)).length,
    })
    setTodayMeals(meals.slice(0, 3).map((m) => ({
      value: m.value ?? 'Meal logged',
      time: m.created_at ? new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '',
    })))
  }

  if (!child) return null

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <View style={styles.root}>
      {/* ─── Child Selector ─────────────────────────────────────── */}
      {children.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childPills}>
          {children.map((c) => {
            const active = c.id === child.id
            return (
              <Pressable key={c.id} onPress={() => setActiveChild(c)}
                style={[styles.childPill, { backgroundColor: active ? colors.primary : colors.surface, borderRadius: radius.full, borderWidth: active ? 0 : 1, borderColor: colors.border }]}
              >
                <Text style={[styles.pillName, { color: active ? '#FFF' : colors.text }]}>{c.name}</Text>
                <Text style={[styles.pillAge, { color: active ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>{formatAge(c.birthDate)}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
      ) : (
        <View style={styles.greeting}>
          <Text style={[styles.greetText, { color: colors.textSecondary }]}>{getGreeting()}</Text>
          <Text style={[styles.childNameLarge, { color: colors.text }]}>{child.name}, {formatAge(child.birthDate)}</Text>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>{today}</Text>
        </View>
      )}

      {/* ─── Today's Tracker Ring ──────────────────────────────── */}
      <View style={[styles.trackerCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
        <Text style={[styles.trackerTitle, { color: colors.text }]}>Today</Text>
        <View style={styles.trackerRow}>
          <TrackerRing value={daySummary.meals} max={5} label="Meals" color={brand.kids} icon={Utensils} />
          <TrackerRing value={daySummary.sleepHours} max={4} label="Naps" color={brand.pregnancy} icon={Moon} />
          <TrackerRing value={daySummary.moods} max={3} label="Moods" color={brand.accent} icon={Smile} />
          <TrackerRing value={daySummary.healthEvents} max={2} label="Health" color={brand.success} icon={Heart} />
        </View>
      </View>

      {/* ─── Food Tracker (main feature) ───────────────────────── */}
      <View style={[styles.foodCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
        <View style={styles.foodHeader}>
          <Apple size={18} color={brand.phase.ovulation} strokeWidth={2} />
          <Text style={[styles.foodTitle, { color: colors.text }]}>Meals Today</Text>
          <View style={[styles.mealCount, { backgroundColor: brand.kids + '15', borderRadius: radius.full }]}>
            <Text style={[styles.mealCountText, { color: brand.kids }]}>{daySummary.meals}</Text>
          </View>
        </View>

        {todayMeals.length > 0 ? (
          <View style={styles.mealList}>
            {todayMeals.map((meal, i) => (
              <View key={i} style={[styles.mealItem, i < todayMeals.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
                <View style={[styles.mealDot, { backgroundColor: [brand.accent, brand.kids, brand.phase.ovulation][i % 3] }]} />
                <Text style={[styles.mealText, { color: colors.text }]} numberOfLines={1}>{meal.value}</Text>
                {meal.time ? <Text style={[styles.mealTime, { color: colors.textMuted }]}>{meal.time}</Text> : null}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.foodEmpty}>
            <Camera size={28} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={[styles.foodEmptyTitle, { color: colors.textSecondary }]}>No meals logged today</Text>
            <Text style={[styles.foodEmptyDesc, { color: colors.textMuted }]}>Track meals by taking a photo or logging manually</Text>
          </View>
        )}

        <Pressable style={[styles.logMealBtn, { backgroundColor: brand.kids + '10', borderRadius: radius.lg }]}>
          <Plus size={16} color={brand.kids} strokeWidth={2.5} />
          <Text style={[styles.logMealText, { color: brand.kids }]}>Log a Meal</Text>
        </Pressable>
      </View>

      {/* ─── Quick Actions ─────────────────────────────────────── */}
      <View style={styles.quickRow}>
        <QuickBtn icon={Utensils} label="Feed" color={brand.kids} />
        <QuickBtn icon={Moon} label="Sleep" color={brand.pregnancy} />
        <QuickBtn icon={Smile} label="Mood" color={brand.accent} />
        <QuickBtn icon={Thermometer} label="Temp" color={brand.error} />
        <QuickBtn icon={Camera} label="Memory" color={brand.phase.ovulation} onPress={() => router.push('/profile/memories')} />
      </View>

      {/* ─── Health at a Glance ────────────────────────────────── */}
      <View style={styles.twoCol}>
        {/* Allergies */}
        <View style={[styles.glanceCard, { backgroundColor: child.allergies.length > 0 ? brand.error + '08' : brand.success + '08', borderRadius: radius.xl }]}>
          <AlertTriangle size={16} color={child.allergies.length > 0 ? brand.error : brand.success} strokeWidth={2} />
          <Text style={[styles.glanceLabel, { color: colors.textSecondary }]}>Allergies</Text>
          {child.allergies.length > 0 ? (
            <View style={styles.chipWrap}>
              {child.allergies.slice(0, 3).map((a) => (
                <View key={a} style={[styles.tinyChip, { backgroundColor: brand.error + '15' }]}>
                  <Text style={[styles.tinyChipText, { color: brand.error }]}>{a}</Text>
                </View>
              ))}
              {child.allergies.length > 3 && <Text style={[styles.moreChip, { color: brand.error }]}>+{child.allergies.length - 3}</Text>}
            </View>
          ) : (
            <Text style={[styles.glanceValue, { color: brand.success }]}>None</Text>
          )}
        </View>

        {/* Medications */}
        <View style={[styles.glanceCard, { backgroundColor: child.medications.length > 0 ? brand.secondary + '08' : colors.surfaceRaised, borderRadius: radius.xl }]}>
          <Pill size={16} color={brand.secondary} strokeWidth={2} />
          <Text style={[styles.glanceLabel, { color: colors.textSecondary }]}>Medications</Text>
          {child.medications.length > 0 ? (
            child.medications.slice(0, 2).map((m) => (
              <Text key={m} style={[styles.glanceValue, { color: colors.text }]}>{m}</Text>
            ))
          ) : (
            <Text style={[styles.glanceValue, { color: colors.textMuted }]}>None</Text>
          )}
        </View>
      </View>

      {/* ─── Milestone + Pediatrician ──────────────────────────── */}
      <View style={styles.twoCol}>
        <View style={[styles.glanceCard, { backgroundColor: brand.accent + '08', borderRadius: radius.xl }]}>
          <Star size={16} color={brand.accent} strokeWidth={2} />
          <Text style={[styles.glanceLabel, { color: colors.textSecondary }]}>Next Milestone</Text>
          <Text style={[styles.glanceValue, { color: colors.text }]}>{getMilestone(child.birthDate)}</Text>
        </View>

        <Pressable onPress={() => router.push('/profile/health-history')} style={[styles.glanceCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <Stethoscope size={16} color={brand.primary} strokeWidth={2} />
          <Text style={[styles.glanceLabel, { color: colors.textSecondary }]}>Health History</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.glanceValue, { color: brand.primary }]}>View all</Text>
            <ChevronRight size={14} color={brand.primary} />
          </View>
        </Pressable>
      </View>

      {/* ─── Ask Grandma ───────────────────────────────────────── */}
      <Pressable onPress={() => router.push('/grandma-talk')} style={[styles.grandmaCard, { backgroundColor: colors.primaryTint, borderRadius: radius.xl }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.grandmaTitle, { color: colors.primary }]}>Ask Grandma</Text>
          <Text style={[styles.grandmaDesc, { color: colors.textSecondary }]}>Feeding tips, sleep advice, milestones</Text>
        </View>
        <View style={[styles.grandmaIcon, { backgroundColor: colors.primary }]}>
          <MessageCircle size={20} color="#FFF" strokeWidth={2} />
        </View>
      </Pressable>
    </View>
  )
}

// ─── Tracker Ring ─────────────────────────────────────────────────────────

function TrackerRing({ value, max, label, color, icon: Icon }: {
  value: number; max: number; label: string; color: string; icon: typeof Utensils
}) {
  const { colors } = useTheme()
  const size = 56
  const strokeW = 4
  const r = (size - strokeW) / 2
  const circumference = 2 * Math.PI * r
  const progress = Math.min(value / max, 1)
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <View style={styles.ringCol}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <SvgCircle cx={size / 2} cy={size / 2} r={r} stroke={color + '20'} strokeWidth={strokeW} fill="none" />
          <SvgCircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={strokeW} fill="none"
            strokeDasharray={`${circumference}`} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round" rotation="-90" origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <Icon size={18} color={color} strokeWidth={2} />
      </View>
      <Text style={[styles.ringValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.ringLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  )
}

// ─── Quick Button ─────────────────────────────────────────────────────────

function QuickBtn({ icon: Icon, label, color, onPress }: { icon: typeof Utensils; label: string; color: string; onPress?: () => void }) {
  const { colors, radius } = useTheme()
  return (
    <Pressable onPress={onPress} style={[styles.quickBtn, { backgroundColor: color + '10', borderRadius: radius.lg }]}>
      <Icon size={18} color={color} strokeWidth={2} />
      <Text style={[styles.quickLabel, { color: colors.text }]}>{label}</Text>
    </Pressable>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { gap: 12, paddingBottom: 20 },

  // Child pills
  childPills: { gap: 8, paddingHorizontal: 4, marginBottom: 4 },
  childPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16 },
  pillName: { fontSize: 15, fontWeight: '700' },
  pillAge: { fontSize: 12, fontWeight: '500' },

  // Greeting
  greeting: { gap: 2, marginBottom: 4 },
  greetText: { fontSize: 14, fontWeight: '500' },
  childNameLarge: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  dateText: { fontSize: 13, fontWeight: '500' },

  // Today tracker
  trackerCard: { padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  trackerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  trackerRow: { flexDirection: 'row', justifyContent: 'space-around' },
  ringCol: { alignItems: 'center', gap: 4 },
  ringValue: { fontSize: 14, fontWeight: '800' },
  ringLabel: { fontSize: 10, fontWeight: '600' },

  // Food card
  foodCard: { padding: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  foodHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  foodTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  mealCount: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  mealCountText: { fontSize: 14, fontWeight: '800' },
  mealList: { gap: 0 },
  mealItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  mealDot: { width: 8, height: 8, borderRadius: 4 },
  mealText: { flex: 1, fontSize: 14, fontWeight: '600' },
  mealTime: { fontSize: 12, fontWeight: '500' },
  foodEmpty: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  foodEmptyTitle: { fontSize: 15, fontWeight: '600' },
  foodEmptyDesc: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  logMealBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  logMealText: { fontSize: 14, fontWeight: '700' },

  // Quick row
  quickRow: { flexDirection: 'row', gap: 6 },
  quickBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 4 },
  quickLabel: { fontSize: 10, fontWeight: '600' },

  // Two col
  twoCol: { flexDirection: 'row', gap: 8 },
  glanceCard: { flex: 1, padding: 14, gap: 4 },
  glanceLabel: { fontSize: 11, fontWeight: '600' },
  glanceValue: { fontSize: 13, fontWeight: '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tinyChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tinyChipText: { fontSize: 10, fontWeight: '600' },
  moreChip: { fontSize: 10, fontWeight: '700', alignSelf: 'center' },

  // Grandma
  grandmaCard: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  grandmaTitle: { fontSize: 16, fontWeight: '700' },
  grandmaDesc: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  grandmaIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
})
