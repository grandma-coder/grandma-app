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
import { useModeStore } from '../../store/useModeStore'
import { CycleCalendar } from '../../components/calendar/CycleCalendar'
import { PregnancyCalendar } from '../../components/calendar/PregnancyCalendar'
import { KidsCalendar } from '../../components/calendar/KidsCalendar'

export default function AgendaScreen() {
  const mode = useModeStore((s) => s.mode)

  let inner
  if (mode === 'pre-pregnancy') inner = <CycleCalendar />
  else if (mode === 'pregnancy') inner = <PregnancyCalendar />
  else inner = <KidsCalendar />

  // All three calendars render the notification bell inline in their own
  // header action cluster, so no floating bell is needed here.
  return <View style={styles.root}>{inner}</View>
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
