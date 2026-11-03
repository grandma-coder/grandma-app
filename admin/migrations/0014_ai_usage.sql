-- AI usage — one row per Claude call from the app's edge functions (nana-chat,
-- grandma-chat, food-ai, scan-image, generate-insights). Powers the AI cost
-- pillar: spend per function / model / day / user. Command-center-owned but
-- WRITTEN by the edge functions (service-role), READ by the console. Idempotent.
--
-- The edge functions log token counts straight from Anthropic's response
-- `usage` block; cost is computed at read time from a pricing table in the
-- console so re-pricing never requires a backfill.

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fn            TEXT NOT NULL,               -- edge function: nana-chat | food-ai | scan-image | …
  model         TEXT NOT NULL,               -- claude-sonnet-4-5 | claude-haiku-4-5-20251001 | …
  user_id       UUID,                        -- app user (auth uuid), nullable for anon/system calls
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens  INTEGER NOT NULL DEFAULT 0,   -- prompt-cache reads (cheaper)
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,   -- prompt-cache writes (pricier)
  ok            BOOLEAN NOT NULL DEFAULT TRUE,      -- false when the Claude call errored
  latency_ms    INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_created_at_idx ON public.ai_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_fn_idx ON public.ai_usage (fn);
CREATE INDEX IF NOT EXISTS ai_usage_user_id_idx ON public.ai_usage (user_id);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
-- Command-center reads via service-role (bypasses RLS); edge functions write via
-- service-role. No user-facing policy — users never see this table.

NOTIFY pgrst, 'reload schema';
