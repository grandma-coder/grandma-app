import { create } from 'zustand'
import type { Listing } from '../lib/exchange'

interface ExchangeStore {
  listings: Listing[]
  savedIds: Set<string>
  loading: boolean
  setListings: (listings: Listing[]) => void
  addListing: (listing: Listing) => void
  toggleSaved: (id: string) => void
  setLoading: (loading: boolean) => void
}

export const useExchangeStore = create<ExchangeStore>((set) => ({
  listings: [],
  savedIds: new Set(),
  loading: false,
  setListings: (listings) => set({ listings }),
  addListing: (listing) => set((state) => ({ listings: [listing, ...state.listings] })),
  toggleSaved: (id) => set((state) => {
    const next = new Set(state.savedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return { savedIds: next }
  }),
  setLoading: (loading) => set({ loading }),
}))
