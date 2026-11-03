-- Content DB — the medical Sources catalog (evidence base).
--
-- The app's only structured citation set outside the birth guide is
-- grandma-app/lib/medicalSources.ts SOURCES (14 curated authority URLs). This
-- table brings them under command-center management as a single evidence base:
-- org / title / url, keyed by the app's SOURCES key so content can reference a
-- source by key later. Idempotent.

CREATE TABLE IF NOT EXISTS public.content_sources (
  key         TEXT PRIMARY KEY,             -- app SOURCES key, e.g. 'acogGdm'
  org         TEXT NOT NULL,                -- ACOG / CDC / WHO / NICE / …
  title       TEXT NOT NULL,                -- human label
  url         TEXT NOT NULL,
  topic       TEXT,                         -- optional grouping (pregnancy/kids/cycle/nutrition)
  active      BOOLEAN NOT NULL DEFAULT true,
  sort        INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT
);

CREATE INDEX IF NOT EXISTS idx_content_sources_org ON public.content_sources (org, sort);

ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "content_sources_read" ON public.content_sources FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed the 14 medicalSources URLs with org + human titles + topic grouping.
INSERT INTO public.content_sources (key, org, title, url, topic, sort) VALUES
  ('acogPrenatalScreening', 'ACOG', 'Prenatal genetic screening tests', 'https://www.acog.org/womens-health/faqs/prenatal-genetic-screening-tests', 'pregnancy', 0),
  ('acogNutrition',         'ACOG', 'Nutrition during pregnancy', 'https://www.acog.org/womens-health/faqs/nutrition-during-pregnancy', 'pregnancy', 1),
  ('acogGdm',               'ACOG', 'Gestational diabetes', 'https://www.acog.org/womens-health/faqs/gestational-diabetes', 'pregnancy', 2),
  ('cdcFolicAcid',          'CDC',  'Folic acid', 'https://www.cdc.gov/folic-acid/about/index.html', 'pre_pregnancy', 3),
  ('cdcHepB',               'CDC',  'Hepatitis B immunization (2025)', 'https://www.cdc.gov/media/releases/2025/2025-hepatitis-b-immunization.html', 'kids', 4),
  ('whoGrowth',             'WHO',  'Child growth standards', 'https://www.who.int/tools/child-growth-standards', 'kids', 5),
  ('cdcGrowth',             'CDC',  'Growth charts', 'https://www.cdc.gov/growthcharts/', 'kids', 6),
  ('wilcoxNejm1995',        'NEJM', 'Wilcox et al. — timing of intercourse & conception (1995)', 'https://www.nejm.org/doi/full/10.1056/NEJM199512073332301', 'pre_pregnancy', 7),
  ('hadlockPerinatology',   'Perinatology.com', 'Hadlock fetal development reference', 'https://perinatology.com/Reference/Fetal%20development.htm', 'pregnancy', 8),
  ('cochranePerineal',      'Cochrane', 'Perineal massage (CD005123)', 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD005123.pub3/full', 'pregnancy', 9),
  ('cochraneEpidural',      'Cochrane', 'Epidural for labour pain (CD000331)', 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD000331.pub4/full', 'pregnancy', 10),
  ('niceWaterBirth',        'NICE', 'Intrapartum care NG235 (water birth)', 'https://www.nice.org.uk/guidance/ng235', 'pregnancy', 11),
  ('usdaFdc',               'USDA', 'FoodData Central', 'https://fdc.nal.usda.gov/', 'kids', 12),
  ('wonderWeeks',           'The Wonder Weeks', 'Wonder Weeks (popular theory — not validated science)', 'https://en.wikipedia.org/wiki/The_Wonder_Weeks', 'kids', 13)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
