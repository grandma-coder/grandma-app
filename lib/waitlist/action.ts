'use server'

import { headers } from 'next/headers'
import { submitWaitlist } from './submit'
import { countryFromGeo } from '@/lib/countries'
import { formDataToObject } from './schema'
import { waitlistDeps } from './supabase'
import type { WaitlistDeps, WaitlistState } from './types'

export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  const h = await headers()
  // Trusting the first x-forwarded-for hop is only safe on Vercel, which overwrites the header.
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
  const country = countryFromGeo(h.get('x-vercel-ip-country'))
  // Lazy deps: env is only read inside submitWaitlist's try, so honeypot/validation work and a config error returns { status: 'error' }.
  const lazy: WaitlistDeps = { hashIp: (i) => waitlistDeps().hashIp(i), join: (row, hash) => waitlistDeps().join(row, hash) }
  return submitWaitlist(formDataToObject(formData), ip, lazy, country)
}
