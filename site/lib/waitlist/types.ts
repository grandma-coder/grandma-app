import type { Mode } from '@/lib/modes'
import type { Country, Place } from '@/lib/countries'
import type { Locale } from '@/i18n/routing'
export type WaitlistErrorCode = 'email_required' | 'email_invalid' | 'email_too_long' | 'name_too_long' | 'mode_required'
export type WaitlistField = 'email' | 'name' | 'mode'
export type WaitlistState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'invalid'; fieldErrors: Partial<Record<WaitlistField, WaitlistErrorCode>> }
  | { status: 'rate_limited' }
  | { status: 'error' }
export interface WaitlistRow {
  email: string; name: string | null; mode: Mode; locale: Locale; country: Country; notifyLaunch: boolean
  region: Place['region']; city: Place['city']
  utmSource: string | null; utmMedium: string | null; utmCampaign: string | null; referrer: string | null
}
export interface WaitlistDeps {
  join(row: WaitlistRow, ipHash: string | null): Promise<'ok' | 'rate_limited'>
  hashIp(ip: string | null): string | null
}
