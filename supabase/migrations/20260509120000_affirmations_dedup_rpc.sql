-- Affirmation logic fix
--
-- 1. Dedupe any duplicates that may have been seeded multiple times.
-- 2. Add a UNIQUE constraint so re-running the seed migration is idempotent.
-- 3. Replace get_daily_affirmation with a version that:
--      - orders deterministically by md5(text) instead of random UUID id
--      - spreads users across the rotation so two users on the same day
--        see different phrases (per-user offset based on auth.uid()).

-- Step 1 — dedupe (keep oldest row per (text, category)).
DELETE FROM affirmations a
USING affirmations b
WHERE a.id > b.id
  AND a.text = b.text
  AND a.category = b.category;

-- Step 2 — uniqueness so future re-seeds don't reintroduce duplicates.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'affirmations_text_category_unique'
  ) THEN
    ALTER TABLE affirmations
      ADD CONSTRAINT affirmations_text_category_unique UNIQUE (text, category);
  END IF;
END$$;

-- Step 3 — deterministic, user-spread daily affirmation.
CREATE OR REPLACE FUNCTION get_daily_affirmation(p_category TEXT DEFAULT 'pregnancy')
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_count INT;
  v_offset INT;
  v_user_seed INT;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM affirmations
    WHERE category = p_category;

  IF v_count = 0 THEN
    RETURN NULL;
  END IF;

  -- Per-user spread so two users don't collide on the same day.
  -- Falls back to 0 for unauthenticated callers.
  v_user_seed := COALESCE(ABS(hashtext(COALESCE(auth.uid()::text, ''))), 0);

  -- Day-of-year + user-spread, modulo total count.
  v_offset := ((EXTRACT(DOY FROM NOW())::INT - 1) + v_user_seed) % v_count;

  RETURN (
    SELECT text
    FROM affirmations
    WHERE category = p_category
    ORDER BY md5(text)  -- deterministic, content-stable ordering
    OFFSET v_offset
    LIMIT 1
  );
END;
$$;
