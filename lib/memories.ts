/**
 * Memories — per-behavior photo memories helper.
 *
 * Cycle, pregnancy, and kids each store memory photos in their OWN table
 * with divergent column names (see table below). This module hides that
 * divergence behind one `Memory` shape + one hook/mutation surface.
 *
 *   cycle:      cycle_logs      — date,     type,     type='memory', scope: user_id
 *   pregnancy:  pregnancy_logs  — log_date, log_type, log_type='memory', scope: user_id
 *   kids:       child_logs      — date,     type,     type='photo' (existing convention,
 *                                  see app/profile/memories.tsx), scope: child_id (active child)
 *
 * Migration `20260719210000_memories_per_behavior.sql` adds `photos text[]`
 * + a 'memory' type to cycle_logs & pregnancy_logs. child_logs already has
 * photos + a free-text type column.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as ImageManipulator from 'expo-image-manipulator'
import { supabase } from './supabase'
import { useChildStore } from '../store/useChildStore'

export type MemoryBehavior = 'cycle' | 'pregnancy' | 'kids'

export interface Memory {
  id: string
  date: string
  photos: string[]
  caption: string // notes column
}

// ─── Pure table-mapping core (unit-test target) ────────────────────────────

export interface MemoryTableConfig {
  table: 'cycle_logs' | 'pregnancy_logs' | 'child_logs'
  dateCol: 'date' | 'log_date'
  typeCol: 'type' | 'log_type'
  typeValue: 'memory' | 'photo'
  scope: 'user' | 'child'
}

export function memoryTableConfig(behavior: MemoryBehavior): MemoryTableConfig {
  switch (behavior) {
    case 'cycle':
      return { table: 'cycle_logs', dateCol: 'date', typeCol: 'type', typeValue: 'memory', scope: 'user' }
    case 'pregnancy':
      return { table: 'pregnancy_logs', dateCol: 'log_date', typeCol: 'log_type', typeValue: 'memory', scope: 'user' }
    case 'kids':
      return { table: 'child_logs', dateCol: 'date', typeCol: 'type', typeValue: 'photo', scope: 'child' }
  }
}

/** Raw DB row shape — a superset of columns across the three tables. */
export interface MemoryRow {
  id: string
  date?: string
  log_date?: string
  photos?: string[] | null
  notes?: string | null
  [key: string]: unknown
}

export function rowToMemory(behavior: MemoryBehavior, row: MemoryRow): Memory {
  const { dateCol } = memoryTableConfig(behavior)
  return {
    id: row.id,
    date: (row[dateCol] as string | undefined) ?? '',
    photos: row.photos ?? [],
    caption: row.notes ?? '',
  }
}

// ─── React Query hook ───────────────────────────────────────────────────────

async function fetchUserId(): Promise<string | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  return sessionData.session?.user.id ?? null
}

async function fetchMemories(behavior: MemoryBehavior, scopeId: string | null): Promise<Memory[]> {
  if (!scopeId) return []

  const { table, dateCol, typeCol, typeValue, scope } = memoryTableConfig(behavior)

  let query = supabase
    .from(table)
    .select(`id, ${dateCol}, photos, notes, ${typeCol}`)
    .eq(typeCol, typeValue)

  query = scope === 'child' ? query.eq('child_id', scopeId) : query.eq('user_id', scopeId)

  if (behavior === 'kids') {
    // Existing child_logs memory rows are tagged type='photo' but that type
    // is also used more broadly — restrict to rows that actually carry photos.
    query = query.not('photos', 'eq', '{}')
  }

  const { data, error } = await query.order(dateCol, { ascending: false })
  if (error) throw error

  return ((data ?? []) as MemoryRow[]).map((row) => rowToMemory(behavior, row))
}

export function useMemories(behavior: MemoryBehavior) {
  const activeChild = useChildStore((s) => s.activeChild)

  const scopeId = behavior === 'kids' ? activeChild?.id ?? null : null

  return useQuery({
    queryKey: ['memories', behavior, behavior === 'kids' ? scopeId : 'user'],
    queryFn: async () => {
      if (behavior === 'kids') {
        if (!scopeId) return []
        return fetchMemories(behavior, scopeId)
      }
      const userId = await fetchUserId()
      return fetchMemories(behavior, userId)
    },
  })
}

// ─── Photo upload ─────────────────────────────────────────────────────────
// Memory photos must be uploaded to a PRIVATE bucket and stored as a bare
// storage PATH (signed at read time via lib/photoSigning.ts) — NOT the raw
// local picker URI, which invalidates when the OS clears the picker cache and
// never syncs across devices. Each URI is re-encoded to a compressed JPEG
// first: this also sidesteps iOS "Cannot load representation of type
// public.jpeg" errors on iCloud-optimized / HEIC originals, since manipulate
// materializes a plain local JPEG that fetch() can always read.

