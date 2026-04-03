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

// ─── PRE-PREGNANCY HOME ─────────────────────────────────────────────────────
function PrePregnancyHome() {
  const { colors: tc } = useAppTheme()
  const parentName = useJourneyStore((s) => s.parentName)
  const [waterGlasses, setWaterGlasses] = useState(0)

  // Cycle info — using a demo last period start for now
  // In production this comes from cycle_logs in Supabase
  const [lastPeriodStart] = useState(() => {
    // Default: assume period started 10 days ago for demo
    const d = new Date()
    d.setDate(d.getDate() - 10)
    return toDateStr(d)
  })

  const cycleInfo = getCycleInfo({ lastPeriodStart, cycleLength: 28, periodLength: 5 })
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))

  const greeting = getGreeting()

  return (
    <>
      {/* Header */}
      <View style={styles.preHeader}>
        <View>
          <Text style={[styles.preLabel, { color: THEME_COLORS.pink }]}>COSMIC CYCLE</Text>
          <Text style={[styles.preName, { color: tc.text }]}>
            {greeting}, {parentName ?? 'Dear'}
          </Text>
        </View>
      </View>

      {/* Moon Phase Ring */}
      <CyclePhaseRing cycleInfo={cycleInfo} />

      {/* Horizontal Week Strip */}
      <WeekStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        cycleInfo={cycleInfo}
      />

      {/* Hormone Rhythm Chart */}
      <View style={{ marginTop: 16 }}>
        <HormoneChart cycleInfo={cycleInfo} />
      </View>

      {/* Daily Decode */}
      <GlassCard style={{ ...styles.decodeCard, marginTop: 16 }}>
        <View style={styles.decodeGlow} />
        <View style={styles.decodeHeader}>
          <Text style={[styles.decodeTitle, { color: tc.text }]}>YOUR DAILY DECODE</Text>
          <Text style={[styles.decodeCycleDay, { color: THEME_COLORS.yellow }]}>
            Cycle Day {cycleInfo.cycleDay} of {cycleInfo.cycleLength}
          </Text>
        </View>
        <Text style={[styles.decodeText, { color: 'rgba(255,255,255,0.8)' }]}>
          {cycleInfo.phaseDescription}
          {cycleInfo.isFertile ? ' This is your fertile window — peak time to conceive!' : ''}
        </Text>
        <View style={styles.decodeFooter}>
          <View style={styles.decodeIcons}>
            <View style={[styles.decodeIconCircle, { backgroundColor: THEME_COLORS.pink }]}>
              <Ionicons name="sparkles" size={12} color="#1A1030" />
            </View>
            <View style={[styles.decodeIconCircle, { backgroundColor: '#B983FF' }]}>
              <Ionicons name="moon" size={12} color="#1A1030" />
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
      </GlassCard>

      {/* Health Dashboard */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={styles.sectionLabel}>Health Tracking</Text>
        <View style={[styles.sectionLine, { backgroundColor: tc.border }]} />
      </View>
      <HealthDashboard
        waterGlasses={waterGlasses}
        onAddWater={() => setWaterGlasses((prev) => Math.min(prev + 1, 12))}
      />

      {/* Daily Insights */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={styles.sectionLabel}>Daily Insights</Text>
        <View style={[styles.sectionLine, { backgroundColor: tc.border }]} />
      </View>
      <DailyInsights
        cycleInfo={cycleInfo}
        onLogSymptoms={() => router.push('/(tabs)/agenda')}
        onAskGrandma={(q) => router.push({ pathname: '/(tabs)/library', params: { suggestion: q } })}
      />
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

  // Pre-Pregnancy new styles
  preHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  preLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  preName: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  // Daily Decode card
  decodeCard: {
    position: 'relative',
    overflow: 'hidden',
  },
  decodeGlow: {
    position: 'absolute',
    right: -24,
    top: -24,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#B983FF',
    opacity: 0.12,
  },
  decodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  decodeTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  decodeCycleDay: {
    fontSize: 11,
    fontWeight: '700',
  },
  decodeText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  decodeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  decodeIcons: {
    flexDirection: 'row',
    marginLeft: -4,
  },
  decodeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1A1030',
    marginLeft: -8,
  },
  decodeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  decodeLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME_COLORS.pink,
    letterSpacing: 0.5,
  },
})
