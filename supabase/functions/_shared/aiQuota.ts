// Server-side quota for paid AI calls.
//
// Every AI edge function reserves a slot via the reserve_ai_call() RPC
// (service role only) BEFORE calling Anthropic. The RPC serialises per
// user+function, so the limit holds under parallel requests, and the slot is
// recorded server-side — the client can't skip it.
//
// If the RPC itself errors (e.g. the migration isn't applied yet) we fail OPEN
// and log: an attacker can't induce that error, and failing closed would take
// every AI feature down on a deploy-order mistake.

// deno-lint-ignore no-explicit-any
type ServiceClient = any

export interface QuotaLimits {
  perHour: number | null
  perDay: number | null
  lifetime?: number | null
  /** Usage recorded before ai_request_log existed (e.g. scan_history rows). */
  priorCount?: number
}

export type QuotaResult = { ok: true } | { ok: false; reason: 'hour' | 'day' | 'lifetime' }

/** Per-tier limits per function. Premium is "unlimited" in the product sense but still capped against abuse. */
export const AI_LIMITS: Record<string, { free: QuotaLimits; premium: QuotaLimits }> = {
  'nana-chat':         { free: { perHour: 20, perDay: 60 },   premium: { perHour: 60, perDay: 300 } },
  'grandma-chat':      { free: { perHour: 20, perDay: 60 },   premium: { perHour: 60, perDay: 300 } },
  'food-ai':           { free: { perHour: 10, perDay: 30 },   premium: { perHour: 30, perDay: 150 } },
  'scan-image':        { free: { perHour: 3, perDay: 3, lifetime: 3 }, premium: { perHour: 20, perDay: 100 } },
  'generate-insights': { free: { perHour: 6, perDay: 20 },    premium: { perHour: 12, perDay: 60 } },
  // Cache misses only; one screen can translate several items at once.
  'translate-content': { free: { perHour: 200, perDay: 1000 }, premium: { perHour: 200, perDay: 1000 } },
}

export async function isPremiumUser(supabase: ServiceClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .maybeSingle()
  return data?.subscription_tier === 'premium_solo' || data?.subscription_tier === 'premium_family'
}

export async function reserveAiCall(
  supabase: ServiceClient,
  userId: string,
  fn: string,
  limits: QuotaLimits,
): Promise<QuotaResult> {
  const { data, error } = await supabase.rpc('reserve_ai_call', {
    p_user_id: userId,
    p_fn: fn,
    p_hour_limit: limits.perHour,
    p_day_limit: limits.perDay,
    p_lifetime_limit: limits.lifetime ?? null,
    p_prior_count: limits.priorCount ?? 0,
  })
  if (error) {
    console.error('[aiQuota] reserve_ai_call failed — allowing request', fn, error.message)
    return { ok: true }
  }
  if (data === 'ok') return { ok: true }
  return { ok: false, reason: data as 'hour' | 'day' | 'lifetime' }
}

/** Resolve the caller's tier and reserve a slot for `fn`. */
export async function checkAiQuota(supabase: ServiceClient, userId: string, fn: string, priorCount = 0): Promise<QuotaResult> {
  const tierLimits = AI_LIMITS[fn]
  if (!tierLimits) return { ok: true }
  const premium = await isPremiumUser(supabase, userId)
  const limits = premium ? tierLimits.premium : { ...tierLimits.free, priorCount }
  return reserveAiCall(supabase, userId, fn, limits)
}

export function quotaExceededResponse(result: QuotaResult, corsHeaders: Record<string, string>): Response {
  const reason = result.ok ? 'hour' : result.reason
  const lifetime = reason === 'lifetime'
  return new Response(
    JSON.stringify({
      error: lifetime ? 'Free limit reached' : 'Too many requests — please try again later',
      code: lifetime ? 'scan_limit_reached' : 'rate_limited',
      reason,
    }),
    { status: lifetime ? 402 : 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

// ─── Input validation ───────────────────────────────────────────────────────

const MAX_CHAT_MESSAGES = 40
const MAX_MESSAGE_CHARS = 8000

/** Keep only well-formed {role: user|assistant, content: string} turns, last N, length-capped. Null if unusable. */
export function sanitizeChatMessages(raw: unknown): Array<{ role: 'user' | 'assistant'; content: string }> | null {
  if (!Array.isArray(raw)) return null
  const clean = raw
    .filter((m): m is { role: 'user' | 'assistant'; content: string } =>
      !!m && typeof m === 'object' &&
      ((m as { role?: unknown }).role === 'user' || (m as { role?: unknown }).role === 'assistant') &&
      typeof (m as { content?: unknown }).content === 'string')
    .slice(-MAX_CHAT_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
  // Anthropic requires the first turn to be the user.
  while (clean.length && clean[0].role !== 'user') clean.shift()
  return clean.length ? clean : null
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
/** ~7.5 MB base64 ≈ 5.6 MB image — above Anthropic's own 5 MB image limit anyway. */
export const MAX_IMAGE_BASE64_CHARS = 7_500_000

export function validateImage(imageBase64: unknown, mediaType: unknown): string | null {
  if (typeof imageBase64 !== 'string' || !imageBase64) return 'No image provided'
  if (imageBase64.length > MAX_IMAGE_BASE64_CHARS) return 'Image too large'
  if (mediaType !== undefined && !ALLOWED_IMAGE_TYPES.includes(mediaType as typeof ALLOWED_IMAGE_TYPES[number])) {
    return 'Unsupported image type'
  }
  return null
}
