import { useProfile } from '../lib/useProfile'
import { useJourneyStore } from '../store/useJourneyStore'
import { isMinor } from '../lib/ageRules'

/** True when the signed-in user's known birth date makes them under 18 (see lib/ageRules). */
export function useIsMinor(): boolean {
  const { data: profile } = useProfile()
  const localDob = useJourneyStore((s) => s.parentDob)
  return isMinor(profile?.dob ?? localDob)
}
