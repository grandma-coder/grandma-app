/**
 * Analytics / Vault Tab — renders behavior-specific variant.
 *
 * - pre-pregnancy → CycleAnalytics
 * - pregnancy → placeholder
 * - kids → placeholder
 *
 * Floating notification bell sits top-right above the inner screen.
 */

import { View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useModeStore } from '../../store/useModeStore'
import { CycleAnalytics } from '../../components/analytics/CycleAnalytics'
import { PregnancyAnalytics } from '../../components/analytics/PregnancyAnalytics'
import { KidsAnalytics } from '../../components/analytics/KidsAnalytics'
import { NotificationBell } from '../../components/ui/NotificationBell'

export default function VaultScreen() {
  const mode = useModeStore((s) => s.mode)
  const insets = useSafeAreaInsets()

  let inner
  if (mode === 'pre-pregnancy') inner = <CycleAnalytics />
  else if (mode === 'pregnancy') inner = <PregnancyAnalytics />
  else inner = <KidsAnalytics />

  return (
    <View style={styles.root}>
      {inner}
      <View style={[styles.bellWrap, { top: insets.top + 12 }]}>
        <NotificationBell />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bellWrap: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
})
