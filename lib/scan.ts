import { supabase } from './supabase'
import type { Child } from '../types'

/** Thrown when the server rejects a scan because the free-tier limit is reached.
 *  The scan screen catches this and routes to the paywall. */
export class ScanLimitReachedError extends Error {
  constructor() {
    super('Free scan limit reached')
    this.name = 'ScanLimitReachedError'
  }
}

interface PregnancyScanContext {
  weekNumber: number | null
  dueDate: string | null
  allergies?: string[]
  conditions?: string[]
}

interface ScanParams {
  imageBase64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
  scanType: string
  child?: Child | null
  pregnancy?: PregnancyScanContext | null
}

function getAgeInMonths(birthDate: string): number {
  const birth = new Date(birthDate)
  const now = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

export async function scanImage({ imageBase64, mediaType, scanType, child, pregnancy }: ScanParams): Promise<string> {
  const childContext = child ? {
    name: child.name,
    ageMonths: getAgeInMonths(child.birthDate),
    weightKg: child.weightKg,
    allergies: child.allergies,
    medications: child.medications,
  } : undefined

  const pregnancyContext = pregnancy ?? undefined

  const { data, error } = await supabase.functions.invoke('scan-image', {
    body: { imageBase64, mediaType, scanType, childContext, pregnancyContext },
  })

  if (error) {
    // The edge function enforces the free-tier quota and returns 402 with
    // { code: 'scan_limit_reached' }. Surface it as a typed error so the
    // caller can route to the paywall instead of showing a generic failure.
    const status = (error as { context?: Response }).context?.status
    if (status === 402) throw new ScanLimitReachedError()
    throw new Error(error.message)
  }
  if (!data?.reply) throw new Error('No response from Grandma')

  return data.reply as string
}
