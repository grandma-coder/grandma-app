import { supabase } from './supabase'
import type { Child } from '../types'

interface ScanParams {
  imageBase64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
  scanType: string
  child?: Child | null
}

function getAgeInMonths(birthDate: string): number {
  const birth = new Date(birthDate)
  const now = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

export async function scanImage({ imageBase64, mediaType, scanType, child }: ScanParams): Promise<string> {
  const childContext = child ? {
    name: child.name,
    ageMonths: getAgeInMonths(child.birthDate),
    weightKg: child.weightKg,
    allergies: child.allergies,
    medications: child.medications,
  } : undefined

  const { data, error } = await supabase.functions.invoke('scan-image', {
    body: { imageBase64, mediaType, scanType, childContext },
  })

  if (error) throw new Error(error.message)
  if (!data?.reply) throw new Error('No response from Grandma')

  return data.reply as string
}
