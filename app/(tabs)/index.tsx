import { useState } from 'react'
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useChildStore } from '../../store/useChildStore'
import { useModeStore } from '../../store/useModeStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { GlassCard } from '../../components/ui/GlassCard'
import { GrandmaBall } from '../../components/home/GrandmaBall'
import { PillarGrid } from '../../components/home/PillarGrid'
import { NannyUpdatesFeed } from '../../components/home/NannyUpdatesFeed'
import { PregnancyWeekDisplay } from '../../components/home/PregnancyWeekDisplay'
import { BabySizeCard } from '../../components/home/BabySizeCard'
import { DevelopmentInsight } from '../../components/home/DevelopmentInsight'
import { DailyPulse } from '../../components/home/DailyPulse'
import { CyclePhaseRing } from '../../components/prepreg/CyclePhaseRing'
import { WeekStrip } from '../../components/prepreg/WeekStrip'
import { HormoneChart } from '../../components/prepreg/HormoneChart'
import { HealthDashboard } from '../../components/prepreg/HealthDashboard'
import { DailyInsights } from '../../components/prepreg/DailyInsights'
import { getCycleInfo, toDateStr } from '../../lib/cycleLogic'
import { useAppTheme } from '../../components/ui/ThemeProvider'
import { colors, THEME_COLORS, spacing, borderRadius } from '../../constants/theme'

