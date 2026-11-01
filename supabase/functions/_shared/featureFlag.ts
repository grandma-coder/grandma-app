// deno-lint-ignore-file
// @ts-nocheck — Deno Edge Function helper
/** Server-side gate for public.feature_flags. Fails closed: a missing row or any read error counts as OFF. */
export async function isFeatureEnabled(supabase: any, key: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('feature_flags').select('enabled').eq('key', key).maybeSingle()
    if (error) return false
    return data?.enabled === true
  } catch {
    return false
  }
}
