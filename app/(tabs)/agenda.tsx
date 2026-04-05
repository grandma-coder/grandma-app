/**
 * Agenda/Calendar Tab — renders behavior-specific variant.
 *
 * - pre-pregnancy → CycleCalendar (cycle tracking calendar)
 * - pregnancy → placeholder (coming soon)
 * - kids → placeholder (coming soon)
 */

import { useModeStore } from '../../store/useModeStore'
import { CycleCalendar } from '../../components/calendar/CycleCalendar'
import { PregnancyCalendar } from '../../components/calendar/PregnancyCalendar'
import { KidsCalendar } from '../../components/calendar/KidsCalendar'

export default function AgendaScreen() {
  const mode = useModeStore((s) => s.mode)

  if (mode === 'pre-pregnancy') return <CycleCalendar />
  if (mode === 'pregnancy') return <PregnancyCalendar />
  return <KidsCalendar />
}
