import { create } from 'zustand'
import type { VaultDocument } from '../lib/vault'

// Emergency-card data shape (the standalone EmergencyCard component was removed
// as dead code; the data model lives here, its canonical consumer).
export interface EmergencyCardData {
  bloodType?: string
  allergies?: string[]
  medicalConditions?: string[]
  primaryContactName?: string
  primaryContactPhone?: string
  pediatricianName?: string
  pediatricianPhone?: string
}

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
