-- content_translations — runtime translation cache for long-form editorial prose.
-- App-owned content (birth guide, pillar bodies, weekly content, growth leaps, etc.)
-- is translated on first view by the translate-content edge function and cached here
-- per (content_key, locale). Source text is hashed so a content edit forces a re-translate.
-- This is NOT user data — no PHI, no per-user rows. Shared across all authenticated users.

CREATE TABLE IF NOT EXISTS content_translations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key     text NOT NULL,
  locale          text NOT NULL,
  source_hash     text NOT NULL,
  translated_text text NOT NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (content_key, locale)
);

ALTER TABLE content_translations ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may READ cached translations (shared app content).
-- Role-scoped (TO authenticated) is enforced before USING runs — stricter than
-- comparing auth.role() inside the predicate.
DROP POLICY IF EXISTS content_translations_read ON content_translations;
CREATE POLICY content_translations_read ON content_translations
  FOR SELECT
  TO authenticated
  USING (true);

-- Writes happen ONLY via the edge function using the service-role key,
-- which bypasses RLS. No client INSERT/UPDATE/DELETE policy is defined, so
-- authenticated clients cannot write — exactly what we want.

-- keep updated_at fresh on every upsert-triggered UPDATE (project convention).
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_translations_updated_at ON content_translations;
CREATE TRIGGER content_translations_updated_at
  BEFORE UPDATE ON content_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- No extra index needed: the UNIQUE (content_key, locale) constraint already
-- creates the btree index used for reads and ON CONFLICT resolution.

NOTIFY pgrst, 'reload schema';
