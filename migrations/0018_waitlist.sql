-- Waitlist — signups from the grandma.app marketing site (v0-grandma-app).
-- Launch is Brazil first, then the US, so country is first-class.
-- Command-center-owned. The site WRITES only through waitlist_join() with the
-- service role; the console READS, exports and promotes rows to beta_testers.
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.waitlist (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  name          TEXT,
  mode          TEXT NOT NULL CHECK (mode IN ('pre','preg','kids','meno')),
  locale        TEXT NOT NULL CHECK (locale IN ('en','pt')),
  country       TEXT NOT NULL DEFAULT 'OTHER' CHECK (country IN ('BR','US','OTHER')),
  notify_launch BOOLEAN NOT NULL DEFAULT false,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  referrer      TEXT,
  ip_hash       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_at    TIMESTAMPTZ,
  invited_by    TEXT,
  CONSTRAINT waitlist_email_key UNIQUE (email),
  CONSTRAINT waitlist_email_lower_chk CHECK (email = lower(email))
);

CREATE INDEX IF NOT EXISTS waitlist_created_at_idx ON public.waitlist (created_at DESC);
CREATE INDEX IF NOT EXISTS waitlist_country_created_idx ON public.waitlist (country, created_at);
CREATE INDEX IF NOT EXISTS waitlist_ip_hash_created_idx ON public.waitlist (ip_hash, created_at DESC);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
-- No policies: service role only.

CREATE OR REPLACE FUNCTION public.waitlist_join(
  p_email text, p_name text, p_mode text, p_locale text, p_country text, p_notify_launch boolean,
  p_utm_source text, p_utm_medium text, p_utm_campaign text, p_referrer text, p_ip_hash text
) RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_ip_hash IS NOT NULL AND (
    SELECT count(*) FROM public.waitlist
    WHERE ip_hash = p_ip_hash AND created_at > now() - interval '1 hour'
  ) >= 5 THEN
    RETURN 'rate_limited';
  END IF;

  INSERT INTO public.waitlist
    (email, name, mode, locale, country, notify_launch, utm_source, utm_medium, utm_campaign, referrer, ip_hash)
  VALUES
    (lower(trim(p_email)), nullif(trim(p_name), ''), p_mode, p_locale, coalesce(p_country, 'OTHER'),
     coalesce(p_notify_launch, false), p_utm_source, p_utm_medium, p_utm_campaign, p_referrer, p_ip_hash)
  ON CONFLICT (email) DO UPDATE SET
    name          = coalesce(excluded.name, waitlist.name),
    mode          = excluded.mode,
    locale        = excluded.locale,
    country       = excluded.country,
    notify_launch = excluded.notify_launch,
    updated_at    = now();

  RETURN 'ok';
END
$$;

REVOKE ALL ON FUNCTION public.waitlist_join(text,text,text,text,text,boolean,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waitlist_join(text,text,text,text,text,boolean,text,text,text,text,text) TO service_role;

NOTIFY pgrst, 'reload schema';
