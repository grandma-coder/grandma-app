/**
 * Analytics / Vault Tab — renders behavior-specific variant.
 *
 * - pre-pregnancy → CycleAnalytics
 * - pregnancy → placeholder
 * - kids → placeholder
 */

import { View, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useModeStore } from '../../store/useModeStore'
import { CycleAnalytics } from '../../components/analytics/CycleAnalytics'
import { PregnancyAnalytics } from '../../components/analytics/PregnancyAnalytics'
import { KidsAnalytics } from '../../components/analytics/KidsAnalytics'

export default function VaultScreen() {
  const mode = useModeStore((s) => s.mode)

  // Exams are isolated per behavior — open the list locked to the active
  // journey. Cycle + kids reach exams from their home wallet card; pregnancy
  // analytics keeps an inline entry point (below), so no floating button is
  // needed on this tab (it collided with the analytics hero glyph).
  const examBehavior = mode === 'pre-pregnancy' ? 'pre-pregnancy' : mode === 'pregnancy' ? 'pregnancy' : 'kids'
  const handleExams = () => router.push(`/exams?behavior=${examBehavior}`)

  let inner
  if (mode === 'pre-pregnancy') inner = <CycleAnalytics />
  else if (mode === 'pregnancy') inner = <PregnancyAnalytics onExamsPress={handleExams} />
  else inner = <KidsAnalytics />

  return <View style={styles.root}>{inner}</View>
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
