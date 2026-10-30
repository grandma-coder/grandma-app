'use server'

import { headers } from 'next/headers'
import { submitWaitlist } from './submit'
import { formDataToObject } from './schema'
import { waitlistDeps } from './supabase'
import type { WaitlistState } from './types'

export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
  return submitWaitlist(formDataToObject(formData), ip, waitlistDeps())
}
