-- Content DB — daily-tracking questions (Stage 1 of the content bridge).
--
-- Moves the app's daily check-in questions out of hardcoded TS
-- (grandma-app/lib/dailyMessage/questions.*.ts) into an editable table so the
-- command center can manage them and edits flow live to the app. The app reads
-- this table DB-first with the bundled arrays as a fallback, so a bad edit or
-- outage never leaves users without questions.
--
-- Shape mirrors DailyQuestion: id (text, e.g. 'q_001'/'pq_001'), mode, prompt,
-- options jsonb [{label, tags[]}]. `sort` controls display order; `active`
-- soft-disables a question without deleting it. Idempotent.

CREATE TABLE IF NOT EXISTS public.content_daily_questions (
  id          TEXT PRIMARY KEY,                 -- keeps the app's stable ids (q_001, pq_001)
  mode        TEXT NOT NULL,                    -- 'pregnancy' | 'pre-pregnancy' | 'kids'
  prompt      TEXT NOT NULL,
  options     JSONB NOT NULL DEFAULT '[]',      -- [{ label, tags: [] }]
  active      BOOLEAN NOT NULL DEFAULT true,
  sort        INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT
);

CREATE INDEX IF NOT EXISTS idx_content_daily_questions_mode
  ON public.content_daily_questions (mode, active, sort);

ALTER TABLE public.content_daily_questions ENABLE ROW LEVEL SECURITY;

-- The APP reads this table (anon/authenticated) — read-only for everyone.
DO $$ BEGIN
  CREATE POLICY "daily_questions_read" ON public.content_daily_questions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Writes go only through the command center's service-role client (bypasses RLS);
-- no user-facing write policy is intended.

NOTIFY pgrst, 'reload schema';
