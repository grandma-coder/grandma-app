/**
 * createChild — the one write path for adding a child the user parents:
 * insert the `children` row, then the parent's own `child_caregivers` link
 * (what loads the child on the next launch — children RLS reads through it).
 * No link → the child row is rolled back, so a failure never leaves a child
 * that would vanish after a restart.
 *
 * Used by Profile → Kids → Add child and by the "Baby arrived" transition.
 */

import { supabase } from './supabase'
import type { ChildWithRole } from '../types'

export const PARENT_PERMISSIONS = { view: true, log_activity: true, chat: true, edit_child: true, emergency: true } as const

export interface NewChildInput {
  name: string
  birthDate: string
  sex?: string | null
  bloodType?: string | null
  allergies?: string[]
  medications?: string[]
  conditions?: string[]
  dietaryRestrictions?: string[]
  preferredFoods?: string[]
  dislikedFoods?: string[]
  pediatrician?: { name: string; phone: string; clinic: string } | null
  notes?: string | null
  countryCode?: string
  photoUrl?: string | null
}

export function mapDbChild(c: any): ChildWithRole {
  return {
    id: c.id,
    parentId: c.parent_id,
    name: c.name,
    birthDate: c.birth_date ?? '',
    weightKg: c.weight_kg ?? 0,
    heightCm: c.height_cm ?? 0,
    sex: c.sex ?? '',
    bloodType: c.blood_type ?? '',
    allergies: c.allergies ?? [],
    medications: c.medications ?? [],
    conditions: c.conditions ?? [],
    dietaryRestrictions: c.dietary_restrictions ?? [],
    preferredFoods: c.preferred_foods ?? [],
    dislikedFoods: c.disliked_foods ?? [],
    pediatrician: c.pediatrician ?? null,
    notes: c.notes ?? '',
    photoUrl: c.photo_url ?? null,
    countryCode: c.country_code ?? 'US',
    caregiverRole: 'parent',
    permissions: { view: true, log_activity: true, chat: true },
  }
}

/** Insert the child + the parent's caregiver link. Throws on failure (nothing left behind). */
export async function createChild(
  session: { user: { id: string; email?: string | null } },
  input: NewChildInput,
): Promise<ChildWithRole> {
  const { data, error } = await supabase.from('children').insert({
    parent_id: session.user.id,
    name: input.name.trim(),
    birth_date: input.birthDate,
    sex: input.sex || null,
    blood_type: input.bloodType || null,
    allergies: input.allergies ?? [],
    medications: input.medications ?? [],
    conditions: input.conditions ?? [],
    dietary_restrictions: input.dietaryRestrictions ?? [],
    preferred_foods: input.preferredFoods ?? [],
    disliked_foods: input.dislikedFoods ?? [],
    pediatrician: input.pediatrician ?? null,
    notes: input.notes?.trim() || null,
    country_code: input.countryCode ?? 'US',
    photo_url: input.photoUrl ?? null,
  }).select().single()

  if (error) throw error

  // The parent's own child_caregivers link is what loads this child on the next launch (the
  // parent_id fallback only runs when the user has no links at all). No link → roll back.
  const { error: linkError } = await supabase.from('child_caregivers').insert({
    child_id: data.id,
    user_id: session.user.id,
    email: session.user.email,
    role: 'parent',
    status: 'accepted',
    permissions: PARENT_PERMISSIONS,
    invited_by: session.user.id,
    accepted_at: new Date().toISOString(),
  })
  if (linkError) {
    await supabase.from('children').delete().eq('id', data.id)
    throw linkError
  }

  return mapDbChild(data)
}

/** Undo createChild (used when a later step of a multi-step transition fails). */
export async function deleteCreatedChild(childId: string): Promise<void> {
  await supabase.from('child_caregivers').delete().eq('child_id', childId)
  await supabase.from('children').delete().eq('id', childId)
}
