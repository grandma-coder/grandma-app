import { supabase } from './supabase'

export type DocumentCategory = 'exams' | 'hospital' | 'insurance' | 'vaccines' | 'other'

export interface VaultDocument {
  id: string
  userId: string
  childId?: string
  category: DocumentCategory
  title: string
  filePath: string
  fileType?: string
  fileSizeBytes?: number
  notes?: string
  createdAt: string
}

export async function getDocuments(childId?: string): Promise<VaultDocument[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  let query = supabase
    .from('vault_documents')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (childId) {
    query = query.eq('child_id', childId)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((d: any) => ({
    id: d.id,
    userId: d.user_id,
    childId: d.child_id,
    category: d.category,
    title: d.title,
    filePath: d.file_path,
    fileType: d.file_type,
    fileSizeBytes: d.file_size_bytes,
    notes: d.notes,
    createdAt: d.created_at,
  }))
}

export async function uploadDocument(input: {
  childId?: string
  category: DocumentCategory
  title: string
  fileUri: string
  fileType?: string
  fileSizeBytes?: number
}): Promise<VaultDocument> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  // Upload file to Supabase Storage
  const ext = input.fileUri.split('.').pop() ?? 'dat'
  const path = `${user.id}/${Date.now()}.${ext}`

  const response = await fetch(input.fileUri)
  const blob = await response.blob()

  const { error: uploadError } = await supabase.storage
    .from('vault-documents')
    .upload(path, blob)

  if (uploadError) throw uploadError

  // Insert metadata
  const { data, error } = await supabase
    .from('vault_documents')
    .insert({
      user_id: user.id,
      child_id: input.childId ?? null,
      category: input.category,
      title: input.title,
      file_path: path,
      file_type: input.fileType ?? null,
      file_size_bytes: input.fileSizeBytes ?? null,
    })
    .select()
    .single()

  if (error) throw error

  return {
    id: data.id,
    userId: data.user_id,
    childId: data.child_id,
    category: data.category,
    title: data.title,
    filePath: data.file_path,
    fileType: data.file_type,
    fileSizeBytes: data.file_size_bytes,
    notes: data.notes,
    createdAt: data.created_at,
  }
}

export async function deleteDocument(documentId: string): Promise<void> {
  const { data: doc } = await supabase
    .from('vault_documents')
    .select('file_path')
    .eq('id', documentId)
    .single()

  if (doc?.file_path) {
    await supabase.storage.from('vault-documents').remove([doc.file_path])
  }

  await supabase.from('vault_documents').delete().eq('id', documentId)
}

export async function getEmergencyCard(childId: string) {
  const { data, error } = await supabase
    .from('emergency_cards')
    .select('*')
    .eq('child_id', childId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function saveEmergencyCard(childId: string, card: {
  bloodType?: string
  allergies?: string[]
  medicalConditions?: string[]
  primaryContactName?: string
  primaryContactPhone?: string
  pediatricianName?: string
  pediatricianPhone?: string
  insuranceProvider?: string
  insuranceNumber?: string
}) {
  const { data, error } = await supabase
    .from('emergency_cards')
    .upsert(
      { child_id: childId, ...card, updated_at: new Date().toISOString() },
      { onConflict: 'child_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}
