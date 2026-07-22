// lib/medicalSources.ts
// Single source of truth for the user-facing medical disclaimer and the
// canonical public-health source URLs referenced across the clinical content
// libraries. Roll-out target from the 2026-06-22 health-content audit:
// every clinical data file cites a SOURCES key in its header and surfaces
// MEDICAL_DISCLAIMER wherever clinical values are shown.

export const MEDICAL_DISCLAIMER =
  'This is general information, not medical advice. Values shown are population estimates, not your own measurements.'

export const VACCINE_SCHEDULE_NOTE = "Follow your country's official immunization schedule and your pediatrician."

export const VACCINE_DISCLAIMER =
  "General information, not medical advice. Timing varies by country — always confirm your child's schedule with your pediatrician."

export const SOURCES = {
  acogPrenatalScreening:
    'https://www.acog.org/womens-health/faqs/prenatal-genetic-screening-tests',
  acogNutrition:
    'https://www.acog.org/womens-health/faqs/nutrition-during-pregnancy',
  acogGdm: 'https://www.acog.org/womens-health/faqs/gestational-diabetes',
  cdcFolicAcid: 'https://www.cdc.gov/folic-acid/about/index.html',
  cdcHepB: 'https://www.cdc.gov/media/releases/2025/2025-hepatitis-b-immunization.html',
  whoGrowth: 'https://www.who.int/tools/child-growth-standards',
  cdcGrowth: 'https://www.cdc.gov/growthcharts/',
  wilcoxNejm1995: 'https://www.nejm.org/doi/full/10.1056/NEJM199512073332301',
  hadlockPerinatology: 'https://perinatology.com/Reference/Fetal%20development.htm',
  cochranePerineal:
    'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD005123.pub3/full',
  cochraneEpidural:
    'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD000331.pub4/full',
  niceWaterBirth: 'https://www.nice.org.uk/guidance/ng235',
  usdaFdc: 'https://fdc.nal.usda.gov/',
  wonderWeeks: 'https://en.wikipedia.org/wiki/The_Wonder_Weeks',
} as const