/** Bucket + path scope for a behavior's memory photos. */
function memoryPhotoTarget(
  behavior: MemoryBehavior,
  userId: string,
  childId: string | null,
): { bucket: 'cycle-photos' | 'pregnancy-nutrition' | 'child-photos'; folder: string } {
  switch (behavior) {
    case 'cycle':
      return { bucket: 'cycle-photos', folder: userId }
    case 'pregnancy':
      return { bucket: 'pregnancy-nutrition', folder: userId }
    case 'kids':
      return { bucket: 'child-photos', folder: childId ?? userId }
  }
}

/**
 * Re-encode + upload each local URI to the behavior's private bucket. Returns
 * the stored storage paths (in order). Throws if every upload fails, so the
 * caller never persists a memory row with zero durable photos.
 */
async function uploadMemoryPhotos(
  behavior: MemoryBehavior,
  uris: string[],
  userId: string,
  childId: string | null,
): Promise<string[]> {
  const { bucket, folder } = memoryPhotoTarget(behavior, userId, childId)
  const paths: string[] = []

  for (const uri of uris) {
    try {
      // Force a local, readable JPEG (fixes HEIC / iCloud representation errors).
      const { uri: jpegUri } = await ImageManipulator.manipulateAsync(
        uri,
        [],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      )
      const res = await fetch(jpegUri)
      const buf = await res.arrayBuffer()
      const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`
      const { error } = await supabase.storage.from(bucket).upload(path, buf, {
        contentType: 'image/jpeg',
        upsert: true,
      })
      if (!error) paths.push(path)
    } catch {
      // Skip a single unreadable photo rather than failing the whole save.
    }
  }

  if (uris.length > 0 && paths.length === 0) {
    throw new Error('Photo upload failed — check your connection and try again.')
  }
  return paths
}

// ─── Mutations ──────────────────────────────────────────────────────────────

interface AddMemoryInput {
  date: string
  /** Local picker URIs — uploaded to a private bucket; stored as paths. */
  photos: string[]
  caption: string
}

export function useAddMemory(behavior: MemoryBehavior) {
  const queryClient = useQueryClient()
  const activeChild = useChildStore((s) => s.activeChild)

  return useMutation({
    mutationFn: async ({ date, photos, caption }: AddMemoryInput) => {
      const { table, dateCol, typeCol, typeValue } = memoryTableConfig(behavior)
      const userId = await fetchUserId()
      if (!userId) throw new Error('No active session')

      // Upload local URIs → durable storage paths before persisting the row.
      const storedPaths = await uploadMemoryPhotos(behavior, photos, userId, activeChild?.id ?? null)

      const row: Record<string, unknown> =
        behavior === 'kids'
          ? {
              user_id: userId,
              child_id: activeChild?.id ?? null,
              [dateCol]: date,
              [typeCol]: typeValue,
              photos: storedPaths,
              notes: caption,
              logged_by: userId,
            }
          : {
              user_id: userId,
              [dateCol]: date,
              [typeCol]: typeValue,
              photos: storedPaths,
              notes: caption,
            }

      const { data, error } = await supabase.from(table).insert(row).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      const scopeId = behavior === 'kids' ? activeChild?.id ?? null : 'user'
      queryClient.invalidateQueries({ queryKey: ['memories', behavior, scopeId] })
    },
  })
}

interface UpdateMemoryCaptionInput {
  id: string
  caption: string
}

export function useUpdateMemoryCaption(behavior: MemoryBehavior) {
  const queryClient = useQueryClient()
  const activeChild = useChildStore((s) => s.activeChild)

  return useMutation({
    mutationFn: async ({ id, caption }: UpdateMemoryCaptionInput) => {
      const { table } = memoryTableConfig(behavior)
      const { data, error } = await supabase
        .from(table)
        .update({ notes: caption })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      const scopeId = behavior === 'kids' ? activeChild?.id ?? null : 'user'
      queryClient.invalidateQueries({ queryKey: ['memories', behavior, scopeId] })
    },
  })
}

export function useDeleteMemory(behavior: MemoryBehavior) {
  const queryClient = useQueryClient()
  const activeChild = useChildStore((s) => s.activeChild)

  return useMutation({
    mutationFn: async (id: string) => {
      const { table } = memoryTableConfig(behavior)
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      const scopeId = behavior === 'kids' ? activeChild?.id ?? null : 'user'
      queryClient.invalidateQueries({ queryKey: ['memories', behavior, scopeId] })
    },
  })
}