// ─── PRE-PREGNANCY HOME — exact match to cycle-home.html ────────────────────
function PrePregnancyHome() {
  const { colors: tc } = useAppTheme()
  const parentName = useJourneyStore((s) => s.parentName)

  const [lastPeriodStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 10)
    return toDateStr(d)
  })

  const cycleInfo = getCycleInfo({ lastPeriodStart, cycleLength: 28, periodLength: 5 })
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const greeting = getGreeting()

  return (
    <>
      {/* ── Header (matches HTML: header.shrink-0.pt-14.px-6) ── */}
      <View style={styles.preHeader}>
        <View>
          <Text style={styles.preLabel}>COSMIC CYCLE</Text>
          <Text style={styles.preName}>{greeting}, {parentName ?? 'Luna'}</Text>
        </View>
        <View style={styles.profileBtn}>
          <Ionicons name="person-outline" size={20} color="#FFFFFF" />
        </View>
      </View>

      {/* ── Moon Phase Ring (matches HTML: .relative.flex.justify-center py-10 min-h-320) ── */}
      <CyclePhaseRing cycleInfo={cycleInfo} />

      {/* ── Week Strip (matches HTML: .px-6.mb-8 flex space-x-4) ── */}
      <View style={{ marginBottom: 32 }}>
        <WeekStrip
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          cycleInfo={cycleInfo}
        />
      </View>

      {/* ── Hormone Chart (matches HTML: .bg-white/5.rounded-[32px].p-6.border) ── */}
      <View style={{ marginBottom: 32 }}>
        <HormoneChart cycleInfo={cycleInfo} />
      </View>

      {/* ── Daily Decode (matches HTML: .bg-gradient-to-br.from-white/10.rounded-[32px].p-6) ── */}
      <View style={styles.decodeCard}>
        {/* Purple glow blur (matches: .absolute.-right-6.-top-6.w-24.h-24.bg-B983FF.blur-40.opacity-20) */}
        <View style={styles.decodeGlow} />

        {/* Header row */}
        <View style={styles.decodeHeader}>
          <Text style={styles.decodeTitle}>YOUR DAILY DECODE</Text>
          <Text style={styles.decodeCycleDay}>Cycle Day {cycleInfo.cycleDay} of {cycleInfo.cycleLength}</Text>
        </View>

        {/* Body text (matches: .text-base.leading-relaxed.text-white/80) */}
        <Text style={styles.decodeText}>
          Your <Text style={{ color: THEME_COLORS.green, fontWeight: '700' }}>peak energy</Text> is here. {cycleInfo.phaseDescription}
          {cycleInfo.isFertile ? " It's the cosmic moment to connect, create, and share your light with the world." : ''}
        </Text>

        {/* Footer (matches: .mt-6.pt-4.border-t.border-white/5) */}
        <View style={styles.decodeFooter}>
          <View style={styles.decodeIcons}>
            <View style={[styles.decodeIconCircle, { backgroundColor: THEME_COLORS.pink }]}>
              <Ionicons name="sparkles" size={10} color="#1A1030" />
            </View>
            <View style={[styles.decodeIconCircle, { backgroundColor: '#B983FF', marginLeft: -8 }]}>
              <Ionicons name="moon" size={10} color="#1A1030" />
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/library')}
            style={styles.decodeLink}
          >
            <Text style={styles.decodeLinkText}>EXPLORE INSIGHTS</Text>
            <Ionicons name="arrow-forward" size={14} color={THEME_COLORS.pink} />
          </Pressable>
        </View>
      </View>
    </>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

// ─── PREGNANCY HOME ─────────────────────────────────────────────────────────
function PregnancyHome() {
  const weekNumber = useJourneyStore((s) => s.weekNumber) ?? 24
  const dueDate = useJourneyStore((s) => s.dueDate)

  return (
    <>
      <PregnancyWeekDisplay weekNumber={weekNumber} />
      <BabySizeCard weekNumber={weekNumber} dueDate={dueDate} />
      <DevelopmentInsight weekNumber={weekNumber} />
      <DailyPulse />
    </>
  )
}

// ─── KIDS HOME ──────────────────────────────────────────────────────────────
function KidsHome() {
  const { colors: tc } = useAppTheme()
  return (
    <>
      {/* Grandma Ball */}
      <GrandmaBall onPress={() => router.push('/(tabs)/library')} />

      {/* Quote */}
      <Text style={[styles.quote, { color: tc.text }]}>
        "How can I help{'\n'}you today, dear?"
      </Text>
      <Text style={[styles.quoteSubtitle, { color: tc.textSecondary }]}>
        Grandma AI is watching over your little one's rhythms and needs.
      </Text>

      {/* Pillar Grid */}
      <PillarGrid />
    </>
  )
}

// ─── MAIN EXPORT ────────────────────────────────────────────────────────────
export default function Home() {
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)

  return (
    <CosmicBackground>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {mode === 'pre-pregnancy' && <PrePregnancyHome />}
          {mode === 'pregnancy' && <PregnancyHome />}
          {mode === 'kids' && <KidsHome />}
        </View>
      </ScrollView>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing['2xl'],
  },
  content: {
    paddingTop: 24,
  },

  // Quotes (Kids + Pre-Preg)
  quote: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  quoteSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    maxWidth: 320,
    alignSelf: 'center',
  },

  // Pre-Preg globe
  preGlobeWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  preGlobe: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 4,
    borderColor: 'rgba(77,150,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
  },
  preGlobeInner: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  preSparkle: {
    position: 'absolute',
    bottom: 0,
    right: '30%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME_COLORS.pink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.background,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME_COLORS.green,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },

  // Getting Started cards
  startCard: {
    marginBottom: 14,
  },
  startCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  startCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  startCardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: -0.3,
    lineHeight: 24,
    marginBottom: 4,
  },
  startCardDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Pre-Pregnancy — exact match to cycle-home.html
  preHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: '#FF8AD8',
    marginBottom: 2,
  },
  preName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Daily Decode — exact match to HTML .bg-gradient-to-br.from-white/10.rounded-[32px].p-6
  decodeCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 48,
  },
  decodeGlow: {
    position: 'absolute',
    right: -24,
    top: -24,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#B983FF',
    opacity: 0.2,
  },
  decodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  decodeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  decodeCycleDay: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME_COLORS.yellow,
  },
  decodeText: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: 'rgba(255,255,255,0.8)',
  },
  decodeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  decodeIcons: {
    flexDirection: 'row',
  },
  decodeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1A1030',
  },
  decodeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  decodeLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME_COLORS.pink,
  },
})
