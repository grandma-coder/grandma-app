/**
 * Analytics / Vault Tab — renders behavior-specific variant.
 *
 * - pre-pregnancy → CycleAnalytics
 * - pregnancy → placeholder
 * - kids → placeholder
 *
 * Floating notification bell sits top-right above the inner screen.
 */

import { View, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { FlaskConical } from 'lucide-react-native'
import { useModeStore } from '../../store/useModeStore'
import { CycleAnalytics } from '../../components/analytics/CycleAnalytics'
import { PregnancyAnalytics } from '../../components/analytics/PregnancyAnalytics'
import { KidsAnalytics } from '../../components/analytics/KidsAnalytics'
import { NotificationBell } from '../../components/ui/NotificationBell'
import { useTheme } from '../../constants/theme'

export default function VaultScreen() {
  const mode = useModeStore((s) => s.mode)
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()

  let inner
  if (mode === 'pre-pregnancy') inner = <CycleAnalytics />
  else if (mode === 'pregnancy') inner = <PregnancyAnalytics />
  else inner = <KidsAnalytics />

  // Kids analytics renders its own NotificationBell inside the header
  // (clustered with the info button) to avoid overlapping that button.
  const showFloatingBell = mode !== 'kids'

  return (
    <View style={styles.root}>
      {inner}
      {showFloatingBell && (
        <View style={[styles.bellWrap, { top: insets.top + 12 }]}>
          <NotificationBell />
        </View>
      )}
      <Pressable
        onPress={() => router.push('/exams')}
        hitSlop={10}
        style={({ pressed }) => [
          styles.examsBtn,
          {
            top: insets.top + 12,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.8 : 1,
          },
          !showFloatingBell && { right: 68 },
        ]}
      >
        <FlaskConical size={18} color={colors.text} strokeWidth={2} />
      </Pressable>
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
  examsBtn: {
    position: 'absolute',
    right: 64,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
})
