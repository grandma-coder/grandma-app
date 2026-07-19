/**
 * Photo Safety — content moderation for uploaded images.
 *
 * The guidelines dialog itself is rendered in-app as a paper dialog (via
 * useConfirmDialog) rather than a native Alert, so this module only owns the
 * persisted "has agreed" gate. Callers: check hasAgreedToPhotoSafety(); if
 * false, show the paper guidelines dialog and call setPhotoSafetyAgreed() when
 * the user agrees.
 *
 * Future: integrate with a Supabase Edge Function for server-side face
 * detection (Google Vision / AWS Rekognition) to auto-block photos containing
 * children's faces.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const SAFETY_AGREED_KEY = 'photo-safety-agreed'

/** Whether the user has already accepted the photo-safety guidelines. */
export async function hasAgreedToPhotoSafety(): Promise<boolean> {
  return (await AsyncStorage.getItem(SAFETY_AGREED_KEY)) === 'true'
}

/** Persist that the user accepted the guidelines (call once they agree). */
export async function setPhotoSafetyAgreed(): Promise<void> {
  await AsyncStorage.setItem(SAFETY_AGREED_KEY, 'true')
}
