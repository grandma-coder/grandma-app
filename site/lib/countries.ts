/** 'OTHER' or an uppercase ISO 3166-1 alpha-2 code (e.g. 'BR', 'DE'). */
export type Country = string

/** Placeholder codes geo headers send when the country is unknown (XX, ZZ); 'T1' (Tor) already fails the letters check. */
const UNKNOWN = new Set(['XX', 'ZZ'])

/** Country from Vercel's x-vercel-ip-country header; anything malformed, placeholder or missing becomes 'OTHER'. */
export function countryFromGeo(header: string | null | undefined): Country {
  const c = (header ?? '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(c) && !UNKNOWN.has(c) ? c : 'OTHER'
}
