// deno-lint-ignore-file
// @ts-nocheck — Deno Edge Function: TS errors in VS Code are expected (runs in Deno, not Node)
//
// translate-content — on-demand translation of long-form app content (birth guide,
// pillar bodies, weekly content, growth leaps, etc.). Translates a block into the
// requested locale via Claude Haiku and caches it in content_translations keyed by
// (content_key, locale). A source_hash guards the cache: if the English source is
// edited, the hash changes and the block is re-translated on next view.
//
// Reads/writes use the service-role key (bypasses RLS). English is a no-op passthrough.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean)

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowOrigin =
    ALLOWED_ORIGINS.length === 0 ? '*'
    : ALLOWED_ORIGINS.includes(origin) ? origin
    : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

// Human-readable language names for the translation prompt (locale code → name).
const LOCALE_NAMES: Record<string, string> = {
  'pt-BR': 'Brazilian Portuguese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Simplified Chinese',
  ar: 'Arabic',
  hi: 'Hindi',
  tr: 'Turkish',
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Authenticate the caller — an open Anthropic relay + shared-cache poison
  // vector otherwise (writes go through the service-role client below and
  // content_translations is world-readable). Verify the JWT before any work,
  // matching the pattern in scan-image / food-ai / nana-chat.
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData?.user?.id) {
    return new Response(
      JSON.stringify({ error: 'Invalid authorization token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const { contentKey, sourceText, locale } = await req.json()

    if (!contentKey || !sourceText || !locale) {
      return new Response(
        JSON.stringify({ error: 'contentKey, sourceText, and locale are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // English is the source — no translation, no cache round-trip.
    if (locale === 'en') {
      return new Response(
        JSON.stringify({ translatedText: sourceText, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const languageName = LOCALE_NAMES[locale]
    if (!languageName) {
      return new Response(
        JSON.stringify({ error: `unsupported locale: ${locale}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const hash = await sha256(sourceText)

    // Cache hit only if the SOURCE hasn't changed since we cached it.
    const { data: hit } = await supabase
      .from('content_translations')
      .select('translated_text, source_hash')
      .eq('content_key', contentKey)
      .eq('locale', locale)
      .maybeSingle()

    if (hit && hit.source_hash === hash) {
      return new Response(
        JSON.stringify({ translatedText: hit.translated_text, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Miss (or stale) — translate via Claude Haiku.
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system:
          `You translate content for a parenting & health app into ${languageName}. ` +
          `Preserve markdown formatting and any {{placeholder}} tokens exactly. ` +
          `Keep clinical accuracy; do NOT translate institutional/organization names ` +
          `(ACOG, NICE, WHO, CDC, USDA, IOM). Return ONLY the translation — no preamble, no quotes.`,
        messages: [{ role: 'user', content: sourceText }],
      }),
    })

    if (!res.ok) {
      // On upstream failure, fall back to the English source rather than erroring the UI.
      return new Response(
        JSON.stringify({ translatedText: sourceText, cached: false, fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const json = await res.json()
    const translated = json?.content?.[0]?.text ?? sourceText

    // Cache it (upsert on the unique (content_key, locale) constraint).
    await supabase.from('content_translations').upsert(
      { content_key: contentKey, locale, source_hash: hash, translated_text: translated, updated_at: new Date().toISOString() },
      { onConflict: 'content_key,locale' },
    )

    return new Response(
      JSON.stringify({ translatedText: translated, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
