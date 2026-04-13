# /edge-function

Create a new Supabase Edge Function for grandma.app.

Ask the user:
1. The function name (snake-case, e.g. `send-reminder`)
2. Whether it requires JWT auth or is public (`--no-verify-jwt`)
3. What it should do

Then create `supabase/functions/<name>/index.ts` with:

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // implementation
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

- Always handle CORS preflight (`OPTIONS`)
- Always wrap in try/catch
- Use `Deno.env.get('ANTHROPIC_API_KEY')` for secrets (never hardcode)
- If calling Claude: model is `claude-sonnet-4-20250514`

Then add the deploy command to README.md's Edge Functions section.
