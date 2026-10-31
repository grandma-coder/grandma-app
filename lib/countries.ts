/** 'OTHER' or an uppercase ISO 3166-1 alpha-2 code (e.g. 'BR', 'DE'). */
export type Country = string

/** Country from Vercel's x-vercel-ip-country header; anything malformed or missing becomes 'OTHER'. */
export function countryFromGeo(header: string | null | undefined): Country {
  const c = (header ?? '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(c) ? c : 'OTHER'
}
