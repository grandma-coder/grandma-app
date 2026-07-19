-- Content DB — birth guide topics + sources (Stage 3 of the content bridge).
--
-- Moves the 11 hardcoded birth-guide topics (grandma-app/lib/birthGuide/*.ts)
-- into an editable table so the command center can manage them — including the
-- medical sources/citations (ACOG/NHS/NICE/WHO). The app reads DB-first with the
-- bundled files as a fallback, so a bad edit or outage never blanks the health
-- content.
--
-- sections + sources are nested structures edited as a unit, so they're stored
-- as jsonb on the topic row rather than over-normalized. Shape mirrors
-- BirthTopic: key/emoji/title/subtitle/heroColor/heroBorder/disclaimer +
-- sections[] (title/content/bullets/subsections/callout) + sources[] (label/org/url).
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.content_birth_topics (
  key          TEXT PRIMARY KEY,               -- 'natural', 'csection', … (BirthTopicKey)
  emoji        TEXT NOT NULL DEFAULT '',
  title        TEXT NOT NULL,
  subtitle     TEXT NOT NULL DEFAULT '',
  hero_color   TEXT,
  hero_border  TEXT,
  disclaimer   TEXT,
  sections     JSONB NOT NULL DEFAULT '[]',    -- BirthSection[]
  sources      JSONB NOT NULL DEFAULT '[]',    -- BirthSource[]
  active       BOOLEAN NOT NULL DEFAULT true,
  sort         INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   TEXT
);

CREATE INDEX IF NOT EXISTS idx_content_birth_topics_sort
  ON public.content_birth_topics (active, sort);

ALTER TABLE public.content_birth_topics ENABLE ROW LEVEL SECURITY;

-- The APP reads this table — read-only for everyone.
DO $$ BEGIN
  CREATE POLICY "birth_topics_read" ON public.content_birth_topics FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Writes go only through the command center's service-role client.

NOTIFY pgrst, 'reload schema';
