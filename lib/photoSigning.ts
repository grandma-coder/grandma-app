/**
 * Photo signing — private-bucket PII photos (P2-27/41/68/76).
 *
 * Child / caregiver / profile / pregnancy-meal photos live in PRIVATE buckets
 * (see migration 20260617130000). Their DB columns store a bare storage *path*
 * (e.g. `{childId}/169..._ab12.jpg`), not a public URL. Mint a short-lived
 * signed URL on display via `signPhotoUrl` / `usePhotoUrl` / `usePhotoUrls`.
 *
 * Soft-migration coexistence: a stored photo value can be one of three shapes,
 * and only the third is signed:
 *   1. `icon:<key>` sentinel  → pass through (rendered as a sticker, not an image)
 *   2. legacy `http(s)://…`    → pass through (old PUBLIC garage-photos URL still works)
 *   3. bare storage path       → sign against the given private bucket
 * `resolvePhotoValue` encodes that decision so callers don't repeat it.
 */

import React from 'react'
import { Image, type ImageProps, type ImageStyle, type StyleProp } from 'react-native'
import { useQueries, useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

export const PHOTO_BUCKETS = {
  child: 'child-photos',
  avatar: 'profile-avatars',
  pregnancyMeal: 'pregnancy-nutrition',
  // Cycle memory photos — private, owner-only (migration 20260719220000).
  // Pregnancy memories reuse the owner-only pregnancyMeal bucket.
  cycle: 'cycle-photos',
} as const

export type PhotoBucket = (typeof PHOTO_BUCKETS)[keyof typeof PHOTO_BUCKETS]

// 10 min — short exposure window for PHI/child photos if a signed URL leaks
// (screenshot, proxy log, shared-device history). React Query re-signs at
// TTL/2 (see staleTime below), so this shortens exposure at no UX cost.
const SIGNED_URL_TTL_SECONDS = 10 * 60

/** True when the value is a bare storage path that must be signed (not an icon sentinel or an http URL). */
export function isStoragePath(value: string | null | undefined): boolean {
  if (!value) return false
  if (value.startsWith('icon:')) return false
  if (value.startsWith('http://') || value.startsWith('https://')) return false
  return true
}

/**
 * Mint a short-lived signed URL for a single storage path. Returns null if
 * signing fails (file deleted or RLS blocked). Pass-through values (icon
 * sentinels / legacy public URLs) should NOT reach this — guard with
 * `isStoragePath` first (the hooks below do).
 */
export async function signPhotoUrl(path: string, bucket: PhotoBucket): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

/**
 * Resolve a stored photo value to something renderable. Icon sentinels and
 * legacy http URLs pass straight through; bare paths are signed (React Query
 * cached at half the TTL to cut re-renders + re-sign before expiry). Returns
 * the original value while a sign is in flight so there's no flash.
 */
export function usePhotoUrl(
  value: string | null | undefined,
  bucket: PhotoBucket
): string | null | undefined {
  const needsSign = isStoragePath(value)
  const { data } = useQuery({
    queryKey: ['signed-photo', bucket, value],
    queryFn: () => signPhotoUrl(value as string, bucket),
    enabled: needsSign,
    staleTime: (SIGNED_URL_TTL_SECONDS * 1000) / 2,
  })
  if (!needsSign) return value
  return (data as string | null | undefined) ?? null
}

/**
 * Array variant — resolve a list of stored photo values (e.g. `child_logs.photos`)
 * to renderable URLs in the same order. Pass-through values are returned as-is;
 * bare paths are signed. Failed signs come back as null.
 */
export function usePhotoUrls(
  values: (string | null | undefined)[],
  bucket: PhotoBucket
): (string | null | undefined)[] {
  const results = useQueries({
    queries: values.map((v) => ({
      queryKey: ['signed-photo', bucket, v],
      queryFn: () => signPhotoUrl(v as string, bucket),
      enabled: isStoragePath(v),
      staleTime: (SIGNED_URL_TTL_SECONDS * 1000) / 2,
    })),
  })
  return values.map((v, i) => {
    if (!isStoragePath(v)) return v
    return (results[i]?.data as string | null | undefined) ?? null
  })
}

/**
 * <Image> that signs a private-bucket storage path on the fly. Use inside list
 * renders (e.g. a photo grid) where the hook variants can't be called per item.
 * Renders nothing until a real path resolves; passes icon/http values through.
 */
export function SignedImage({
  value,
  bucket,
  style,
  ...rest
}: {
  value: string | null | undefined
  bucket: PhotoBucket
  style?: StyleProp<ImageStyle>
} & Omit<ImageProps, 'source' | 'style'>): React.ReactElement | null {
  const uri = usePhotoUrl(value, bucket)
  if (!uri) return null
  return React.createElement(Image, { source: { uri }, style, ...rest })
}
