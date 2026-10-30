/** Launch countries: Brazil opens first, then the US. */
export const COUNTRIES = ['BR', 'US', 'OTHER'] as const
export type Country = (typeof COUNTRIES)[number]

/** Default for the form from Vercel's x-vercel-ip-country header, falling back by site language. */
export function countryFromGeo(header: string | null | undefined, locale: 'en' | 'pt'): Country {
  const c = (header ?? '').trim().toUpperCase()
  if (c === 'BR' || c === 'US') return c
  if (c) return 'OTHER'
  return locale === 'pt' ? 'BR' : 'OTHER'
}
