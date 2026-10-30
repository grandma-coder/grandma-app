import 'server-only'
import { headers } from 'next/headers'
import { countryFromGeo, type Country } from './countries'

export async function getDefaultCountry(locale: 'en' | 'pt'): Promise<Country> {
  const h = await headers()
  return countryFromGeo(h.get('x-vercel-ip-country'), locale)
}
