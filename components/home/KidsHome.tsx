/**
 * Kids Home — Premium Data-Rich Dashboard
 *
 * Hero sleep circle, mood analysis, calories, health reminders,
 * growth leaps, memory highlights. All real data from Supabase.
 */

import { useState, useEffect, useMemo } from 'react'
import {
  View, Text, Pressable, ScrollView, StyleSheet, Dimensions, Image,
} from 'react-native'
import { router } from 'expo-router'
import Svg, {
  Circle as SvgCircle, Defs, LinearGradient, Stop, Rect, Line,
} from 'react-native-svg'
import {
  Moon, Smile, Utensils, Heart, Camera, ChevronRight,
  Thermometer, MessageCircle, Plus, AlertCircle, Baby,
  Brain, Rocket, Check, Sparkles,
} from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { supabase } from '../../lib/supabase'
import { estimateCalories } from '../../lib/foodCalories'
import type { ChildWithRole } from '../../types'

const SW = Dimensions.get('window').width

// ─── Growth Leap Data ────────────────────────────────────────────────────────

const GROWTH_LEAPS = [
  { week: 5, name: 'Changing Sensations', desc: 'Awareness of senses' },
  { week: 8, name: 'Patterns', desc: 'Recognizing simple patterns' },
  { week: 12, name: 'Smooth Transitions', desc: 'Smoother movements' },
  { week: 19, name: 'Events', desc: 'Understanding sequences' },
  { week: 26, name: 'Relationships', desc: 'Connecting cause & effect' },
  { week: 37, name: 'Categories', desc: 'Grouping things together' },
  { week: 46, name: 'Sequences', desc: 'Following step-by-step' },
  { week: 55, name: 'Programs', desc: 'Understanding rules & principles' },
  { week: 64, name: 'Principles', desc: 'Flexible thinking & planning' },
  { week: 75, name: 'Systems', desc: 'Complex systems understanding' },
]

function getGrowthLeap(birthDate: string) {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const now = new Date()
  const weekAge = Math.floor((now.getTime() - birth.getTime()) / (7 * 24 * 60 * 60 * 1000))

  // Find current or next leap
  for (let i = 0; i < GROWTH_LEAPS.length; i++) {
    const leap = GROWTH_LEAPS[i]
    const leapStart = leap.week - 2 // Fussy period starts ~2 weeks before
    const leapEnd = leap.week + 1

    if (weekAge >= leapStart && weekAge <= leapEnd) {
      return { ...leap, status: 'active' as const, index: i, weekAge, progress: (weekAge - leapStart) / (leapEnd - leapStart) }
    }
    if (weekAge < leapStart) {
      const weeksUntil = leapStart - weekAge
      return { ...leap, status: 'upcoming' as const, index: i, weekAge, weeksUntil, progress: 0 }
    }
  }
  return null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAge(bd: string): string {
  if (!bd) return ''
  const b = new Date(bd), n = new Date()
  const m = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth())
  if (m < 1) return 'Newborn'
  if (m < 12) return `${m}mo`
  const y = Math.floor(m / 12), r = m % 12
  return r > 0 ? `${y}y ${r}mo` : `${y}y`
}

function getRecommendedSleep(bd: string): number {
  if (!bd) return 56 // default 8h/day * 7
  const m = (new Date().getFullYear() - new Date(bd).getFullYear()) * 12 + (new Date().getMonth() - new Date(bd).getMonth())
  // Weekly hours based on age (CDC guidelines)
  if (m < 4) return 105   // 14-17h/day → ~15h * 7
  if (m < 12) return 91   // 12-16h/day → ~13h * 7
  if (m < 36) return 84   // 11-14h/day → ~12h * 7
  return 73                // 10-13h/day → ~10.5h * 7
}

const MOOD_COLORS: Record<string, string> = {
  happy: '#FBBF24',
  calm: '#6EC96E',
  energetic: '#4D96FF',
  fussy: '#FF9800',
  cranky: '#FF7070',
}

const MOOD_LABELS: Record<string, string> = {
  happy: 'Happy',
  calm: 'Calm',
  energetic: 'Active',
  fussy: 'Fussy',
  cranky: 'Cranky',
}

// ─── Data Types ──────────────────────────────────────────────────────────────

