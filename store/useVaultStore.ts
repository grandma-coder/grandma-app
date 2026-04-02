import { create } from 'zustand'
import type { VaultDocument } from '../lib/vault'
import type { EmergencyCardData } from '../components/vault/EmergencyCard'

interface VaultStore {
  documents: VaultDocument[]
  emergencyCard: EmergencyCardData | null
  loading: boolean
  setDocuments: (docs: VaultDocument[]) => void
  addDocument: (doc: VaultDocument) => void
  removeDocument: (id: string) => void
  setEmergencyCard: (card: EmergencyCardData | null) => void
  setLoading: (loading: boolean) => void
}

export const useVaultStore = create<VaultStore>((set) => ({
  documents: [],
  emergencyCard: null,
  loading: false,
  setDocuments: (documents) => set({ documents }),
  addDocument: (doc) => set((state) => ({ documents: [doc, ...state.documents] })),
  removeDocument: (id) => set((state) => ({ documents: state.documents.filter((d) => d.id !== id) })),
  setEmergencyCard: (emergencyCard) => set({ emergencyCard }),
  setLoading: (loading) => set({ loading }),
}))
