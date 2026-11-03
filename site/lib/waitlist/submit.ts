import { waitlistSchema } from './schema'
import type { Country } from '@/lib/countries'
import type { WaitlistDeps, WaitlistErrorCode, WaitlistField, WaitlistState } from './types'

const FIELDS: WaitlistField[] = ['email', 'name', 'mode']

export async function submitWaitlist(raw: Record<string, string>, ip: string | null, deps: WaitlistDeps, country: Country): Promise<WaitlistState> {
  if (raw.company && raw.company.trim() !== '') return { status: 'success' }

  const parsed = waitlistSchema.safeParse(raw)
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>
    const fieldErrors: Partial<Record<WaitlistField, WaitlistErrorCode>> = {}
    for (const f of FIELDS) if (flat[f]?.[0]) fieldErrors[f] = flat[f]![0] as WaitlistErrorCode
    return { status: 'invalid', fieldErrors }
  }

  try {
    const result = await deps.join({ ...parsed.data, country }, deps.hashIp(ip))
    return result === 'rate_limited' ? { status: 'rate_limited' } : { status: 'success' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[waitlist] join failed:', message.replace(/[^\s@]+@[^\s@]+/g, '<email>'))
    return { status: 'error' }
  }
}
