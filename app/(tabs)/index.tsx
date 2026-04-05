/**
 * Home Screen — renders single dashboard based on currentBehavior.
 *
 * No switcher row, no floating indicator. Clean single dashboard.
 * Switching happens from Profile → My Journeys.
 */

import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Sparkles } from 'lucide-react-native'
import { useModeStore } from '../../store/useModeStore'
import { useTheme } from '../../constants/theme'
import { CycleHome } from '../../components/home/CycleHome'
import { PregnancyHome } from '../../components/home/PregnancyHome'
import { KidsHome } from '../../components/home/KidsHome'
import { NotificationBell } from '../../components/ui/NotificationBell'

export default function Home() {
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const { colors, radius } = useTheme()

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Bell icon */}
      <View style={[styles.bellWrap, { top: insets.top + 12 }]}>
        <NotificationBell />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {mode === 'pre-pregnancy' && <CycleHome />}
        {mode === 'pregnancy' && <PregnancyHome />}
        {mode === 'kids' && <KidsHome />}

        {/* Empty state — no behavior enrolled */}
        {!mode && (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryTint }]}>
              <Sparkles size={36} color={colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Your journey starts here, dear.
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Choose your path — whether you are trying to conceive,
              expecting, or raising little ones. Grandma is here for it all.
            </Text>
            <Pressable
              onPress={() => router.push('/onboarding/journey')}
              style={({ pressed }) => [
                styles.emptyBtn,
                { backgroundColor: colors.primary, borderRadius: radius.lg },
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={styles.emptyBtnText}>Choose Your Journey</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bellWrap: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  scroll: {
    paddingHorizontal: 20,
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 16,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  emptyBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  emptyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
