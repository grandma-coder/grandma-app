import { ScrollView, View, Text, StyleSheet } from 'react-native'
import { router } from 'expo-router'
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
import { GrandmaWisdom } from '../../components/home/GrandmaWisdom'
import { MomentsOfCare } from '../../components/home/MomentsOfCare'
import { MilkTracker } from '../../components/home/MilkTracker'
import { colors, typography, spacing } from '../../constants/theme'

function PrePregnancyHome() {
  return (
    <>
      <GrandmaBall onPress={() => router.push('/(tabs)/library')} />
      <Text style={styles.quote}>
        "Let's prepare for{'\n'}your journey, dear."
      </Text>
      <Text style={styles.quoteSubtitle}>
        Grandma AI is here to guide you through{'\n'}every step of preparing for parenthood.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Getting Started</Text>
        <GlassCard style={styles.learningCard}>
          <Text style={{ fontSize: 28, marginBottom: 8 }}>📚</Text>
          <Text style={styles.learningTitle}>Fertility & Preparation</Text>
          <Text style={styles.learningSubtitle}>
            Nutrition, health checkups, and emotional readiness courses coming soon.
          </Text>
        </GlassCard>

        <GlassCard style={styles.learningCard}>
          <Text style={{ fontSize: 28, marginBottom: 8 }}>💑</Text>
          <Text style={styles.learningTitle}>Partner Connection</Text>
          <Text style={styles.learningSubtitle}>
            Invite your partner to learn together and share the journey.
          </Text>
        </GlassCard>
      </View>
    </>
  )
}

function PregnancyHome() {
  const weekNumber = useJourneyStore((s) => s.weekNumber) ?? 24
  const dueDate = useJourneyStore((s) => s.dueDate)

  return (
    <>
      <PregnancyWeekDisplay weekNumber={weekNumber} />
      <BabySizeCard weekNumber={weekNumber} dueDate={dueDate} />
      <DevelopmentInsight weekNumber={weekNumber} />
      <DailyPulse />
      <GrandmaWisdom weekNumber={weekNumber} />
      <MilkTracker />
      <MomentsOfCare />
    </>
  )
}

function KidsHome() {
  const child = useChildStore((s) => s.activeChild)

  return (
    <>
      <GrandmaBall onPress={() => router.push('/(tabs)/library')} />
      <Text style={styles.quote}>
        "How can I help{'\n'}you today, dear?"
      </Text>
      <Text style={styles.quoteSubtitle}>
        Grandma AI is watching over your little one's{'\n'}rhythms and needs.
      </Text>

      <View style={styles.section}>
        <PillarGrid />
      </View>

      <View style={styles.section}>
        <NannyUpdatesFeed />
      </View>
    </>
  )
}

export default function Home() {
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const isPregnancy = mode === 'pregnancy'

  return (
    <CosmicBackground variant={isPregnancy ? 'pregnancy' : 'default'}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode Switcher */}
        <View style={styles.switcherRow}>
          <ModeSwitcher />
        </View>

        {/* Mode-specific content */}
        {mode === 'pre-pregnancy' && <PrePregnancyHome />}
        {mode === 'pregnancy' && <PregnancyHome />}
        {mode === 'kids' && <KidsHome />}
      </ScrollView>
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing['2xl'],
  },
  switcherRow: {
    marginBottom: 24,
  },
  quote: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 8,
  },
  quoteSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  learningCard: {
    marginBottom: 12,
  },
  learningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  learningSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
})
