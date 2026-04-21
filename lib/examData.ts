/**
 * Exams data layer — cross-behavior medical exam / lab-result management.
 *
 * Exams are stored in the `exams` table (one row per exam). Each row can carry
 * multiple photos (page images in Supabase Storage) + an `extracted` JSON blob
 * holding whatever Claude Vision parsed from the first photo.
 *
 * Security: photos are kept **private**. `exam.photos` stores storage *paths*
 * (e.g. `exams/{uid}/abc.jpg`), not public URLs. Use `signExamPhotoUrl` /
 * `useExamPhotoUrls` to mint short-lived signed URLs on display.
 */

import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import * as ImageManipulator from 'expo-image-manipulator'
import { supabase } from './supabase'

const EXAM_BUCKET = 'scan-images'
const SIGNED_URL_TTL_SECONDS = 60 * 60 // 1 hour

// ─── Types ─────────────────────────────────────────────────────────────────

export type ExamBehavior = 'pre-pregnancy' | 'pregnancy' | 'kids'

export interface Exam {
  id: string
  userId: string
  childId: string | null
  behavior: ExamBehavior
  title: string
  result: string | null
  notes: string | null
  examDate: string
  photos: string[]
  extracted: ExamExtracted | null
  provider: string | null
  createdAt: string
  updatedAt: string
}

/** Shape returned by the `scan-image` edge function when scanType = 'exam'. */
export interface ExamExtracted {
  title: string | null
  result: string | null
  examDate: string | null
  provider: string | null
  referenceRange: string | null
  flagged: string[]
  notes: string | null
}

// ─── Row mapping ───────────────────────────────────────────────────────────

interface ExamRow {
  id: string
  user_id: string
  child_id: string | null
  behavior: ExamBehavior
  title: string
  result: string | null
  notes: string | null
  exam_date: string
  photos: string[] | null
  extracted: ExamExtracted | null
  provider: string | null
  created_at: string
  updated_at: string
}

