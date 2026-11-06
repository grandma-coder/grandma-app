// @ts-nocheck — Deno Edge Function (URL imports, Deno globals; not type-checked by the app's tsconfig).
// submit-feedback — the in-app "Send a suggestion" sheet posts here. Authenticated users only;
// writes one row to support_tickets (the command center's Support inbox) through the shared
// writer. Light rate limit per user so a stuck button can't flood the inbox.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { createSupportTicket } from '../_shared/supportTicket.ts'

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

const KINDS = new Set(['feedback', 'bug', 'question'])
const MAX_LEN = 2000
const MAX_PER_HOUR = 5

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })
}

serve(async (req) => {
  const cors = corsHeadersFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors)

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'unauthorized' }, 401, cors)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  const user = authData?.user
  if (authError || !user?.id) return json({ error: 'unauthorized' }, 401, cors)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'bad_request' }, 400, cors) }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const kind = typeof body.kind === 'string' && KINDS.has(body.kind) ? body.kind : 'feedback'
  if (!message) return json({ error: 'empty' }, 400, cors)
  if (message.length > MAX_LEN) return json({ error: 'too_long' }, 400, cors)

  // Rate limit: at most MAX_PER_HOUR in-app tickets per user per hour.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('source', 'in_app')
    .gte('created_at', since)
  if ((count ?? 0) >= MAX_PER_HOUR) return json({ error: 'rate_limited' }, 429, cors)

  // Context the team needs to act on it — never health data.
  const str = (v: unknown, max = 40) => (typeof v === 'string' ? v.slice(0, max) : null)
  const journey = str(body.journey)
  const language = str(body.language, 10)
  const subject = [journey, language].filter(Boolean).join(' · ') || null

  const id = await createSupportTicket(supabase, {
    userId: user.id,
    email: user.email ?? null,
    kind,
    subject,
    message,
    appVersion: str(body.appVersion, 20),
    platform: str(body.platform, 10),
  })
  if (!id) return json({ error: 'save_failed' }, 500, cors)
  return json({ id }, 200, cors)
})
