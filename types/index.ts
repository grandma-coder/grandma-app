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

export type PillarId = 'milk' | 'food' | 'nutrition' | 'vaccines' | 'clothes' | 'recipes' | 'natural' | 'medicine'

export interface Pillar {
  id: PillarId
  name: string
  icon: string
  description: string
  color: string
  tips: { label: string; text: string }[]
  suggestions: string[]
}