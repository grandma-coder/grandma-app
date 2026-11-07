-- Content DB — AI-researched news / articles feed.
--
-- The command center researches a topic on the live web (Claude web_search),
-- drafts news items with real source URLs, an admin reviews, and publishes. The
-- app reads only PUBLISHED items (draft → review → publish; nothing reaches
-- users until approved — this is health content). Idempotent.

CREATE TABLE IF NOT EXISTS public.content_news (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  summary       TEXT,                          -- 1-2 line teaser for the feed card
  body          TEXT NOT NULL,                 -- full article (markdown-ish)
  topic         TEXT,                          -- pregnancy / kids / cycle / general
  mode          TEXT,                          -- optional journey-mode targeting
  sources       JSONB NOT NULL DEFAULT '[]',   -- [{ title, url }] real citations from the search
  status        TEXT NOT NULL DEFAULT 'draft', -- draft | published | archived
  image_url     TEXT,
  created_by    TEXT,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_news_status
  ON public.content_news (status, published_at DESC);

ALTER TABLE public.content_news ENABLE ROW LEVEL SECURITY;

-- The app reads ONLY published items. Drafts stay invisible to users; the
-- command center reaches everything via the service-role client.
DO $$ BEGIN
  CREATE POLICY "content_news_read_published" ON public.content_news
    FOR SELECT USING (status = 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
