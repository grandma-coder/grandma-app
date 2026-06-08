-- Atomic share_count increment for garage_posts.
--
-- Replaces a client-side read-modify-write (share_count = fetched_value + 1),
-- which loses increments under concurrent shares. This does the +1 in a single
-- SQL statement so the database serializes it.
--
-- Idempotent: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.increment_garage_share_count(post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.garage_posts
  SET share_count = COALESCE(share_count, 0) + 1
  WHERE id = post_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_garage_share_count(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
