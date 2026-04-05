/**
 * Home Screen — renders behavior-specific variant.
 *
 * Detects active mode from useModeStore and renders:
 * - pre-pregnancy → CycleHome
 * - pregnancy → PregnancyHome
 * - kids → KidsHome
 */

import { ScrollView, View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useModeStore } from '../../store/useModeStore'
import { useTheme } from '../../constants/theme'
import { CycleHome } from '../../components/home/CycleHome'
import { PregnancyHome } from '../../components/home/PregnancyHome'
import { KidsHome } from '../../components/home/KidsHome'
import { NotificationBell } from '../../components/ui/NotificationBell'

export default function Home() {
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const { colors } = useTheme()

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
})
