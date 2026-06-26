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
import { Display, DisplayItalic, Body } from '../../components/ui/Typography'
import { PillButton } from '../../components/ui/PillButton'
import { GrandmaLogo } from '../../components/ui/GrandmaLogo'
import { useTranslation } from '../../lib/i18n'

export default function Home() {
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const { colors } = useTheme()
  const { t } = useTranslation()

  const bg = colors.bg
  const ink = colors.text
  const ink3 = colors.textMuted

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
