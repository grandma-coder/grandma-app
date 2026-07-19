export interface Child {
  id: string
  parentId: string
  name: string
  birthDate: string
  weightKg: number
  heightCm: number
  sex: string
  bloodType: string
  allergies: string[]
  medications: string[]
  conditions: string[]
  dietaryRestrictions: string[]
  preferredFoods: string[]
  dislikedFoods: string[]
  pediatrician: { name: string; phone: string; clinic: string } | null
  notes: string
  countryCode: string
  photoUrl?: string | null
}

export interface Message {
  id: string
  childId: string
  pillarId: string | null
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export type JourneyMode = 'pre-pregnancy' | 'pregnancy' | 'kids'

// Kids pillars
export type KidsPillarId = 'milk' | 'food' | 'nutrition' | 'vaccines' | 'clothes' | 'recipes' | 'habits' | 'medicine' | 'milestones'
// Pregnancy pillars
export type PregnancyPillarId = 'week-by-week' | 'symptoms-relief' | 'birth-planning' | 'breastfeeding-prep' | 'baby-gear' | 'partner-support' | 'postpartum-prep' | 'pregnancy-nutrition' | 'emotional-wellness'
// Pre-pregnancy pillars
export type PrePregPillarId = 'fertility' | 'nutrition-prep' | 'emotional-readiness' | 'financial-planning' | 'partner-journey' | 'health-checkups'

export type PillarId = KidsPillarId | PregnancyPillarId | PrePregPillarId

export type CyclePhaseTag = 'menstruation' | 'follicular' | 'ovulation' | 'luteal'

export interface PillarTip {
  label: string
  text: string
  /** Pre-pregnancy: cycle phases when this tip is most relevant. */
  phases?: CyclePhaseTag[]
  /** Pregnancy: gestational week range [min, max] inclusive. */
  weekRange?: [number, number]
  /** Kids: child age in months [min, max] inclusive. */
  ageMonthsRange?: [number, number]
}

export interface Pillar {
  id: PillarId
  name: string
  icon: string
  description: string
  color: string
  intro?: string
  tips: PillarTip[]
  suggestions: string[]
}

export type CaregiverRole = 'parent' | 'nanny' | 'family'
export type InviteStatus = 'pending' | 'accepted' | 'revoked'

export interface CaregiverPermissions {
  view: boolean
  log_activity: boolean
  chat: boolean
  edit_child?: boolean
  emergency?: boolean
  // Meta keys stored in the same JSONB by the care-circle UI (not capabilities).
  _paused?: boolean
  _display_name?: string
  _photo_url?: string
  // Meta key: per-behavior UX allowlist of home card ids this caregiver sees.
  // Absent → fall back to role defaults. Never a security gate (RLS is).
  _shared_cards?: Partial<Record<'kids' | 'pregnancy' | 'cycle', string[]>>
}

/** Capability flags the owner can grant/withhold (excludes meta keys). */
export type CaregiverCapability =
  | 'view'
  | 'log_activity'
  | 'chat'
  | 'edit_child'
  | 'emergency'

export interface ChildCaregiver {
  id: string
  childId: string
  userId: string | null
  email: string
  role: CaregiverRole
  status: InviteStatus
  permissions: CaregiverPermissions
  inviteToken: string | null
  invitedBy: string
  createdAt: string
  acceptedAt: string | null
}

export interface ChildWithRole extends Child {
  caregiverRole: CaregiverRole
  permissions: CaregiverPermissions
}