/**
 * Analytics / Vault Tab — renders behavior-specific variant.
 *
 * - pre-pregnancy → CycleAnalytics
 * - pregnancy → placeholder
 * - kids → placeholder
 */

import { View, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { FlaskConical } from 'lucide-react-native'
import { useModeStore } from '../../store/useModeStore'
import { CycleAnalytics } from '../../components/analytics/CycleAnalytics'
import { PregnancyAnalytics } from '../../components/analytics/PregnancyAnalytics'
import { KidsAnalytics } from '../../components/analytics/KidsAnalytics'
import { useTheme } from '../../constants/theme'

export default function VaultScreen() {
  const mode = useModeStore((s) => s.mode)
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()

  // Exams are isolated per behavior — open the list locked to the active
  // journey so the vault's Exams entry never mixes behaviors.
  const examBehavior = mode === 'pre-pregnancy' ? 'pre-pregnancy' : mode === 'pregnancy' ? 'pregnancy' : 'kids'
  const handleExams = () => router.push(`/exams?behavior=${examBehavior}`)

  let inner
  if (mode === 'pre-pregnancy') inner = <CycleAnalytics />
  else if (mode === 'pregnancy') inner = <PregnancyAnalytics onExamsPress={handleExams} />
  else inner = <KidsAnalytics />

  const showFloatingExams = mode !== 'pregnancy'

  return (
    <View style={styles.root}>
      {inner}
      {showFloatingExams ? (
        <Pressable
          onPress={handleExams}
          hitSlop={10}
          style={({ pressed }) => [
            styles.examsBtn,
            {
              top: insets.top + 12,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <FlaskConical size={18} color={colors.text} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  examsBtn: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
})
