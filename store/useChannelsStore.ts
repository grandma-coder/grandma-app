import { create } from 'zustand'
import type { Channel, Thread } from '../lib/channels'

interface ChannelsStore {
  channels: Channel[]
  activeThreads: Thread[]
  loading: boolean
  setChannels: (channels: Channel[]) => void
  setActiveThreads: (threads: Thread[]) => void
  setLoading: (loading: boolean) => void
}

export const useChannelsStore = create<ChannelsStore>((set) => ({
  channels: [],
  activeThreads: [],
  loading: false,
  setChannels: (channels) => set({ channels }),
  setActiveThreads: (activeThreads) => set({ activeThreads }),
  setLoading: (loading) => set({ loading }),
}))
