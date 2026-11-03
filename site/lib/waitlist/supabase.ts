import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { makeIpHasher } from './hash'
import type { WaitlistDeps } from './types'

const required = (name: string) => { const v = process.env[name]; if (!v) throw new Error(`${name} is not set`); return v }
let cached: WaitlistDeps | null = null

// Own names, not SUPABASE_*: those belong to the Vercel Supabase integration (another project) and get
// rewritten by it. The waitlist writes to the command center's project.

export function waitlistDeps(): WaitlistDeps {
  if (cached) return cached
  const supabase = createClient(required('WAITLIST_SUPABASE_URL'), required('WAITLIST_SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } })
  cached = {
    hashIp: makeIpHasher(required('WAITLIST_IP_SALT')),
    async join(row, ipHash) {
      const args = {
        p_email: row.email, p_name: row.name, p_mode: row.mode, p_locale: row.locale, p_country: row.country,
        p_notify_launch: row.notifyLaunch, p_utm_source: row.utmSource, p_utm_medium: row.utmMedium,
        p_utm_campaign: row.utmCampaign, p_referrer: row.referrer, p_ip_hash: ipHash,
      }
      let { data, error } = await supabase.rpc('waitlist_join', { ...args, p_region: row.region, p_city: row.city })
      // Until migration 0019 is applied the function has no p_region/p_city (PostgREST: PGRST202, no matching
      // function); join without them rather than losing the signup.
      if (error?.code === 'PGRST202') ({ data, error } = await supabase.rpc('waitlist_join', args))
      if (error) throw new Error(`waitlist_join: ${error.code} ${error.message}`)
      return data === 'rate_limited' ? 'rate_limited' : 'ok'
    },
  }
  return cached
}
