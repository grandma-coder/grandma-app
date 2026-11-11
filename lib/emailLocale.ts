/**
 * Auth emails (confirm, reset password, notices) are rendered by Supabase from templates in
 * supabase/templates/. They pick their language from the user's metadata `locale`, so the app
 * keeps that field in step with the language picked in the app.
 */
import { supabase } from './supabase'

/** The metadata patch to save, or null when the account already has this language. */
export function emailLocaleUpdate(
  metadata: Record<string, unknown> | undefined,
  language: string,
): { locale: string } | null {
  if (!metadata) return null
  return metadata.locale === language ? null : { locale: language }
}

/** Saves the app language on the signed-in account when it differs. Best effort: emails fall back to English. */
export async function syncEmailLocale(metadata: Record<string, unknown> | undefined, language: string): Promise<void> {
  const patch = emailLocaleUpdate(metadata, language)
  if (!patch) return
  try {
    await supabase.auth.updateUser({ data: patch })
  } catch (e) {
    if (__DEV__) console.warn('[emailLocale] could not save', e)
  }
}
