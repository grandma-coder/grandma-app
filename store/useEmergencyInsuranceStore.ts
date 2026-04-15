/**
 * Emergency Contacts + Insurance Plans Store
 *
 * Intentionally NOT persisted: data is always fetched fresh from Supabase on
 * mount so it stays in sync with care circle edits and server-side changes.
 * Offline support is not a requirement for emergency/insurance data.
 * If offline support is added in future, wire up `persist` middleware with
 * the same AsyncStorage pattern as other stores — but ensure upsert logic
 * still reconciles correctly with the server copy.
 */

import { create } from 'zustand'
import type { EmergencyContact, InsurancePlan } from '../lib/emergencyInsurance'

interface EmergencyInsuranceStore {
  contacts: EmergencyContact[]
  plans: InsurancePlan[]
  loading: boolean

  setContacts: (contacts: EmergencyContact[]) => void
  addContact: (contact: EmergencyContact) => void
  updateContact: (contact: EmergencyContact) => void
  removeContact: (id: string) => void

  setPlans: (plans: InsurancePlan[]) => void
  addPlan: (plan: InsurancePlan) => void
  updatePlan: (plan: InsurancePlan) => void
  removePlan: (id: string) => void

  setLoading: (loading: boolean) => void
}

export const useEmergencyInsuranceStore = create<EmergencyInsuranceStore>((set) => ({
  contacts: [],
  plans: [],
  loading: false,

  setContacts: (contacts) => set({ contacts }),
  addContact: (contact) => set((s) => ({ contacts: [contact, ...s.contacts] })),
  updateContact: (contact) => set((s) => ({
    contacts: s.contacts.map((c) => (c.id === contact.id ? contact : c)),
  })),
  removeContact: (id) => set((s) => ({
    contacts: s.contacts.filter((c) => c.id !== id),
  })),

  setPlans: (plans) => set({ plans }),
  addPlan: (plan) => set((s) => ({ plans: [plan, ...s.plans] })),
  updatePlan: (plan) => set((s) => ({
    plans: s.plans.map((p) => (p.id === plan.id ? plan : p)),
  })),
  removePlan: (id) => set((s) => ({
    plans: s.plans.filter((p) => p.id !== id),
  })),

  setLoading: (loading) => set({ loading }),
}))
