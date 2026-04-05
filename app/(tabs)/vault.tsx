/**
 * Analytics / Vault Tab — renders behavior-specific variant.
 *
 * - pre-pregnancy → CycleAnalytics
 * - pregnancy → placeholder
 * - kids → placeholder
 */

import { useModeStore } from '../../store/useModeStore'
import { CycleAnalytics } from '../../components/analytics/CycleAnalytics'
import { PregnancyAnalytics } from '../../components/analytics/PregnancyAnalytics'
import { KidsAnalytics } from '../../components/analytics/KidsAnalytics'

export default function VaultScreen() {
  const mode = useModeStore((s) => s.mode)

  if (mode === 'pre-pregnancy') return <CycleAnalytics />
  if (mode === 'pregnancy') return <PregnancyAnalytics />
  return <KidsAnalytics />
}
