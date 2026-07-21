/**
 * Card-id vocabulary for caregiver sharing. These ids form a shared contract
 * that behavior homes + wallet builders (kidsWallet/weekWallet/cycleWallet)
 * wire into, so a shared-card allowlist maps 1:1 onto what those homes render.
 * Plus the new cross-behavior `essentials` card. UX metadata only — RLS is the boundary.
 */
import type { CaregiverRole, JourneyMode } from '../types'

export type CaregiverBehavior = 'kids' | 'pregnancy' | 'cycle'
export type SensitivityTier = 'safe' | 'child-health' | 'intimate'

export interface CaregiverCardMeta {
  id: string
  label: string
  tier: SensitivityTier
}

export const CAREGIVER_CARDS: Record<CaregiverBehavior, CaregiverCardMeta[]> = {
  kids: [
    { id: 'hero-tiles', label: 'Daily stats (sleep · mood · feeding)', tier: 'child-health' },
    { id: 'today-summary', label: 'Today at a glance', tier: 'child-health' },
    { id: 'vaccines', label: 'Vaccine schedule', tier: 'child-health' },
    { id: 'health', label: 'Health & care', tier: 'child-health' },
    { id: 'exams', label: 'Exams & lab results', tier: 'child-health' },
    { id: 'diaper', label: 'Diaper tracker', tier: 'child-health' },
    { id: 'growth_leap', label: 'Growth leaps', tier: 'child-health' },
    { id: 'reminders', label: 'Reminders', tier: 'child-health' },
    { id: 'ask_grandma', label: 'Ask Grandma', tier: 'safe' },
    { id: 'rewards', label: 'Rewards', tier: 'safe' },
    { id: 'essentials', label: 'Child essentials card', tier: 'safe' },
  ],
  pregnancy: [
    { id: 'week-hero', label: 'Baby this week', tier: 'child-health' },
    { id: 'daily_message', label: 'Daily message', tier: 'safe' },
    { id: 'today_summary', label: 'Today at a glance', tier: 'child-health' },
    { id: 'appointment', label: 'Appointments', tier: 'child-health' },
    { id: 'week_tip', label: 'Weekly tip', tier: 'safe' },
    { id: 'kicks', label: 'Kick count', tier: 'child-health' },
    { id: 'reminders', label: 'Reminders', tier: 'child-health' },
    { id: 'exams', label: 'Exams', tier: 'child-health' },
    { id: 'birth_guide', label: 'Birth guide', tier: 'safe' },
    { id: 'ask_grandma', label: 'Ask Grandma', tier: 'safe' },
    { id: 'rewards', label: 'Rewards', tier: 'safe' },
    { id: 'essentials', label: 'Essentials card', tier: 'safe' },
  ],
  cycle: [
    { id: 'journey_ring', label: 'Cycle phase & period timing', tier: 'child-health' },
    { id: 'daily_message', label: 'Daily message', tier: 'safe' },
    { id: 'today_summary', label: 'Intimate signals (BBT · LH · intercourse)', tier: 'intimate' },
    { id: 'reminders', label: 'Reminders', tier: 'child-health' },
    { id: 'pillars', label: 'Pillars', tier: 'safe' },
    { id: 'exams', label: 'Exams', tier: 'child-health' },
    { id: 'ask_grandma', label: 'Ask Grandma', tier: 'safe' },
    { id: 'rewards', label: 'Rewards', tier: 'safe' },
    { id: 'essentials', label: 'Essentials card', tier: 'safe' },
  ],
}

const NANNY_KIDS = ['hero-tiles', 'today-summary', 'diaper', 'reminders', 'essentials']
const FAMILY_KIDS = ['hero-tiles', 'essentials']
const PREGNANCY_WATCHER = ['week-hero', 'today_summary', 'essentials']
const CYCLE_WATCHER = ['journey_ring', 'essentials'] // never an intimate card

/**
 * Default shared-card set when `_shared_cards[behavior]` is absent. Parents get
 * every card; caregivers get a role-appropriate, privacy-safe default.
 */
export function roleDefaultCards(behavior: CaregiverBehavior, role: CaregiverRole): string[] {
  if (role === 'parent') return CAREGIVER_CARDS[behavior].map((c) => c.id)
  if (behavior === 'kids') return role === 'nanny' ? [...NANNY_KIDS] : [...FAMILY_KIDS]
  if (behavior === 'pregnancy') return [...PREGNANCY_WATCHER]
  return [...CYCLE_WATCHER]
}

/**
 * The CaregiverBehavior a home renders for a given journey mode. Pre-pregnancy
 * IS the cycle behavior (CycleHome is the pre-pregnancy home). Single source of
 * truth — mirrors the inline mapping in app/(tabs)/index.tsx.
 */
export function modeToBehavior(mode: JourneyMode): CaregiverBehavior {
  if (mode === 'kids') return 'kids'
  if (mode === 'pregnancy') return 'pregnancy'
  return 'cycle'
}
