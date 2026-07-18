-- Community cleanup — remove the leftover user-created TEST channels.
--
-- Igor created ~8 throwaway channels while testing ("Test", "Test 1",
-- "V2 Screenshot Test", "Yes 2", "Rio", "Parenting test", "Kids Mental Health",
-- "Sleep training"). Now that the 12 official topic channels are seeded, delete
-- the test junk so the community list is clean.
--
-- Precise targeting: these are the user-created channels (created_by IS NOT NULL
-- is NOT reliable — a deleted creator sets it NULL — so we match by the exact
-- known names AND a created_at BEFORE the official-seed date 2026-07-17, which
-- guarantees the 12 official topic channels (created 2026-07-17, created_by
-- NULL) are never touched).
--
-- channel_posts has no enforced FK to channels, so posts/members/saves are
-- deleted explicitly before the channels (mirrors 20260607131000).

CREATE TEMP TABLE _test_channel_ids ON COMMIT DROP AS
SELECT id FROM channels
WHERE name IN (
  'Test', 'Test 1', 'V2 Screenshot Test', 'Yes 2', 'Rio',
  'Parenting test', 'Kids Mental Health', 'Sleep training'
)
AND created_at < '2026-07-17T00:00:00Z';

-- Dependent rows first.
DELETE FROM channel_posts WHERE channel_id IN (SELECT id FROM _test_channel_ids);
DELETE FROM channel_members WHERE channel_id IN (SELECT id FROM _test_channel_ids);

DO $$
BEGIN
  IF to_regclass('public.channel_ratings') IS NOT NULL THEN
    DELETE FROM channel_ratings WHERE channel_id IN (SELECT id FROM _test_channel_ids);
  END IF;
  IF to_regclass('public.channel_saves') IS NOT NULL THEN
    DELETE FROM channel_saves WHERE channel_id IN (SELECT id FROM _test_channel_ids);
  END IF;
  IF to_regclass('public.channel_requests') IS NOT NULL THEN
    DELETE FROM channel_requests WHERE channel_id IN (SELECT id FROM _test_channel_ids);
  END IF;
END $$;

-- Finally the test channels.
DELETE FROM channels WHERE id IN (SELECT id FROM _test_channel_ids);

NOTIFY pgrst, 'reload schema';
