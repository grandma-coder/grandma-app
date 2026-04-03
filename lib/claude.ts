import { supabase } from './supabase'
import type { Child, PillarId, JourneyMode } from '../types'

interface CallNanaParams {
  messages: { role: string; content: string }[]
  child?: Child | null
  pillarId?: PillarId
  mode?: JourneyMode
  weekNumber?: number | null
}

export async function callNana({ messages, child, pillarId, mode = 'kids', weekNumber }: CallNanaParams): Promise<string> {
  const childContext = child ? {
    name: child.name,
    ageMonths: getAgeInMonths(child.birthDate),
    weightKg: child.weightKg,
    allergies: child.allergies,
    medications: child.medications,
  } : undefined

  const { data, error } = await supabase.functions.invoke('nana-chat', {
    body: { messages, childContext, pillarId, mode, weekNumber },
  })

  if (error) throw new Error(error.message)
  if (!data?.reply) throw new Error('No response from Grandma')

  return data.reply as string
}

function getAgeInMonths(birthDate: string): number {
  const birth = new Date(birthDate)
  const now = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}