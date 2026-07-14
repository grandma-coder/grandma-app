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
import { useChildStore } from '../../store/useChildStore'
import { useCaregiverStore } from '../../store/useCaregiverStore'
import { useTheme, useDiffuseTheme, stickers } from '../../constants/theme'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { CycleHome } from '../../components/home/CycleHome'
import { PregnancyHome } from '../../components/home/PregnancyHome'
import { KidsHome } from '../../components/home/KidsHome'
import { CaregiverHome } from '../../components/caregiver/CaregiverHome'
import { Display, DisplayItalic, Body } from '../../components/ui/Typography'
import { PillButton } from '../../components/ui/PillButton'
import { GrandmaLogo } from '../../components/ui/GrandmaLogo'
import { BrandedLoader } from '../../components/ui/BrandedLoader'
import { useTranslation } from '../../lib/i18n'

export default function Home() {
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const activeChild = useChildStore((s) => s.activeChild)
  const caregiverHydrated = useCaregiverStore((s) => s.hydrated)
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()

  // Under Diffuse the page canvas is the diffuse paper (matches the nav theme +
  // every other Diffuse screen); the current-system cream would read warmer and
  // clash. Ink stays from the active variant too.
  const bg = diffuse ? dt.colors.bg : colors.bg
  const ink = diffuse ? dt.colors.ink : colors.text
  const ink3 = diffuse ? dt.colors.ink3 : colors.textMuted

  // Caregiver surface: when the active child is one the user is a caregiver for
  // (not their own), render the scoped caregiver home instead of the owner
  // dashboard. Gate on hydration so the persona never flashes on cold start.
  const isCaregiverContext = !!activeChild && activeChild.caregiverRole !== 'parent'
  if (isCaregiverContext) {
    if (!caregiverHydrated) {
      return (
        <View style={[styles.root, styles.loaderRoot, { backgroundColor: bg }]}>
          <BrandedLoader label="Loading" />
        </View>
      )
    }
    return (
      <View style={[styles.root, { backgroundColor: bg }]}>
        <CaregiverHome />
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Pregnancy gets its own full-width scroll (hero carousel needs SCREEN_W) */}
      {mode === 'pregnancy' && <PregnancyHome topInset={insets.top} />}

      {/* Cycle brings its own ScrollView — render it standalone (like pregnancy)
          rather than nesting it inside the outer one. */}
      {mode === 'pre-pregnancy' && <CycleHome />}

      {mode !== 'pregnancy' && mode !== 'pre-pregnancy' && (
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {mode === 'kids' && <KidsHome />}

        {/* Empty state — no behavior enrolled */}
        {!mode && (
          <View style={styles.emptyWrap}>
            <GrandmaLogo
              size={96}
              palette="sunny"
              outline={ink}
              motion="default"
            />
            <Display size={28} align="center" color={ink} style={{ marginTop: 18 }}>
              {t('tabsHome_journeyStarts1')}
            </Display>
            <DisplayItalic size={28} align="center" color={ink}>
              {t('tabsHome_journeyStarts2')}
            </DisplayItalic>
            <Body align="center" color={ink3} style={styles.emptyBody}>
              {t('tabsHome_journeyBody')}
            </Body>
            <PillButton
              label={t('tabsHome_chooseJourney')}
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
  loaderRoot: { alignItems: 'center', justifyContent: 'center' },
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
