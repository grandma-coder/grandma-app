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
import { useIsDiffuse, useScrollBottomInset } from '../../components/ui/diffuse/DiffuseKit'
import { CycleHome } from '../../components/home/CycleHome'
import { PregnancyHome } from '../../components/home/PregnancyHome'
import { KidsHome } from '../../components/home/KidsHome'
import {
  visibleCards, hasCapability, CAPABILITY, isCaregiver,
  type CaregiverView,
} from '../../lib/caregiverPermissions'
import type { CaregiverBehavior } from '../../lib/caregiverCards'
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
  const bottomInset = useScrollBottomInset()
  const { t } = useTranslation()

  // Under Diffuse the page canvas is the diffuse paper (matches the nav theme +
  // every other Diffuse screen); the current-system cream would read warmer and
  // clash. Ink stays from the active variant too.
  const bg = diffuse ? dt.colors.bg : colors.bg
  const ink = diffuse ? dt.colors.ink : colors.text
  const ink3 = diffuse ? dt.colors.ink3 : colors.textMuted

  // Caregiver surface: when the active child is one the user is a caregiver for
  // (not their own), the SAME behavior home renders — but filtered to the cards
  // the owner shared, with log entry points inert unless log_activity is granted
  // and the essentials card pinned. Gate on hydration so the caregiver's
  // permission-derived view never flashes the owner's full home on cold start.
  const isCaregiverContext = !!activeChild && activeChild.caregiverRole !== 'parent'
  if (isCaregiverContext && !caregiverHydrated) {
    return (
      <View style={[styles.root, styles.loaderRoot, { backgroundColor: bg }]}>
        <BrandedLoader label="Loading" />
      </View>
    )
  }

  // The active journey mode maps 1:1 to a caregiver behavior; pre-pregnancy is
  // the cycle behavior (CycleHome IS the pre-pregnancy home).
  const behavior: CaregiverBehavior =
    mode === 'kids' ? 'kids' : mode === 'pregnancy' ? 'pregnancy' : 'cycle'

  // Non-null only for a real caregiver relationship; owners get null → every
  // home renders exactly as before (its show() helper is true when this is null).
  const caregiverView: CaregiverView | null =
    isCaregiver(activeChild) && activeChild
      ? {
          visible: visibleCards(activeChild, behavior),
          canLog: hasCapability(activeChild, CAPABILITY.LOG_ACTIVITY),
          showFullEssentials: hasCapability(activeChild, CAPABILITY.EMERGENCY),
          ownerUserId: activeChild.parentId,
        }
      : null

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Pregnancy gets its own full-width scroll (hero carousel needs SCREEN_W) */}
      {mode === 'pregnancy' && <PregnancyHome topInset={insets.top} caregiverView={caregiverView} />}

      {/* Cycle brings its own ScrollView — render it standalone (like pregnancy)
          rather than nesting it inside the outer one. */}
      {mode === 'pre-pregnancy' && <CycleHome caregiverView={caregiverView} />}

      {mode !== 'pregnancy' && mode !== 'pre-pregnancy' && (
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: bottomInset },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {mode === 'kids' && <KidsHome caregiverView={caregiverView} />}

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
