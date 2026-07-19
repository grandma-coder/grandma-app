import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

export interface ChildEssentials {
  childName: string
  photoUrl: string | null
  allergies: string[]
  pediatricianName: string | null
  pediatricianPhone: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  insuranceProvider: string | null
  insuranceMemberId: string | null
  insurancePhone: string | null
}

type ChildRow = { name: string; photo_url: string | null; allergies: string[] | null; pediatrician: { name?: string; phone?: string } | null }
type ContactRow = { name: string; phone: string } | null
// `insurance_plans.provider_name` is the real column (not `provider` — see Step 0 verification).
type InsuranceRow = { provider_name: string; member_id: string | null; phone: string | null } | null

/** Pure mapper — unit-tested without the network. */
export function normalizeEssentials(child: ChildRow, contact: ContactRow, insurance: InsuranceRow): ChildEssentials {
  return {
    childName: child.name,
    photoUrl: child.photo_url ?? null,
    allergies: child.allergies ?? [],
    pediatricianName: child.pediatrician?.name ?? null,
    pediatricianPhone: child.pediatrician?.phone ?? null,
    emergencyContactName: contact?.name ?? null,
    emergencyContactPhone: contact?.phone ?? null,
    insuranceProvider: insurance?.provider_name ?? null,
    insuranceMemberId: insurance?.member_id ?? null,
    insurancePhone: insurance?.phone ?? null,
  }
}

export async function fetchChildEssentials(childId: string, ownerUserId: string): Promise<ChildEssentials> {
  const { data: child, error } = await supabase
    .from('children')
    .select('name, photo_url, allergies, pediatrician')
    .eq('id', childId)
    .single()
  if (error) throw error

  const { data: contact } = await supabase
    .from('emergency_contacts')
    .select('name, phone')
    .eq('user_id', ownerUserId)
    .eq('is_primary', true)
    .maybeSingle()

  const { data: insurance } = await supabase
    .from('insurance_plans')
    .select('provider_name, member_id, phone')
    .eq('user_id', ownerUserId)
    .limit(1)
    .maybeSingle()

  return normalizeEssentials(child as ChildRow, contact as ContactRow, insurance as InsuranceRow)
}

export function useChildEssentials(childId: string, ownerUserId: string) {
  return useQuery({
    queryKey: ['child-essentials', childId],
    queryFn: () => fetchChildEssentials(childId, ownerUserId),
    enabled: !!childId && !!ownerUserId,
  })
}