function toExam(row: ExamRow): Exam {
  return {
    id: row.id,
    userId: row.user_id,
    childId: row.child_id,
    behavior: row.behavior,
    title: row.title,
    result: row.result,
    notes: row.notes,
    examDate: row.exam_date,
    photos: row.photos ?? [],
    extracted: row.extracted,
    provider: row.provider,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ─── Queries ───────────────────────────────────────────────────────────────

export interface UseExamsFilters {
  behavior?: ExamBehavior
  childId?: string | null
}

/** Returns all exams for the current user, optionally filtered. */
export function useExams(filters: UseExamsFilters = {}) {
  const { behavior, childId } = filters
  return useQuery({
    queryKey: ['exams', behavior ?? 'all', childId ?? 'all'],
    queryFn: async (): Promise<Exam[]> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      let q = supabase
        .from('exams')
        .select('*')
        .eq('user_id', user.id)
        .order('exam_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (behavior) q = q.eq('behavior', behavior)
      if (childId !== undefined && childId !== null) q = q.eq('child_id', childId)

      const { data, error } = await q
      if (error) throw error
      return (data as ExamRow[]).map(toExam)
    },
    staleTime: 30_000,
  })
}

export function useExam(examId: string | undefined) {
  return useQuery({
    queryKey: ['exam', examId],
    queryFn: async (): Promise<Exam | null> => {
      if (!examId) return null
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single()
      if (error) throw error
      return data ? toExam(data as ExamRow) : null
    },
    enabled: !!examId,
  })
}

// ─── Mutations ─────────────────────────────────────────────────────────────

export interface CreateExamInput {
  behavior: ExamBehavior
  childId?: string | null
  title: string
  result?: string | null
  notes?: string | null
  examDate?: string
  photos?: string[]
  extracted?: ExamExtracted | null
  provider?: string | null
}

export async function createExam(input: CreateExamInput): Promise<Exam> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('exams')
    .insert({
      user_id: user.id,
      child_id: input.childId ?? null,
      behavior: input.behavior,
      title: input.title,
      result: input.result ?? null,
      notes: input.notes ?? null,
      exam_date: input.examDate ?? new Date().toISOString().slice(0, 10),
      photos: input.photos ?? [],
      extracted: input.extracted ?? null,
      provider: input.provider ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return toExam(data as ExamRow)
}

export interface UpdateExamInput {
  title?: string
  result?: string | null
  notes?: string | null
  examDate?: string
  photos?: string[]
  extracted?: ExamExtracted | null
  provider?: string | null
}

export async function updateExam(examId: string, input: UpdateExamInput): Promise<Exam> {
  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.result !== undefined) patch.result = input.result
  if (input.notes !== undefined) patch.notes = input.notes
  if (input.examDate !== undefined) patch.exam_date = input.examDate
  if (input.photos !== undefined) patch.photos = input.photos
  if (input.extracted !== undefined) patch.extracted = input.extracted
  if (input.provider !== undefined) patch.provider = input.provider

  const { data, error } = await supabase
    .from('exams')
    .update(patch)
    .eq('id', examId)
    .select()
    .single()

  if (error) throw error
  return toExam(data as ExamRow)
}

export async function deleteExam(examId: string): Promise<void> {
  // Best-effort: remove storage objects for this exam before deleting the row.
  const { data: row } = await supabase
    .from('exams')
    .select('photos')
    .eq('id', examId)
    .single()

  const paths: string[] = (row?.photos as string[] | null) ?? []
  if (paths.length > 0) {
    await supabase.storage.from(EXAM_BUCKET).remove(paths)
  }

  await supabase.from('exams').delete().eq('id', examId)
}

// ─── Photo upload + AI extract ─────────────────────────────────────────────

/**
 * Compresses a local image URI and uploads it to the private `scan-images`
 * bucket under `exams/{userId}/...`. Returns the storage path (store this on
 * the exam row) and the base64 payload (so callers can feed it into the scan
 * edge function without a second round-trip).
 */
export async function uploadExamPhoto(localUri: string): Promise<{
  storagePath: string
  base64: string
  mediaType: 'image/jpeg'
}> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  // Compress to ~1024w, JPEG 0.7 — matches the scan.tsx pattern.
  const processed = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1024 } }],
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  )

  const path = `exams/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
  const response = await fetch(processed.uri)
  const blob = await response.blob()

  const { error: uploadError } = await supabase.storage
    .from(EXAM_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg' })
  if (uploadError) throw uploadError

  return {
    storagePath: path,
    base64: processed.base64 ?? '',
    mediaType: 'image/jpeg',
  }
}

/**
 * Mint a short-lived signed URL for a single exam photo path. Returns null if
 * signing fails (e.g. the file was deleted or RLS blocked access).
 */
export async function signExamPhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(EXAM_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

/**
 * Hook: resolve an array of storage paths to signed URLs. Returns the same
 * order as the input (null for paths that failed to sign). Cached for
 * `SIGNED_URL_TTL_SECONDS / 2` to cut re-renders.
 */
export function useExamPhotoUrls(paths: string[]): (string | null)[] {
  const results = useQueries({
    queries: paths.map((p) => ({
      queryKey: ['exam-photo-url', p],
      queryFn: () => signExamPhotoUrl(p),
      staleTime: (SIGNED_URL_TTL_SECONDS * 1000) / 2,
    })),
  })
  return results.map((r) => (r.data as string | null | undefined) ?? null)
}

/**
 * Calls the `scan-image` edge function with scanType = 'exam' and parses the
 * JSON reply into an `ExamExtracted`. Returns null if the AI couldn't return
 * valid JSON.
 */
export async function extractExamFromPhoto(args: {
  imageBase64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
}): Promise<ExamExtracted | null> {
  const { data, error } = await supabase.functions.invoke('scan-image', {
    body: {
      imageBase64: args.imageBase64,
      mediaType: args.mediaType,
      scanType: 'exam',
    },
  })
  if (error) throw error

  const reply: string | undefined = (data as { reply?: string } | null)?.reply
  if (!reply) return null

  // Claude may wrap the JSON in whitespace or return stray text — try hard.
  const jsonMatch = reply.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<ExamExtracted>
    return {
      title: parsed.title ?? null,
      result: parsed.result ?? null,
      examDate: parsed.examDate ?? null,
      provider: parsed.provider ?? null,
      referenceRange: parsed.referenceRange ?? null,
      flagged: Array.isArray(parsed.flagged) ? parsed.flagged : [],
      notes: parsed.notes ?? null,
    }
  } catch {
    return null
  }
}

// ─── Cache invalidation helper ─────────────────────────────────────────────

export function useInvalidateExams() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['exams'] })
    void qc.invalidateQueries({ queryKey: ['exam'] })
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Format helpers used by list / detail screens. */
export function formatExamDate(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function examBehaviorLabel(b: ExamBehavior): string {
  if (b === 'pre-pregnancy') return 'Pre-pregnancy'
  if (b === 'pregnancy') return 'Pregnancy'
  return 'Kids'
}