interface WeekData {
  sleepTotal: number
  sleepByDay: number[]
  sleepQuality: string
  moodCounts: Record<string, number>
  dominantMood: string
  totalCalories: number
  calorieTarget: number
  calorieCategories: { label: string; cals: number; color: string }[]
  mealsToday: number
  healthTasks: { label: string; done: boolean }[]
  memories: { id: string; uri: string | null; label: string; date: string }[]
  dayLabels: string[]
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function KidsHome() {
  const { colors, radius } = useTheme()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const setActiveChild = useChildStore((s) => s.setActiveChild)
  const parentName = useJourneyStore((s) => s.parentName)
  const child = activeChild ?? children[0]

  const [weekData, setWeekData] = useState<WeekData>({
    sleepTotal: 0, sleepByDay: [0, 0, 0, 0, 0, 0, 0], sleepQuality: 'No data',
    moodCounts: {}, dominantMood: '', totalCalories: 0, calorieTarget: 1200,
    calorieCategories: [], mealsToday: 0,
    healthTasks: [], memories: [], dayLabels: [],
  })

  useEffect(() => {
    if (child) loadWeekData(child)
  }, [child?.id])

  async function loadWeekData(c: ChildWithRole) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dates: string[] = []
    const labels: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().split('T')[0])
      labels.push(dayNames[d.getDay()])
    }

    const { data } = await supabase
      .from('child_logs')
      .select('type, value, notes, photos, date, created_at')
      .eq('child_id', c.id)
      .gte('date', dates[0])
      .order('created_at', { ascending: false })

    const logs = (data ?? []) as any[]
    const today = new Date().toISOString().split('T')[0]

    // Sleep
    const sleepByDay = new Array(7).fill(0)
    let sleepTotal = 0
    let goodSleep = 0, totalSleepLogs = 0
    for (const log of logs.filter((l) => l.type === 'sleep')) {
      const dayIdx = dates.indexOf(log.date)
      let val: any = log.value
      try { val = typeof val === 'string' ? JSON.parse(val) : val } catch {}
      const hours = typeof val === 'object' && val ? (parseFloat(val.duration) || 0) : 0
      if (dayIdx !== -1) sleepByDay[dayIdx] += hours
      sleepTotal += hours
      totalSleepLogs++
      const q = typeof val === 'object' && val ? (val.quality || '').toLowerCase() : ''
      if (q === 'great' || q === 'good') goodSleep++
    }
    const sleepQuality = totalSleepLogs === 0 ? 'No data' : goodSleep / totalSleepLogs >= 0.7 ? 'Great' : goodSleep / totalSleepLogs >= 0.4 ? 'Solid' : 'Restless'

    // Mood
    const moodCounts: Record<string, number> = {}
    for (const log of logs.filter((l) => l.type === 'mood')) {
      let mood = log.value
      try { mood = typeof mood === 'string' ? JSON.parse(mood) : mood } catch {}
      if (typeof mood === 'string') {
        const key = mood.toLowerCase()
        moodCounts[key] = (moodCounts[key] || 0) + 1
      }
    }
    const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

    // Calories (today only)
    const todayFoodLogs = logs.filter((l) => (l.type === 'food' || l.type === 'feeding') && l.date === today)
    const catMap: Record<string, { cals: number; color: string }> = {}
    let totalCalories = 0
    for (const log of todayFoodLogs) {
      const desc = log.notes || log.value || ''
      const est = estimateCalories(typeof desc === 'string' ? desc : '')
      totalCalories += est.totalCals
      for (const m of est.matches) {
        if (!catMap[m.category]) catMap[m.category] = { cals: 0, color: getCatColor(m.category) }
        catMap[m.category].cals += m.cals
      }
    }
    const calorieCategories = Object.entries(catMap).map(([label, v]) => ({ label: label.charAt(0).toUpperCase() + label.slice(1), ...v })).sort((a, b) => b.cals - a.cals)

    // Age-based calorie target
    const ageMonths = (new Date().getFullYear() - new Date(c.birthDate).getFullYear()) * 12 + (new Date().getMonth() - new Date(c.birthDate).getMonth())
    const calorieTarget = ageMonths < 6 ? 600 : ageMonths < 12 ? 800 : ageMonths < 24 ? 1000 : 1200

    // Health tasks
    const healthTasks: { label: string; done: boolean }[] = []
    const hasVitamins = logs.some((l) => l.type === 'medicine' && (l.value || '').toString().toLowerCase().includes('vitamin'))
    const hasVaccine = logs.some((l) => l.type === 'vaccine')
    const hasWeight = logs.some((l) => l.type === 'growth')
    healthTasks.push({ label: 'Vitamins', done: hasVitamins })
    if (c.medications.length > 0) healthTasks.push({ label: c.medications[0], done: logs.some((l) => l.type === 'medicine' && l.date === today) })
    healthTasks.push({ label: 'Vaccine check', done: hasVaccine })
    healthTasks.push({ label: 'Growth log', done: hasWeight })

    // Memories (photos from this week)
    const photoLogs = logs.filter((l) => l.photos && l.photos.length > 0).slice(0, 6)
    const memories = photoLogs.map((l) => ({
      id: l.created_at,
      uri: l.photos[0] ?? null,
      label: l.notes || l.type || 'Memory',
      date: new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))

    setWeekData({
      sleepTotal: Math.round(sleepTotal * 10) / 10,
      sleepByDay, sleepQuality, moodCounts, dominantMood,
      totalCalories, calorieTarget, calorieCategories,
      mealsToday: todayFoodLogs.length,
      healthTasks, memories, dayLabels: labels,
    })
  }

  if (!child) return null

  const recommendedSleep = getRecommendedSleep(child.birthDate)
  const sleepProgress = Math.min(weekData.sleepTotal / recommendedSleep, 1)
  const growthLeap = getGrowthLeap(child.birthDate)
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = parentName?.split(' ')[0] || 'Mom'

  return (
    <View style={s.root}>
      {/* ─── Header ──────────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={[s.greeting, { color: colors.text }]}>Hi, {firstName}</Text>
          <Text style={[s.subtitle, { color: colors.textMuted }]}>{child.name}'s Day</Text>
        </View>
      </View>

      {/* ─── Child Selector ──────────────────────────────────── */}
      {children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.childPills}>
          {children.map((c) => {
            const active = c.id === child.id
            return (
              <Pressable key={c.id} onPress={() => setActiveChild(c)}
                style={[s.childPill, {
                  backgroundColor: active ? colors.primary : 'rgba(255,255,255,0.05)',
                  borderRadius: radius.full,
                  borderWidth: active ? 0 : 1,
                  borderColor: colors.border,
                }]}
              >
                <Text style={[s.pillName, { color: active ? '#FFF' : colors.textMuted }]}>{c.name}</Text>
                <Text style={[s.pillAge, { color: active ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>{formatAge(c.birthDate)}</Text>
              </Pressable>
            )
          })}
          <Pressable style={[s.addChildBtn, { borderColor: colors.border }]}>
            <Plus size={14} color={colors.textMuted} strokeWidth={2} />
          </Pressable>
        </ScrollView>
      )}

      {/* ─── Hero: Weekly Sleep Circle ────────────────────────── */}
      <SleepHero
        total={weekData.sleepTotal}
        target={recommendedSleep}
        progress={sleepProgress}
        quality={weekData.sleepQuality}
        dailyHours={weekData.sleepByDay}
        dayLabels={weekData.dayLabels}
      />

      {/* ─── Metric Cards Horizontal Scroll ──────────────────── */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Daily Metrics</Text>
        <Pressable onPress={() => router.push('/profile/health-history' as any)}>
          <Text style={[s.sectionLink, { color: colors.primary }]}>Insights</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.metricsScroll}>
        {/* Mood Card */}
        <MoodCard moodCounts={weekData.moodCounts} dominantMood={weekData.dominantMood} />
        {/* Calories Card */}
        <CaloriesCard
          total={weekData.totalCalories}
          target={weekData.calorieTarget}
          categories={weekData.calorieCategories}
          meals={weekData.mealsToday}
        />
        {/* Health Card */}
        <HealthCard tasks={weekData.healthTasks} />
      </ScrollView>

      {/* ─── Quick Actions ────────────────────────────────────── */}
      <View style={s.quickRow}>
        <QuickBtn icon={Utensils} label="Feed" color={brand.kids} />
        <QuickBtn icon={Moon} label="Sleep" color={brand.pregnancy} />
        <QuickBtn icon={Smile} label="Mood" color={brand.accent} />
        <QuickBtn icon={Thermometer} label="Temp" color={brand.error} />
        <QuickBtn icon={Camera} label="Log" color={brand.success} onPress={() => router.push('/profile/memories' as any)} />
      </View>

      {/* ─── Growth Leap ──────────────────────────────────────── */}
      {growthLeap && <GrowthLeapCard leap={growthLeap} childName={child.name} />}

      {/* ─── Memory Highlights ────────────────────────────────── */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Memories</Text>
        <Pressable onPress={() => router.push('/profile/memories' as any)}>
          <Text style={[s.sectionLink, { color: colors.primary }]}>Gallery</Text>
        </Pressable>
      </View>

      {weekData.memories.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.memoriesScroll}>
          {weekData.memories.map((mem, i) => (
            <Pressable key={mem.id + i} style={s.memoryCard}>
              <View style={[s.memoryImage, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
                {mem.uri ? (
                  <Image source={{ uri: mem.uri }} style={[s.memoryImg, { borderRadius: radius.lg }]} />
                ) : (
                  <Camera size={24} color={colors.textMuted} strokeWidth={1.5} />
                )}
                <View style={s.memoryBadge}>
                  <Camera size={10} color="rgba(255,255,255,0.8)" strokeWidth={2} />
                  <Text style={s.memoryBadgeText} numberOfLines={1}>{mem.label}</Text>
                </View>
              </View>
              <Text style={[s.memoryDate, { color: colors.textMuted }]}>{mem.date}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={[s.memoryEmpty, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <Camera size={24} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={[s.memoryEmptyText, { color: colors.textSecondary }]}>No memories this week</Text>
          <Text style={[s.memoryEmptyHint, { color: colors.textMuted }]}>Capture moments with the Log button</Text>
        </View>
      )}

      {/* ─── Ask Grandma ─────────────────────────────────────── */}
      <Pressable
        onPress={() => router.push('/grandma-talk' as any)}
        style={({ pressed }) => [
          s.grandmaCard,
          { backgroundColor: colors.primary, borderRadius: radius.lg, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <View style={[s.grandmaIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <MessageCircle size={22} color="#FFF" strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.grandmaTitle}>Ask Grandma</Text>
          <Text style={s.grandmaDesc}>Instant advice on sleep & feeding</Text>
        </View>
        <ChevronRight size={20} color="rgba(255,255,255,0.5)" strokeWidth={2} />
      </Pressable>
    </View>
  )
}

// ─── Sleep Hero ──────────────────────────────────────────────────────────────

function SleepHero({ total, target, progress, quality, dailyHours, dayLabels }: {
  total: number; target: number; progress: number; quality: string
  dailyHours: number[]; dayLabels: string[]
}) {
  const { colors } = useTheme()
  const size = SW - 100
  const strokeW = 16
  const r = (size - strokeW) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - progress)

  // Streak: count consecutive days with sleep > 0 (from today backwards)
  let streak = 0
  for (let i = dailyHours.length - 1; i >= 0; i--) {
    if (dailyHours[i] > 0) streak++
    else break
  }

  const sleepPct = target > 0 ? Math.round((total / target) * 100) : 0
  const pctLabel = total > 0 ? (sleepPct >= 100 ? 'On target' : `${sleepPct}% of goal`) : ''

  return (
    <View style={s.heroWrap}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Defs>
            <LinearGradient id="sleepGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={brand.kids} />
              <Stop offset="1" stopColor={brand.primary} />
            </LinearGradient>
          </Defs>
          <SvgCircle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.04)" strokeWidth={strokeW} fill="none" />
          <SvgCircle cx={size / 2} cy={size / 2} r={r} stroke="url(#sleepGrad)" strokeWidth={strokeW} fill="none"
            strokeDasharray={`${circumference}`} strokeDashoffset={offset}
            strokeLinecap="round" rotation="-90" origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={s.heroCenter}>
          <Moon size={22} color={brand.kids} strokeWidth={2} />
          <Text style={[s.heroNumber, { color: colors.text }]}>{total > 0 ? total.toFixed(1) : '—'}</Text>
          <Text style={[s.heroUnit, { color: colors.textMuted }]}>HOURS SLEPT</Text>
          {total > 0 && (
            <View style={[s.heroBadge, { backgroundColor: sleepPct >= 90 ? 'rgba(110,201,110,0.12)' : 'rgba(255,152,0,0.12)' }]}>
              <Text style={[s.heroBadgeText, { color: sleepPct >= 90 ? brand.success : brand.warning }]}>{pctLabel}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats row */}
      <View style={s.heroStats}>
        <View style={s.heroStat}>
          <Text style={[s.heroStatLabel, { color: colors.textMuted }]}>TARGET</Text>
          <Text style={[s.heroStatValue, { color: colors.text }]}>{target}h</Text>
        </View>
        <View style={[s.heroDivider, { backgroundColor: colors.border }]} />
        <View style={s.heroStat}>
          <Text style={[s.heroStatLabel, { color: colors.textMuted }]}>QUALITY</Text>
          <Text style={[s.heroStatValue, { color: quality === 'Great' ? brand.success : quality === 'Solid' ? brand.accent : colors.text }]}>{quality}</Text>
        </View>
        <View style={[s.heroDivider, { backgroundColor: colors.border }]} />
        <View style={s.heroStat}>
          <Text style={[s.heroStatLabel, { color: colors.textMuted }]}>STREAK</Text>
          <Text style={[s.heroStatValue, { color: colors.text }]}>{streak > 0 ? `${streak} Days` : '—'}</Text>
        </View>
      </View>
    </View>
  )
}

// ─── Mood Card ───────────────────────────────────────────────────────────────

function MoodCard({ moodCounts, dominantMood }: { moodCounts: Record<string, number>; dominantMood: string }) {
  const { colors, radius } = useTheme()
  const moods = ['happy', 'calm', 'energetic', 'fussy', 'cranky']
  const maxCount = Math.max(...Object.values(moodCounts), 1)
  const hasMoods = Object.values(moodCounts).some((v) => v > 0)
  const dominantLabel = MOOD_LABELS[dominantMood] || 'No data'

  return (
    <View style={[s.metricCard, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.borderLight }]}>
      <View style={s.metricHeader}>
        <Smile size={14} color={brand.accent} strokeWidth={2} />
        <Text style={[s.metricLabel, { color: colors.textSecondary }]}>Mood</Text>
      </View>
      {hasMoods ? (
        <>
          <View style={s.moodBars}>
            {moods.map((m) => {
              const count = moodCounts[m] || 0
              const height = Math.max((count / maxCount) * 50, 3)
              return (
                <View key={m} style={s.moodBarCol}>
                  <View style={[s.moodBar, { height, backgroundColor: MOOD_COLORS[m] || colors.textMuted, borderRadius: 4 }]} />
                </View>
              )
            })}
          </View>
          <Text style={[s.metricValue, { color: colors.text }]}>Mostly {dominantLabel}</Text>
          <Text style={[s.metricSmall, { color: colors.textMuted }]}>This week</Text>
        </>
      ) : (
        <>
          <View style={s.metricEmpty}>
            <Smile size={20} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={[s.metricValue, { color: colors.textSecondary }]}>No moods yet</Text>
          <Text style={[s.metricSmall, { color: colors.textMuted }]}>Log a mood</Text>
        </>
      )}
    </View>
  )
}

// ─── Calories Card ───────────────────────────────────────────────────────────

function CaloriesCard({ total, target, categories, meals }: {
  total: number; target: number; categories: { label: string; cals: number; color: string }[]; meals: number
}) {
  const { colors, radius } = useTheme()
  const ringSize = 56
  const ringR = 22
  const ringCircumference = 2 * Math.PI * ringR
  const pct = Math.min(total / target, 1)
  const ringOffset = ringCircumference * (1 - pct)

  return (
    <View style={[s.metricCard, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.borderLight }]}>
      <View style={s.metricHeader}>
        <Utensils size={14} color="#EF5350" strokeWidth={2} />
        <Text style={[s.metricLabel, { color: colors.textSecondary }]}>Calories</Text>
      </View>
      <View style={s.calorieRingWrap}>
        <Svg width={ringSize} height={ringSize}>
          <SvgCircle cx={ringSize / 2} cy={ringSize / 2} r={ringR} fill="none" stroke="rgba(239,83,80,0.1)" strokeWidth={5} />
          <SvgCircle cx={ringSize / 2} cy={ringSize / 2} r={ringR} fill="none" stroke="#EF5350" strokeWidth={5}
            strokeDasharray={`${ringCircumference}`} strokeDashoffset={ringOffset}
            strokeLinecap="round" rotation="-90" origin={`${ringSize / 2}, ${ringSize / 2}`}
          />
        </Svg>
        <Text style={[s.calorieNumber, { color: colors.text }]}>{total > 0 ? total.toLocaleString() : '—'}</Text>
      </View>
      <Text style={[s.metricValue, { color: colors.text }]}>{total > 0 ? (pct >= 0.9 ? 'Target Met' : `${Math.round(pct * 100)}% of daily`) : `${meals} meals`}</Text>
      <Text style={[s.metricSmall, { color: colors.textMuted }]}>{total > 0 ? `${Math.round(pct * 100)}% of daily` : 'Log meals to track'}</Text>
    </View>
  )
}

// ─── Health Card ─────────────────────────────────────────────────────────────

function HealthCard({ tasks }: { tasks: { label: string; done: boolean }[] }) {
  const { colors, radius } = useTheme()
  const done = tasks.filter((t) => t.done).length

  return (
    <View style={[s.metricCard, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.borderLight }]}>
      <View style={s.metricHeader}>
        <Heart size={14} color={brand.success} strokeWidth={2} />
        <Text style={[s.metricLabel, { color: colors.textSecondary }]}>Health</Text>
      </View>
      <View style={s.healthList}>
        {tasks.slice(0, 3).map((t, i) => (
          <View key={i} style={s.healthRow}>
            <View style={[s.healthCheck, {
              backgroundColor: t.done ? brand.success : 'transparent',
              borderWidth: t.done ? 0 : 1,
              borderColor: colors.border,
            }]}>
              {t.done && <Check size={8} color="#FFF" strokeWidth={3} />}
            </View>
            <Text style={[s.healthLabel, { color: t.done ? colors.textSecondary : colors.textMuted }]} numberOfLines={1}>{t.label}</Text>
          </View>
        ))}
      </View>
      <Text style={[s.metricValue, { color: colors.text }]}>{done}/{tasks.length} Tasks</Text>
    </View>
  )
}

// ─── Growth Leap Card ────────────────────────────────────────────────────────

function GrowthLeapCard({ leap, childName }: { leap: NonNullable<ReturnType<typeof getGrowthLeap>>; childName: string }) {
  const { colors, radius } = useTheme()
  const isActive = leap.status === 'active'

  return (
    <View style={[s.leapCard, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, borderColor: colors.borderLight }]}>
      <View style={s.leapHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[s.leapTitle, { color: colors.text }]}>Growth Leap #{leap.index + 1}</Text>
          <Text style={[s.leapDesc, { color: colors.textMuted }]}>{leap.name}</Text>
        </View>
        <View style={[s.leapBadge, { backgroundColor: isActive ? brand.primary + '20' : brand.kids + '15' }]}>
          <Text style={[s.leapBadgeText, { color: isActive ? colors.primary : brand.kids }]}>
            {isActive ? 'In Progress' : `In ${leap.weeksUntil}w`}
          </Text>
        </View>
      </View>

      {/* Timeline */}
      <View style={s.leapTimeline}>
        <View style={[s.leapTrack, { backgroundColor: colors.border }]} />
        <View style={[s.leapTrackFill, { backgroundColor: brand.kids, width: isActive ? `${Math.round(leap.progress * 100)}%` as any : '0%' as any }]} />
        <View style={s.leapDots}>
          <View style={[s.leapDot, { backgroundColor: brand.kids }]} />
          <View style={{ alignItems: 'center' }}>
            <View style={[s.leapDot, { backgroundColor: isActive ? brand.primary : colors.border }]} />
            <Text style={[s.leapWeekLabel, { color: colors.textMuted }]}>Week {leap.week}</Text>
          </View>
          <View style={[s.leapDot, { backgroundColor: colors.border }]} />
        </View>
      </View>

      {isActive && (
        <View style={[s.leapTip, { backgroundColor: 'rgba(255,152,0,0.08)' }]}>
          <View style={[s.leapTipIcon, { backgroundColor: 'rgba(255,152,0,0.12)' }]}>
            <AlertCircle size={16} color={brand.warning} strokeWidth={2} />
          </View>
          <Text style={[s.leapTipText, { color: colors.textSecondary }]}>
            {childName} might be more fussy than usual. Extra comfort and patience helps.
          </Text>
        </View>
      )}
    </View>
  )
}

// ─── Quick Button ────────────────────────────────────────────────────────────

function QuickBtn({ icon: Icon, label, color, onPress }: {
  icon: typeof Utensils; label: string; color: string; onPress?: () => void
}) {
  const { colors, radius } = useTheme()
  return (
    <Pressable onPress={onPress} style={s.quickBtn}>
      <View style={[s.quickBtnInner, { backgroundColor: color + '12', borderRadius: radius.md }]}>
        <Icon size={18} color={color} strokeWidth={2} />
      </View>
      <Text style={[s.quickLabel, { color: colors.textMuted }]}>{label}</Text>
    </Pressable>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCatColor(cat: string): string {
  const map: Record<string, string> = {
    fruit: '#4CAF50', vegetable: '#66BB6A', grain: '#FFA726',
    protein: '#EF5350', dairy: '#42A5F5', drink: '#26C6DA',
    snack: '#AB47BC', mixed: '#8D6E63',
  }
  return map[cat] || '#888'
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { gap: 16, paddingBottom: 24 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  greeting: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 },

  // Child pills
  childPills: { gap: 8, paddingHorizontal: 2, marginBottom: 4 },
  childPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 16 },
  pillName: { fontSize: 14, fontWeight: '700' },
  pillAge: { fontSize: 10, fontWeight: '500' },
  addChildBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },

  // Hero
  heroWrap: { alignItems: 'center', paddingVertical: 8 },
  heroCenter: { alignItems: 'center', gap: 2 },
  heroNumber: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  heroUnit: { fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  heroBadge: { marginTop: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  heroBadgeText: { fontSize: 10, fontWeight: '700' },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 16 },
  heroStat: { alignItems: 'center' },
  heroStatLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  heroStatValue: { fontSize: 14, fontWeight: '700' },
  heroDivider: { width: 1, height: 28 },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  sectionLink: { fontSize: 12, fontWeight: '700' },

  // Metric cards
  metricsScroll: { gap: 10, paddingRight: 20, paddingVertical: 4 },
  metricCard: { width: 155, padding: 14, borderWidth: 1, gap: 2 },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metricLabel: { fontSize: 11, fontWeight: '700' },
  metricValue: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  metricSmall: { fontSize: 10, fontWeight: '500' },
  metricEmpty: { height: 50, alignItems: 'center', justifyContent: 'center' },

  // Mood bars
  moodBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 50, marginBottom: 4 },
  moodBarCol: { flex: 1, justifyContent: 'flex-end' },
  moodBar: { width: '100%' },

  // Calories ring
  calorieRingWrap: { alignItems: 'center', justifyContent: 'center', height: 60, marginBottom: 2 },
  calorieNumber: { position: 'absolute', fontSize: 11, fontWeight: '800' },

  // Health
  healthList: { gap: 6, marginBottom: 2 },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  healthCheck: { width: 14, height: 14, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  healthLabel: { fontSize: 10, fontWeight: '500', flex: 1 },

  // Quick actions
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickBtn: { alignItems: 'center', gap: 6 },
  quickBtnInner: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  // Growth leap
  leapCard: { padding: 20, gap: 12, borderWidth: 1 },
  leapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leapTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  leapDesc: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  leapBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  leapBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: -0.3 },
  leapTimeline: { height: 30, justifyContent: 'center', marginHorizontal: 8, marginTop: 4 },
  leapTrack: { position: 'absolute', left: 0, right: 0, height: 2, borderRadius: 1 },
  leapTrackFill: { position: 'absolute', left: 0, height: 2, borderRadius: 1 },
  leapDots: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leapDot: { width: 10, height: 10, borderRadius: 5 },
  leapWeekLabel: { fontSize: 8, fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
  leapTip: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16 },
  leapTipIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  leapTipText: { flex: 1, fontSize: 11, fontWeight: '500', lineHeight: 16 },

  // Memories
  memoriesScroll: { gap: 12, paddingRight: 20, paddingVertical: 4 },
  memoryCard: { width: SW * 0.55 },
  memoryImage: { aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  memoryImg: { width: '100%', height: '100%' },
  memoryBadge: { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 999 },
  memoryBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF', maxWidth: 100 },
  memoryDate: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 6, marginLeft: 4 },
  memoryEmpty: { alignItems: 'center', padding: 24, gap: 8 },
  memoryEmptyText: { fontSize: 14, fontWeight: '600' },
  memoryEmptyHint: { fontSize: 11, fontWeight: '500' },

  // Grandma
  grandmaCard: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  grandmaIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  grandmaTitle: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  grandmaDesc: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.8)', marginTop: 1 },
})
