/** 'OTHER' or an uppercase ISO 3166-1 alpha-2 code (e.g. 'BR', 'DE'). */
export type Country = string

/** Placeholder codes geo headers send when the country is unknown (XX, ZZ); 'T1' (Tor) already fails the letters check. */
const UNKNOWN = new Set(['XX', 'ZZ'])

/** Country from Vercel's x-vercel-ip-country header; anything malformed, placeholder or missing becomes 'OTHER'. */
export function countryFromGeo(header: string | null | undefined): Country {
  const c = (header ?? '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(c) && !UNKNOWN.has(c) ? c : 'OTHER'
}

/** Where in the country a signup came from, as Vercel's geo headers tell it. Either part may be unknown. */
export interface Place { region: string | null; city: string | null }
export const NO_PLACE: Place = { region: null, city: null }

/**
 * Region from x-vercel-ip-country-region (the ISO 3166-2 subdivision code without the country, e.g. 'SP')
 * and city from x-vercel-ip-city (URL-encoded, e.g. 'S%C3%A3o%20Paulo'). Anything malformed becomes null.
 */
export function placeFromGeo(region: string | null | undefined, city: string | null | undefined): Place {
  const r = (region ?? '').trim().toUpperCase()
  let c: string
  try { c = decodeURIComponent(city ?? '') } catch { c = '' }
  c = c.replace(/[\u0000-\u001f\u007f]/g, '').trim()
  return { region: /^[A-Z0-9]{1,3}$/.test(r) ? r : null, city: c && c.length <= 80 ? c : null }
}
