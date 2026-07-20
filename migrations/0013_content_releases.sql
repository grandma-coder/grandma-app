-- Releases — our own editable changelog per app version, merged with live App
-- Store Connect build data in the Releases pillar. ASC tells us the builds +
-- states; this table holds the human "what's new / what shipped" notes the team
-- writes, keyed by version (e.g. '2.3.0'). Idempotent. Command-center-owned.

CREATE TABLE IF NOT EXISTS public.content_releases (
  version      TEXT PRIMARY KEY,             -- marketing version, e.g. '2.3.0'
  build        TEXT,                         -- optional build number
  title        TEXT,                         -- short headline
  changelog    TEXT,                         -- internal "what shipped" notes (markdown-ish)
  highlights   JSONB NOT NULL DEFAULT '[]',  -- ["bullet", …] user-facing highlights
  status       TEXT NOT NULL DEFAULT 'draft',-- draft | shipped
  released_at  TIMESTAMPTZ,
  created_by   TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_releases ENABLE ROW LEVEL SECURITY;
-- Command-center-only (reached via service-role); no user-facing policy.

NOTIFY pgrst, 'reload schema';
