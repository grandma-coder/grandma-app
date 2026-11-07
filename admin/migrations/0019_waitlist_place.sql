-- Waitlist — where in the country each signup came from, for the admin map (Pessoas › Mapa).
-- region: ISO 3166-2 subdivision code without the country (x-vercel-ip-country-region, e.g. 'SP').
-- city:   city name (x-vercel-ip-city, URL-decoded by the site). Both nullable; rows before 0019 keep null.
-- waitlist_join gains p_region/p_city with defaults, replacing the 11-argument version in the same
-- transaction, so a site build that does not send them keeps working.
-- Idempotent.

BEGIN;

ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS region TEXT CHECK (region IS NULL OR region ~ '^[A-Z0-9]{1,3}$');
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS city   TEXT CHECK (city IS NULL OR length(city) BETWEEN 1 AND 80);

CREATE INDEX IF NOT EXISTS waitlist_country_region_idx ON public.waitlist (country, region);

DROP FUNCTION IF EXISTS public.waitlist_join(text,text,text,text,text,boolean,text,text,text,text,text);

CREATE OR REPLACE FUNCTION public.waitlist_join(
  p_email text, p_name text, p_mode text, p_locale text, p_country text, p_notify_launch boolean,
  p_utm_source text, p_utm_medium text, p_utm_campaign text, p_referrer text, p_ip_hash text,
  p_region text DEFAULT NULL, p_city text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Rate limit unchanged from 0018: an ip_hash may touch at most 5 rows per hour, re-joins included.
  IF p_ip_hash IS NOT NULL AND (
    SELECT count(*) FROM public.waitlist
    WHERE ip_hash = p_ip_hash AND greatest(created_at, updated_at) > now() - interval '1 hour'
  ) >= 5 THEN
    RETURN 'rate_limited';
  END IF;

  INSERT INTO public.waitlist
    (email, name, mode, locale, country, region, city, notify_launch, utm_source, utm_medium, utm_campaign, referrer, ip_hash)
  VALUES
    (lower(trim(p_email)), nullif(trim(p_name), ''), p_mode, p_locale, coalesce(p_country, 'OTHER'),
     p_region, nullif(trim(p_city), ''),
     coalesce(p_notify_launch, false), p_utm_source, p_utm_medium, p_utm_campaign, p_referrer, p_ip_hash)
  ON CONFLICT (email) DO UPDATE SET
    name          = coalesce(excluded.name, waitlist.name),
    mode          = excluded.mode,
    locale        = excluded.locale,
    country       = excluded.country,
    -- Same country: keep the known place when this join has none. New country: the old place no longer applies.
    region        = CASE WHEN excluded.country = waitlist.country THEN coalesce(excluded.region, waitlist.region) ELSE excluded.region END,
    city          = CASE WHEN excluded.country = waitlist.country THEN coalesce(excluded.city, waitlist.city) ELSE excluded.city END,
    notify_launch = excluded.notify_launch,
    ip_hash       = excluded.ip_hash,
    updated_at    = now();

  RETURN 'ok';
END
$$;

REVOKE ALL ON FUNCTION public.waitlist_join(text,text,text,text,text,boolean,text,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waitlist_join(text,text,text,text,text,boolean,text,text,text,text,text,text,text) TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
