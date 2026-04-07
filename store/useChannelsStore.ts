import { create } from 'zustand'
import type { Channel } from '../lib/channels'
import { getUnreadCounts } from '../lib/channelPosts'

interface ChannelsStore {
  channels: Channel[]
  loading: boolean
  unreadCounts: Record<string, number>
  setChannels: (channels: Channel[]) => void
  setLoading: (loading: boolean) => void
  fetchUnreadCounts: () => Promise<void>
  clearUnread: (channelId: string) => void
}

export const useChannelsStore = create<ChannelsStore>((set) => ({
  channels: [],
  loading: false,
  unreadCounts: {},
  setChannels: (channels) => set({ channels }),
  setLoading: (loading) => set({ loading }),
  fetchUnreadCounts: async () => {
    try {
      const counts = await getUnreadCounts()
      set({ unreadCounts: counts })
    } catch {}
  },
  clearUnread: (channelId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [channelId]: 0 },
    })),
}))
