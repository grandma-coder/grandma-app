import { z } from 'zod'
import { MODES } from '@/lib/modes'
import { COUNTRIES } from '@/lib/countries'
import { routing } from '@/i18n/routing'
import type { WaitlistRow } from './types'

const optionalText = (max: number) => z.string().trim().max(max).optional().catch(undefined).transform((v) => v || null)

export const waitlistSchema = z
  .object({
    email: z.string({ required_error: 'email_required' }).trim().toLowerCase().min(1, 'email_required').max(254, 'email_too_long').email('email_invalid'),
    name: z.string().trim().max(80, 'name_too_long').optional().transform((v) => v || null),
    mode: z.enum(MODES, { errorMap: () => ({ message: 'mode_required' }) }),
    country: z.enum(COUNTRIES, { errorMap: () => ({ message: 'country_required' }) }),
    locale: z.enum(routing.locales).catch('en'),
    notify_launch: z.string().optional().transform((v) => v === 'on' || v === 'true'),
    utm_source: optionalText(200),
    utm_medium: optionalText(200),
    utm_campaign: optionalText(200),
    referrer: optionalText(200),
  })
  .transform((v): WaitlistRow => ({
    email: v.email, name: v.name, mode: v.mode, locale: v.locale, country: v.country, notifyLaunch: v.notify_launch,
    utmSource: v.utm_source, utmMedium: v.utm_medium, utmCampaign: v.utm_campaign, referrer: v.referrer,
  }))

export function formDataToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of fd.entries()) if (typeof v === 'string') out[k] = v
  return out
}
