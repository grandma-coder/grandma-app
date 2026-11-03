import { createHash } from 'node:crypto'

/** One-way hash of the client IP for rate limiting. The raw IP is never stored. */
export function makeIpHasher(salt: string): (ip: string | null) => string | null {
  if (!salt) throw new Error('WAITLIST_IP_SALT is not set')
  return (ip) => (ip ? createHash('sha256').update(`${salt}:${ip}`).digest('hex') : null)
}
