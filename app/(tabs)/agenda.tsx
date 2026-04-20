/**
 * Agenda/Calendar Tab — renders behavior-specific variant.
 *
 * - pre-pregnancy → CycleCalendar (cycle tracking calendar)
 * - pregnancy → placeholder (coming soon)
 * - kids → placeholder (coming soon)
 *
 * Floating notification bell sits top-right above the inner screen.
 */

import { View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useModeStore } from '../../store/useModeStore'
import { CycleCalendar } from '../../components/calendar/CycleCalendar'
import { PregnancyCalendar } from '../../components/calendar/PregnancyCalendar'
import { KidsCalendar } from '../../components/calendar/KidsCalendar'
import { NotificationBell } from '../../components/ui/NotificationBell'

export default function AgendaScreen() {
  const mode = useModeStore((s) => s.mode)
  const insets = useSafeAreaInsets()

  let inner
  if (mode === 'pre-pregnancy') inner = <CycleCalendar />
  else if (mode === 'pregnancy') inner = <PregnancyCalendar />
  else inner = <KidsCalendar />

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
