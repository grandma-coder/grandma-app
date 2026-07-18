-- Phase 3 (community cold-start) — curated topic channels.
--
-- "An empty forum is a dead forum." The old fake-persona seed (85 channels +
-- 80 posts by BoundaryQueen/SleepMama) was deliberately removed
-- (20260607131000) for a clean, real-user-only system. This does NOT bring that
-- back: it seeds a small set of OFFICIAL, EMPTY topic channels — structural
-- containers per journey so real users have somewhere to post from day one.
-- No fake conversations.
--
-- Marked as official via created_by = NULL (system-owned) with a created_at
-- WELL AFTER the old seed window, so the old removal migration's time-bound
-- (created_at < 2026-04-10) can never catch these, and a future cleanup can
-- target them precisely by their known names if needed.
--
-- Idempotent: each channel is inserted only if no channel with that exact name
-- already exists, so re-running never duplicates.

DO $$
DECLARE
  ch TEXT[];
  topics TEXT[][] := ARRAY[
    -- name, description, category, sticker-url
    ARRAY['Trying to Conceive', 'Cycle tracking, fertile windows, and the TTC journey — together.', 'fertility', 'sticker://heart/pink'],
    ARRAY['Fertility & Nutrition', 'Foods, supplements, and habits that support conception.', 'fertility', 'sticker://leaf/green'],
    ARRAY['The Two-Week Wait', 'Support through the wait — symptoms, hope, and each other.', 'fertility', 'sticker://moon/lilac'],
    ARRAY['First Trimester', 'Early pregnancy — symptoms, scans, and those first big feelings.', 'pregnancy', 'sticker://star/yellow'],
    ARRAY['Second & Third Trimester', 'Growing bumps, kicks, appointments, and getting ready.', 'pregnancy', 'sticker://heart/pink'],
    ARRAY['Birth & Labor', 'Birth plans, hospital bags, and sharing your birth stories.', 'pregnancy', 'sticker://drop/blue'],
    ARRAY['Newborn Days', 'The fourth trimester — feeding, sleep, and surviving the newborn fog.', 'parenting', 'sticker://moon/lilac'],
    ARRAY['Baby Sleep', 'Naps, nights, and everything sleep for babies and toddlers.', 'sleep', 'sticker://moon/lilac'],
    ARRAY['Feeding & Weaning', 'Breast, bottle, solids, and picky eaters — all feeding talk here.', 'feeding', 'sticker://drop/blue'],
    ARRAY['Milestones & Development', 'Rolls, first steps, first words — celebrate and compare notes.', 'milestones', 'sticker://star/yellow'],
    ARRAY['Health & Vaccines', 'Fevers, check-ups, vaccines, and when to call the doctor.', 'health', 'sticker://heart/pink'],
    ARRAY['Ask the Village', 'No question too small — the whole community is here for you.', 'community', 'sticker://leaf/green']
  ];
BEGIN
  FOREACH ch SLICE 1 IN ARRAY topics LOOP
    IF NOT EXISTS (SELECT 1 FROM channels WHERE name = ch[1]) THEN
      INSERT INTO channels (name, description, category, channel_type, created_by, member_count, avatar_url)
      VALUES (ch[1], ch[2], ch[3], 'public', NULL, 0, ch[4]);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
