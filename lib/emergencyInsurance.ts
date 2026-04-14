/**
 * Emergency Contacts + Insurance Plans — Supabase CRUD + card scan via Claude Vision
 */

import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { Alert } from 'react-native'
import { supabase } from './supabase'

// ─── Types ──────────────────────────────────────────────────────────────────

export type ContactRelationship =
  | 'spouse'
  | 'parent'
  | 'sibling'
  | 'friend'
  | 'doctor'
  | 'neighbor'
  | 'other'

export interface EmergencyContact {
  id: string
  userId: string
  name: string
  relationship: ContactRelationship
  phone: string
  email: string | null
  isPrimary: boolean
  notes: string | null
  sortOrder: number
  createdAt: string
}

export type InsurancePlanType = 'health' | 'dental' | 'vision'

export interface InsurancePlan {
  id: string
  userId: string
  planType: InsurancePlanType
  providerName: string
  planName: string | null
  policyNumber: string | null
  groupNumber: string | null
  memberId: string | null
  phone: string | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  createdAt: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapContact(row: any): EmergencyContact {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    relationship: row.relationship,
    phone: row.phone,
    email: row.email,
    isPrimary: row.is_primary ?? false,
    notes: row.notes,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  }
}

function mapPlan(row: any): InsurancePlan {
  return {
    id: row.id,
    userId: row.user_id,
    planType: row.plan_type,
    providerName: row.provider_name,
    planName: row.plan_name,
    policyNumber: row.policy_number,
    groupNumber: row.group_number,
    memberId: row.member_id,
    phone: row.phone,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

// ─── Emergency Contacts ─────────────────────────────────────────────────────

export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('user_id', user.id)
    .order('is_primary', { ascending: false })
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []).map(mapContact)
}

export async function upsertEmergencyContact(contact: {
  id?: string
  name: string
  relationship: ContactRelationship
  phone: string
  email?: string | null
  isPrimary?: boolean
  notes?: string | null
}): Promise<EmergencyContact> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  // If marking as primary, unset any existing primary
  if (contact.isPrimary) {
    await supabase
      .from('emergency_contacts')
      .update({ is_primary: false })
      .eq('user_id', user.id)
      .eq('is_primary', true)
  }

  const row = {
    ...(contact.id ? { id: contact.id } : {}),
    user_id: user.id,
    name: contact.name,
    relationship: contact.relationship,
    phone: contact.phone,
    email: contact.email ?? null,
    is_primary: contact.isPrimary ?? false,
    notes: contact.notes ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('emergency_contacts')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single()

  if (error) throw error
  return mapContact(data)
}

export async function deleteEmergencyContact(id: string): Promise<void> {
  const { error } = await supabase
    .from('emergency_contacts')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ─── Insurance Plans ────────────────────────────────────────────────────────

export async function getInsurancePlans(): Promise<InsurancePlan[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('insurance_plans')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapPlan)
}

export async function upsertInsurancePlan(plan: {
  id?: string
  planType: InsurancePlanType
  providerName: string
  planName?: string | null
  policyNumber?: string | null
  groupNumber?: string | null
  memberId?: string | null
  phone?: string | null
  startDate?: string | null
  endDate?: string | null
  notes?: string | null
}): Promise<InsurancePlan> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const row = {
    ...(plan.id ? { id: plan.id } : {}),
    user_id: user.id,
    plan_type: plan.planType,
    provider_name: plan.providerName,
    plan_name: plan.planName ?? null,
    policy_number: plan.policyNumber ?? null,
    group_number: plan.groupNumber ?? null,
    member_id: plan.memberId ?? null,
    phone: plan.phone ?? null,
    start_date: plan.startDate ?? null,
    end_date: plan.endDate ?? null,
    notes: plan.notes ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('insurance_plans')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single()

  if (error) throw error
  return mapPlan(data)
}

export async function deleteInsurancePlan(id: string): Promise<void> {
  const { error } = await supabase
    .from('insurance_plans')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ─── Insurance Card Scan (Claude Vision) ────────────────────────────────────

export interface ScannedCardData {
  providerName: string | null
  planName: string | null
  planType: InsurancePlanType
  policyNumber: string | null
  groupNumber: string | null
  memberId: string | null
  phone: string | null
}

/**
 * Pick an image (camera or gallery) and scan it with Claude Vision
 * to extract insurance card fields.
 */
export async function pickAndScanInsuranceCard(
  useCamera: boolean
): Promise<ScannedCardData | null> {
  // Request permission
  const permissionFn = useCamera
    ? ImagePicker.requestCameraPermissionsAsync
    : ImagePicker.requestMediaLibraryPermissionsAsync

  const { granted } = await permissionFn()
  if (!granted) {
    Alert.alert(
      'Permission needed',
      `Please allow ${useCamera ? 'camera' : 'photo library'} access to scan your card.`
    )
    return null
  }

  // Launch picker
  const launchFn = useCamera
    ? ImagePicker.launchCameraAsync
    : ImagePicker.launchImageLibraryAsync

  const result = await launchFn({
    mediaTypes: ['images'],
    quality: 0.8,
    base64: false,
  })

  if (result.canceled || !result.assets[0]) return null

  const uri = result.assets[0].uri

  // Compress & encode
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  )

  if (!manipulated.base64) throw new Error('Failed to encode image')

  // Call edge function
  const { data, error } = await supabase.functions.invoke('scan-image', {
    body: {
      imageBase64: manipulated.base64,
      mediaType: 'image/jpeg',
      scanType: 'insurance_card',
    },
  })

  if (error) throw new Error(error.message)
  if (!data?.reply) throw new Error('No response from scan')

  // Parse JSON from Claude's response
  const raw = (data.reply as string).trim()
  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

  let parsed: any
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Could not read card details. Please try again with a clearer photo.')
  }

  return {
    providerName: parsed.provider_name ?? null,
    planName: parsed.plan_name ?? null,
    planType: (['health', 'dental', 'vision'].includes(parsed.plan_type) ? parsed.plan_type : 'health') as InsurancePlanType,
    policyNumber: parsed.policy_number ?? null,
    groupNumber: parsed.group_number ?? null,
    memberId: parsed.member_id ?? null,
    phone: parsed.phone ?? null,
  }
}
