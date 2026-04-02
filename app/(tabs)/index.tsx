import { ScrollView, View, Text, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useChildStore } from '../../store/useChildStore'
import { useModeStore } from '../../store/useModeStore'
import { useJourneyStore } from '../../store/useJourneyStore'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { GlassCard } from '../../components/ui/GlassCard'
import { ModeSwitcher } from '../../components/home/ModeSwitcher'
import { GrandmaBall } from '../../components/home/GrandmaBall'
import { PillarGrid } from '../../components/home/PillarGrid'
import { NannyUpdatesFeed } from '../../components/home/NannyUpdatesFeed'
import { PregnancyWeekDisplay } from '../../components/home/PregnancyWeekDisplay'
import { BabySizeCard } from '../../components/home/BabySizeCard'
import { DevelopmentInsight } from '../../components/home/DevelopmentInsight'
import { DailyPulse } from '../../components/home/DailyPulse'
import { colors, THEME_COLORS, spacing, borderRadius } from '../../constants/theme'

// ─── PRE-PREGNANCY HOME ─────────────────────────────────────────────────────
function PrePregnancyHome() {
  return (
    <>
      {/* Globe */}
      <View style={styles.preGlobeWrapper}>
        <View style={[styles.preGlobe, { shadowColor: THEME_COLORS.blue }]}>
          <View style={styles.preGlobeInner}>
            <Ionicons name="help-circle-outline" size={72} color={THEME_COLORS.blue} style={{ opacity: 0.8 }} />
          </View>
        </View>
        <View style={styles.preSparkle}>
          <Ionicons name="sparkles" size={14} color="#000" />
        </View>
      </View>

      {/* Quote */}
      <Text style={styles.quote}>
        "Let's prepare for{'\n'}your journey, dear."
      </Text>
      <Text style={styles.quoteSubtitle}>
        Grandma AI is here to guide you through every step of preparing for parenthood.
      </Text>

      {/* Getting Started */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Getting Started</Text>
        <View style={styles.sectionLine} />
      </View>

      {/* Fertility card */}
      <GlassCard style={styles.startCard}>
        <View style={styles.startCardRow}>
          <View style={[styles.startCardIcon, { backgroundColor: 'rgba(255,138,216,0.1)', borderColor: 'rgba(255,138,216,0.2)' }]}>
            <Ionicons name="heart-outline" size={28} color={THEME_COLORS.pink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.startCardTitle}>Fertility &{'\n'}Preparation</Text>
            <Text style={styles.startCardDesc}>Nutrition, health checkups, and emotional readiness courses coming soon.</Text>
          </View>
        </View>
      </GlassCard>

      {/* Partner card */}
      <GlassCard style={styles.startCard}>
        <View style={styles.startCardRow}>
          <View style={[styles.startCardIcon, { backgroundColor: 'rgba(77,150,255,0.1)', borderColor: 'rgba(77,150,255,0.2)' }]}>
            <Ionicons name="people-outline" size={28} color={THEME_COLORS.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.startCardTitle}>Partner{'\n'}Connection</Text>
            <Text style={styles.startCardDesc}>Invite your partner to learn together and share the journey.</Text>
          </View>
        </View>
      </GlassCard>
    </>
  )
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
  return (
    <>
      {/* Grandma Ball */}
      <GrandmaBall onPress={() => router.push('/(tabs)/library')} />

      {/* Quote */}
      <Text style={styles.quote}>
        "How can I help{'\n'}you today, dear?"
      </Text>
      <Text style={styles.quoteSubtitle}>
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
        {/* Mode Switcher */}
        <ModeSwitcher />

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
})
