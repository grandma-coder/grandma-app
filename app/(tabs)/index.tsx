/**
 * Home Screen — renders single dashboard based on currentBehavior.
 *
 * No switcher row, no floating indicator. Clean single dashboard.
 * Switching happens from Profile → My Journeys.
 */

import { ScrollView, View, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useModeStore } from '../../store/useModeStore'
import { useTheme, stickers } from '../../constants/theme'
import { CycleHome } from '../../components/home/CycleHome'
import { PregnancyHome } from '../../components/home/PregnancyHome'
import { KidsHome } from '../../components/home/KidsHome'
import { NotificationBell } from '../../components/ui/NotificationBell'
import { Display, DisplayItalic, Body } from '../../components/ui/Typography'
import { PillButton } from '../../components/ui/PillButton'
import { GrandmaLogo } from '../../components/ui/GrandmaLogo'

export default function Home() {
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const { colors, isDark } = useTheme()

  const bg = isDark ? colors.bg : '#F3ECD9'
  const ink = isDark ? colors.text : '#141313'
  const ink3 = isDark ? colors.textMuted : '#6E6763'

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Bell icon */}
      <View style={[styles.bellWrap, { top: insets.top + 12 }]}>
        <NotificationBell />
      </View>

      {/* Pregnancy gets its own full-width scroll (hero carousel needs SCREEN_W) */}
      {mode === 'pregnancy' && <PregnancyHome topInset={insets.top} />}

      {mode !== 'pregnancy' && (
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {mode === 'pre-pregnancy' && <CycleHome />}
        {mode === 'kids' && <KidsHome />}

        {/* Empty state — no behavior enrolled */}
        {!mode && (
          <View style={styles.emptyWrap}>
            <GrandmaLogo
              size={96}
              body={isDark ? stickers.yellow : '#F5D652'}
              outline={ink}
              accent={stickers.coral}
            />
            <Display size={28} align="center" color={ink} style={{ marginTop: 18 }}>
              Your journey starts
            </Display>
            <DisplayItalic size={28} align="center" color={ink}>
              here, dear.
            </DisplayItalic>
            <Body align="center" color={ink3} style={styles.emptyBody}>
              Choose your path — whether you are trying to conceive, expecting, or raising little ones. Grandma is here for it all.
            </Body>
            <PillButton
              label="Choose your journey →"
              onPress={() => router.push('/onboarding/journey')}
              variant="ink"
              style={{ marginTop: 20, alignSelf: 'stretch' }}
            />
          </View>
        )}
      </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bellWrap: { position: 'absolute', right: 20, zIndex: 10 },
  scroll: { paddingHorizontal: 20 },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 16,
  },
  emptyBody: {
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 320,
  },
})
