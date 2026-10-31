import type { KidId } from '@/lib/demo'

export const KID_IDS: KidId[] = ['kenji', 'lua']
export type { KidFilter } from '@/lib/demo/reducer'

/** Which child a sheet or screen is about when the filter is "all". */
export const currentKid = (kid: 'all' | KidId): KidId => (kid === 'all' ? KID_IDS[0] : kid)
