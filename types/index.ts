export interface Child {
  id: string
  parentId: string
  name: string
  birthDate: string
  weightKg: number
  heightCm: number
  allergies: string[]
  medications: string[]
  countryCode: string
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

export type PillarId = 'milk' | 'food' | 'nutrition' | 'vaccines' | 'clothes' | 'recipes' | 'habits' | 'medicine' | 'milestones'

export interface Pillar {
  id: PillarId
  name: string
  icon: string
  description: string
  color: string
  tips: { label: string; text: string }[]
  suggestions: string[]
}

export type CaregiverRole = 'parent' | 'nanny' | 'family'
export type InviteStatus = 'pending' | 'accepted' | 'revoked'

export interface CaregiverPermissions {
  view: boolean
  log_activity: boolean
  chat: boolean
}

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